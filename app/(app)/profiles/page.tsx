export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { consultants } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Plus, User } from 'lucide-react';

export default async function ProfilesPage() {
  const rows = await db.select().from(consultants).orderBy(desc(consultants.createdAt));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Profiles</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Consultant profiles used to generate CVs</p>
        </div>
        <Link
          href="/profiles/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} /> New Profile
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <User className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground mb-4">No profiles yet. Import a CV or create one manually.</p>
          <Link
            href="/profiles/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={15} /> Add Profile
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/profiles/${c.id}`}
                className="flex items-center gap-4 px-4 py-3.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.name}</div>
                  {c.headline && (
                    <div className="text-xs text-muted-foreground truncate">{c.headline}</div>
                  )}
                </div>
                {c.email && (
                  <span className="text-xs text-muted-foreground hidden sm:block">{c.email}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
