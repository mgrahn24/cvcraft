import { streamObject } from 'ai';
import { models } from '@/lib/ai/models';
import { updateSchema } from '@/lib/ai/schemas';
import { CV_UPDATE_SYSTEM_PROMPT, UPDATE_USER_PROMPT } from '@/lib/ai/prompts';
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

  const result = streamObject({
    model: models.update,
    schema: updateSchema,
    system: CV_UPDATE_SYSTEM_PROMPT,
    prompt: UPDATE_USER_PROMPT(components, theme, instruction),
    temperature: 0.5,
  });

  return result.toTextStreamResponse();
}
