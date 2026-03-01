'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Curated groups (shown when no search query) ──────────────────────────────

const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: 'Navigation',
    icons: [
      'menu', 'x', 'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
      'chevron-right', 'chevron-left', 'chevron-up', 'chevron-down',
      'external-link', 'link',
    ],
  },
  {
    label: 'Actions',
    icons: [
      'plus', 'minus', 'search', 'settings', 'filter', 'refresh-cw',
      'download', 'upload', 'share-2', 'copy', 'edit', 'trash-2', 'check', 'send',
    ],
  },
  {
    label: 'Status',
    icons: [
      'check-circle', 'x-circle', 'alert-circle', 'alert-triangle',
      'info', 'help-circle', 'loader', 'zap',
    ],
  },
  {
    label: 'User / Auth',
    icons: [
      'user', 'users', 'user-plus', 'log-in', 'log-out',
      'lock', 'unlock', 'eye', 'eye-off', 'shield',
    ],
  },
  {
    label: 'Content',
    icons: [
      'image', 'video', 'file-text', 'folder', 'mail', 'phone',
      'map-pin', 'calendar', 'clock', 'globe', 'rss', 'bookmark', 'tag', 'bell',
    ],
  },
  {
    label: 'Commerce',
    icons: [
      'shopping-cart', 'shopping-bag', 'credit-card',
      'dollar-sign', 'package', 'receipt', 'percent',
    ],
  },
  {
    label: 'Data',
    icons: [
      'bar-chart-2', 'pie-chart', 'trending-up', 'trending-down', 'activity', 'layers',
    ],
  },
  {
    label: 'Social',
    icons: ['github', 'twitter', 'linkedin', 'instagram', 'facebook', 'youtube'],
  },
  {
    label: 'Tech',
    icons: ['code-2', 'terminal', 'database', 'server', 'cloud', 'wifi', 'cpu', 'monitor'],
  },
  {
    label: 'Misc',
    icons: [
      'star', 'heart', 'home', 'building-2', 'briefcase', 'graduation-cap',
      'rocket', 'gift', 'trophy', 'award', 'sun', 'moon', 'flag',
    ],
  },
];

const CURATED_ICONS = ICON_GROUPS.flatMap((g) => g.icons);

// Convert Lucide's PascalCase export names to the kebab-case used in data-lucide
function toKebab(pascal: string): string {
  return pascal.replace(/([A-Z])/g, (_, c, i) => (i > 0 ? '-' : '') + c.toLowerCase());
}

// Enumerate all icons exposed by the Lucide CDN window object.
// Each icon entry is an Array (SVG path data); functions/primitives are skipped.
function loadAllLucideIcons(): string[] {
  if (typeof window === 'undefined' || !window.lucide) return CURATED_ICONS;
  const lucideObj = window.lucide as Record<string, unknown>;
  const names: string[] = [];
  for (const [key, val] of Object.entries(lucideObj)) {
    if (Array.isArray(val)) names.push(toKebab(key));
  }
  return names.length > 0 ? names.sort() : CURATED_ICONS;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface IconPickerPanelProps {
  currentIcon: string;
  x: number;
  y: number;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function IconPickerPanel({ currentIcon, x, y, onSelect, onClose }: IconPickerPanelProps) {
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  // Full icon list loaded once on mount from the live Lucide CDN object
  const [allIcons, setAllIcons] = useState<string[]>(CURATED_ICONS);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setAllIcons(loadAllLucideIcons());
  }, []);

  // Auto-focus search input
  useEffect(() => {
    if (mounted) inputRef.current?.focus();
  }, [mounted]);

  // Re-run Lucide after every render so icon previews appear as SVGs
  useEffect(() => {
    if (mounted) (window.lucide as { createIcons?: () => void } | undefined)?.createIcons?.();
  });

  // Escape (capture phase — fires before Canvas's handler) + outside click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
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

  // Smart positioning: avoid viewport edges
  const PANEL_W = 296;
  const PANEL_H = 400;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.max(8, Math.min(x, vw - PANEL_W - 8));
  const top = y + PANEL_H + 8 > vh ? Math.max(8, y - PANEL_H - 4) : y + 4;

  const query = search.trim().toLowerCase();

  // When searching: scan the full icon set. When browsing: use curated groups.
  const searchResults = query ? allIcons.filter((n) => n.includes(query)) : null;

  if (!mounted) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[300] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      style={{ left, top, width: PANEL_W, height: PANEL_H }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-gray-100 px-3 py-2.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Change Icon
            {!query && (
              <span className="ml-1.5 font-normal normal-case text-gray-300">
                — {allIcons.length} available
              </span>
            )}
          </span>
          <button
            onMouseDown={(e) => { e.preventDefault(); onClose(); }}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <i data-lucide="x" className="w-3.5 h-3.5" />
          </button>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${allIcons.length} icons…`}
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {searchResults ? (
          // ── Search results: flat grid ──────────────────────────────────────
          <div className="p-2">
            {searchResults.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                No icons match &ldquo;{search}&rdquo;
              </p>
            ) : (
              <>
                <p className="mb-1.5 px-1 text-[10px] text-gray-400">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </p>
                <IconGrid icons={searchResults} current={currentIcon} onSelect={onSelect} />
              </>
            )}
          </div>
        ) : (
          // ── Browse: curated groups ─────────────────────────────────────────
          <div className="p-2 space-y-3">
            {ICON_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
                  {group.label}
                </p>
                <IconGrid icons={group.icons} current={currentIcon} onSelect={onSelect} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: current icon name */}
      <div className="flex-shrink-0 border-t border-gray-100 px-3 py-1.5">
        <span className="font-mono text-[11px] text-gray-400">{currentIcon}</span>
      </div>
    </div>,
    document.body,
  );
}

// ─── Icon grid sub-component ──────────────────────────────────────────────────

function IconGrid({
  icons,
  current,
  onSelect,
}: {
  icons: string[];
  current: string;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-0.5">
      {icons.map((name) => (
        <button
          key={name}
          title={name}
          onMouseDown={(e) => { e.preventDefault(); onSelect(name); }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-blue-50 hover:text-blue-600 ${
            name === current
              ? 'bg-blue-100 text-blue-600 ring-1 ring-inset ring-blue-400'
              : 'text-gray-600'
          }`}
        >
          <i data-lucide={name} className="pointer-events-none w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
