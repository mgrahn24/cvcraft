export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { consultants, opportunities, cvTemplates } from '@/lib/db/schema';
import { GenerateForm } from './GenerateForm';
import { ArrowLeft } from 'lucide-react';

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ opportunityId?: string }> }) {
  const { opportunityId } = await searchParams;

  const [allConsultants, allOpportunities, allTemplates] = await Promise.all([
    db.select({ id: consultants.id, name: consultants.name }).from(consultants).orderBy(consultants.name),
    db.select({ id: opportunities.id, roleTitle: opportunities.roleTitle, clientName: opportunities.clientName })
      .from(opportunities)
      .orderBy(opportunities.roleTitle),
    db.select({ id: cvTemplates.id, name: cvTemplates.name }).from(cvTemplates),
  ]);

  return (
    <div className="p-8 max-w-xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={13} /> Dashboard
      </Link>

      <h1 className="text-2xl font-semibold mb-1">Generate CV</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Select a consultant, opportunity, and template to generate a tailored CV.
      </p>

      <GenerateForm
        consultants={allConsultants}
        opportunities={allOpportunities}
        templates={allTemplates}
        defaultOpportunityId={opportunityId}
      />
    </div>
  );
}
