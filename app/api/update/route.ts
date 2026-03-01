import { streamObject } from 'ai';
import { models } from '@/lib/ai/models';
import { updateSchema } from '@/lib/ai/schemas';
import { UPDATE_SYSTEM_PROMPT, UPDATE_USER_PROMPT } from '@/lib/ai/prompts';
import { logLLMCall } from '@/lib/utils/llmLogger';
import type { Component, Theme } from '@/types';

export const maxDuration = 30;


export async function POST(req: Request) {
  const { components, theme, instruction }: {
    components: Component[];
    theme: Theme;
    instruction: string;
  } = await req.json();

  if (!components?.length || !instruction) {
    return new Response('Missing components or instruction', { status: 400 });
  }

  const startMs = Date.now();

  const result = streamObject({
    model: models.update,
    schema: updateSchema,
    system: UPDATE_SYSTEM_PROMPT,
    prompt: UPDATE_USER_PROMPT(components, theme, instruction),
    temperature: 0.5,
    onFinish: ({ usage, object }) => {
      logLLMCall({
        route: 'POST /api/update',
        model: models.update.modelId,
        request: { instruction, componentIds: components.map((c) => c.id) },
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        durationMs: Date.now() - startMs,
        response: object,
      });
    },
  });

  return result.toTextStreamResponse();
}
