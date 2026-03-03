'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteTemplate } from '@/lib/actions/templates';
import { Button } from '@/components/ui/button';

export function DeleteTemplateButton({ id, isBuiltIn, compact }: { id: string; isBuiltIn: boolean; compact?: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isBuiltIn) {
      if (!confirm('This is a built-in template. Delete it permanently?')) return;
    } else {
      if (!confirm('Delete this template?')) return;
    }
    startTransition(() => deleteTemplate(id));
  }

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={handleDelete}
        disabled={isPending}
        className="text-muted-foreground hover:text-destructive"
        title="Delete template"
      >
        <Trash2 size={13} />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 size={13} /> {isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
