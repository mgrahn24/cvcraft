'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Component, Theme } from '@/types';

function uid() {
  return crypto.randomUUID();
}

export async function createTemplate(data: {
  name: string;
  category: string;
  components: Component[];
  theme: Theme;
}) {
  const id = uid();
  await db.insert(cvTemplates).values({
    id,
    name: data.name,
    category: data.category,
    components: data.components,
    theme: data.theme,
    isBuiltIn: false,
  });
  revalidatePath('/templates');
  redirect(`/templates/${id}`);
}

export async function updateTemplate(
  id: string,
  data: {
    name: string;
    category: string;
    components: Component[];
    theme: Theme;
  }
) {
  await db
    .update(cvTemplates)
    .set({
      name: data.name,
      category: data.category,
      components: data.components,
      theme: data.theme,
    })
    .where(eq(cvTemplates.id, id));
  revalidatePath('/templates');
  revalidatePath(`/templates/${id}`);
  redirect(`/templates/${id}`);
}

export async function deleteTemplate(id: string) {
  await db.delete(cvTemplates).where(eq(cvTemplates.id, id));
  revalidatePath('/templates');
  redirect('/templates');
}
