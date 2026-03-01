'use client';

import { useTransition } from 'react';
import { updateConsultant, deleteConsultant } from '@/lib/actions/consultants';
import type { ConsultantRow } from '@/lib/db/schema';

export function ProfileForm({ consultant }: { consultant: ConsultantRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => startTransition(() => updateConsultant(consultant.id, fd))}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Full name *</label>
          <input name="name" required defaultValue={consultant.name} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Headline</label>
          <input name="headline" defaultValue={consultant.headline ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Email</label>
          <input name="email" type="email" defaultValue={consultant.email ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Phone</label>
          <input name="phone" defaultValue={consultant.phone ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Location</label>
        <input name="location" defaultValue={consultant.location ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Professional summary</label>
        <textarea name="summary" rows={3} defaultValue={consultant.summary ?? ''} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete ${consultant.name}? This cannot be undone.`)) {
              startTransition(() => deleteConsultant(consultant.id));
            }
          }}
          className="text-xs text-destructive hover:underline"
        >
          Delete profile
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
