'use client';

import { useRef, useState, useCallback } from 'react';
import { useEditorStore, selectSortedComponents } from '@/lib/store/editorStore';
import { canvasAddComponent } from '@/lib/utils/canvasManager';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TemplateWizard } from '@/components/editor/TemplateWizard';
import { AgentChat } from '@/components/editor/AgentChat';
import type { Component, ComponentType, DaisyTheme, FontFamily, PageEntry } from '@/types';

export function GeneratePrompt() {
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [showRefUrl, setShowRefUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showAgentChat, setShowAgentChat] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const setPage = useEditorStore((s) => s.setPage);
  const setProject = useEditorStore((s) => s.setProject);
  const setAppName = useEditorStore((s) => s.setAppName);
  const setIsGenerating = useEditorStore((s) => s.setIsGenerating);
  const setSiteComponents = useEditorStore((s) => s.setSiteComponents);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const page = useEditorStore((s) => s.page);
  const pageEntries = useEditorStore((s) => s.pageEntries);
  const activePageId = useEditorStore((s) => s.activePageId);
  const existingSiteComponents = useEditorStore((s) => s.siteComponents);
  const components = useEditorStore(selectSortedComponents);

  const handleGenerate = useCallback(async (descriptionOverride?: string) => {
    const desc = descriptionOverride ?? description;
    if (!desc.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);
    setIsGenerating(true);

    // Clear canvas for fresh generation
    if (canvasRef?.current) canvasRef.current.innerHTML = '';

    const abort = new AbortController();
    abortRef.current = abort;

    // Single-page accumulator (used when no page markers arrive)
    const accumulated: Component[] = [];
    const accumulatedSiteComponents: Component[] = [];
    let pageTitle = 'Untitled';
    let generatedAppName = '';
    let pageDaisyTheme: DaisyTheme = 'light';
    let pageFontFamily: FontFamily = 'Inter';

    // Multi-page accumulators
    const multiPages: Array<{ slug: string; name: string; components: Component[] }> = [];
    let currentMultiPage: { slug: string; name: string; components: Component[] } | null = null;

    // Build project context when generating within an existing multi-page project
    const activeEntry = pageEntries.find((e) => e.id === activePageId);
    const otherEntries = pageEntries.filter((e) => e.id !== activePageId);
    const isSubsequentPage = otherEntries.length > 0 && activeEntry != null;
    const projectContext = isSubsequentPage
      ? {
          pageName: activeEntry.name,
          existingPages: otherEntries.map((e) => ({ name: e.name, slug: e.slug })),
          theme: otherEntries[0].content.theme,
          hasSiteComponents: existingSiteComponents.length > 0,
        }
      : undefined;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, projectContext, referenceUrl: referenceUrl.trim() || undefined }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));

            if (ev.t === 'theme') {
              pageDaisyTheme = ev.daisyTheme as DaisyTheme;
              pageFontFamily = ev.fontFamily as FontFamily;
              if (ev.appName) generatedAppName = ev.appName as string;
              if (canvasRef?.current) {
                canvasRef.current.dataset.theme = ev.daisyTheme;
                canvasRef.current.style.fontFamily = `'${ev.fontFamily}', sans-serif`;
              }
            } else if (ev.t === 'page') {
              // Start of a new page in multi-page generation
              currentMultiPage = { slug: ev.slug as string, name: ev.name as string, components: [] };
              multiPages.push(currentMultiPage);
              // Clear canvas so user sees each page as it builds
              if (canvasRef?.current) canvasRef.current.innerHTML = '';
            } else if (ev.t === 'sc') {
              // Site-wide component (navbar/footer) — shared across all pages
              const siteComp: Component = {
                id: ev.id,
                type: ev.ct as ComponentType,
                label: ev.label,
                html: ev.html || '',
                order: ev.order,
                ...(ev.columns ? { columns: ev.columns as Component[][] } : {}),
              };
              accumulatedSiteComponents.push(siteComp);
              if (canvasRef?.current) {
                canvasAddComponent(canvasRef.current, siteComp);
              }
            } else if (ev.t === 'c') {
              const component: Component = {
                id: ev.id,
                type: ev.ct as ComponentType,
                label: ev.label,
                html: ev.html || '',
                order: ev.order,
                ...(ev.columns ? { columns: ev.columns as Component[][] } : {}),
              };
              if (currentMultiPage) {
                currentMultiPage.components.push(component);
              } else {
                accumulated.push(component);
              }
              if (canvasRef?.current) {
                canvasAddComponent(canvasRef.current, component);
              }
            } else if (ev.t === 'done') {
              if (ev.title) pageTitle = ev.title;
              if (ev.appName) generatedAppName = ev.appName as string;
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setError('Generation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      abortRef.current = null;

      if (multiPages.length === 0 && accumulated.length === 0 && !error) {
        setError('Generation failed. Please try again.');
      }

      if (multiPages.length > 0) {
        // Multi-page generation: create all page entries at once
        const theme = { daisyTheme: pageDaisyTheme, fontFamily: pageFontFamily };
        const entries: PageEntry[] = multiPages.map((p, i) => ({
          id: `page-${Date.now()}-${i}`,
          name: p.name,
          slug: p.slug,
          content: {
            title: p.name,
            description: desc,
            components: p.components.map((c, j) => ({ ...c, order: j })),
            theme,
          },
        }));
        setProject(entries, generatedAppName || pageTitle);
        if (accumulatedSiteComponents.length > 0) {
          setSiteComponents(accumulatedSiteComponents);
        }
      } else if (accumulated.length > 0) {
        // Single-page generation
        setPage({
          title: pageTitle,
          description: desc,
          components: accumulated,
          theme: { daisyTheme: pageDaisyTheme, fontFamily: pageFontFamily },
        });
        // Only set the app name on initial generation, not when regenerating a page in a project
        if (!isSubsequentPage) {
          setAppName(generatedAppName || pageTitle);
        }
        if (accumulatedSiteComponents.length > 0) {
          setSiteComponents(accumulatedSiteComponents);
        }
      }
    }
  }, [description, isLoading, setPage, setProject, setAppName, setIsGenerating, setSiteComponents, canvasRef, pageEntries, activePageId, existingSiteComponents]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const activeEntry = pageEntries.find((e) => e.id === activePageId);
  const isSubsequentPage = pageEntries.filter((e) => e.id !== activePageId).length > 0 && activeEntry != null;
  const isFirstGeneration = !page;

  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          {isSubsequentPage
            ? `Generate "${activeEntry!.name}" page`
            : isFirstGeneration
            ? 'Generate a page'
            : 'Regenerate page'}
        </h2>
        <p className="text-xs text-gray-400">
          {isSubsequentPage
            ? 'Describe the content for this page. Theme and nav links will match the rest of the site.'
            : isFirstGeneration
            ? 'Describe what you want to build. Mention multiple pages if needed.'
            : 'This will replace the current page.'}
        </p>
      </div>

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
        }}
        placeholder='e.g. A 3-page site for "FlowDesk" — home page with hero and features, a pricing page, and an about page.'
        className="min-h-[130px] resize-none text-sm"
        disabled={isLoading}
      />

      {/* Template wizard */}
      <TemplateWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onGenerate={(prompt) => {
          setShowWizard(false);
          handleGenerate(prompt);
        }}
      />

      {/* Agent chat */}
      <AgentChat
        open={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        onGenerate={(prompt) => {
          setShowAgentChat(false);
          handleGenerate(prompt);
        }}
      />

      {/* Reference URL */}
      {showRefUrl ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => { setShowRefUrl(false); setReferenceUrl(''); }}
              className="p-1.5 rounded text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
              title="Remove reference URL"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-gray-400">AI will use this site's content and structure as inspiration</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowRefUrl(true)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors w-fit"
          disabled={isLoading}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Use existing website as reference
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-100 transition-colors flex-1 disabled:opacity-50"
          disabled={isLoading}
        >
          <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span>Use a template</span>
        </button>
        <button
          type="button"
          onClick={() => setShowAgentChat(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 transition-colors flex-1 disabled:opacity-50"
          disabled={isLoading}
        >
          <span className="text-[11px]">✦</span>
          <span>Answer questions</span>
        </button>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => handleGenerate()}
          disabled={isLoading || !description.trim()}
          className="flex-1"
          size="sm"
        >
          {isLoading ? 'Generating…' : isFirstGeneration ? 'Generate →' : 'Regenerate →'}
        </Button>
        {isLoading && (
          <Button variant="outline" size="sm" onClick={handleStop}>
            Stop
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="text-xs text-gray-400 text-center animate-pulse">
          Building with Kimi K2…
        </p>
      )}

      {!isLoading && error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}

      {!isLoading && !error && components.length > 0 && (
        <p className="text-xs text-gray-300 text-center">Ctrl+Enter to generate</p>
      )}
    </div>
  );
}
