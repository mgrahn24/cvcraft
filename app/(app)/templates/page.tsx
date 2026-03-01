export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { seedBuiltInTemplates } from '@/lib/db/seed';
import { desc } from 'drizzle-orm';
import type { Component, Theme } from '@/types';

export default async function TemplatesPage() {
  await seedBuiltInTemplates();
  const templates = await db.select().from(cvTemplates).orderBy(desc(cvTemplates.isBuiltIn));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">CV Templates</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Choose a layout for generated CVs</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {templates.map((t) => {
          const theme = t.theme as Theme | null;
          const components = t.components as Component[];
          const preview = components[0]?.html ?? '';
          return (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="group rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all"
            >
              {/* Mini preview */}
              <div
                className="h-40 bg-base-100 overflow-hidden relative pointer-events-none"
                data-theme={theme?.daisyTheme ?? 'light'}
              >
                <div
                  className="absolute inset-0 scale-[0.35] origin-top-left"
                  style={{ width: '285%', height: '285%' }}
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              </div>
              <div className="px-3 py-2.5 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.isBuiltIn && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Built-in</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
