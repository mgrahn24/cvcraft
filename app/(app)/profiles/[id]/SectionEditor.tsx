'use client';

import { useState, useTransition } from 'react';
import { upsertProfileSection, deleteProfileSection } from '@/lib/actions/consultants';
import { ChevronDown, ChevronRight, Plus, Trash2, Briefcase, GraduationCap, Wrench, Award, FolderOpen, Globe, BookOpen } from 'lucide-react';
import type { ProfileSectionType, ProfileEntry } from '@/types';
import type { ProfileSectionRow } from '@/lib/db/schema';
import { Button } from '@/components/ui/button';

const SECTION_ICON: Record<ProfileSectionType, React.ElementType> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  certifications: Award,
  projects: FolderOpen,
  languages: Globe,
  publications: BookOpen,
};

interface Props {
  consultantId: string;
  section: ProfileSectionRow | null;
  type: ProfileSectionType;
  label: string;
}

function emptyEntry(): ProfileEntry {
  return { id: crypto.randomUUID() };
}

export function SectionEditor({ consultantId, section, type, label }: Props) {
  const Icon = SECTION_ICON[type];
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
            <Button type="button" variant="link" size="sm" className="px-0 gap-1" onClick={addEntry}>
              <Plus size={12} /> Add entry
            </Button>
            <div className="flex items-center gap-2">
              {section && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-destructive hover:text-destructive"
                  onClick={deleteSection}
                >
                  <Trash2 size={11} /> Delete section
                </Button>
              )}
              <Button type="button" size="xs" onClick={save} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save section'}
              </Button>
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
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute top-2 right-2 hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 size={13} />
      </Button>

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
