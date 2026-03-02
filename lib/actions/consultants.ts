'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { consultants, profileSections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ProfileSectionType, ProfileEntry } from '@/types';

function uid() {
  return crypto.randomUUID();
}

export async function createConsultant(formData: FormData) {
  const name = (formData.get('name') as string).trim();
  if (!name) throw new Error('Name is required');

  const id = uid();
  await db.insert(consultants).values({
    id,
    name,
    headline: (formData.get('headline') as string | null) || undefined,
    email: (formData.get('email') as string | null) || undefined,
    phone: (formData.get('phone') as string | null) || undefined,
    location: (formData.get('location') as string | null) || undefined,
    summary: (formData.get('summary') as string | null) || undefined,
  });

  redirect(`/profiles/${id}`);
}

export async function updateConsultant(id: string, formData: FormData) {
  await db
    .update(consultants)
    .set({
      name: (formData.get('name') as string).trim(),
      headline: (formData.get('headline') as string | null) || undefined,
      email: (formData.get('email') as string | null) || undefined,
      phone: (formData.get('phone') as string | null) || undefined,
      location: (formData.get('location') as string | null) || undefined,
      summary: (formData.get('summary') as string | null) || undefined,
      photoUrl: (formData.get('photoUrl') as string | null) || undefined,
      updatedAt: new Date(),
    })
    .where(eq(consultants.id, id));

  revalidatePath(`/profiles/${id}`);
}

export async function deleteConsultant(id: string) {
  await db.delete(consultants).where(eq(consultants.id, id));
  redirect('/profiles');
}

export async function upsertProfileSection(
  consultantId: string,
  sectionId: string | null,
  type: ProfileSectionType,
  entries: ProfileEntry[],
  order: number
) {
  if (sectionId) {
    await db
      .update(profileSections)
      .set({ entries, order })
      .where(eq(profileSections.id, sectionId));
  } else {
    await db.insert(profileSections).values({
      id: uid(),
      consultantId,
      type,
      entries,
      order,
    });
  }
  revalidatePath(`/profiles/${consultantId}`);
}

export async function deleteProfileSection(consultantId: string, sectionId: string) {
  await db.delete(profileSections).where(eq(profileSections.id, sectionId));
  revalidatePath(`/profiles/${consultantId}`);
}

export async function createConsultantFromExtraction(data: {
  name: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  sections: Array<{
    type: ProfileSectionType;
    entries: ProfileEntry[];
  }>;
}) {
  const id = uid();
  await db.insert(consultants).values({
    id,
    name: data.name,
    headline: data.headline,
    email: data.email,
    phone: data.phone,
    location: data.location,
    summary: data.summary,
  });

  if (data.sections.length > 0) {
    await db.insert(profileSections).values(
      data.sections.map((s, i) => ({
        id: uid(),
        consultantId: id,
        type: s.type,
        entries: s.entries,
        order: i,
      }))
    );
  }

  return id;
}
