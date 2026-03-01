'use client';

import { useState, useEffect } from 'react';
import { SiteTree } from './SiteTree';
import { Canvas } from './Canvas';
import { EditPanel } from './EditPanel';
import { GeneratePrompt } from './GeneratePrompt';
import { TopBar } from './TopBar';
import { useEditorStore, selectPageEntries } from '@/lib/store/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { saveProject, loadProject, loadAutosaveLegacy } from '@/lib/utils/storage';

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function EditorLayout() {
  const page = useEditorStore((s) => s.page);
  const setPage = useEditorStore((s) => s.setPage);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const selectedIds = useEditorStore((s) => s.selectedComponentIds);
  const pageEntries = useEditorStore(useShallow(selectPageEntries));
  const appName = useEditorStore((s) => s.appName);
  const publishedSlug = useEditorStore((s) => s.publishedSlug);
  const publishedPrivate = useEditorStore((s) => s.publishedPrivate);
  const siteComponents = useEditorStore((s) => s.siteComponents);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Restore last session on mount (only if no page is loaded yet)
  useEffect(() => {
    if (useEditorStore.getState().page) return;

    // Try new multi-page project format first
    const project = loadProject();
    if (project && project.entries.length > 0) {
      const { entries, activePageId, appName, publishedSlug, publishedPrivate, siteComponents: sc } = project;
      const targetId = activePageId ?? entries[0].id;
      const target = entries.find((e) => e.id === targetId) ?? entries[0];

      useEditorStore.setState({
        pageEntries: entries,
        activePageId: target.id,
        page: { ...target.content },
        appName: appName ?? '',
        publishedSlug: publishedSlug ?? null,
        publishedPrivate: publishedPrivate ?? false,
        siteComponents: sc,
        past: [],
        future: [],
      });
      return;
    }

    // Fall back to legacy single-page autosave (migration)
    const legacy = loadAutosaveLegacy();
    if (legacy) setPage(legacy);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save when the active page content changes
  useEffect(() => {
    if (!page) return;
    const { pageEntries, activePageId, appName, publishedSlug, publishedPrivate, siteComponents: sc } = useEditorStore.getState();
    const syncedEntries = pageEntries.map((e) =>
      e.id === activePageId ? { ...e, content: page } : e
    );
    saveProject(syncedEntries, activePageId, appName, publishedSlug, publishedPrivate, sc);
  }, [page]);

  // Auto-save when pageEntries change without page changing (rename, remove non-active page)
  useEffect(() => {
    if (pageEntries.length === 0) return;
    const { activePageId, page: livePage, appName: currentAppName, publishedSlug, publishedPrivate, siteComponents: sc } = useEditorStore.getState();
    const syncedEntries = pageEntries.map((e) =>
      e.id === activePageId && livePage ? { ...e, content: livePage } : e
    );
    saveProject(syncedEntries, activePageId, currentAppName, publishedSlug, publishedPrivate, sc);
  }, [pageEntries]);

  // Auto-save when the app name changes
  useEffect(() => {
    const { pageEntries: entries, activePageId, page: livePage, publishedSlug: slug, publishedPrivate: priv, siteComponents: sc } = useEditorStore.getState();
    if (entries.length === 0) return;
    const syncedEntries = entries.map((e) =>
      e.id === activePageId && livePage ? { ...e, content: livePage } : e
    );
    saveProject(syncedEntries, activePageId, appName, slug, priv, sc);
  }, [appName]);

  // Auto-save when publish state changes (publishedSlug / publishedPrivate)
  useEffect(() => {
    const { pageEntries: entries, activePageId, page: livePage, appName: currentAppName, siteComponents: sc } = useEditorStore.getState();
    if (entries.length === 0) return;
    const syncedEntries = entries.map((e) =>
      e.id === activePageId && livePage ? { ...e, content: livePage } : e
    );
    saveProject(syncedEntries, activePageId, currentAppName, publishedSlug, publishedPrivate, sc);
  }, [publishedSlug, publishedPrivate]);

  // Auto-save when site components change
  useEffect(() => {
    const { pageEntries: entries, activePageId, page: livePage, appName: currentAppName, publishedSlug: slug, publishedPrivate: priv } = useEditorStore.getState();
    if (entries.length === 0) return;
    const syncedEntries = entries.map((e) =>
      e.id === activePageId && livePage ? { ...e, content: livePage } : e
    );
    saveProject(syncedEntries, activePageId, currentAppName, slug, priv, siteComponents);
  }, [siteComponents]);

  // Pre-generation: no page and not currently generating
  const showCenteredInput = !page && !isGenerating;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <TopBar />

      <div className="flex flex-1 overflow-hidden bg-gray-100">
      {/* Left panel — Component tree (show as soon as generation starts) */}
      {(page || isGenerating || pageEntries.length > 0) && (
        <aside
          className="flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-200"
          style={{ width: leftCollapsed ? 44 : 'clamp(200px, 19vw, 360px)' }}
          aria-label="Component tree"
        >
          {leftCollapsed ? (
            <button
              onClick={() => setLeftCollapsed(false)}
              className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="Expand layers panel"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                Layers
              </span>
            </button>
          ) : (
            <>
              {/* Branding + collapse button */}
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between gap-2">
                <span className="text-base font-bold tracking-tight text-gray-900">blitz</span>
                <button
                  onClick={() => setLeftCollapsed(true)}
                  className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                  title="Collapse panel"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <SiteTree />
              </div>
            </>
          )}
        </aside>
      )}

      {/* Center panel — Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative" aria-label="Page canvas">
        <Canvas />

        {/* Pre-generation: centered input UI */}
        {showCenteredInput && (
          <div className="absolute inset-0 overflow-y-auto z-10 blitz-fade-in">
            <div className="min-h-full flex items-center justify-center py-8">
              <div className="w-full max-w-3xl px-6">
                <div className="mb-6 text-center">
                  <p className="text-3xl font-bold tracking-tight text-gray-800">blitz</p>
                  <p className="text-sm text-gray-400 mt-1">Describe what you want to build</p>
                </div>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <GeneratePrompt />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Right panel — Edit / Refine (show as soon as generation starts) */}
      {(page || isGenerating || pageEntries.length > 0) && (
        <aside
          className="flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden transition-all duration-200"
          style={{ width: rightCollapsed ? 44 : 'clamp(240px, 23vw, 420px)' }}
          aria-label="Edit panel"
        >
          {rightCollapsed ? (
            <button
              onClick={() => setRightCollapsed(false)}
              className="flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="Expand edit panel"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400" style={{ writingMode: 'vertical-rl' }}>
                {selectedIds.length > 0 ? 'Edit' : 'Refine'}
              </span>
            </button>
          ) : (
            <>
              {/* Panel header with collapse button */}
              <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                  {selectedIds.length > 0 ? 'Edit' : 'Refine'}
                </span>
                <button
                  onClick={() => setRightCollapsed(true)}
                  className="flex-shrink-0 p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
                  title="Collapse panel"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <EditPanel />
              </div>
            </>
          )}
        </aside>
      )}
      </div>
    </div>
  );
}
