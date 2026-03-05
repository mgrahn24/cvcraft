import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import {
  applyPatchOps,
  calculateCompleteness,
  normalizePatchPath,
  profileBuilderAgentOutputSchema,
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
  };
  if (alias[last]) parts[parts.length - 1] = alias[last];
  return parts.join('.');
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

    const profilePatch = canApplyPatches
      ? (object.profilePatch ?? []).map((op) => ({ ...op, path: mapProfilePathAliases(op.path) }))
      : [];
    const targetPatch = canApplyPatches
      ? (object.targetPatch ?? []).map((op) => ({ ...op, path: normalizePatchPath(op.path) }))
      : [];
    const nextProfile = applyPatchOps(input.profileState as unknown as Record<string, unknown>, profilePatch) as unknown as ProfileBuilderState;
    const nextTarget = applyPatchOps(input.targetState as unknown as Record<string, unknown>, targetPatch) as unknown as ProfileBuilderTargetState;
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
