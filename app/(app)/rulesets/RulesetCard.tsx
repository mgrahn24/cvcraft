'use client';

import { useState, useTransition } from 'react';
import { updateRuleset, deleteRuleset } from '@/lib/actions/rulesets';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  ruleset: { id: string; name: string; rules: string[] };
}

export function RulesetCard({ ruleset }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="rounded-lg border border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{ruleset.name}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-xs" onClick={() => setEditing(true)}>
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete "${ruleset.name}"?`)) {
                  startTransition(() => deleteRuleset(ruleset.id));
                }
              }}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
        <ul className="space-y-0.5">
          {ruleset.rules.map((r, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">·</span>{r}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        startTransition(() => updateRuleset(ruleset.id, fd));
        setEditing(false);
      }}
      className="rounded-lg border border-primary/30 px-4 py-3 space-y-2"
    >
      <input name="name" defaultValue={ruleset.name} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
      <textarea name="rules" rows={4} defaultValue={ruleset.rules.join('\n')} className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono" />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
          <X size={12} /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          <Check size={12} /> Save
        </Button>
      </div>
    </form>
  );
}
