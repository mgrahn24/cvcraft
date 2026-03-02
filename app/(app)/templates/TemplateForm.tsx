'use client';

import { useState, useTransition } from 'react';
import { Wand2, Link, CheckCircle } from 'lucide-react';
import { DAISY_THEMES, FONT_FAMILIES } from '@/types';
import type { Component, Theme, DaisyTheme, FontFamily } from '@/types';
import { createTemplate, updateTemplate } from '@/lib/actions/templates';
import { Button } from '@/components/ui/button';

interface Section {
  id: string;
  label: string;
  html: string;
}

interface Props {
  templateId?: string;
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
  const [sections, setSections] = useState<Section[]>(initialSections);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // AI generation
  const [genDescription, setGenDescription] = useState('');
  const [genBrandUrl, setGenBrandUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [extractedBrand, setExtractedBrand] = useState<string | null>(null);

  async function generateFromAI() {
    if (!genDescription.trim()) return;
    setIsGenerating(true);
    setGenError('');
    setExtractedBrand(null);
    try {
      const res = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: genDescription, brandUrl: genBrandUrl || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as {
        components: Array<{ id: string; label: string; html: string }>;
        daisyTheme: string;
        fontFamily: string;
        brandContext?: string;
      };
      setSections(data.components.map((c) => ({ id: c.id, label: c.label, html: c.html })));
      setDaisyTheme(data.daisyTheme as DaisyTheme);
      setFontFamily(data.fontFamily as FontFamily);
      if (data.brandContext) setExtractedBrand(data.brandContext);
    } catch (e) {
      setGenError(String(e));
    } finally {
      setIsGenerating(false);
    }
  }

  function save() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (sections.length === 0) { setError('Generate a template first'); return; }
    setError('');

    const components: Component[] = sections.map((s, i) => ({
      id: s.id,
      type: 'custom' as const,
      label: s.label || s.id,
      html: s.html,
      order: i,
    }));
    const theme: Theme = { daisyTheme, fontFamily };

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
      {/* AI Generator */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Style description <span className="text-destructive">*</span>
          </label>
          <textarea
            value={genDescription}
            onChange={(e) => setGenDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="e.g. Clean single-column with a navy accent header, classic consulting style, serif font"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            <span className="inline-flex items-center gap-1.5"><Link size={13} /> Brand URL <span className="text-muted-foreground font-normal">(optional)</span></span>
          </label>
          <input
            type="url"
            value={genBrandUrl}
            onChange={(e) => setGenBrandUrl(e.target.value)}
            className={inputClass}
            placeholder="https://example.com — colours, fonts, and brand tone will be extracted"
          />
        </div>

        {genError && <p className="text-sm text-destructive">{genError}</p>}

        <Button
          type="button"
          onClick={generateFromAI}
          disabled={isGenerating || !genDescription.trim()}
        >
          <Wand2 size={14} />
          {isGenerating
            ? (genBrandUrl ? 'Extracting brand & generating…' : 'Generating template…')
            : (sections.length > 0 ? 'Regenerate template' : 'Generate template')}
        </Button>
      </div>

      {/* Brand context */}
      {extractedBrand && (
        <div className="rounded-md bg-muted/40 border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Brand context extracted from URL:</p>
          <pre className="text-xs whitespace-pre-wrap leading-relaxed">{extractedBrand}</pre>
        </div>
      )}

      {/* Generated sections summary */}
      {sections.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <CheckCircle size={15} className="text-success" />
            {sections.length} sections generated
          </p>
          <ul className="space-y-1">
            {sections.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs w-4 text-right shrink-0">{i + 1}.</span>
                <span>{s.label || s.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Template metadata — only shown once sections exist */}
      {sections.length > 0 && (
        <>
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={save} disabled={isPending}>
            {isPending ? 'Saving…' : templateId ? 'Save changes' : 'Create template'}
          </Button>
        </>
      )}
    </div>
  );
}
