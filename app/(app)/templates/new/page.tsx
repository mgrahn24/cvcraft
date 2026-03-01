import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TemplateForm } from '../TemplateForm';

export default function NewTemplatePage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/templates" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={13} /> Templates
      </Link>

      <h1 className="text-2xl font-semibold mb-1">New Template</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Build a custom CV template with HTML sections. Use Tailwind and DaisyUI classes — the canvas loads their CDNs automatically.
      </p>

      <TemplateForm />
    </div>
  );
}
