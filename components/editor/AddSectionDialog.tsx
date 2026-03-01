'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditorStore, selectSortedComponents } from '@/lib/store/editorStore';
import { canvasAddComponent } from '@/lib/utils/canvasManager';
import type { Component, ComponentType } from '@/types';
import { COMPONENT_TYPES } from '@/types';

// Layout type is excluded — it requires the generate endpoint (JSONL with columns),
// not the add endpoint which only returns plain html.
const ADDABLE_TYPES = COMPONENT_TYPES.filter((t) => t !== 'layout');

interface Props {
  open: boolean;
  onClose: () => void;
  /** If provided, new section is inserted after this component */
  afterId?: string;
}

export function AddSectionDialog({ open, onClose, afterId }: Props) {
  const [typeHint, setTypeHint] = useState<ComponentType>('content');
  const [description, setDescription] = useState('');

  const page = useEditorStore((s) => s.page);
  const components = useEditorStore(selectSortedComponents);
  const addComponent = useEditorStore((s) => s.addComponent);
  const isAdding = useEditorStore((s) => s.isAdding);
  const setIsAdding = useEditorStore((s) => s.setIsAdding);
  const canvasRef = useEditorStore((s) => s.canvasRef);

  const handleAdd = async () => {
    if (!page) return;
    setIsAdding(true);

    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: page.theme,
          typeHint,
          description,
          existingComponents: components,
          afterId,
        }),
      });

      const data = await res.json();

      // Determine order based on afterId
      let order = components.length;
      if (afterId) {
        const anchorIdx = components.findIndex((c) => c.id === afterId);
        if (anchorIdx !== -1) order = anchorIdx + 1;
      }

      const newComponent: Component = {
        id: data.id,
        type: data.type,
        label: data.label,
        html: data.html,
        order,
      };

      addComponent(newComponent);

      if (canvasRef?.current) {
        canvasAddComponent(canvasRef.current, newComponent, afterId);
      }

      setDescription('');
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add section</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="section-type">Section type</Label>
            <Select
              value={typeHint}
              onValueChange={(v) => setTypeHint(v as ComponentType)}
            >
              <SelectTrigger id="section-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDABLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="section-desc">Description (optional)</Label>
            <Textarea
              id="section-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A 3-column pricing table with Free, Pro, and Enterprise tiers"
              className="min-h-[80px] resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding || !page}>
            {isAdding ? 'Generating…' : 'Add section'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
