export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { consultants, profileSections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileForm } from './ProfileForm';
import { SectionEditor } from './SectionEditor';
import type { ProfileSectionType } from '@/types';

const SECTION_META: Record<ProfileSectionType, { label: string }> = {
  experience: { label: 'Experience' },
  education: { label: 'Education' },
  skills: { label: 'Skills' },
  certifications: { label: 'Certifications' },
  projects: { label: 'Projects' },
  languages: { label: 'Languages' },
  publications: { label: 'Publications' },
};

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [consultant] = await db.select().from(consultants).where(eq(consultants.id, id));
  if (!consultant) notFound();

  const sections = await db
    .select()
    .from(profileSections)
    .where(eq(profileSections.consultantId, id))
    .orderBy(profileSections.order);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/profiles" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={13} /> Profiles
      </Link>

      <h1 className="text-2xl font-semibold mb-6">{consultant.name}</h1>
      <div className="mb-6">
        <Button asChild size="sm" variant="outline">
          <Link href={`/profiles/${id}/improve`}>Improve in Builder</Link>
        </Button>
      </div>

      {/* Basic info form */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3">Basic information</h2>
        <ProfileForm consultant={consultant} />
      </section>

      {/* Sections */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Profile sections</h2>
        <div className="space-y-3">
          {Object.entries(SECTION_META).map(([type, meta]) => {
            const section = sections.find((s) => s.type === type);
            return (
              <SectionEditor
                key={type}
                consultantId={id}
                section={section ?? null}
                type={type as ProfileSectionType}
                label={meta.label}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
