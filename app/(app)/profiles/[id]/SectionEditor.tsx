'use client';

import { useState, useTransition } from 'react';
import { upsertProfileSection, deleteProfileSection } from '@/lib/actions/consultants';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { ProfileSectionType, ProfileEntry } from '@/types';
import type { ProfileSectionRow } from '@/lib/db/schema';

interface Props {
  consultantId: string;
  section: ProfileSectionRow | null;
  type: ProfileSectionType;
  label: string;
  Icon: React.ElementType;
}

function emptyEntry(): ProfileEntry {
  return { id: crypto.randomUUID() };
}

export function SectionEditor({ consultantId, section, type, label, Icon }: Props) {
  const [open, setOpen] = useState(!!section);
  const [entries, setEntries] = useState<ProfileEntry[]>(
    section?.entries?.length ? (section.entries as ProfileEntry[]) : []
  );
  const [isPending, startTransition] = useTransition();

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function updateEntry(idx: number, patch: Partial<ProfileEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function save() {
    startTransition(() =>
      upsertProfileSection(consultantId, section?.id ?? null, type, entries, section?.order ?? 0)
    );
  }

  function deleteSection() {
    if (!section) return;
    if (!confirm(`Delete ${label} section?`)) return;
    startTransition(() => deleteProfileSection(consultantId, section.id));
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Icon size={14} className="text-muted-foreground" />
        {label}
        {section && (
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground">No entries yet. Add one below.</p>
          )}

          {entries.map((entry, idx) => (
            <EntryFields
              key={entry.id}
              entry={entry}
              type={type}
              onChange={(patch) => updateEntry(idx, patch)}
              onRemove={() => removeEntry(idx)}
            />
          ))}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus size={12} /> Add entry
            </button>
            <div className="flex items-center gap-3">
              {section && (
                <button
                  type="button"
                  onClick={deleteSection}
                  className="text-xs text-destructive hover:underline flex items-center gap-0.5"
                >
                  <Trash2 size={11} /> Delete section
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EntryFields({
  entry,
  type,
  onChange,
  onRemove,
}: {
  entry: ProfileEntry;
  type: ProfileSectionType;
  onChange: (patch: Partial<ProfileEntry>) => void;
  onRemove: () => void;
}) {
  const f = (name: keyof ProfileEntry) => (
    <input
      value={(entry[name] as string) ?? ''}
      onChange={(e) => onChange({ [name]: e.target.value })}
      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
    />
  );

  return (
    <div className="rounded-md border border-border p-3 space-y-2.5 relative">
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 size={13} />
      </button>

      {type === 'skills' ? (
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Skills (comma-separated)</label>
          <input
            value={entry.skills?.join(', ') ?? ''}
            onChange={(e) =>
              onChange({ skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
            }
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="TypeScript, React, Node.js, …"
          />
        </div>
      ) : type === 'languages' ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Language</label>
            {f('title')}
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Level</label>
            {f('level')}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Title / Role</label>
              {f('title')}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {type === 'education' ? 'Institution' : 'Organisation'}
              </label>
              {f('organisation')}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Start</label>
              {f('startDate')}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">End</label>
              {f('endDate')}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Location</label>
              {f('location')}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Description</label>
            <textarea
              value={entry.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </>
      )}
    </div>
  );
}
