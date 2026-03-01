'use client';

import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore, findInTree } from '@/lib/store/editorStore';
import { useStreamUpdate } from '@/lib/hooks/useStreamUpdate';
import { canvasRemoveComponent } from '@/lib/utils/canvasManager';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Component } from '@/types';

const PINNED_ACTIONS = ['Redesign this', 'Make it simpler', 'Make it more detailed'];

export function ComponentEditPanel() {
  const [instruction, setInstruction] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [usedPinned, setUsedPinned] = useState<Set<string>>(new Set());

  const page = useEditorStore((s) => s.page);
  const isUpdating = useEditorStore((s) => s.isUpdating);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const selectedComponents = useEditorStore(
    useShallow((s) => {
      if (s.selectedComponentIds.length === 0) return [];
      return s.selectedComponentIds
        .map((id) => {
          const inSite = findInTree(s.siteComponents, id);
          if (inSite) return inSite;
          if (!s.page) return null;
          return findInTree(s.page.components, id);
        })
        .filter(Boolean) as Component[];
    })
  );
  const selectedIds = useEditorStore((s) => s.selectedComponentIds);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const { submitUpdate, isLoading, stop, error } = useStreamUpdate('/api/update');

  const firstSelected = selectedComponents[0];
  const isMultiple = selectedIds.length > 1;
  const isLayoutContainer = firstSelected?.type === 'layout';
  const isBusy = isLoading || isUpdating;

  // Auto-fetch suggestions when a single component is selected
  useEffect(() => {
    if (!firstSelected || isMultiple || !page) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    const controller = new AbortController();
    setSuggestions([]);
    setSuggestLoading(true);

    fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component: firstSelected, theme: page.theme }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => { if (!controller.signal.aborted) setSuggestions(data.suggestions ?? []); })
      .catch(() => { if (!controller.signal.aborted) setSuggestions([]); })
      .finally(() => { if (!controller.signal.aborted) setSuggestLoading(false); });

    return () => controller.abort();
  }, [firstSelected?.id, isMultiple]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset used pinned actions when selection changes
  useEffect(() => { setUsedPinned(new Set()); }, [firstSelected?.id]);

  const handlePinned = (text: string) => {
    if (!page || selectedComponents.length === 0 || isBusy) return;
    setUsedPinned((prev) => new Set(prev).add(text));
    submitUpdate({ components: selectedComponents, theme: page.theme, instruction: text });
  };

  const handleSuggestion = (text: string) => {
    if (!page || selectedComponents.length === 0 || isBusy) return;
    setSuggestions((prev) => prev.filter((s) => s !== text));
    submitUpdate({ components: selectedComponents, theme: page.theme, instruction: text });
  };

  const handleUpdate = () => {
    if (!page || !instruction.trim() || selectedComponents.length === 0) return;
    submitUpdate({ components: selectedComponents, theme: page.theme, instruction });
    setInstruction('');
  };

  const handleRemove = () => {
    if (!canvasRef?.current) return;
    pushHistory();
    selectedIds.forEach((id) => {
      canvasRemoveComponent(canvasRef.current!, id);
      removeComponent(id);
    });
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 xl:px-5 xl:py-4 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs text-gray-700 uppercase tracking-wider font-semibold">
          {isMultiple ? `${selectedIds.length} sections selected` : 'Edit section'}
        </p>
        {firstSelected && !isMultiple && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {firstSelected.label}
            <span className="ml-1 opacity-75">· {firstSelected.type}</span>
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 xl:p-5 flex flex-col gap-5 min-h-0">

        {/* Quick actions — single selection only, not for layout containers */}
        {!isMultiple && !isLayoutContainer && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] xl:text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick actions
            </p>

            {/* Pinned actions — always shown */}
            <div className="flex flex-wrap gap-1.5">
              {PINNED_ACTIONS.filter((a) => !usedPinned.has(a)).map((a) => (
                <button
                  key={a}
                  onClick={() => handlePinned(a)}
                  disabled={isBusy}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {a}
                </button>
              ))}
            </div>

            {/* AI-generated suggestions */}
            {suggestLoading ? (
              <div className="flex flex-wrap gap-1.5">
                {[100, 130, 90, 115, 105, 85].map((w, i) => (
                  <div
                    key={i}
                    className="h-7 rounded-md bg-gray-100 animate-pulse flex-shrink-0"
                    style={{ width: w }}
                  />
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s)}
                    disabled={isBusy}
                    title={s}
                    className="px-2.5 py-1 text-xs rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Layout container message */}
        {isLayoutContainer && !isMultiple && (
          <p className="text-xs text-gray-400 text-center py-2">
            Select a child section to edit it, or delete the entire layout below.
          </p>
        )}

        {/* Custom edit — not for layout containers */}
        {!isLayoutContainer && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {isMultiple ? `Edit ${selectedIds.length} sections` : 'Custom edit'}
            </p>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleUpdate();
              }}
              placeholder={
                isMultiple
                  ? 'Describe changes to apply to all selected sections…'
                  : 'Describe a custom change…'
              }
              className="min-h-[80px] xl:min-h-[100px] resize-none text-sm xl:text-base"
              disabled={isBusy}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                disabled={isBusy || !instruction.trim()}
                className="flex-1"
                size="sm"
              >
                {isBusy ? 'Updating…' : 'Apply →'}
              </Button>
              {isBusy && (
                <Button variant="outline" size="sm" onClick={stop}>
                  Stop
                </Button>
              )}
            </div>
            {error && !isBusy && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        )}

        {/* Remove */}
        <div className="border-t border-gray-100 pt-1">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            className="w-full"
            disabled={isBusy}
          >
            {isMultiple ? `Remove ${selectedIds.length} sections` : 'Remove section'}
          </Button>
        </div>

      </div>
    </div>
  );
}
