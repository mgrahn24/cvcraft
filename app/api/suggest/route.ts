import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { suggestSchema } from '@/lib/ai/schemas';
import { CV_SUGGEST_SYSTEM_PROMPT, SUGGEST_USER_PROMPT } from '@/lib/ai/prompts';
import type { Component, Theme } from '@/types';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { component, theme }: { component: Component; theme: Theme } = await req.json();

  if (!component || !theme) {
    return new Response('Missing component or theme', { status: 400 });
  }

  const { object } = await generateObject({
    model: models.suggest,
    schema: suggestSchema,
    system: CV_SUGGEST_SYSTEM_PROMPT,
    prompt: SUGGEST_USER_PROMPT(component, theme),
    temperature: 0.8,
  });

  return Response.json(object);
}
