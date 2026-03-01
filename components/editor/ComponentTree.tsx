'use client';

import React from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import {
  useEditorStore,
  selectSortedComponents,
  selectSelectedIds,
} from '@/lib/store/editorStore';
import { ComponentTreeItem, TYPE_ICONS } from './ComponentTreeItem';
import { canvasRebuild } from '@/lib/utils/canvasManager';

const SKELETON_WIDTHS = ['55%', '72%', '48%', '65%', '58%'];

function ComponentTreeSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="h-2.5 w-16 bg-gray-100 rounded animate-pulse" />
        <div className="h-2 w-10 bg-gray-100 rounded animate-pulse mt-1.5" />
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1">
        {SKELETON_WIDTHS.map((w, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg">
            <div className="w-4 h-4 bg-gray-100 rounded animate-pulse flex-shrink-0" />
            <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComponentTree() {
  const components = useEditorStore(selectSortedComponents);
  const selectedIds = useEditorStore(selectSelectedIds);
  const page = useEditorStore((s) => s.page);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const reorderComponents = useEditorStore((s) => s.reorderComponents);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !page || !canvasRef?.current) return;
    const ids = components.map((c) => c.id);
    const [moved] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, moved);
    reorderComponents(ids);
    // canvasRebuild is called via the Canvas useEffect watching page signature
    // but we also do it directly here for immediate feedback
    const reordered = ids.map((id, i) => {
      const c = page.components.find((comp) => comp.id === id)!;
      return { ...c, order: i };
    });
    canvasRebuild(canvasRef.current, reordered);
  };

  if (!page) {
    if (isGenerating) return <ComponentTreeSkeleton />;
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <p className="text-sm text-gray-400">No page yet.</p>
        <p className="text-xs text-gray-300 mt-1">Generate one using the right panel.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          Sections
        </p>
        <p className="text-xs text-gray-300 mt-0.5">{components.length} total</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="component-tree">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col gap-1"
              >
                {components.map((component, index) => (
                  <React.Fragment key={component.id}>
                    <ComponentTreeItem
                      component={component}
                      index={index}
                      isSelected={selectedIds.includes(component.id)}
                      onSelect={selectComponent}
                    />
                    {component.type === 'layout' && component.columns && (
                      <div className="ml-6 mb-1 flex flex-col gap-0.5">
                        {component.columns.flatMap((col) =>
                          col.map((child) => (
                            <div
                              key={child.id}
                              className={[
                                'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none border text-xs',
                                selectedIds.includes(child.id)
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'hover:bg-gray-50 text-gray-600 border-transparent',
                              ].join(' ')}
                              onClick={(e) => selectComponent(child.id, e.shiftKey)}
                            >
                              <span className="w-4 text-center text-gray-400 flex-shrink-0">
                                {TYPE_ICONS[child.type] ?? '⬡'}
                              </span>
                              <span className="flex-1 font-medium truncate">{child.label}</span>
                              <span className="text-gray-400 capitalize flex-shrink-0">{child.type}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
