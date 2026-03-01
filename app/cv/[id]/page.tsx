export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { cvVersions, consultants, opportunities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Component, Theme } from '@/types';
import { CVEditor } from './CVEditor';

export default async function CVEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cv] = await db.select().from(cvVersions).where(eq(cvVersions.id, id));
  if (!cv) notFound();

  const [[consultant], [opportunity]] = await Promise.all([
    db.select({ name: consultants.name }).from(consultants).where(eq(consultants.id, cv.consultantId)),
    cv.opportunityId
      ? db.select({ roleTitle: opportunities.roleTitle, clientName: opportunities.clientName })
          .from(opportunities)
          .where(eq(opportunities.id, cv.opportunityId))
      : Promise.resolve([null]),
  ]);

  return (
    <CVEditor
      id={id}
      components={cv.components as Component[]}
      theme={cv.theme as Theme}
      consultantName={consultant?.name ?? 'Unknown'}
      opportunityLabel={
        opportunity
          ? `${opportunity.roleTitle} — ${opportunity.clientName}`
          : undefined
      }
      opportunityId={cv.opportunityId ?? undefined}
    />
  );
}
