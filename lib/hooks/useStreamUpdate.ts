'use client';

import { useRef, useEffect, useState } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { useEditorStore } from '@/lib/store/editorStore';
import { updateSchema } from '@/lib/ai/schemas';
import { canvasUpdateComponent, canvasRemoveComponent } from '@/lib/utils/canvasManager';
import { restoreDataUrls } from '@/lib/utils/imageUtils';
import type { DaisyTheme, FontFamily } from '@/types';

/**
 * Shared streaming hook for both /api/update (selected components) and /api/refine (whole page).
 * Applies updates to the canvas and store as they stream in.
 */
export function useStreamUpdate(apiEndpoint: '/api/update' | '/api/refine') {
  const sentCountRef = useRef(0);
  const themeAppliedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Snapshot of component HTML taken at submit time, keyed by component id.
  // Used to restore user-uploaded images (data URLs) that were stripped from the prompt.
  const preSubmitHtmlRef = useRef<Map<string, string>>(new Map());

  const setIsUpdating = useEditorStore((s) => s.setIsUpdating);
  const updateComponentHtml = useEditorStore((s) => s.updateComponentHtml);
  const removeComponent = useEditorStore((s) => s.removeComponent);
  const setTheme = useEditorStore((s) => s.setTheme);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const page = useEditorStore((s) => s.page);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const { submit, isLoading, stop, object: partialObject } = useObject({
    api: apiEndpoint,
    schema: updateSchema,

    onFinish: ({ object }) => {
      // Apply removals at the end once the full response is available
      if (object?.removals) {
        for (const id of object.removals) {
          if (canvasRef?.current) canvasRemoveComponent(canvasRef.current, id);
          removeComponent(id);
        }
      }
      setIsUpdating(false);
      sentCountRef.current = 0;
      themeAppliedRef.current = false;
    },

    onError: () => {
      setIsUpdating(false);
      sentCountRef.current = 0;
      themeAppliedRef.current = false;
      setError('Update failed. Please try again.');
    },
  });

  // Apply streamed updates to canvas + store
  useEffect(() => {
    const updates = partialObject?.updates;

    // Apply theme change as soon as it arrives (themeChange is nullable — null means no change)
    if (!themeAppliedRef.current && partialObject?.themeChange != null && page?.theme) {
      const tc = partialObject.themeChange;
      // Only apply if at least one non-null field is present
      if (tc.daisyTheme != null || tc.fontFamily != null) {
        setTheme({
          daisyTheme: (tc.daisyTheme ?? page.theme.daisyTheme) as DaisyTheme,
          fontFamily: (tc.fontFamily ?? page.theme.fontFamily) as FontFamily,
        });
        themeAppliedRef.current = true;
      }
    }

    if (!updates) return;

    const boundary = isLoading ? updates.length - 1 : updates.length;

    for (let i = sentCountRef.current; i < boundary; i++) {
      const u = updates[i];
      if (!u?.id || !u?.html) continue;

      // Restore any user-uploaded images that were stripped from the prompt
      const originalHtml = preSubmitHtmlRef.current.get(u.id) ?? '';
      const html = restoreDataUrls(u.html, originalHtml);

      updateComponentHtml(u.id, html);

      if (canvasRef?.current) {
        canvasUpdateComponent(canvasRef.current, u.id, html);
      }

      sentCountRef.current = i + 1;
    }
  }, [partialObject, isLoading, updateComponentHtml, setTheme, canvasRef, page?.theme]);

  const submitUpdate = (body: Record<string, unknown>) => {
    setError(null);
    // Snapshot current HTML before the LLM changes anything, so we can
    // restore data URLs that were stripped from the prompt.
    const { page, siteComponents } = useEditorStore.getState();
    preSubmitHtmlRef.current = new Map([
      ...(page?.components ?? []).map((c): [string, string] => [c.id, c.html]),
      ...siteComponents.map((c): [string, string] => [c.id, c.html]),
    ]);
    // Save current state to history so the user can undo the AI change
    pushHistory();
    setIsUpdating(true);
    sentCountRef.current = 0;
    themeAppliedRef.current = false;
    submit(body);
  };

  return { submitUpdate, isLoading, stop, error };
}
