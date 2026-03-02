'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useEditorStore, selectCanUndo, selectCanRedo } from '@/lib/store/editorStore';
import { Canvas } from '@/components/editor/Canvas';
import { EditPanel } from '@/components/editor/EditPanel';
import { forkCVVersion, saveCVVersion, deleteCVVersion } from '@/lib/actions/cvVersions';
import { downloadStandaloneHtml } from '@/lib/utils/storage';
import Link from 'next/link';
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

export function CVEditor({ id, components, theme, consultantName, opportunityLabel, opportunityId }: Props) {
  const setProject = useEditorStore((s) => s.setProject);
  const page = useEditorStore((s) => s.page);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);
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
    if (!canvasWrapperRef.current) return;
    setIsExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const el = canvasWrapperRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (_clonedDoc, clonedEl) => {
          // DaisyUI v4 uses oklch() which html2canvas can't parse.
          // Inline browser-resolved (rgb) computed colors on every cloned element.
          const origNodes = [el, ...Array.from(el.querySelectorAll('*'))];
          const cloneNodes = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))];
          const props = [
            'color', 'background-color',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'outline-color', 'text-decoration-color', 'fill', 'stroke',
          ];
          origNodes.forEach((orig, i) => {
            const clone = cloneNodes[i] as HTMLElement;
            if (!clone?.style) return;
            const cs = window.getComputedStyle(orig);
            for (const prop of props) {
              const val = cs.getPropertyValue(prop);
              if (val) clone.style.setProperty(prop, val, 'important');
            }
          });
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;
      let y = 0;
      let remaining = imgH;
      let first = true;
      while (remaining > 0) {
        if (!first) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH);
        y += pageH;
        remaining -= pageH;
        first = false;
      }
      pdf.save(`${consultantName}-CV.pdf`);
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
        <Link
          href={opportunityId ? `/opportunities/${opportunityId}` : '/cv'}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors mr-1"
        >
          <ArrowLeft size={13} />
          {opportunityId ? 'Opportunity' : 'CVs'}
        </Link>

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
