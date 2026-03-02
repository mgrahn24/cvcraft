'use client';

import { useEffect, useState, useTransition } from 'react';
import { useEditorStore } from '@/lib/store/editorStore';
import { Canvas } from '@/components/editor/Canvas';
import { EditPanel } from '@/components/editor/EditPanel';
import { saveTemplateComponents } from '@/lib/actions/templates';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import type { Component, Theme, PageState, PageEntry } from '@/types';
import { StylePopover } from '@/components/editor/StylePopover';

interface Props {
  id: string;
  name: string;
  components: Component[];
  theme: Theme;
}

export function TemplateEditor({ id, name, components, theme }: Props) {
  const setProject = useEditorStore((s) => s.setProject);
  const page = useEditorStore((s) => s.page);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const pageState: PageState = {
      title: name,
      description: 'CV Template',
      components,
      theme,
    };
    const entry: PageEntry = { id, name, slug: id, content: pageState };
    setProject([entry], id, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleSave() {
    if (!page) return;
    startTransition(async () => {
      await saveTemplateComponents(id, page.components, page.theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 h-12 bg-white border-b border-gray-200 flex items-center gap-3 px-4">
        <Link
          href={`/templates/${id}`}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors mr-1"
        >
          <ArrowLeft size={13} />
          Templates
        </Link>

        <div className="h-4 w-px bg-gray-200" />

        <span className="flex-1 text-sm font-semibold text-gray-800 truncate">{name}</span>

        <StylePopover />
        <div className="h-4 w-px bg-gray-200" />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Save template"
        >
          <Save size={13} />
          {saved ? 'Saved!' : 'Save'}
        </button>
      </header>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden bg-gray-100">
        {/* Canvas — A4-width constrained for WYSIWYG PDF fidelity */}
        <main className="flex-1 overflow-auto bg-gray-100 flex flex-col items-center py-6 min-w-0">
          <div className="shadow-2xl ring-1 ring-black/5 bg-white flex-shrink-0" style={{ width: '210mm', minHeight: '297mm' }}>
            <Canvas />
          </div>
        </main>

        <aside
          className="flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden"
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
