'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useEditorStore, selectCanUndo, selectCanRedo } from '@/lib/store/editorStore';
import { Canvas } from '@/components/editor/Canvas';
import { EditPanel } from '@/components/editor/EditPanel';
import { forkCVVersion, saveCVVersion, deleteCVVersion } from '@/lib/actions/cvVersions';
import { downloadStandaloneHtml } from '@/lib/utils/storage';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Download, GitBranch, Loader2, Redo2, Save, Trash2, Undo2,
} from 'lucide-react';
import type { Component, Theme, PageState, PageEntry } from '@/types';
import { StylePopover } from '@/components/editor/StylePopover';

interface Props {
  id: string;
  components: Component[];
  theme: Theme;
  consultantName: string;
  opportunityLabel?: string;
  opportunityId?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintableCvHtml(title: string, page: PageState): string {
  const sorted = [...page.components].sort((a, b) => a.order - b.order);
  const fontParam = encodeURIComponent(page.theme.fontFamily).replace(/%20/g, '+');
  const body = sorted
    .map((c) => `<section id="${escapeHtml(c.id)}" data-component-id="${escapeHtml(c.id)}">${c.html}</section>`)
    .join('\n');

  return `<!doctype html>
<html lang="en" data-theme="${escapeHtml(page.theme.daisyTheme)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <base href="${escapeHtml(window.location.origin)}/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css" rel="stylesheet" type="text/css" />
  <script>
    tailwind={config:{corePlugins:{preflight:false},theme:{extend:{colors:{
      'base-100':'oklch(var(--b1) / <alpha-value>)',
      'base-200':'oklch(var(--b2) / <alpha-value>)',
      'base-300':'oklch(var(--b3) / <alpha-value>)',
      'base-content':'oklch(var(--bc) / <alpha-value>)',
      'primary':'oklch(var(--p) / <alpha-value>)',
      'primary-content':'oklch(var(--pc) / <alpha-value>)',
      'secondary':'oklch(var(--s) / <alpha-value>)',
      'secondary-content':'oklch(var(--sc) / <alpha-value>)',
      'accent':'oklch(var(--a) / <alpha-value>)',
      'accent-content':'oklch(var(--ac) / <alpha-value>)',
      'neutral':'oklch(var(--n) / <alpha-value>)',
      'neutral-content':'oklch(var(--nc) / <alpha-value>)'
    }}}}};
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: var(--fallback-b1, oklch(var(--b1) / 1));
      color: var(--fallback-bc, oklch(var(--bc) / 1));
    }
    *,
    *::before,
    *::after {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: '${escapeHtml(page.theme.fontFamily)}', sans-serif;
    }
    #cv-print-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background-color: var(--fallback-b1, oklch(var(--b1) / 1));
      overflow: hidden;
    }
    @media print {
      body {
        padding: 0;
        background-color: var(--fallback-b1, oklch(var(--b1) / 1)) !important;
        color: var(--fallback-bc, oklch(var(--bc) / 1)) !important;
      }
      #cv-print-page {
        background-color: var(--fallback-b1, oklch(var(--b1) / 1)) !important;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <main id="cv-print-page">
    ${body}
  </main>
  <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
  <script>
    async function printWhenReady() {
      if (window.lucide) window.lucide.createIcons();
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch {}
      }
      await new Promise((r) => setTimeout(r, 250));
      window.focus();
      window.print();
    }
    function notifyDone() {
      try {
        if (window.opener && window.opener !== window) {
          window.opener.postMessage({ type: 'cv-print-done' }, window.location.origin);
        }
      } catch {}
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'cv-print-done' }, window.location.origin);
        }
      } catch {}
      try { window.close(); } catch {}
    }
    window.addEventListener('load', printWhenReady);
    window.addEventListener('afterprint', notifyDone);
  </script>
</body>
</html>`;
}

export function CVEditor({ id, components, theme, consultantName, opportunityLabel, opportunityId }: Props) {
  const setProject = useEditorStore((s) => s.setProject);
  const page = useEditorStore((s) => s.page);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  // Load CV into editor store on mount
  useEffect(() => {
    const pageState: PageState = {
      title: `${consultantName} CV`,
      description: opportunityLabel ?? '',
      components,
      theme,
    };
    const entry: PageEntry = {
      id,
      name: `${consultantName} CV`,
      slug: id,
      content: pageState,
    };
    setProject([entry], id, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSave() {
    if (!page) return;
    startTransition(async () => {
      await saveCVVersion(id, page.components, page.theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  async function handleExportPdf() {
    if (!page) return;
    setIsExporting(true);
    try {
      const html = buildPrintableCvHtml(`${consultantName} CV`, page);

      // Preferred path: popup print window (best isolation)
      const printWin = window.open('about:blank', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        return;
      }

      // Fallback path for strict popup blockers: print from hidden iframe in-page.
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        iframe.remove();
      };

      const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return;
        if ((ev.data as { type?: string } | null)?.type !== 'cv-print-done') return;
        cleanup();
      };

      window.addEventListener('message', onMessage);
      document.body.appendChild(iframe);
      iframe.srcdoc = html;
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportHtml() {
    if (!page) return;
    const entry: PageEntry = { id, name: `${consultantName} CV`, slug: id, content: page };
    downloadStandaloneHtml([entry], id, page, []);
  }

  function handleFork() {
    startTransition(() => forkCVVersion(id));
  }

  function handleDelete() {
    if (!confirm('Delete this CV version? This cannot be undone.')) return;
    startTransition(() => deleteCVVersion(id, opportunityId ? `/opportunities/${opportunityId}` : '/cv'));
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors mr-1"
        >
          <ArrowLeft size={13} />
          Back
        </button>

        <div className="h-4 w-px bg-gray-200" />

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800 truncate">{consultantName}</span>
          {opportunityLabel && (
            <span className="text-xs text-gray-400 ml-2 truncate hidden sm:inline">{opportunityLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={13} />
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <StylePopover />
          <div className="h-4 w-px bg-gray-200" />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Save changes to database"
          >
            <Save size={13} />
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={handleFork}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Fork this CV version"
          >
            <GitBranch size={13} /> Fork
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Export as PDF"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {isExporting ? 'Exporting…' : 'PDF'}
          </button>
          <button
            onClick={handleExportHtml}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="Download standalone HTML"
          >
            <Download size={13} /> HTML
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            title="Delete this CV"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </header>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden bg-gray-100">
        {/* Canvas — A4-width constrained for WYSIWYG PDF fidelity */}
        <main className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center py-6 min-w-0">
          <div ref={canvasWrapperRef} className="shadow-2xl ring-1 ring-black/5 bg-white flex-shrink-0" style={{ width: '210mm', minHeight: '297mm' }}>
            <Canvas />
          </div>
        </main>

        {/* Right panel */}
        <aside
          className="flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden transition-all duration-200 print:hidden"
          style={{ width: 'clamp(240px, 23vw, 380px)' }}
        >
          <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Edit / Refine</span>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <EditPanel refineEndpoint="/api/refine-cv" />
          </div>
        </aside>
      </div>

    </div>
  );
}
