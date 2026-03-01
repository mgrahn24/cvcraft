'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { DAISY_THEMES, FONT_FAMILIES } from '@/types';
import type { Component, Theme, DaisyTheme, FontFamily } from '@/types';
import { createTemplate, updateTemplate } from '@/lib/actions/templates';

interface Section {
  id: string;
  label: string;
  html: string;
}

interface Props {
  templateId?: string; // undefined = new template
  initialName?: string;
  initialCategory?: string;
  initialTheme?: Theme;
  initialSections?: Section[];
}

const DEFAULT_THEME: Theme = { daisyTheme: 'light', fontFamily: 'Inter' };

export function TemplateForm({
  templateId,
  initialName = '',
  initialCategory = 'professional',
  initialTheme = DEFAULT_THEME,
  initialSections = [],
}: Props) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [daisyTheme, setDaisyTheme] = useState<DaisyTheme>(initialTheme.daisyTheme);
  const [fontFamily, setFontFamily] = useState<FontFamily>(initialTheme.fontFamily);
  const [sections, setSections] = useState<Section[]>(
    initialSections.length > 0 ? initialSections : [newSection()]
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set([sections[0]?.id]));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function newSection(): Section {
    return { id: `section-${crypto.randomUUID().slice(0, 8)}`, label: '', html: '' };
  }

  function addSection() {
    const s = newSection();
    setSections((prev) => [...prev, s]);
    setExpanded((prev) => new Set([...prev, s.id]));
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }

  function updateSection(id: string, patch: Partial<Section>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function save() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (sections.some((s) => !s.html.trim())) { setError('All sections need HTML content'); return; }
    setError('');

    const components: Component[] = sections.map((s, i) => ({
      id: s.id,
      type: 'custom' as const,
      label: s.label || s.id,
      html: s.html,
      order: i,
    }));
    const theme: Theme = { daisyTheme: daisyTheme as Theme['daisyTheme'], fontFamily: fontFamily as Theme['fontFamily'] };

    startTransition(() => {
      if (templateId) {
        updateTemplate(templateId, { name, category, components, theme });
      } else {
        createTemplate({ name, category, components, theme });
      }
    });
  }

  const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name <span className="text-destructive">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Modern Minimal" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="professional" />
        </div>
      </div>

      {/* Theme */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">DaisyUI Theme</label>
          <select value={daisyTheme} onChange={(e) => setDaisyTheme(e.target.value as DaisyTheme)} className={inputClass}>
            {DAISY_THEMES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Font Family</label>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as FontFamily)} className={inputClass}>
            {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">HTML Sections</label>
          <span className="text-xs text-muted-foreground">Use Tailwind + DaisyUI classes. No &lt;html&gt;/&lt;body&gt; tags.</span>
        </div>
        <div className="space-y-2">
          {sections.map((s, idx) => (
            <div key={s.id} className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => toggleExpanded(s.id)}
              >
                {expanded.has(s.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                <input
                  value={s.label}
                  onChange={(e) => { e.stopPropagation(); updateSection(s.id, { label: e.target.value }); }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Section label (e.g. Header)"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSection(s.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-auto"
                  disabled={sections.length === 1}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {expanded.has(s.id) && (
                <div className="border-t border-border p-3 space-y-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Section ID (kebab-case)</label>
                    <input
                      value={s.id}
                      onChange={(e) => updateSection(s.id, { id: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="cv-header"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">HTML</label>
                    <textarea
                      value={s.html}
                      onChange={(e) => updateSection(s.id, { html: e.target.value })}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                      placeholder={'<div class="p-6 bg-base-100">\n  <h1 class="text-3xl font-bold">{{name}}</h1>\n</div>'}
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSection}
          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus size={12} /> Add section
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={save}
        disabled={isPending}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isPending ? 'Saving…' : templateId ? 'Save changes' : 'Create template'}
      </button>
    </div>
  );
}
