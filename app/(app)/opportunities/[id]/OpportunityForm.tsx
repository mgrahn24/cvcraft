'use client';

import { useTransition } from 'react';
import { updateOpportunity, deleteOpportunity } from '@/lib/actions/opportunities';
import type { OpportunityRow } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';

export function OpportunityForm({ opportunity }: { opportunity: OpportunityRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form action={(fd) => startTransition(() => updateOpportunity(opportunity.id, fd))} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Client *</label>
          <input name="clientName" required defaultValue={opportunity.clientName} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Role *</label>
          <input name="roleTitle" required defaultValue={opportunity.roleTitle} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description *</label>
        <textarea name="description" required rows={4} defaultValue={opportunity.description} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Requirements</label>
        <textarea name="requirements" rows={3} defaultValue={opportunity.requirements ?? ''} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Deadline</label>
        <input name="deadline" type="date" defaultValue={opportunity.deadline ?? ''} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => { if (confirm('Delete this opportunity?')) startTransition(() => deleteOpportunity(opportunity.id)); }}
        >
          Delete
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
