import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { profileExtractionSchema } from '@/lib/ai/schemas';
import { createConsultantFromExtraction } from '@/lib/actions/consultants';

export const maxDuration = 60;

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
- Extract ALL experience, education, skills, certifications, projects, languages, and publications you find.
- For each entry, generate a unique short id (e.g. "exp-1", "edu-1").
- Preserve exact dates, titles, and organisations as written.
- For skills sections, group all skills into a single entry with an array of skill strings.
- Write a concise professional summary if one is not already present.
- Be thorough — missing information is worse than including too much.`,
      prompt: `Extract the structured profile from this CV:\n\n${cvText.slice(0, 12000)}`,
    });

    // Schema uses .nullable() for Groq compatibility; convert null → undefined for DB layer
    const n2u = <T>(v: T | null): T | undefined => v ?? undefined;

    const id = await createConsultantFromExtraction({
      name: object.name,
      headline: n2u(object.headline),
      email: n2u(object.email),
      phone: n2u(object.phone),
      location: n2u(object.location),
      summary: n2u(object.summary),
      sections: object.sections.map((s) => ({
        type: s.type,
        entries: s.entries.map((e) => ({
          id: e.id || crypto.randomUUID(),
          title: n2u(e.title),
          organisation: n2u(e.organisation),
          location: n2u(e.location),
          startDate: n2u(e.startDate),
          endDate: n2u(e.endDate),
          description: n2u(e.description),
          skills: n2u(e.skills) ?? undefined,
          level: n2u(e.level),
          url: n2u(e.url),
        })),
      })),
    });

    return Response.json({ id });
  } catch (err) {
    console.error('[extract-profile]', err);
    return new Response('Extraction failed', { status: 500 });
  }
}
