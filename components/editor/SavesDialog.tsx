'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/lib/store/editorStore';
import { loadSaves, savePage, deleteSave, downloadStandaloneHtml } from '@/lib/utils/storage';
import type { SavedPage } from '@/types';

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Save Modal ────────────────────────────────────────────────────────────────

interface SaveModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SaveModal({ open, onOpenChange }: SaveModalProps) {
  const appName = useEditorStore((s) => s.appName);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(appName || '');
  }, [open, appName]);

  function handleSave() {
    if (!name.trim()) return;
    const { pageEntries, activePageId, page: livePage, appName: currentAppName, publishedSlug, publishedPrivate } = useEditorStore.getState();
    if (pageEntries.length === 0) return;
    // Sync the active page's live content into entries before saving
    const syncedEntries = pageEntries.map((e) =>
      e.id === activePageId && livePage ? { ...e, content: livePage } : e
    );
    savePage(name, syncedEntries, activePageId, currentAppName, publishedSlug, publishedPrivate);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save project</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Name this save…"
            className="h-9 text-sm"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="h-9 px-4 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Load Modal ────────────────────────────────────────────────────────────────

interface LoadModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function LoadModal({ open, onOpenChange }: LoadModalProps) {
  const setPage = useEditorStore((s) => s.setPage);
  const [saves, setSaves] = useState<SavedPage[]>([]);

  useEffect(() => {
    if (open) setSaves(loadSaves());
  }, [open]);

  function handleLoad(saved: SavedPage) {
    if (saved.entries && saved.entries.length > 0) {
      // Multi-page restore
      const entries = saved.entries;
      const targetId = saved.activePageId ?? entries[0].id;
      const target = entries.find((e) => e.id === targetId) ?? entries[0];
      useEditorStore.setState({
        pageEntries: entries,
        activePageId: target.id,
        page: { ...target.content },
        appName: saved.appName ?? '',
        publishedSlug: saved.publishedSlug ?? null,
        publishedPrivate: saved.publishedPrivate ?? false,
        past: [],
        future: [],
        selectedComponentIds: [],
        selectionRects: [],
        forceRebuild: useEditorStore.getState().forceRebuild + 1,
      });
    } else if (saved.page) {
      // Legacy single-page restore
      setPage(saved.page);
    }
    onOpenChange(false);
  }

  function handleDelete(id: string) {
    deleteSave(id);
    setSaves(loadSaves());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load page</DialogTitle>
        </DialogHeader>
        <div className="pt-1">
          {saves.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No saved pages yet.</p>
          ) : (
            <ScrollArea className="max-h-72">
              <div className="flex flex-col gap-1.5 pr-2">
                {saves.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatDate(s.timestamp)}
                        {s.entries && s.entries.length > 1 && (
                          <span className="ml-1.5">· {s.entries.length} pages</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLoad(s)}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-gray-300 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Export Modal ──────────────────────────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const page = useEditorStore((s) => s.page);
  const pageEntries = useEditorStore((s) => s.pageEntries);
  const activePageId = useEditorStore((s) => s.activePageId);
  const siteComponents = useEditorStore((s) => s.siteComponents);
  const isMultiPage = pageEntries.length > 1;

  function handleDownload() {
    if (!page && pageEntries.length === 0) return;
    downloadStandaloneHtml(pageEntries, activePageId, page, siteComponents);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-1">
          <p className="text-sm text-gray-500">
            {isMultiPage
              ? `Download all ${pageEntries.length} pages as a single HTML file with built-in navigation. Opens in any browser with no server required.`
              : 'Download your page as a standalone HTML file. Opens in any browser with no server required.'}
          </p>
          <button
            onClick={handleDownload}
            className="h-9 px-4 rounded-md text-sm font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            Download HTML
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
