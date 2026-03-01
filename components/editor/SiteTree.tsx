'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, type DropResult } from '@hello-pangea/dnd';
import {
  useEditorStore,
  selectSortedComponents,
  selectSelectedIds,
  selectPageEntries,
  selectActivePageId,
} from '@/lib/store/editorStore';
import { useShallow } from 'zustand/react/shallow';
import { ComponentTreeItem, TYPE_ICONS } from './ComponentTreeItem';
import { canvasRebuild } from '@/lib/utils/canvasManager';

const SKELETON_WIDTHS = ['55%', '72%', '48%', '65%', '58%'];

function Skeleton() {
  return (
    <div className="flex flex-col gap-1 px-2 pt-1">
      {SKELETON_WIDTHS.map((w, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <div className="w-3.5 h-3.5 bg-gray-100 rounded animate-pulse flex-shrink-0" />
          <div className="h-2.5 bg-gray-100 rounded animate-pulse" style={{ width: w }} />
        </div>
      ))}
    </div>
  );
}

function PageIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-blue-500' : 'text-gray-400'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function SiteTree() {
  const components = useEditorStore(selectSortedComponents);
  const selectedIds = useEditorStore(selectSelectedIds);
  const page = useEditorStore((s) => s.page);
  const isGenerating = useEditorStore((s) => s.isGenerating);
  const canvasRef = useEditorStore((s) => s.canvasRef);
  const containerRef = useEditorStore((s) => s.containerRef);
  const selectComponent = useEditorStore((s) => s.selectComponent);
  const reorderComponents = useEditorStore((s) => s.reorderComponents);
  const siteComponents = useEditorStore((s) => s.siteComponents);
  const removeComponent = useEditorStore((s) => s.removeComponent);

  const pageEntries = useEditorStore(useShallow(selectPageEntries));
  const activePageId = useEditorStore(selectActivePageId);
  const switchPage = useEditorStore((s) => s.switchPage);
  const addPage = useEditorStore((s) => s.addPage);
  const removePage = useEditorStore((s) => s.removePage);
  const renamePageEntry = useEditorStore((s) => s.renamePageEntry);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [addingPage, setAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (addingPage && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingPage]);

  const startRename = useCallback((id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  }, []);

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      renamePageEntry(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, renamePageEntry]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
  }, []);

  const commitAdd = useCallback(() => {
    const name = newPageName.trim() || 'New Page';
    addPage(name);
    setAddingPage(false);
    setNewPageName('');
  }, [newPageName, addPage]);

  const cancelAdd = useCallback(() => {
    setAddingPage(false);
    setNewPageName('');
  }, []);

  const handleSelectAndScroll = useCallback(
    (id: string, multi: boolean) => {
      selectComponent(id, multi);
      requestAnimationFrame(() => {
        const canvas = canvasRef?.current;
        const container = containerRef?.current;
        if (!canvas || !container) return;
        const el = canvas.querySelector(`[data-component-id="${id}"]`) as HTMLElement | null;
        if (!el) return;
        const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
        container.scrollTo({ top: Math.max(0, elTop - 24), behavior: 'smooth' });
      });
    },
    [selectComponent, canvasRef, containerRef]
  );

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !page || !canvasRef?.current) return;
    const ids = components.map((c) => c.id);
    const [moved] = ids.splice(result.source.index, 1);
    ids.splice(result.destination.index, 0, moved);
    reorderComponents(ids);
    const reordered = ids.map((id, i) => {
      const c = page.components.find((comp) => comp.id === id)!;
      return { ...c, order: i };
    });
    canvasRebuild(canvasRef.current, reordered, siteComponents);
  };

  const multiPage = pageEntries.length > 1;

  // Pre-generation empty state
  if (pageEntries.length === 0) {
    if (isGenerating) return <Skeleton />;
    return null;
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto">

        {/* Site-wide components (navbar/footer) */}
        {siteComponents.length > 0 && (
          <div className="pb-1">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wider">Site</span>
            </div>
            <div className="flex flex-col gap-0.5 pl-5 pr-2">
              {siteComponents.map((sc) => (
                <div
                  key={sc.id}
                  className={[
                    'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none border text-xs transition-colors duration-100',
                    selectedIds.includes(sc.id)
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-500 border-transparent',
                  ].join(' ')}
                  onClick={(e) => handleSelectAndScroll(sc.id, e.shiftKey)}
                >
                  <span className="w-3.5 text-center text-gray-400 flex-shrink-0">
                    {TYPE_ICONS[sc.type] ?? '⬡'}
                  </span>
                  <span className="flex-1 font-medium truncate">{sc.label}</span>
                  <span className="text-gray-400 capitalize flex-shrink-0">{sc.type}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeComponent(sc.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                    title="Remove site component"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="mx-3 border-t border-gray-100 mt-1" />
          </div>
        )}

        {/* Page entries */}
        {pageEntries.map((entry) => {
          const isActive = entry.id === activePageId;
          const sectionCount = entry.content.components.length;

          return (
            <div key={entry.id}>
              {/* Page row */}
              <div
                className={[
                  'group flex items-center gap-1.5 px-3 py-2 cursor-pointer select-none transition-colors',
                  isActive
                    ? 'bg-gray-50 text-gray-900'
                    : 'hover:bg-gray-50 text-gray-500',
                ].join(' ')}
                onClick={() => {
                  if (renamingId !== entry.id && !isActive) switchPage(entry.id);
                }}
                onDoubleClick={() => startRename(entry.id, entry.name)}
              >
                {/* Expand chevron (decorative for active, clickable intent for inactive) */}
                <svg
                  className={`w-3 h-3 flex-shrink-0 transition-transform ${isActive ? 'rotate-90 text-gray-400' : 'text-gray-300'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>

                <PageIcon active={isActive} />

                {/* Name or rename input */}
                {renamingId === entry.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') cancelRename();
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs bg-white border border-blue-300 rounded px-1.5 py-0.5 outline-none min-w-0"
                  />
                ) : (
                  <span
                    className={`flex-1 text-xs font-medium truncate ${isActive ? 'text-gray-800' : 'text-gray-500'}`}
                  >
                    {entry.name}
                  </span>
                )}

                {/* Section count for inactive pages */}
                {!isActive && renamingId !== entry.id && (
                  <span className="text-[10px] text-gray-300 flex-shrink-0 tabular-nums">
                    {sectionCount}
                  </span>
                )}

                {/* Delete button */}
                {multiPage && renamingId !== entry.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePage(entry.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
                    title="Remove page"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Sections — only for active page */}
              {isActive && (
                <div className="pb-1">
                  {!page ? (
                    isGenerating ? <Skeleton /> : null
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="component-tree">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex flex-col gap-0.5 pl-5 pr-2"
                          >
                            {components.map((component, index) => (
                              <React.Fragment key={component.id}>
                                <ComponentTreeItem
                                  component={component}
                                  index={index}
                                  isSelected={selectedIds.includes(component.id)}
                                  onSelect={handleSelectAndScroll}
                                />
                                {component.type === 'layout' && component.columns && (
                                  <div className="ml-5 flex flex-col gap-0.5 mb-0.5">
                                    {component.columns.flatMap((col) =>
                                      col.map((child) => (
                                        <div
                                          key={child.id}
                                          className={[
                                            'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none border text-xs',
                                            selectedIds.includes(child.id)
                                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                                              : 'hover:bg-gray-50 text-gray-500 border-transparent',
                                          ].join(' ')}
                                          onClick={(e) => handleSelectAndScroll(child.id, e.shiftKey)}
                                        >
                                          <span className="w-3.5 text-center text-gray-400 flex-shrink-0">
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
                  )}
                </div>
              )}

              {/* Divider between pages */}
              {multiPage && <div className="mx-3 border-t border-gray-100" />}
            </div>
          );
        })}

        {/* Add page input */}
        {addingPage && (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <svg className="w-3 h-3 flex-shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <PageIcon active={false} />
            <input
              ref={addInputRef}
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd();
                if (e.key === 'Escape') cancelAdd();
                e.stopPropagation();
              }}
              placeholder="Page name"
              className="flex-1 text-xs bg-white border border-blue-300 rounded px-1.5 py-0.5 outline-none min-w-0"
            />
          </div>
        )}

        {/* Add page button */}
        {!addingPage && (
          <button
            onClick={() => setAddingPage(true)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add page</span>
          </button>
        )}
      </div>
    </div>
  );
}
