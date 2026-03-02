export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { opportunities } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function OpportunitiesPage() {
  const rows = await db.select().from(opportunities).orderBy(desc(opportunities.createdAt));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Generate CVs tailored to specific roles</p>
        </div>
        <Button asChild size="sm">
          <Link href="/opportunities/new">
            <Plus size={15} /> New
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Briefcase className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground mb-4">No opportunities yet.</p>
          <Button asChild size="sm">
            <Link href="/opportunities/new">
              <Plus size={15} /> Create first opportunity
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/opportunities/${o.id}`} className="flex items-center gap-4 px-4 py-3.5 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Briefcase size={15} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{o.roleTitle}</div>
                  <div className="text-xs text-muted-foreground">{o.clientName}</div>
                </div>
                {o.deadline && (
                  <span className="text-xs text-muted-foreground">{o.deadline}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
