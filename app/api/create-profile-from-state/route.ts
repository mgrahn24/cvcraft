import { createConsultantFromExtraction } from '@/lib/actions/consultants';
import { db } from '@/lib/db';
import { consultants, profileSections } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  profileBuilderStateSchema,
} from '@/lib/profile-builder/state';
import type { ProfileEntry, ProfileSectionType } from '@/types';

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const profileState = profileBuilderStateSchema.parse(raw.profileState);
    const consultantId = typeof raw.consultantId === 'string' ? raw.consultantId : undefined;

    const name = profileState.basics.name.trim();
    if (!name) {
      return new Response('Name is required', { status: 400 });
    }

    const sections: Array<{ type: ProfileSectionType; entries: ProfileEntry[] }> = [];

    if (profileState.experience.length > 0) {
      sections.push({ type: 'experience', entries: profileState.experience });
    }
    if (profileState.education.length > 0) {
      sections.push({ type: 'education', entries: profileState.education });
    }
    if (profileState.skills.length > 0) {
      sections.push({
        type: 'skills',
        entries: [{
          id: crypto.randomUUID(),
          skills: profileState.skills.map((s) => s.name.trim()).filter(Boolean),
        }],
      });
    }
    if (profileState.certifications.length > 0) {
      sections.push({ type: 'certifications', entries: profileState.certifications });
    }
    if (profileState.projects.length > 0) {
      sections.push({ type: 'projects', entries: profileState.projects });
    }
    if (profileState.languages.length > 0) {
      sections.push({
        type: 'languages',
        entries: profileState.languages.map((l) => ({
          id: l.id,
          title: l.language,
          level: l.level,
        })),
      });
    }
    if (profileState.publications.length > 0) {
      sections.push({ type: 'publications', entries: profileState.publications });
    }

    let id: string;
    if (consultantId) {
      id = consultantId;
      await db
        .update(consultants)
        .set({
          name,
          headline: clean(profileState.basics.headline),
          email: clean(profileState.basics.email),
          phone: clean(profileState.basics.phone),
          location: clean(profileState.basics.location),
          summary: clean(profileState.basics.summary),
          updatedAt: new Date(),
        })
        .where(eq(consultants.id, consultantId));

      await db.delete(profileSections).where(eq(profileSections.consultantId, consultantId));
      if (sections.length > 0) {
        await db.insert(profileSections).values(
          sections.map((s, i) => ({
            id: crypto.randomUUID(),
            consultantId,
            type: s.type,
            entries: s.entries,
            order: i,
          }))
        );
      }
    } else {
      id = await createConsultantFromExtraction({
        name,
        headline: clean(profileState.basics.headline),
        email: clean(profileState.basics.email),
        phone: clean(profileState.basics.phone),
        location: clean(profileState.basics.location),
        summary: clean(profileState.basics.summary),
        sections,
      });
    }

    return Response.json({ id });
  } catch (err) {
    console.error('[create-profile-from-state]', err);
    return new Response('Failed to create profile', { status: 500 });
  }
}
