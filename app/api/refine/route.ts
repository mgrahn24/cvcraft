import { streamObject } from 'ai';
import { models } from '@/lib/ai/models';
import { updateSchema } from '@/lib/ai/schemas';
import { REFINE_SYSTEM_PROMPT, REFINE_USER_PROMPT } from '@/lib/ai/prompts';
import { logLLMCall } from '@/lib/utils/llmLogger';
import type { Component, Theme } from '@/types';

export const maxDuration = 60;


export async function POST(req: Request) {
  const { components, theme, instruction, siteComponents }: {
    components: Component[];
    theme: Theme;
    instruction: string;
    siteComponents?: Component[];
  } = await req.json();

  if (!components?.length || !instruction) {
    return new Response('Missing components or instruction', { status: 400 });
  }

  const startMs = Date.now();

  const result = streamObject({
    model: models.refine,
    schema: updateSchema,
    system: REFINE_SYSTEM_PROMPT,
    prompt: REFINE_USER_PROMPT(components, theme, instruction, siteComponents),
    temperature: 0.5,
    onFinish: ({ usage, object }) => {
      logLLMCall({
        route: 'POST /api/refine',
        model: models.refine.modelId,
        request: instruction,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        durationMs: Date.now() - startMs,
        response: object,
      });
    },
  });

  return result.toTextStreamResponse();
}
