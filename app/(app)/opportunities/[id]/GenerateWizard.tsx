'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight } from 'lucide-react';

interface Props {
  opportunityId: string;
  consultants: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  guidance: { consultantId: string; guidance: string }[];
}

export function GenerateWizard({ opportunityId, consultants, templates, guidance }: Props) {
  const router = useRouter();
  const [consultantId, setConsultantId] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [consultantGuidance, setConsultantGuidance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill guidance from DB when consultant changes
  function handleConsultantChange(id: string) {
    setConsultantId(id);
    const existing = guidance.find((g) => g.consultantId === id);
    setConsultantGuidance(existing?.guidance ?? '');
  }

  async function generate() {
    if (!consultantId || !templateId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId,
          consultantId,
          templateId,
          consultantGuidance: consultantGuidance.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      router.push(`/cv/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setLoading(false);
    }
  }

  if (consultants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No profiles yet.{' '}
        <a href="/profiles/new" className="text-primary hover:underline">Add a profile</a> first.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1">Consultant *</label>
        <select
          value={consultantId}
          onChange={(e) => handleConsultantChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Select consultant…</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">Template *</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">
          Guidance for this consultant{' '}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          value={consultantGuidance}
          onChange={(e) => setConsultantGuidance(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="e.g. Emphasise their cloud architecture experience"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <button
        onClick={generate}
        disabled={loading || !consultantId || !templateId}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 size={14} className="animate-spin" /> Generating…</>
        ) : (
          <>Generate CV <ChevronRight size={14} /></>
        )}
      </button>
    </div>
  );
}
