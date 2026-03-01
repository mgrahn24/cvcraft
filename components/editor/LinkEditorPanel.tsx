'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from '@/lib/store/editorStore';
import { useShallow } from 'zustand/react/shallow';
import type { Component } from '@/types';

interface LinkEditorPanelProps {
  href: string;
  newTab: boolean;
  x: number;
  y: number;
  onSave: (href: string, newTab: boolean) => void;
  onClose: () => void;
}

interface SectionOption {
  href: string;   // "#section-id" (current page) or "#page-slug~section-id" (other page)
  label: string;
}

interface PageGroup {
  pageId: string;
  pageName: string;
  pageSlug: string;
  isCurrentPage: boolean;
  sections: SectionOption[];
}

const PANEL_W = 320;
const PANEL_H = 195;

const SKIP_TAGS_LINK = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'LABEL', 'A']);

function classifyHref(href: string): 'internal' | 'external' {
  if (!href || href.startsWith('#')) return 'internal';
  return 'external';
}

function findNaturalId(el: Element): string | null {
  const id = el.getAttribute('id');
  if (id && !SKIP_TAGS_LINK.has(el.tagName)) return id;
  for (const child of Array.from(el.children)) {
    const found = findNaturalId(child);
    if (found) return found;
  }
  return null;
}

/** Parse sections from stored component HTML (for non-current pages — no live DOM needed). */
function extractSectionsFromComponents(components: Component[], pageSlug: string): SectionOption[] {
  const seen = new Set<string>();
  const sections: SectionOption[] = [];
  const sorted = [...components].sort((a, b) => a.order - b.order);
  for (const c of sorted) {
    const div = document.createElement('div');
    div.innerHTML = c.html;
    const root = div.firstElementChild;
    const naturalId = root ? findNaturalId(root) : null;
    const anchorId = naturalId ?? c.id;
    if (seen.has(anchorId)) continue;
    seen.add(anchorId);
    const heading = div.querySelector('h1, h2, h3, h4, h5, h6');
    const label = heading?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) || `#${anchorId}`;
    // Cross-page section: #page-slug~section-id
    sections.push({ href: `#${pageSlug}~${anchorId}`, label });
  }
  return sections;
}

export function LinkEditorPanel({ href, newTab, x, y, onSave, onClose }: LinkEditorPanelProps) {
  const activePageId = useEditorStore((s) => s.activePageId);
  const pageEntries = useEditorStore(useShallow((s) => s.pageEntries));

  const [tab, setTab] = useState<'internal' | 'external'>(() => classifyHref(href));

  const originalHrefRef = useRef(href);
  const firstPageHref = pageEntries[0] ? `#${pageEntries[0].slug}` : '';
  const [selectedHref, setSelectedHref] = useState(() =>
    href.startsWith('#') ? href : firstPageHref
  );

  // External URL + new-tab flag
  const [url, setUrl] = useState(tab === 'external' ? href : '');
  const [openNewTab, setOpenNewTab] = useState(newTab);

  // Per-page groups (built after mount — needs DOM for current page, createElement for others)
  const [pageGroups, setPageGroups] = useState<PageGroup[]>([]);

  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Build page groups: current page from live DOM, other pages from stored HTML
  useEffect(() => {
    if (!mounted) return;

    const groups: PageGroup[] = [];

    for (const entry of pageEntries) {
      const isCurrentPage = entry.id === activePageId;

      if (isCurrentPage) {
        // Scan live canvas DOM for current page sections
        const wrappers = document.querySelectorAll('[data-component-id]');
        const seen = new Set<string>();
        const sections: SectionOption[] = [];
        wrappers.forEach((wrapper) => {
          const componentId = (wrapper as HTMLElement).dataset.componentId!;
          const root = wrapper.firstElementChild;
          const naturalId = root ? findNaturalId(root) : null;
          const anchorId = naturalId ?? componentId;
          if (!anchorId || seen.has(anchorId)) return;
          seen.add(anchorId);
          const heading = wrapper.querySelector('h1, h2, h3, h4, h5, h6');
          const label = heading?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) || `#${anchorId}`;
          sections.push({ href: `#${anchorId}`, label });
        });
        groups.push({ pageId: entry.id, pageName: entry.name, pageSlug: entry.slug, isCurrentPage, sections });
      } else {
        // Parse stored component HTML for other pages
        const sections = extractSectionsFromComponents(entry.content.components, entry.slug);
        groups.push({ pageId: entry.id, pageName: entry.name, pageSlug: entry.slug, isCurrentPage, sections });
      }
    }

    setPageGroups(groups);

    // Restore original href if it's a valid option
    const orig = originalHrefRef.current;
    if (orig.startsWith('#')) {
      const allHrefs = new Set<string>();
      groups.forEach((g) => {
        allHrefs.add(`#${g.pageSlug}`);
        g.sections.forEach((s) => allHrefs.add(s.href));
      });
      if (allHrefs.has(orig)) {
        setSelectedHref(orig);
      } else if (!allHrefs.has(selectedHref) && firstPageHref) {
        setSelectedHref(firstPageHref);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, pageEntries, activePageId]);

  useEffect(() => {
    if (mounted && tab === 'external') inputRef.current?.focus();
  }, [mounted, tab]);

  // Ref-pattern to avoid stale closures in keyboard handler
  const saveRef = useRef<() => void>(() => {});
  saveRef.current = () => {
    if (tab === 'internal') {
      if (selectedHref) onSave(selectedHref, false);
    } else {
      onSave(url, openNewTab);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter') { e.preventDefault(); saveRef.current(); }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.max(8, Math.min(x, vw - PANEL_W - 8));
  const top = y + PANEL_H + 8 > vh ? Math.max(8, y - PANEL_H - 4) : y + 4;

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[300] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      style={{ left, top, width: PANEL_W }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5 flex-shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Edit Link</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); onClose(); }}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        <button
          onMouseDown={(e) => { e.preventDefault(); setTab('internal'); }}
          className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${tab === 'internal' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Internal
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setTab('external'); }}
          className={`flex-1 py-1.5 text-[11px] font-semibold transition-colors ${tab === 'external' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          External
        </button>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2.5">
        {tab === 'internal' ? (
          pageGroups.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-1">No pages available</p>
          ) : (
            <select
              value={selectedHref}
              onChange={(e) => setSelectedHref(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            >
              {pageGroups.map((pg) => (
                <optgroup key={pg.pageId} label={pg.isCurrentPage ? `${pg.pageName} (current)` : pg.pageName}>
                  {/* Link to the page itself */}
                  <option value={`#${pg.pageSlug}`}>↑ {pg.pageName}</option>
                  {/* Sections within this page */}
                  {pg.sections.map((s) => (
                    <option key={s.href} value={s.href}>↳ {s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )
        ) : (
          <>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono"
            />
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 select-none">
              <input
                type="checkbox"
                checked={openNewTab}
                onChange={(e) => setOpenNewTab(e.target.checked)}
                className="rounded border-gray-300 accent-blue-500"
              />
              Open in new tab
            </label>
          </>
        )}
        <button
          onMouseDown={(e) => { e.preventDefault(); saveRef.current(); }}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Save
        </button>
      </div>
    </div>,
    document.body,
  );
}
