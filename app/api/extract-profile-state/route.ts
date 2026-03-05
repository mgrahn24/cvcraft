import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { profileExtractionSchema } from '@/lib/ai/schemas';
import { defaultProfileBuilderState } from '@/lib/profile-builder/state';

export const maxDuration = 60;

function toString(value: string | null | undefined) {
  return value ?? '';
}

export async function POST(req: Request) {
  try {
    const { cvText } = await req.json() as { cvText: string };
    if (!cvText?.trim()) {
      return new Response('cvText is required', { status: 400 });
    }

    const { object } = await generateObject({
      model: models.profileExtract,
      schema: profileExtractionSchema,
      system: `You are an expert CV parser. Extract structured profile information from the provided CV text.
- Extract all experience, education, skills, certifications, projects, languages, and publications.
- Preserve exact dates, titles, and organisations where available.
- Be thorough and avoid omissions.`,
      prompt: `Extract the structured profile from this CV:\n\n${cvText.slice(0, 12000)}`,
    });

    const seeded = structuredClone(defaultProfileBuilderState);
    seeded.basics = {
      name: object.name,
      headline: toString(object.headline),
      email: toString(object.email),
      phone: toString(object.phone),
      location: toString(object.location),
      summary: toString(object.summary),
    };

    for (const section of object.sections) {
      if (section.type === 'experience') {
        seeded.experience = section.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: toString(e.title),
          organisation: toString(e.organisation),
          location: toString(e.location),
          startDate: toString(e.startDate),
          endDate: toString(e.endDate),
          description: toString(e.description),
          url: toString(e.url),
          skills: e.skills ?? [],
        }));
      } else if (section.type === 'education') {
        seeded.education = section.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: toString(e.title),
          organisation: toString(e.organisation),
          location: toString(e.location),
          startDate: toString(e.startDate),
          endDate: toString(e.endDate),
          description: toString(e.description),
          url: toString(e.url),
        }));
      } else if (section.type === 'skills') {
        const flatSkills = section.entries.flatMap((e) => e.skills ?? []);
        seeded.skills = flatSkills.map((name, idx) => ({
          id: `skill-${idx + 1}`,
          name,
          level: '',
        }));
      } else if (section.type === 'certifications') {
        seeded.certifications = section.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: toString(e.title),
          organisation: toString(e.organisation),
          location: toString(e.location),
          startDate: toString(e.startDate),
          endDate: toString(e.endDate),
          description: toString(e.description),
          url: toString(e.url),
        }));
      } else if (section.type === 'projects') {
        seeded.projects = section.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: toString(e.title),
          organisation: toString(e.organisation),
          location: toString(e.location),
          startDate: toString(e.startDate),
          endDate: toString(e.endDate),
          description: toString(e.description),
          url: toString(e.url),
          skills: e.skills ?? [],
        }));
      } else if (section.type === 'languages') {
        seeded.languages = section.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          language: toString(e.title),
          level: toString(e.level),
        }));
      } else if (section.type === 'publications') {
        seeded.publications = section.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: toString(e.title),
          organisation: toString(e.organisation),
          location: toString(e.location),
          startDate: toString(e.startDate),
          endDate: toString(e.endDate),
          description: toString(e.description),
          url: toString(e.url),
        }));
      }
    }

    return Response.json({ profileState: seeded });
  } catch (err) {
    console.error('[extract-profile-state]', err);
    return new Response('Extraction failed', { status: 500 });
  }
}
