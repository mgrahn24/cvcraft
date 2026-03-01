'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function ImportCVForm() {
  const router = useRouter();
  const [cvText, setCvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!cvText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvText }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      router.push(`/profiles/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleImport} className="space-y-3">
      <textarea
        value={cvText}
        onChange={(e) => setCvText(e.target.value)}
        rows={8}
        placeholder="Paste the full CV text here — the LLM will extract the structured profile automatically."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !cvText.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Extracting...' : 'Import CV'}
        </button>
      </div>
    </form>
  );
}
