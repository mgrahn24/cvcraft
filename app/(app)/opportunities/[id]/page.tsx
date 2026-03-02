export const dynamic = 'force-dynamic';
export const maxDuration = 30;
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { opportunities, consultants, consultantGuidance, cvVersions, cvTemplates } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { OpportunityForm } from './OpportunityForm';
import { GenerateWizard } from './GenerateWizard';

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [[opportunity], allConsultants, allTemplates, guidance, recentCVs] = await Promise.all([
    db.select().from(opportunities).where(eq(opportunities.id, id)),
    db.select().from(consultants).orderBy(consultants.name),
    db.select({ id: cvTemplates.id, name: cvTemplates.name }).from(cvTemplates),
    db.select().from(consultantGuidance).where(eq(consultantGuidance.opportunityId, id)),
    db.select({
      id: cvVersions.id,
      consultantId: cvVersions.consultantId,
      createdAt: cvVersions.createdAt,
    }).from(cvVersions)
      .where(eq(cvVersions.opportunityId, id))
      .orderBy(desc(cvVersions.createdAt))
      .limit(10),
  ]);

  if (!opportunity) notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/opportunities" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={13} /> Opportunities
      </Link>

      <h1 className="text-2xl font-semibold mb-1">{opportunity.roleTitle}</h1>
      <p className="text-muted-foreground text-sm mb-8">{opportunity.clientName}</p>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold mb-3">Details</h2>
          <OpportunityForm opportunity={opportunity} />
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-semibold mb-3">Generate a CV</h2>
            <GenerateWizard
              opportunityId={id}
              consultants={allConsultants.map((c) => ({ id: c.id, name: c.name }))}
              templates={allTemplates}
              guidance={guidance}
            />
          </section>

          {recentCVs.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-3">Generated CVs</h2>
              <ul className="space-y-1.5">
                {recentCVs.map((cv) => {
                  const consultant = allConsultants.find((c) => c.id === cv.consultantId);
                  return (
                    <li key={cv.id}>
                      <Link
                        href={`/cv/${cv.id}`}
                        className="flex items-center justify-between px-3 py-2.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-sm">{consultant?.name ?? 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(cv.createdAt).toLocaleDateString()}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
