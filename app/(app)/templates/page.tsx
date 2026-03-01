export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { cvTemplates } from '@/lib/db/schema';
import { seedBuiltInTemplates } from '@/lib/db/seed';
import { desc } from 'drizzle-orm';
import { Plus } from 'lucide-react';
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
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Template
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {templates.map((t) => {
          const theme = t.theme as Theme | null;
          const components = t.components as Component[];
          const preview = components[0]?.html ?? '';
          return (
            <div key={t.id} className="group rounded-lg border border-border overflow-hidden hover:border-primary/50 hover:shadow-sm transition-all">
              <Link href={`/templates/${t.id}`} className="block">
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
              </Link>
              <div className="px-3 py-2.5 border-t border-border">
                <div className="flex items-center justify-between">
                  <Link href={`/templates/${t.id}`} className="text-sm font-medium hover:underline">{t.name}</Link>
                  <div className="flex items-center gap-2">
                    {t.isBuiltIn && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Built-in</span>
                    )}
                    <Link
                      href={`/templates/${t.id}/edit`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
