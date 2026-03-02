/**
 * Seed script — inserts built-in CV templates if they don't already exist.
 * Run with: npx tsx lib/db/seed.ts
 * Or call seedBuiltInTemplates() from the app on startup.
 */
import { db } from './index';
import { cvTemplates } from './schema';
import { BUILT_IN_TEMPLATES } from '../cv-templates';
import { inArray } from 'drizzle-orm';

let seeded = false;

export async function seedBuiltInTemplates() {
  if (seeded) return;
  seeded = true;

  const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
  const existing = await db.select({ id: cvTemplates.id })
    .from(cvTemplates)
    .where(inArray(cvTemplates.id, ids));

  const existingIds = new Set(existing.map((r) => r.id));
  const toInsert = BUILT_IN_TEMPLATES.filter((t) => !existingIds.has(t.id));

  if (toInsert.length === 0) return;

  await db.insert(cvTemplates).values(
    toInsert.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      components: t.components,
      isBuiltIn: true,
      theme: t.theme ?? null,
    }))
  );

  console.log(`Seeded ${toInsert.length} built-in template(s).`);
}

// Allow running directly
if (require.main === module) {
  seedBuiltInTemplates().then(() => process.exit(0)).catch(console.error);
}
