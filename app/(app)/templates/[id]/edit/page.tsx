export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import type { Component, Theme } from '@/types';
import { TemplateForm } from '../../TemplateForm';

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [template] = await db.select().from(cvTemplates).where(eq(cvTemplates.id, id));
  if (!template) notFound();

  const components = template.components as Component[];
  const theme = (template.theme as Theme | null) ?? { daisyTheme: 'light', fontFamily: 'Inter' };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/templates/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={13} /> {template.name}
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Edit Template</h1>
      {template.isBuiltIn && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-6">
          This is a built-in template. Your changes will overwrite it directly.
        </p>
      )}

      <TemplateForm
        templateId={id}
        initialName={template.name}
        initialCategory={template.category}
        initialTheme={theme}
        initialSections={components.map((c) => ({ id: c.id, label: c.label, html: c.html }))}
      />
    </div>
  );
}
