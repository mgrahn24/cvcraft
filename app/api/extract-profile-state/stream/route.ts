import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { z } from 'zod';
import {
  applyPatchOps,
  calculateCompleteness,
  defaultProfileBuilderState,
  defaultProfileBuilderTargetState,
  type PatchOp,
  type ProfileBuilderState,
} from '@/lib/profile-builder/state';

export const maxDuration = 120;

function text(v: string | null | undefined) {
  return v ?? '';
}

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const profileEntrySchema = z.object({
  id: z.string().nullable(),
  title: z.string().nullable(),
  organisation: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  description: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  level: z.string().nullable(),
  url: z.string().nullable(),
});

const basicsSchema = z.object({
  name: z.string(),
  headline: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),
});

const sectionSchema = z.object({
  entries: z.array(profileEntrySchema),
});

export async function POST(req: Request) {
  try {
    const { cvText } = await req.json() as { cvText: string };
    if (!cvText?.trim()) return new Response('cvText is required', { status: 400 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        const ping = () => controller.enqueue(encoder.encode(`: ping\n\n`));

        try {
          ping();
          send({ type: 'status', message: 'Parsing basic profile details...' });

          let current: ProfileBuilderState = structuredClone(defaultProfileBuilderState);
          const emitPatch = async (patch: PatchOp[], message: string) => {
            current = applyPatchOps(current as unknown as Record<string, unknown>, patch) as unknown as ProfileBuilderState;
            const completeness = calculateCompleteness(current, defaultProfileBuilderTargetState);
            send({
              type: 'patch',
              message,
              patch,
              completeness: {
                overall: completeness.overall,
                components: completeness.components,
              },
            });
            ping();
            await sleep(120);
          };

          const cvSnippet = cvText.slice(0, 16000);
          const { object: basics } = await generateObject({
            model: models.profileExtract,
            schema: basicsSchema,
            system: 'Extract only the person basic details from CV text. Use null when unknown.',
            prompt: `CV text:\n\n${cvSnippet}`,
          });

          await emitPatch([{
            path: 'basics',
            value: {
              name: text(basics.name),
              headline: text(basics.headline),
              email: text(basics.email),
              phone: text(basics.phone),
              location: text(basics.location),
              summary: text(basics.summary),
            },
          }], 'Added basic details');

          const sectionPlan: Array<{ type: 'experience'|'education'|'skills'|'certifications'|'projects'|'languages'|'publications'; label: string }> = [
            { type: 'experience', label: 'experience' },
            { type: 'education', label: 'education' },
            { type: 'skills', label: 'skills' },
            { type: 'certifications', label: 'certifications' },
            { type: 'projects', label: 'projects' },
            { type: 'languages', label: 'languages' },
            { type: 'publications', label: 'publications' },
          ];

          for (const s of sectionPlan) {
            send({ type: 'status', message: `Extracting ${s.label}...` });
            const { object: section } = await generateObject({
              model: models.profileExtract,
              schema: sectionSchema,
              system: `Extract ONLY the "${s.type}" section from CV text. Return entries array; empty if none.`,
              prompt: `CV text:\n\n${cvSnippet}`,
            });
            const entries = section.entries ?? [];

            if (s.type === 'experience') {
              await emitPatch([{ path: 'experience', value: entries.map((e) => ({ id: e.id || crypto.randomUUID(), title: text(e.title), organisation: text(e.organisation), location: text(e.location), startDate: text(e.startDate), endDate: text(e.endDate), description: text(e.description), url: text(e.url), skills: e.skills ?? [] })) }], 'Added experience');
            } else if (s.type === 'education') {
              await emitPatch([{ path: 'education', value: entries.map((e) => ({ id: e.id || crypto.randomUUID(), title: text(e.title), organisation: text(e.organisation), location: text(e.location), startDate: text(e.startDate), endDate: text(e.endDate), description: text(e.description), url: text(e.url) })) }], 'Added education');
            } else if (s.type === 'skills') {
              const allSkills = entries.flatMap((e) => e.skills ?? []);
              await emitPatch([{ path: 'skills', value: allSkills.map((name, idx) => ({ id: `skill-${idx + 1}`, name, level: '' })) }], 'Added skills');
            } else if (s.type === 'certifications') {
              await emitPatch([{ path: 'certifications', value: entries.map((e) => ({ id: e.id || crypto.randomUUID(), title: text(e.title), organisation: text(e.organisation), location: text(e.location), startDate: text(e.startDate), endDate: text(e.endDate), description: text(e.description), url: text(e.url) })) }], 'Added certifications');
            } else if (s.type === 'projects') {
              await emitPatch([{ path: 'projects', value: entries.map((e) => ({ id: e.id || crypto.randomUUID(), title: text(e.title), organisation: text(e.organisation), location: text(e.location), startDate: text(e.startDate), endDate: text(e.endDate), description: text(e.description), url: text(e.url), skills: e.skills ?? [] })) }], 'Added projects');
            } else if (s.type === 'languages') {
              await emitPatch([{ path: 'languages', value: entries.map((e) => ({ id: e.id || crypto.randomUUID(), language: text(e.title), level: text(e.level) })) }], 'Added languages');
            } else if (s.type === 'publications') {
              await emitPatch([{ path: 'publications', value: entries.map((e) => ({ id: e.id || crypto.randomUUID(), title: text(e.title), organisation: text(e.organisation), location: text(e.location), startDate: text(e.startDate), endDate: text(e.endDate), description: text(e.description), url: text(e.url) })) }], 'Added publications');
            }
          }

          const final = calculateCompleteness(current, defaultProfileBuilderTargetState);
          send({
            type: 'done',
            profileState: current,
            targetState: defaultProfileBuilderTargetState,
            completeness: {
              overall: final.overall,
              components: final.components,
            },
          });
          ping();
        } catch (err) {
          send({
            type: 'error',
            message: err instanceof Error ? err.message : 'Streaming extraction failed',
          });
          ping();
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('[extract-profile-state-stream]', err);
    return new Response('Extraction failed', { status: 500 });
  }
}
