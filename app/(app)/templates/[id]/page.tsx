export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import type { Component, Theme } from '@/types';

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [template] = await db.select().from(cvTemplates).where(eq(cvTemplates.id, id));
  if (!template) notFound();

  const components = template.components as Component[];
  const theme = (template.theme as Theme | null) ?? { daisyTheme: 'light', fontFamily: 'Inter' };
  const allHtml = components.map((c) => c.html).join('\n');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/templates" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={13} /> Templates
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{template.name}</h1>
        <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">{template.category}</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-white" data-theme={theme.daisyTheme}>
        <div dangerouslySetInnerHTML={{ __html: allHtml }} />
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Theme: <strong>{theme.daisyTheme}</strong> · Font: <strong>{theme.fontFamily}</strong>
      </p>
    </div>
  );
}
