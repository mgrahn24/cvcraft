'use client';

import { Draggable } from '@hello-pangea/dnd';
import type { Component } from '@/types';

export const TYPE_ICONS: Record<string, string> = {
  navbar: '≡',
  hero: '★',
  features: '◈',
  content: '¶',
  pricing: '$',
  testimonials: '"',
  cta: '▶',
  contact: '@',
  footer: '⊥',
  layout: '⊞',
  custom: '⬡',
};

interface Props {
  component: Component;
  index: number;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
}

export function ComponentTreeItem({ component, index, isSelected, onSelect }: Props) {
  return (
    <Draggable draggableId={component.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={[
            'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer select-none',
            'transition-colors duration-100 border',
            isSelected
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'hover:bg-gray-50 text-gray-700 border-transparent',
            snapshot.isDragging ? 'shadow-lg bg-white border-gray-200' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={(e) => onSelect(component.id, e.shiftKey)}
        >
          {/* Drag handle */}
          <span
            {...provided.dragHandleProps}
            className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing text-sm flex-shrink-0"
            title="Drag to reorder"
          >
            ⠿
          </span>

          {/* Type icon */}
          <span className="w-4 text-center text-gray-400 text-sm flex-shrink-0">
            {TYPE_ICONS[component.type] ?? '⬡'}
          </span>

          {/* Label */}
          <span className="flex-1 text-sm font-medium truncate">{component.label}</span>

          {/* Type badge */}
          <span className="text-xs text-gray-400 capitalize flex-shrink-0">
            {component.type}
          </span>
        </div>
      )}
    </Draggable>
  );
}
