import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { themeSchema } from '@/lib/ai/schemas';
import { SUGGEST_THEME_SYSTEM_PROMPT, SUGGEST_THEME_USER_PROMPT } from '@/lib/ai/prompts';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { appName, currentTheme, currentFont, target } = await req.json() as {
    appName: string;
    currentTheme: string;
    currentFont: string;
    target: 'theme' | 'font';
  };

  const { object } = await generateObject({
    model: models.suggest,
    schema: themeSchema,
    system: SUGGEST_THEME_SYSTEM_PROMPT,
    prompt: SUGGEST_THEME_USER_PROMPT(appName ?? '', currentTheme ?? 'light', currentFont ?? 'Inter', target ?? 'theme'),
  });

  return Response.json(object);
}
