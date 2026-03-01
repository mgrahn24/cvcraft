'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { opportunities, consultantGuidance } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

function uid() { return crypto.randomUUID(); }

export async function createOpportunity(formData: FormData) {
  const clientName = (formData.get('clientName') as string).trim();
  const roleTitle = (formData.get('roleTitle') as string).trim();
  const description = (formData.get('description') as string).trim();
  if (!clientName || !roleTitle || !description) throw new Error('Required fields missing');

  const id = uid();
  await db.insert(opportunities).values({
    id,
    clientName,
    roleTitle,
    description,
    requirements: (formData.get('requirements') as string | null) || undefined,
    deadline: (formData.get('deadline') as string | null) || undefined,
  });

  redirect(`/opportunities/${id}`);
}

export async function updateOpportunity(id: string, formData: FormData) {
  await db.update(opportunities).set({
    clientName: (formData.get('clientName') as string).trim(),
    roleTitle: (formData.get('roleTitle') as string).trim(),
    description: (formData.get('description') as string).trim(),
    requirements: (formData.get('requirements') as string | null) || undefined,
    deadline: (formData.get('deadline') as string | null) || undefined,
  }).where(eq(opportunities.id, id));

  revalidatePath(`/opportunities/${id}`);
}

export async function deleteOpportunity(id: string) {
  await db.delete(opportunities).where(eq(opportunities.id, id));
  redirect('/opportunities');
}

export async function setConsultantGuidance(
  opportunityId: string,
  consultantId: string,
  guidance: string
) {
  const existing = await db.select()
    .from(consultantGuidance)
    .where(
      and(
        eq(consultantGuidance.opportunityId, opportunityId),
        eq(consultantGuidance.consultantId, consultantId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db.update(consultantGuidance)
      .set({ guidance })
      .where(
        and(
          eq(consultantGuidance.opportunityId, opportunityId),
          eq(consultantGuidance.consultantId, consultantId)
        )
      );
  } else {
    await db.insert(consultantGuidance).values({
      id: uid(),
      opportunityId,
      consultantId,
      guidance,
    });
  }

  revalidatePath(`/opportunities/${opportunityId}`);
}
