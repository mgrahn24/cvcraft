import { db } from '@/lib/db';
import { consultants, profileSections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  defaultProfileBuilderState,
  defaultProfileBuilderTargetState,
} from '@/lib/profile-builder/state';
import type { ProfileEntry } from '@/types';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [consultant] = await db.select().from(consultants).where(eq(consultants.id, id));
    if (!consultant) return new Response('Not found', { status: 404 });

    const sections = await db
      .select()
      .from(profileSections)
      .where(eq(profileSections.consultantId, id))
      .orderBy(profileSections.order);

    const state = structuredClone(defaultProfileBuilderState);
    state.basics = {
      name: consultant.name,
      headline: consultant.headline ?? '',
      email: consultant.email ?? '',
      phone: consultant.phone ?? '',
      location: consultant.location ?? '',
      linkedin: '',
      summary: consultant.summary ?? '',
    };

    for (const s of sections) {
      const entries = (s.entries as ProfileEntry[]) ?? [];
      if (s.type === 'experience') {
        state.experience = entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: e.title ?? '',
          organisation: e.organisation ?? '',
          location: e.location ?? '',
          startDate: e.startDate ?? '',
          endDate: e.endDate ?? '',
          description: e.description ?? '',
          url: e.url ?? '',
          skills: e.skills ?? [],
        }));
      } else if (s.type === 'education') {
        state.education = entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: e.title ?? '',
          organisation: e.organisation ?? '',
          location: e.location ?? '',
          startDate: e.startDate ?? '',
          endDate: e.endDate ?? '',
          description: e.description ?? '',
          url: e.url ?? '',
        }));
      } else if (s.type === 'skills') {
        const allSkills = entries.flatMap((e) => e.skills ?? []);
        state.skills = allSkills.map((name, idx) => ({
          id: `skill-${idx + 1}`,
          name,
          level: '',
        }));
      } else if (s.type === 'certifications') {
        state.certifications = entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: e.title ?? '',
          organisation: e.organisation ?? '',
          location: e.location ?? '',
          startDate: e.startDate ?? '',
          endDate: e.endDate ?? '',
          description: e.description ?? '',
          url: e.url ?? '',
        }));
      } else if (s.type === 'projects') {
        state.projects = entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: e.title ?? '',
          organisation: e.organisation ?? '',
          location: e.location ?? '',
          startDate: e.startDate ?? '',
          endDate: e.endDate ?? '',
          description: e.description ?? '',
          url: e.url ?? '',
          skills: e.skills ?? [],
        }));
      } else if (s.type === 'languages') {
        state.languages = entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          language: e.title ?? '',
          level: e.level ?? '',
        }));
      } else if (s.type === 'publications') {
        state.publications = entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: e.title ?? '',
          organisation: e.organisation ?? '',
          location: e.location ?? '',
          startDate: e.startDate ?? '',
          endDate: e.endDate ?? '',
          description: e.description ?? '',
          url: e.url ?? '',
        }));
      }
    }

    return Response.json({
      profileState: state,
      targetState: defaultProfileBuilderTargetState,
    });
  } catch (err) {
    console.error('[profile-builder-state]', err);
    return new Response('Failed to load profile builder state', { status: 500 });
  }
}
