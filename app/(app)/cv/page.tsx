export const revalidate = 10;
import Link from 'next/link';
import { db } from '@/lib/db';
import { cvVersions, consultants, opportunities } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { FileText } from 'lucide-react';

export default async function CVListPage() {
  const cvs = await db.select({
    id: cvVersions.id,
    consultantId: cvVersions.consultantId,
    opportunityId: cvVersions.opportunityId,
    createdAt: cvVersions.createdAt,
  }).from(cvVersions).orderBy(desc(cvVersions.createdAt)).limit(50);

  // Batch-load related data
  const consultantIds = [...new Set(cvs.map((cv) => cv.consultantId))];
  const opportunityIds = [...new Set(cvs.map((cv) => cv.opportunityId).filter(Boolean))] as string[];

  const [consultantRows, opportunityRows] = await Promise.all([
    consultantIds.length > 0
      ? db.select({ id: consultants.id, name: consultants.name }).from(consultants)
      : Promise.resolve([]),
    opportunityIds.length > 0
      ? db.select({ id: opportunities.id, roleTitle: opportunities.roleTitle, clientName: opportunities.clientName }).from(opportunities)
      : Promise.resolve([]),
  ]);

  const cMap = new Map(consultantRows.map((c) => [c.id, c.name]));
  const oMap = new Map(opportunityRows.map((o) => [o.id, `${o.roleTitle} — ${o.clientName}`]));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">CVs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All generated CV versions</p>
      </div>

      {cvs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileText className="mx-auto mb-3 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground mb-2">No CVs generated yet.</p>
          <Link href="/opportunities/new" className="text-xs text-primary hover:underline">
            Create an opportunity to get started
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {cvs.map((cv) => (
            <li key={cv.id}>
              <Link
                href={`/cv/${cv.id}`}
                className="flex items-center gap-4 px-4 py-3.5 rounded-lg border border-border hover:bg-muted/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <FileText size={15} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{cMap.get(cv.consultantId) ?? 'Unknown'}</div>
                  {cv.opportunityId && oMap.has(cv.opportunityId) && (
                    <div className="text-xs text-muted-foreground truncate">{oMap.get(cv.opportunityId)}</div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(cv.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
