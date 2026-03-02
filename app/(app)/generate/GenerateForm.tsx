'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  consultants: { id: string; name: string }[];
  opportunities: { id: string; roleTitle: string; clientName: string }[];
  templates: { id: string; name: string }[];
  defaultOpportunityId?: string;
}

export function GenerateForm({ consultants, opportunities, templates, defaultOpportunityId }: Props) {
  const router = useRouter();
  const [consultantId, setConsultantId] = useState('');
  const [opportunityId, setOpportunityId] = useState(defaultOpportunityId ?? '');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [guidance, setGuidance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = consultantId && opportunityId && templateId;

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId,
          opportunityId,
          templateId,
          consultantGuidance: guidance.trim() || undefined,
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

  const fieldClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

  if (consultants.length === 0 || opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
        {consultants.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No profiles yet.{' '}
            <a href="/profiles/new" className="text-primary hover:underline">Add a consultant profile</a> first.
          </p>
        )}
        {opportunities.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No opportunities yet.{' '}
            <a href="/opportunities/new" className="text-primary hover:underline">Create an opportunity</a> first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">Consultant <span className="text-destructive">*</span></label>
        <select
          value={consultantId}
          onChange={(e) => setConsultantId(e.target.value)}
          className={fieldClass}
        >
          <option value="">Select consultant…</option>
          {consultants.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Opportunity <span className="text-destructive">*</span></label>
        <select
          value={opportunityId}
          onChange={(e) => setOpportunityId(e.target.value)}
          className={fieldClass}
        >
          <option value="">Select opportunity…</option>
          {opportunities.map((o) => (
            <option key={o.id} value={o.id}>{o.roleTitle} — {o.clientName}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Template <span className="text-destructive">*</span></label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className={fieldClass}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Guidance <span className="text-muted-foreground font-normal text-xs">(optional)</span>
        </label>
        <textarea
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          rows={3}
          className={`${fieldClass} resize-none`}
          placeholder="e.g. Emphasise cloud architecture experience, keep it to one page, highlight leadership roles"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        onClick={generate}
        disabled={loading || !canGenerate}
        className="w-full"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Generating CV…</>
        ) : (
          <><Sparkles size={15} /> Generate CV</>
        )}
      </Button>

      {loading && (
        <p className="text-xs text-center text-muted-foreground">
          This takes 15–30 seconds. Please wait.
        </p>
      )}
    </div>
  );
}
