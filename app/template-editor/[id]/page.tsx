export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Component, Theme } from '@/types';
import { TemplateEditor } from './TemplateEditor';

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [template] = await db.select().from(cvTemplates).where(eq(cvTemplates.id, id));
  if (!template) notFound();

  const components = template.components as Component[];
  const theme = (template.theme as Theme | null) ?? { daisyTheme: 'light', fontFamily: 'Inter' };

  return (
    <TemplateEditor
      id={id}
      name={template.name}
      components={components}
      theme={theme}
    />
  );
}
