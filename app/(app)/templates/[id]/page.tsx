export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { Component, Theme } from '@/types';
import { DeleteTemplateButton } from './DeleteTemplateButton';

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
        <div>
          <h1 className="text-2xl font-semibold">{template.name}</h1>
          <span className="text-xs text-muted-foreground capitalize">{template.category}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/template-editor/${id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-muted/40 transition-colors"
          >
            <Pencil size={13} /> Edit
          </Link>
          <DeleteTemplateButton id={id} isBuiltIn={template.isBuiltIn} />
        </div>
      </div>

      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.fontFamily).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`}
      />
      <div
        className="rounded-lg border border-border overflow-hidden bg-base-100"
        data-theme={theme.daisyTheme}
        style={{ fontFamily: `'${theme.fontFamily}', sans-serif` }}
      >
        <div dangerouslySetInnerHTML={{ __html: allHtml }} />
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Theme: <strong>{theme.daisyTheme}</strong> · Font: <strong>{theme.fontFamily}</strong>
        {template.isBuiltIn && <span className="ml-2 bg-muted px-1.5 py-0.5 rounded">Built-in</span>}
      </p>
    </div>
  );
}
