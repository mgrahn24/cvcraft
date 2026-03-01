'use client';

import { useRef, useState, useEffect } from 'react';
import { useEditorStore, selectCanUndo, selectCanRedo } from '@/lib/store/editorStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DAISY_THEMES, FONT_FAMILIES } from '@/types';
import type { DaisyTheme, FontFamily } from '@/types';
import { SaveModal, LoadModal, ExportModal } from './SavesDialog';
import {
  FolderOpen, Save, Download, FilePlus, Wand2, Globe,
  Copy, Check, Lock, Unlock, Paintbrush, ChevronDown, Settings2,
} from 'lucide-react';
import { buildProjectHtml } from '@/lib/utils/storage';

// ── Icons ─────────────────────────────────────────────────────────────────────

function UndoIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 14 4 9 9 4" />
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 14 20 9 15 4" />
      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
    </svg>
  );
}

// ── Shared button style ────────────────────────────────────────────────────────

function TopBtn({
  onClick,
  disabled,
  title,
  children,
  variant = 'ghost',
  className = '',
}: {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  variant?: 'ghost' | 'solid';
  className?: string;
}) {
  const base = 'h-8 px-2.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0';
  const styles =
    variant === 'solid'
      ? `${base} bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 ${className}`
      : `${base} text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed ${className}`;
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={styles}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 flex-shrink-0" />;
}

// ── URL helpers ────────────────────────────────────────────────────────────────

function slugifyName(name: string): string {
  return (name || 'my-app').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'my-app';
}

function sanitizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-/, '');
}

// ── Component ──────────────────────────────────────────────────────────────────

export function TopBar() {
  const page = useEditorStore((s) => s.page);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const setDaisyTheme = useEditorStore((s) => s.setDaisyTheme);
  const setFontFamily = useEditorStore((s) => s.setFontFamily);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const clearPage = useEditorStore((s) => s.clearPage);
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
  const appName = useEditorStore((s) => s.appName);
  const setAppName = useEditorStore((s) => s.setAppName);
  const publishedSlug = useEditorStore((s) => s.publishedSlug);
  const setPublishedSlug = useEditorStore((s) => s.setPublishedSlug);
  const publishedPrivate = useEditorStore((s) => s.publishedPrivate);
  const setPublishedPrivate = useEditorStore((s) => s.setPublishedPrivate);
  const pageEntries = useEditorStore((s) => s.pageEntries);
  const activePageId = useEditorStore((s) => s.activePageId);
  const siteComponents = useEditorStore((s) => s.siteComponents);

  // Editable app name
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(appName);
  useEffect(() => { setNameValue(appName); }, [appName]);

  function commitName() {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== appName) setAppName(trimmed);
    else setNameValue(appName);
  }

  // Modal state
  const [openModal, setOpenModal] = useState<'save' | 'load' | 'export' | null>(null);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState(() => publishedSlug ?? slugifyName(appName));
  const [showFirstPublishModal, setShowFirstPublishModal] = useState(false);

  useEffect(() => {
    setPublishedUrl(publishedSlug ? `/p/${publishedSlug}` : null);
    setSlugDraft(publishedSlug ?? slugifyName(appName));
  }, [publishedSlug, appName]);

  async function handlePublish() {
    if (!page || isPublishing) return;
    const slug = slugDraft.replace(/^-|-$/g, '') || slugifyName(appName);
    setIsPublishing(true);
    try {
      const html = buildProjectHtml(pageEntries, activePageId, page, siteComponents);
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, slug, isPrivate: publishedPrivate }),
      });
      if (!res.ok) return;
      setPublishedSlug(slug);
      setSlugDraft(slug);
      setPublishedUrl(`/p/${slug}`);
      window.open(`/p/${slug}`, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleUnpublish() {
    if (!publishedSlug || isUnpublishing) return;
    setIsUnpublishing(true);
    try {
      await fetch('/api/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: publishedSlug }),
      });
      setPublishedSlug(null);
      setPublishedUrl(null);
      setSlugDraft(slugifyName(appName));
    } catch {
      // ignore
    } finally {
      setIsUnpublishing(false);
    }
  }

  async function handleCopy() {
    if (!publishedUrl) return;
    await navigator.clipboard.writeText(window.location.origin + publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Suggest theme / font
  const [isSuggestingTheme, setIsSuggestingTheme] = useState(false);
  const [isSuggestingFont, setIsSuggestingFont] = useState(false);

  async function handleSuggestTheme() {
    if (!page || isSuggestingTheme) return;
    setIsSuggestingTheme(true);
    try {
      const res = await fetch('/api/suggest-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, currentTheme: page.theme.daisyTheme, currentFont: page.theme.fontFamily, target: 'theme' }),
      });
      if (!res.ok) return;
      const { daisyTheme } = await res.json() as { daisyTheme: DaisyTheme; fontFamily: FontFamily };
      pushHistory();
      setDaisyTheme(daisyTheme);
      applyThemePreview(daisyTheme);
    } catch {
      // ignore
    } finally {
      setIsSuggestingTheme(false);
    }
  }

  async function handleSuggestFont() {
    if (!page || isSuggestingFont) return;
    setIsSuggestingFont(true);
    try {
      const res = await fetch('/api/suggest-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, currentTheme: page.theme.daisyTheme, currentFont: page.theme.fontFamily, target: 'font' }),
      });
      if (!res.ok) return;
      const { fontFamily } = await res.json() as { daisyTheme: DaisyTheme; fontFamily: FontFamily };
      pushHistory();
      setFontFamily(fontFamily);
      applyFontPreview(fontFamily);
    } catch {
      // ignore
    } finally {
      setIsSuggestingFont(false);
    }
  }

  // Hover-preview refs
  const themeBeforeOpenRef = useRef<string | null>(null);
  const themeSelectedRef = useRef(false);
  const fontBeforeOpenRef = useRef<string | null>(null);
  const fontSelectedRef = useRef(false);

  const applyThemePreview = (theme: string) => {
    if (canvasRef?.current) canvasRef.current.dataset.theme = theme;
  };

  const applyFontPreview = (font: string) => {
    if (canvasRef?.current) canvasRef.current.style.fontFamily = `'${font}', sans-serif`;
  };

  const isPublished = !!(publishedSlug && slugDraft === publishedSlug);

  return (
    <>
      <div className="h-11 border-b border-gray-200 bg-white flex items-center gap-1 px-3 flex-shrink-0 z-20 min-w-0">

        {/* Undo / Redo */}
        {page && (
          <>
            <TopBtn onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
              <UndoIcon />
            </TopBtn>
            <TopBtn onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
              <RedoIcon />
            </TopBtn>
            <Divider />
          </>
        )}

        {/* Style popover — theme + font */}
        {page && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="h-8 px-2.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center gap-1.5 flex-shrink-0">
                <Paintbrush className="w-3.5 h-3.5" />
                Style
                <ChevronDown className="w-3 h-3 opacity-40" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-4">
              <div className="space-y-4">
                {/* Theme */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Theme</div>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={page.theme.daisyTheme}
                      onOpenChange={(open) => {
                        if (open) {
                          themeBeforeOpenRef.current = page.theme.daisyTheme;
                          themeSelectedRef.current = false;
                        } else if (!themeSelectedRef.current && themeBeforeOpenRef.current) {
                          applyThemePreview(themeBeforeOpenRef.current);
                        }
                      }}
                      onValueChange={(v) => {
                        themeSelectedRef.current = true;
                        pushHistory();
                        setDaisyTheme(v as DaisyTheme);
                        applyThemePreview(v);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        onMouseLeave={() => {
                          if (themeBeforeOpenRef.current) applyThemePreview(themeBeforeOpenRef.current);
                        }}
                      >
                        {DAISY_THEMES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize text-xs" onMouseEnter={() => applyThemePreview(t)}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={handleSuggestTheme}
                      disabled={isSuggestingTheme}
                      title="Suggest a theme"
                      className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors flex-shrink-0"
                    >
                      <Wand2 className={`w-3.5 h-3.5${isSuggestingTheme ? ' animate-pulse' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Font */}
                <div>
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Font</div>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={page.theme.fontFamily}
                      onOpenChange={(open) => {
                        if (open) {
                          fontBeforeOpenRef.current = page.theme.fontFamily;
                          fontSelectedRef.current = false;
                        } else if (!fontSelectedRef.current && fontBeforeOpenRef.current) {
                          applyFontPreview(fontBeforeOpenRef.current);
                        }
                      }}
                      onValueChange={(v) => {
                        fontSelectedRef.current = true;
                        pushHistory();
                        setFontFamily(v as FontFamily);
                        applyFontPreview(v);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        onMouseLeave={() => {
                          if (fontBeforeOpenRef.current) applyFontPreview(fontBeforeOpenRef.current);
                        }}
                      >
                        {FONT_FAMILIES.map((f) => (
                          <SelectItem key={f} value={f} className="text-xs" onMouseEnter={() => applyFontPreview(f)}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      onClick={handleSuggestFont}
                      disabled={isSuggestingFont}
                      title="Suggest a font"
                      className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors flex-shrink-0"
                    >
                      <Wand2 className={`w-3.5 h-3.5${isSuggestingFont ? ' animate-pulse' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}


        {/* App name — flex-1 center */}
        <div className="flex-1 flex items-center justify-center px-2 min-w-0">
          {(page || appName) && (
            editingName ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') { setNameValue(appName); setEditingName(false); }
                }}
                className="text-sm font-semibold text-gray-800 bg-transparent border-b border-gray-300 outline-none text-center w-40 xl:w-56"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                title="Click to rename"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors max-w-[160px] xl:max-w-[240px] truncate"
              >
                {appName || 'Untitled'}
              </button>
            )
          )}
        </div>

        {/* Right-side actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TopBtn onClick={() => setOpenModal('load')} title="Load a saved page">
            <FolderOpen className="w-3.5 h-3.5" />
            Load
          </TopBtn>

          {page && (
            <>
              <TopBtn onClick={() => setOpenModal('save')} title="Save current page">
                <Save className="w-3.5 h-3.5" />
                Save
              </TopBtn>
              <TopBtn onClick={() => setOpenModal('export')} title="Export as HTML">
                <Download className="w-3.5 h-3.5" />
                Export
              </TopBtn>
              <Divider />

              {/* Publish area */}
              <div className="flex items-center flex-shrink-0">
                {/* Main publish / published button */}
                {isPublished ? (
                  <a
                    href={publishedUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 rounded-l text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 border border-r-0 border-emerald-200"
                    title="Open published site"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Published ✓
                  </a>
                ) : (
                  <button
                    onClick={() => publishedSlug ? handlePublish() : setShowFirstPublishModal(true)}
                    disabled={isPublishing || !page}
                    className="h-8 px-2.5 rounded-l text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 border border-r-0 border-gray-900"
                    title={publishedSlug ? 'Publish to new URL' : 'Publish to a live URL'}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {isPublishing ? 'Publishing…' : 'Publish'}
                  </button>
                )}

                {/* Settings popover (slug, lock, copy, update) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      title="Publish settings"
                      className={[
                        'h-8 w-7 flex items-center justify-center rounded-r border transition-colors flex-shrink-0',
                        isPublished
                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-600',
                      ].join(' ')}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-4">
                    <div className="space-y-4">

                      {/* Visibility */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-medium text-gray-700">Visibility</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {publishedPrivate ? 'Only accessible via link' : 'Anyone with the link can view'}
                          </div>
                        </div>
                        <button
                          onClick={() => setPublishedPrivate(!publishedPrivate)}
                          title={publishedPrivate ? 'Make public' : 'Make private'}
                          className="h-8 w-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors flex-shrink-0"
                        >
                          {publishedPrivate
                            ? <Lock className="w-4 h-4" />
                            : <Unlock className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* URL slug */}
                      <div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">URL path</div>
                        <div className="flex items-center h-8 border border-gray-200 rounded overflow-hidden text-xs">
                          <span className="px-2 text-gray-400 border-r border-gray-200 bg-gray-50 select-none whitespace-nowrap">/p/</span>
                          <input
                            value={slugDraft}
                            onChange={(e) => setSlugDraft(sanitizeSlug(e.target.value))}
                            onBlur={(e) => {
                              const clean = e.target.value.replace(/^-|-$/g, '') || slugifyName(appName);
                              setSlugDraft(clean);
                            }}
                            className="px-2 flex-1 outline-none text-gray-700 bg-white"
                            placeholder="my-app"
                            spellCheck={false}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      {isPublished ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleCopy}
                            className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Copy link'}
                          </button>
                          <button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
                          >
                            {isPublishing ? 'Updating…' : 'Update'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => publishedSlug ? handlePublish() : setShowFirstPublishModal(true)}
                          disabled={isPublishing || !page}
                          className="w-full h-8 flex items-center justify-center gap-1.5 rounded bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {isPublishing ? 'Publishing…' : publishedSlug ? 'Publish to new URL' : 'Publish'}
                        </button>
                      )}

                      {/* Unpublish */}
                      {publishedSlug && (
                        <button
                          onClick={handleUnpublish}
                          disabled={isUnpublishing}
                          className="w-full h-8 flex items-center justify-center rounded border border-red-200 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                        >
                          {isUnpublishing ? 'Unpublishing…' : 'Unpublish'}
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Divider />
              <TopBtn onClick={clearPage} title="Start a new page">
                <FilePlus className="w-3.5 h-3.5" />
                New app
              </TopBtn>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <SaveModal open={openModal === 'save'} onOpenChange={(v) => setOpenModal(v ? 'save' : null)} />
      <LoadModal open={openModal === 'load'} onOpenChange={(v) => setOpenModal(v ? 'load' : null)} />
      <ExportModal open={openModal === 'export'} onOpenChange={(v) => setOpenModal(v ? 'export' : null)} />

      {/* First-publish modal */}
      <Dialog open={showFirstPublishModal} onOpenChange={setShowFirstPublishModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Publish your site</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">URL path</label>
              <div className="flex items-center h-9 border border-gray-200 rounded overflow-hidden text-sm mt-1.5">
                <span className="px-2.5 text-gray-400 border-r border-gray-200 bg-gray-50 select-none whitespace-nowrap text-xs">/p/</span>
                <input
                  autoFocus
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(sanitizeSlug(e.target.value))}
                  onBlur={(e) => {
                    const clean = e.target.value.replace(/^-|-$/g, '') || slugifyName(appName);
                    setSlugDraft(clean);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { setShowFirstPublishModal(false); handlePublish(); }
                  }}
                  className="px-2.5 flex-1 outline-none text-gray-700 bg-white"
                  placeholder="my-app"
                  spellCheck={false}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Your site will be live at <span className="font-mono">/p/{slugDraft || 'my-app'}</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPublishedPrivate(!publishedPrivate)}
                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                {publishedPrivate
                  ? <Lock className="w-3.5 h-3.5" />
                  : <Unlock className="w-3.5 h-3.5" />}
                {publishedPrivate ? 'Private link' : 'Public'}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFirstPublishModal(false)}
                  className="h-8 px-3 rounded text-xs text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowFirstPublishModal(false); handlePublish(); }}
                  disabled={isPublishing}
                  className="h-8 px-4 rounded bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {isPublishing ? 'Publishing…' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
