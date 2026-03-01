import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { suggestSchema } from '@/lib/ai/schemas';
import { SUGGEST_SYSTEM_PROMPT, SUGGEST_USER_PROMPT } from '@/lib/ai/prompts';
import { logLLMCall } from '@/lib/utils/llmLogger';
import type { Component, Theme } from '@/types';

export async function POST(req: Request) {
  const { component, theme }: { component: Component; theme: Theme } = await req.json();

  const startMs = Date.now();

  const { object, usage } = await generateObject({
    model: models.suggest,
    schema: suggestSchema,
    system: SUGGEST_SYSTEM_PROMPT,
    prompt: SUGGEST_USER_PROMPT(component, theme),
    temperature: 0.8,
  });

  logLLMCall({
    route: 'POST /api/suggest',
    model: models.suggest.modelId,
    request: { componentId: component.id, type: component.type },
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    durationMs: Date.now() - startMs,
    response: { suggestions: object.suggestions },
  });

  return Response.json(object);
}
