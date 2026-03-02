'use client';

import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import { useEditorStore, selectSortedComponents } from '@/lib/store/editorStore';
import { useStreamUpdate } from '@/lib/hooks/useStreamUpdate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AddSectionDialog } from './AddSectionDialog';
import { DAISY_THEMES, FONT_FAMILIES } from '@/types';
import type { DaisyTheme, FontFamily } from '@/types';

export function RefinePanel({ endpoint = '/api/refine' }: { endpoint?: string }) {
  const [instruction, setInstruction] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [shuffling, setShuffling] = useState(false);

  const page = useEditorStore((s) => s.page);
  const isUpdating = useEditorStore((s) => s.isUpdating);
  const components = useEditorStore(selectSortedComponents);
  const siteComponents = useEditorStore((s) => s.siteComponents);
  const setTheme = useEditorStore((s) => s.setTheme);

  const { submitUpdate, isLoading, stop, error } = useStreamUpdate(endpoint);

  const handleRefine = () => {
    if (!page || !instruction.trim()) return;
    submitUpdate({
      components,
      theme: page.theme,
      instruction,
      ...(siteComponents.length > 0 ? { siteComponents } : {}),
    });
    setInstruction('');
  };

  async function shuffleAppearance(target: 'theme' | 'font') {
    if (!page || shuffling) return;
    setShuffling(true);
    try {
      const res = await fetch('/api/suggest-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: page.title ?? 'CV',
          currentTheme: page.theme.daisyTheme,
          currentFont: page.theme.fontFamily,
          target,
        }),
      });
      if (!res.ok) return;
      const data = await res.json() as { daisyTheme?: string; fontFamily?: string };
      setTheme({
        daisyTheme: (data.daisyTheme ?? page.theme.daisyTheme) as DaisyTheme,
        fontFamily: (data.fontFamily ?? page.theme.fontFamily) as FontFamily,
      });
    } finally {
      setShuffling(false);
    }
  }

  if (!page) return null;

  const selectClass =
    'flex-1 text-xs rounded border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 text-gray-700';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 xl:px-5 xl:py-4 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs text-gray-700 uppercase tracking-wider font-semibold">
          Refine CV
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Changes to the whole document
        </p>
      </div>

      <div className="flex-1 p-4 xl:p-5 flex flex-col gap-5">
        {/* Whole-CV refinement */}
        <div className="flex flex-col gap-2">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRefine();
            }}
            placeholder="e.g. Make the summary more concise, strengthen the experience bullets, or improve the skills section layout…"
            className="min-h-[100px] xl:min-h-[130px] resize-none text-sm xl:text-base"
            disabled={isLoading || isUpdating}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleRefine}
              disabled={isLoading || isUpdating || !instruction.trim()}
              className="flex-1"
              size="sm"
            >
              {isLoading || isUpdating ? 'Refining…' : 'Apply →'}
            </Button>
            {(isLoading || isUpdating) && (
              <Button variant="outline" size="sm" onClick={stop}>
                Stop
              </Button>
            )}
          </div>
          {error && !isLoading && !isUpdating && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Appearance — theme + font */}
        <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Appearance
          </p>

          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Theme</label>
            <div className="flex items-center gap-1.5">
              <select
                value={page.theme.daisyTheme}
                onChange={(e) =>
                  setTheme({ daisyTheme: e.target.value as DaisyTheme, fontFamily: page.theme.fontFamily })
                }
                className={selectClass}
              >
                {DAISY_THEMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={() => shuffleAppearance('theme')}
                disabled={shuffling}
                title="Suggest a different theme"
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 transition-colors"
              >
                <Shuffle size={12} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Font</label>
            <div className="flex items-center gap-1.5">
              <select
                value={page.theme.fontFamily}
                onChange={(e) =>
                  setTheme({ daisyTheme: page.theme.daisyTheme, fontFamily: e.target.value as FontFamily })
                }
                className={selectClass}
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <button
                onClick={() => shuffleAppearance('font')}
                disabled={shuffling}
                title="Suggest a different font"
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 transition-colors"
              >
                <Shuffle size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Add section */}
        <div className="border-t border-gray-100 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddDialog(true)}
          >
            + Add section
          </Button>
        </div>
      </div>

      <AddSectionDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  );
}
