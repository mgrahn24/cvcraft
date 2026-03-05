import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import {
  applyPatchOps,
  calculateCompleteness,
  normalizePatchPath,
  profileBuilderAgentOutputSchema,
  profileBuilderStateSchema,
  profileBuilderTargetStateSchema,
  type PatchOp,
  type ProfileBuilderState,
  type ProfileBuilderTargetState,
  profileBuilderTurnRequestSchema,
} from '@/lib/profile-builder/state';

export const maxDuration = 60;

function mapProfilePathAliases(path: string): string {
  const p = normalizePatchPath(path);
  const parts = p.split('.');
  if (!parts.length) return p;
  const last = parts[parts.length - 1];
  const alias: Record<string, string> = {
    company: 'organisation',
    employer: 'organisation',
    position: 'title',
    jobTitle: 'title',
    role: 'title',
    linkedIn: 'linkedin',
    linkedinUrl: 'linkedin',
    linkedInUrl: 'linkedin',
    website: 'linkedin',
    proficiency: 'level',
    fluency: 'level',
  };
  if (parts[0] === 'languages' && last === 'name') {
    parts[parts.length - 1] = 'language';
    return parts.join('.');
  }
  if (alias[last]) parts[parts.length - 1] = alias[last];
  return parts.join('.');
}

function sanitizeLanguageObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const v = value as Record<string, unknown>;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : crypto.randomUUID(),
    language:
      typeof v.language === 'string' ? v.language :
      typeof v.name === 'string' ? v.name :
      typeof v.lang === 'string' ? v.lang : '',
    level:
      typeof v.level === 'string' ? v.level :
      typeof v.proficiency === 'string' ? v.proficiency :
      typeof v.fluency === 'string' ? v.fluency : '',
  };
}

function sanitizeProfilePatchValue(path: string, value: unknown): unknown {
  if (path === 'languages' && Array.isArray(value)) {
    return value.map((v) => sanitizeLanguageObject(v));
  }
  if (/^languages\.\d+$/.test(path)) {
    return sanitizeLanguageObject(value);
  }
  if (path === 'skills' && Array.isArray(value)) {
    return value.map((v) => {
      if (typeof v === 'string') return { id: crypto.randomUUID(), name: v, level: '' };
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        return {
          id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
          name: typeof o.name === 'string' ? o.name : '',
          level: typeof o.level === 'string' ? o.level : '',
        };
      }
      return { id: crypto.randomUUID(), name: '', level: '' };
    });
  }
  return value;
}

function applyValidProfilePatches(
  base: ProfileBuilderState,
  ops: PatchOp[]
): { next: ProfileBuilderState; accepted: PatchOp[] } {
  let next = base;
  const accepted: PatchOp[] = [];
  for (const op of ops) {
    const candidate = applyPatchOps(next as unknown as Record<string, unknown>, [op]) as unknown as ProfileBuilderState;
    const parsed = profileBuilderStateSchema.safeParse(candidate);
    if (parsed.success) {
      next = parsed.data;
      accepted.push(op);
    }
  }
  return { next, accepted };
}

function applyValidTargetPatches(
  base: ProfileBuilderTargetState,
  ops: PatchOp[]
): { next: ProfileBuilderTargetState; accepted: PatchOp[] } {
  let next = base;
  const accepted: PatchOp[] = [];
  for (const op of ops) {
    const candidate = applyPatchOps(next as unknown as Record<string, unknown>, [op]) as unknown as ProfileBuilderTargetState;
    const parsed = profileBuilderTargetStateSchema.safeParse(candidate);
    if (parsed.success) {
      next = parsed.data;
      accepted.push(op);
    }
  }
  return { next, accepted };
}

const SYSTEM_PROMPT = `You are a profile-building agent for CV creation.
Goal: produce a complete, high-quality reusable profile quickly.

Rules:
- targetState means the desired completeness goals for the PERSON profile (coverage/depth), not any job/opportunity.
- Never ask about target opportunities, target roles for specific vacancies, client names, or application-specific preferences.
- Always update profileState and targetState from the latest user input when explicit information is provided.
- Return only transactional updates as patches, never full profileState or full targetState.
- Use profilePatch and targetPatch arrays with { path, value } operations.
- Use dot-notation paths (for example: basics.summary, experience, skills).
- Keep patch output minimal and only include changed paths.
- Never invent, assume, or infer personal facts not explicitly provided by the user.
- Never use placeholder/example values as real data (for example "John Doe").
- If the latest user message provides no new factual data, return empty patches.
- If the user clearly says a section is not applicable (for example "no publications"), do not ask that section again in subsequent turns.
- Ask exactly ONE next question.
- Prefer closed questions and provide 3-6 concise options whenever possible.
- Focus the next question on the highest-impact missing area.
- Keep the question short and specific.
- Do not include explanations, summaries, or extra text.
- If a topic is irrelevant, allow skip options.
- Never invent facts; only use user-provided information.
- Return strictly valid JSON matching the schema.`;

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const includeDebug = raw?.debug === true;
    const input = profileBuilderTurnRequestSchema.parse(raw);

    const recentMessages = input.messages.slice(-10);
    const latestMessage = recentMessages[recentMessages.length - 1];
    const canApplyPatches = latestMessage?.role === 'user' && latestMessage.content.trim().length > 0;
    const baseCompleteness = calculateCompleteness(input.profileState, input.targetState);
    const prompt = [
      `Current profile completeness: ${baseCompleteness.overall}%`,
      `Weakest area to prioritize: ${baseCompleteness.nextFocus}`,
      'Current profileState JSON:',
      JSON.stringify(input.profileState),
      'Current targetState JSON:',
      JSON.stringify(input.targetState),
      'Conversation history JSON:',
      JSON.stringify(recentMessages),
    ].join('\n\n');

    const t0 = Date.now();
    const result = await generateObject({
      model: models.profileBuilderTurn,
      schema: profileBuilderAgentOutputSchema,
      system: SYSTEM_PROMPT,
      prompt,
    });
    const durationMs = Date.now() - t0;
    const object = result.object;
    const usage = (result as unknown as { usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } }).usage;
    const rawResponse = (result as unknown as { response?: unknown }).response;

    const logPayload = {
      at: new Date().toISOString(),
      route: 'POST /api/profile-builder-turn',
      durationMs,
      usage: {
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
      },
      llmInput: {
        systemPrompt: SYSTEM_PROMPT,
        prompt,
      },
      llmOutput: {
        parsedObject: object,
        rawResponse: rawResponse ?? null,
      },
    };
    console.info('[profile-builder-turn:llm]\n' + JSON.stringify(logPayload, null, 2));

    const rawProfilePatch = canApplyPatches
      ? (object.profilePatch ?? []).map((op) => {
          const path = mapProfilePathAliases(op.path);
          return { path, value: sanitizeProfilePatchValue(path, op.value) };
        })
      : [];
    const rawTargetPatch = canApplyPatches
      ? (object.targetPatch ?? []).map((op) => ({ ...op, path: normalizePatchPath(op.path) }))
      : [];

    const { next: nextProfile, accepted: profilePatch } = applyValidProfilePatches(input.profileState, rawProfilePatch);
    const { next: nextTarget, accepted: targetPatch } = applyValidTargetPatches(input.targetState, rawTargetPatch);
    const completeness = calculateCompleteness(nextProfile, nextTarget);

    return Response.json({
      question: object.question.trim(),
      inputType: object.inputType,
      options: object.options.slice(0, 6),
      placeholder: object.placeholder.trim(),
      profilePatch,
      targetPatch,
      completeness: {
        overall: completeness.overall,
        components: completeness.components,
      },
      nextFocus: completeness.nextFocus,
      debug: includeDebug
        ? {
            systemPrompt: SYSTEM_PROMPT,
            prompt,
            response: {
              parsedObject: object,
              rawResponse: rawResponse ?? null,
            },
            usage: {
              inputTokens: usage?.inputTokens ?? null,
              outputTokens: usage?.outputTokens ?? null,
              totalTokens: usage?.totalTokens ?? null,
            },
            durationMs,
          }
        : undefined,
    });
  } catch (err) {
    console.error('[profile-builder-turn]', err);
    return new Response('Failed to produce profile builder turn', { status: 500 });
  }
}
