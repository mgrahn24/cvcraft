import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { addSchema } from '@/lib/ai/schemas';
import { ADD_SYSTEM_PROMPT, ADD_USER_PROMPT } from '@/lib/ai/prompts';
import { logLLMCall } from '@/lib/utils/llmLogger';
import type { Component, ComponentType, Theme } from '@/types';

export const maxDuration = 30;


export async function POST(req: Request) {
  const { theme, typeHint, description, existingComponents, afterId }: {
    theme: Theme;
    typeHint: ComponentType;
    description: string;
    existingComponents: Component[];
    afterId?: string;
  } = await req.json();

  if (!theme || !typeHint) {
    return new Response('Missing theme or typeHint', { status: 400 });
  }

  const startMs = Date.now();

  const { object, usage } = await generateObject({
    model: models.add,
    schema: addSchema,
    system: ADD_SYSTEM_PROMPT,
    prompt: ADD_USER_PROMPT(theme, typeHint, description, existingComponents),
    temperature: 0.7,
  });

  logLLMCall({
    route: 'POST /api/add',
    model: models.add.modelId,
    request: { typeHint, description },
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    durationMs: Date.now() - startMs,
    response: { id: object.id, type: object.type, label: object.label },
  });

  return Response.json({ ...object, afterId });
}
