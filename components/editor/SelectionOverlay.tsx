'use client';

import { useEditorStore } from '@/lib/store/editorStore';
import type { SelectionRect } from '@/types';

interface SelectionOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

function SelectionBorder({ rect, isUpdating }: { rect: SelectionRect; isUpdating: boolean }) {
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        // Expand 2 px on all sides so the border sits flush outside the component,
        // instead of using `outline` which gets clipped by overflow-y-auto
        top: rect.top - 2,
        left: rect.left - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        border: isUpdating ? '2px solid rgba(251,191,36,0.7)' : '2px solid #3B82F6',
      }}
    >
      {/* Frosted blur + shimmer sweep while updating */}
      {isUpdating ? (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backdropFilter: 'blur(2px)',
            backgroundColor: 'rgba(251, 191, 36, 0.05)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)',
              animation: 'blitz-shimmer 1.4s ease-in-out infinite',
            }}
          />
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(59, 130, 246, 0.06)' }}
        />
      )}

      {/* Label badge */}
      <div
        className="absolute -top-6 left-0 text-white text-xs px-2 py-0.5 rounded-t font-mono whitespace-nowrap flex items-center gap-1.5"
        style={{
          fontSize: '11px',
          backgroundColor: isUpdating ? '#F59E0B' : '#3B82F6',
        }}
      >
        {isUpdating && (
          <span className="inline-block w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        {rect.id}
      </div>
    </div>
  );
}

export function SelectionOverlay({ containerRef: _ }: SelectionOverlayProps) {
  const selectionRects = useEditorStore((s) => s.selectionRects);
  const selectedIds = useEditorStore((s) => s.selectedComponentIds);
  const isUpdating = useEditorStore((s) => s.isUpdating);

  if (selectedIds.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
      {selectionRects.map((rect) => (
        <SelectionBorder key={rect.id} rect={rect} isUpdating={isUpdating} />
      ))}
    </div>
  );
}
