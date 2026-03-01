import { createConsultant } from '@/lib/actions/consultants';
import { ImportCVForm } from './ImportCVForm';

export default function NewProfilePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">New Profile</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Import from an existing CV, or create manually.
      </p>

      {/* Import from CV text */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Import from CV text</h2>
        <ImportCVForm />
      </section>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">or create manually</span></div>
      </div>

      {/* Manual creation */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Manual entry</h2>
        <form action={createConsultant} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Full name *</label>
              <input name="name" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Headline</label>
              <input name="headline" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Senior Software Engineer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <input name="email" type="email" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Phone</label>
              <input name="phone" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="+44 7700 900000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Location</label>
            <input name="location" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" placeholder="London, UK" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Professional summary</label>
            <textarea name="summary" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Brief professional summary..." />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Create Profile
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
