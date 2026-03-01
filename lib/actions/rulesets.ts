'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { rulesets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function uid() { return crypto.randomUUID(); }

export async function createRuleset(formData: FormData) {
  const name = (formData.get('name') as string).trim();
  const rulesText = (formData.get('rules') as string).trim();
  const rules = rulesText.split('\n').map((r) => r.trim()).filter(Boolean);
  if (!name) throw new Error('Name is required');

  await db.insert(rulesets).values({ id: uid(), name, rules });
  revalidatePath('/rulesets');
}

export async function updateRuleset(id: string, formData: FormData) {
  const name = (formData.get('name') as string).trim();
  const rulesText = (formData.get('rules') as string).trim();
  const rules = rulesText.split('\n').map((r) => r.trim()).filter(Boolean);

  await db.update(rulesets).set({ name, rules }).where(eq(rulesets.id, id));
  revalidatePath('/rulesets');
}

export async function deleteRuleset(id: string) {
  await db.delete(rulesets).where(eq(rulesets.id, id));
  revalidatePath('/rulesets');
}
