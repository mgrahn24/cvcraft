import { streamObject } from 'ai';
import { models } from '@/lib/ai/models';
import { updateSchema } from '@/lib/ai/schemas';
import { CV_REFINEMENT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import type { Component, Theme } from '@/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json() as {
    components: Component[];
    theme: Theme;
    instruction: string;
    siteComponents?: Component[];
  };

  const componentList = body.components
    .map((c) => `ID: ${c.id}\nLabel: ${c.label}\nHTML:\n${c.html}`)
    .join('\n\n---\n\n');

  const result = streamObject({
    model: models.refine,
    schema: updateSchema,
    system: CV_REFINEMENT_SYSTEM_PROMPT,
    prompt: `Current CV sections:\n${componentList}\n\nTheme: ${body.theme.daisyTheme}\nFont: ${body.theme.fontFamily}\n\nInstruction: ${body.instruction}`,
  });

  return result.toTextStreamResponse();
}
