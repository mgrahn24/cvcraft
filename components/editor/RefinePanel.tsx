'use client';

import { useState } from 'react';
import { useEditorStore, selectSortedComponents } from '@/lib/store/editorStore';
import { useStreamUpdate } from '@/lib/hooks/useStreamUpdate';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AddSectionDialog } from './AddSectionDialog';

export function RefinePanel() {
  const [instruction, setInstruction] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const page = useEditorStore((s) => s.page);
  const isUpdating = useEditorStore((s) => s.isUpdating);
  const components = useEditorStore(selectSortedComponents);
  const siteComponents = useEditorStore((s) => s.siteComponents);

  const { submitUpdate, isLoading, stop, error } = useStreamUpdate('/api/refine');

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

  if (!page) return null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 xl:px-5 xl:py-4 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs text-gray-700 uppercase tracking-wider font-semibold">
          Refine page
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Changes to the whole page
        </p>
      </div>

      <div className="flex-1 p-4 xl:p-5 flex flex-col gap-5">
        {/* Whole-page text prompt */}
        <div className="flex flex-col gap-2">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRefine();
            }}
            placeholder="e.g. Make the copy more energetic, add social proof, or improve the hero section's visual impact…"
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

        {/* Add section */}
        <div className="border-t border-gray-100 pt-4">
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
