'use client';

import { useEffect, useState, useTransition } from 'react';
import { useEditorStore } from '@/lib/store/editorStore';
import { Canvas } from '@/components/editor/Canvas';
import { EditPanel } from '@/components/editor/EditPanel';
import { forkCVVersion, saveCVVersion, deleteCVVersion } from '@/lib/actions/cvVersions';
import { buildSinglePageHtml, downloadStandaloneHtml } from '@/lib/utils/storage';
import Link from 'next/link';
import {
  ArrowLeft, Download, GitBranch, Printer, Save, Trash2,
} from 'lucide-react';
import type { Component, Theme, PageState, PageEntry } from '@/types';

interface Props {
  id: string;
  components: Component[];
  theme: Theme;
  consultantName: string;
  opportunityLabel?: string;
  opportunityId?: string;
}

export function CVEditor({ id, components, theme, consultantName, opportunityLabel, opportunityId }: Props) {
  const setPage = useEditorStore((s) => s.setPage);
  const setProject = useEditorStore((s) => s.setProject);
  const page = useEditorStore((s) => s.page);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

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

  function handleExportPdf() {
    window.print();
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="Print / Export as PDF"
          >
            <Printer size={13} /> PDF
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
        {/* Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Canvas />
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

      {/* Print styles — hide editor chrome, show only the CV */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}
