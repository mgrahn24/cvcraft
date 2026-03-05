export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { consultants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { ProfileBuilderAgent } from '@/app/(app)/profiles/new/ProfileBuilderAgent';

export default async function ImproveProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [consultant] = await db.select().from(consultants).where(eq(consultants.id, id));
  if (!consultant) notFound();

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <Link href={`/profiles/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={13} /> Back to profile
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Improve Profile: {consultant.name}</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Use guided chat + inline editing to improve this existing profile.
      </p>
      <ProfileBuilderAgent consultantId={id} />
    </div>
  );
}
