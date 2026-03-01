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
      model: models.generate,
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

    const id = await createConsultantFromExtraction({
      name: object.name,
      headline: object.headline,
      email: object.email,
      phone: object.phone,
      location: object.location,
      summary: object.summary,
      sections: object.sections.map((s) => ({
        type: s.type,
        entries: s.entries.map((e) => ({ ...e, id: e.id || crypto.randomUUID() })),
      })),
    });

    return Response.json({ id });
  } catch (err) {
    console.error('[extract-profile]', err);
    return new Response('Extraction failed', { status: 500 });
  }
}
