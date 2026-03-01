'use server';

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { cvVersions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Component, Theme } from '@/types';

export async function forkCVVersion(id: string) {
  const [original] = await db.select().from(cvVersions).where(eq(cvVersions.id, id));
  if (!original) throw new Error('CV not found');

  const newId = crypto.randomUUID();
  await db.insert(cvVersions).values({
    id: newId,
    consultantId: original.consultantId,
    templateId: original.templateId,
    opportunityId: original.opportunityId,
    rulesetIds: original.rulesetIds,
    components: original.components,
    theme: original.theme,
    parentVersionId: id,
  });

  redirect(`/cv/${newId}`);
}

export async function saveCVVersion(id: string, components: Component[], theme: Theme) {
  await db.update(cvVersions)
    .set({ components, theme })
    .where(eq(cvVersions.id, id));
}

export async function deleteCVVersion(id: string, redirectTo?: string) {
  await db.delete(cvVersions).where(eq(cvVersions.id, id));
  redirect(redirectTo ?? '/cv');
}
