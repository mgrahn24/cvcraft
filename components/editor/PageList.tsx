'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore, selectPageEntries, selectActivePageId } from '@/lib/store/editorStore';
import { useShallow } from 'zustand/react/shallow';

export function PageList() {
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

  const startRename = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
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

  if (pageEntries.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pages</span>
        <button
          onClick={() => setAddingPage(true)}
          className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Add page"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Page tabs */}
      <div className="px-2 pb-2 flex flex-col gap-0.5">
        {pageEntries.map((entry) => (
          <div
            key={entry.id}
            className={[
              'group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors',
              entry.id === activePageId
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-50 text-gray-600',
            ].join(' ')}
            onClick={() => {
              if (renamingId !== entry.id) switchPage(entry.id);
            }}
            onDoubleClick={() => startRename(entry.id, entry.name)}
          >
            {/* Page icon */}
            <svg
              className={`w-3.5 h-3.5 flex-shrink-0 ${entry.id === activePageId ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>

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
                className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 outline-none min-w-0"
              />
            ) : (
              <span className="flex-1 text-xs font-medium truncate">{entry.name}</span>
            )}

            {/* Delete button (hidden unless >1 page) */}
            {pageEntries.length > 1 && renamingId !== entry.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePage(entry.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                title="Remove page"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* Add new page inline input */}
        {addingPage && (
          <div className="flex items-center gap-1 px-2 py-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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
              className="flex-1 text-xs bg-white border border-blue-300 rounded px-1 py-0.5 outline-none min-w-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
