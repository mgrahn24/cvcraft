export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { consultants, opportunities, cvVersions } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { Users, Briefcase, FileText, Plus, ArrowRight, Sparkles } from 'lucide-react';

export default async function DashboardPage() {
  const [recentConsultants, recentOpportunities, recentCVs] = await Promise.all([
    db.select().from(consultants).orderBy(desc(consultants.createdAt)).limit(5),
    db.select().from(opportunities).orderBy(desc(opportunities.createdAt)).limit(5),
    db.select().from(cvVersions).orderBy(desc(cvVersions.createdAt)).limit(5),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-muted-foreground text-sm mb-8">CVCraft — AI-powered CV generator</p>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <Link
          href="/generate"
          className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors col-span-3 sm:col-span-1"
        >
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-primary">Generate CV</div>
            <div className="text-xs text-muted-foreground">Pick consultant, opportunity & template</div>
          </div>
        </Link>
        <Link
          href="/profiles/new"
          className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Plus size={16} className="text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">New Profile</div>
            <div className="text-xs text-muted-foreground">Import or create</div>
          </div>
        </Link>
        <Link
          href="/opportunities/new"
          className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Plus size={16} className="text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">New Opportunity</div>
            <div className="text-xs text-muted-foreground">Define role & client</div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent consultants */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Users size={14} /> Profiles
            </h2>
            <Link href="/profiles" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              All <ArrowRight size={11} />
            </Link>
          </div>
          {recentConsultants.length === 0 ? (
            <EmptyState href="/profiles/new" label="Add first profile" />
          ) : (
            <ul className="space-y-1.5">
              {recentConsultants.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/profiles/${c.id}`}
                    className="flex flex-col px-3 py-2.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    {c.headline && (
                      <span className="text-xs text-muted-foreground truncate">{c.headline}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent opportunities */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Briefcase size={14} /> Opportunities
            </h2>
            <Link href="/opportunities" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              All <ArrowRight size={11} />
            </Link>
          </div>
          {recentOpportunities.length === 0 ? (
            <EmptyState href="/opportunities/new" label="Add first opportunity" />
          ) : (
            <ul className="space-y-1.5">
              {recentOpportunities.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/opportunities/${o.id}`}
                    className="flex flex-col px-3 py-2.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">{o.roleTitle}</span>
                    <span className="text-xs text-muted-foreground truncate">{o.clientName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent CVs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <FileText size={14} /> Recent CVs
            </h2>
            <Link href="/cv" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              All <ArrowRight size={11} />
            </Link>
          </div>
          {recentCVs.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No CVs generated yet.</p>
              <p className="text-xs text-muted-foreground">Create an opportunity to get started.</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {recentCVs.map((cv) => (
                <li key={cv.id}>
                  <Link
                    href={`/cv/${cv.id}`}
                    className="flex flex-col px-3 py-2.5 rounded-md border border-border hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-sm font-medium">CV</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(cv.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-4 text-center">
      <Link
        href={href}
        className="text-xs text-primary hover:underline"
      >
        {label}
      </Link>
    </div>
  );
}
