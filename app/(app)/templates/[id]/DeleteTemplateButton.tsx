'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteTemplate } from '@/lib/actions/templates';

export function DeleteTemplateButton({ id, isBuiltIn }: { id: string; isBuiltIn: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (isBuiltIn) {
      if (!confirm('This is a built-in template. Delete it permanently?')) return;
    } else {
      if (!confirm('Delete this template?')) return;
    }
    startTransition(() => deleteTemplate(id));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50"
    >
      <Trash2 size={13} /> {isPending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
