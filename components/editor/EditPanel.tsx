'use client';

import { useEditorStore } from '@/lib/store/editorStore';
import { ComponentEditPanel } from './ComponentEditPanel';
import { RefinePanel } from './RefinePanel';

export function EditPanel() {
  const page = useEditorStore((s) => s.page);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const selectedIds = useEditorStore((s) => s.selectedComponentIds);

  if (!page) {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center blitz-fade-in">
          <div className="flex flex-col gap-3 items-center">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-2.5 bg-gray-100 rounded-full animate-pulse"
                style={{ width: `${72 - i * 12}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Sections appear as they stream in</p>
        </div>
      );
    }
    return null;
  }

  if (selectedIds.length > 0) {
    return <ComponentEditPanel />;
  }

  return (
    <div className="h-full">
      <RefinePanel />
    </div>
  );
}
