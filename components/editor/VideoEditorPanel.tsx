'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ── URL conversion helpers ─────────────────────────────────────────────────────

/** Convert an embed URL back to a human-readable watch URL for the input field */
function toDisplayUrl(embedSrc: string): string {
  const ytMatch = embedSrc.match(/youtube(?:-nocookie)?\.com\/embed\/([^?/]+)/);
  if (ytMatch) return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
  const vimeoMatch = embedSrc.match(/player\.vimeo\.com\/video\/(\d+)/);
  if (vimeoMatch) return `https://vimeo.com/${vimeoMatch[1]}`;
  return embedSrc;
}

/** Convert a YouTube/Vimeo watch URL to the correct embed src */
export function toEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  // youtube.com/watch?v= or youtu.be/
  const ytWatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
  // Already a YouTube embed
  if (/youtube(?:-nocookie)?\.com\/embed\//.test(trimmed)) return trimmed;
  // vimeo.com/ID
  const vimeo = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  // Already a Vimeo embed
  if (/player\.vimeo\.com\/video\//.test(trimmed)) return trimmed;
  // Return as-is (could be another valid embed URL)
  return trimmed;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface VideoEditorPanelProps {
  src: string;
  x: number;
  y: number;
  onSave: (embedSrc: string) => void;
  onClose: () => void;
}

const PANEL_W = 320;
const PANEL_H = 130;

export function VideoEditorPanel({ src, x, y, onSave, onClose }: VideoEditorPanelProps) {
  const [url, setUrl] = useState(() => toDisplayUrl(src));
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) inputRef.current?.focus(); }, [mounted]);

  const handleSave = () => {
    const embed = toEmbedUrl(url);
    if (embed) onSave(embed);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, url]);

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
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Video URL</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); onClose(); }}
          className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono"
        />
        <p className="text-[10px] text-gray-400">Paste a YouTube or Vimeo URL</p>
        <button
          onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
        >
          Save
        </button>
      </div>
    </div>,
    document.body,
  );
}
