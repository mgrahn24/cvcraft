export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { rulesets } from '@/lib/db/schema';
import { createRuleset } from '@/lib/actions/rulesets';
import { Shield } from 'lucide-react';
import { RulesetCard } from './RulesetCard';
import { Button } from '@/components/ui/button';

export default async function RulesetsPage() {
  const rows = await db.select().from(rulesets);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Rulesets</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Define generation rules injected into the CV generation prompt
        </p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center mb-6">
          <Shield className="mx-auto mb-2 text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">No rulesets yet. Create one below.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3 mb-8">
          {rows.map((r) => (
            <RulesetCard key={r.id} ruleset={{ ...r, rules: r.rules as string[] }} />
          ))}
        </div>
      )}

      {/* Create new */}
      <div className="rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold mb-3">New Ruleset</h2>
        <form action={createRuleset} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <input name="name" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Company Standard" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Rules (one per line)</label>
            <textarea
              name="rules"
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
              placeholder={"Always write in third person\nLimit to 2 pages\nInclude a skills matrix\nDo not include salary history"}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Create Ruleset</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
