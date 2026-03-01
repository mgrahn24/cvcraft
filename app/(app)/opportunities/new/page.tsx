import { createOpportunity } from '@/lib/actions/opportunities';

export default function NewOpportunityPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">New Opportunity</h1>
      <p className="text-muted-foreground text-sm mb-8">Define the role and requirements. You can generate CVs from the opportunity page.</p>

      <form action={createOpportunity} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Client name *</label>
            <input name="clientName" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Role title *</label>
            <input name="roleTitle" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Lead Software Engineer" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Description *</label>
          <textarea name="description" required rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Describe the role, context, and what you're looking to highlight..." />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Requirements</label>
          <textarea name="requirements" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Key skills or qualifications required..." />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Deadline</label>
          <input name="deadline" type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Create Opportunity
          </button>
        </div>
      </form>
    </div>
  );
}
