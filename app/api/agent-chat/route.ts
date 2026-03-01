import { generateText } from 'ai';
import { models } from '@/lib/ai/models';
import { AGENT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { agentTurnSchema } from '@/lib/ai/schemas';

export const maxDuration = 30;

// Appended to the system prompt to guarantee JSON output from models that
// don't reliably honour Groq's structured-output mode.
const JSON_FORMAT_INSTRUCTION = `

RESPONSE FORMAT — you MUST output ONLY a single valid JSON object with no other text before or after it. No markdown, no code fences.

Schema:
{
  "message": "<your question or closing message — 1-2 sentences>",
  "done": <true | false>,
  "generationPrompt": "<detailed page generation instructions — non-empty only when done=true, otherwise empty string>",
  "inputType": "<'text' | 'select' | 'multiselect'>",
  "inputPlaceholder": "<hint text for text inputs, empty string otherwise>",
  "inputOptions": ["<option1>", "<option2>", ...]
}

Examples:
{"message":"What type of page do you want to build?","done":false,"generationPrompt":"","inputType":"select","inputPlaceholder":"","inputOptions":["Portfolio","Business website","Blog","CV / Resume","Landing page","Other"]}
{"message":"Which sections should the page include?","done":false,"generationPrompt":"","inputType":"multiselect","inputPlaceholder":"","inputOptions":["Hero / intro","About","Services","Portfolio / work","Testimonials","Contact","Pricing"]}
{"message":"What's the name or subject of this site?","done":false,"generationPrompt":"","inputType":"text","inputPlaceholder":"e.g. Jane Smith, Acme Corp, my startup…","inputOptions":[]}
{"message":"I have everything I need — let's build it!","done":true,"generationPrompt":"Create a modern portfolio website for Jane Smith, a senior UX designer...","inputType":"text","inputPlaceholder":"","inputOptions":[]}`;

export async function POST(req: Request) {
  const { messages } = await req.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!Array.isArray(messages)) {
    return Response.json({ error: 'Invalid messages' }, { status: 400 });
  }

  // The SDK requires at least one message — seed the first turn with a bootstrap prompt
  const effectiveMessages =
    messages.length === 0
      ? [{ role: 'user' as const, content: 'Start the conversation.' }]
      : messages;

  const { text } = await generateText({
    model: models.agent,
    system: AGENT_SYSTEM_PROMPT + JSON_FORMAT_INSTRUCTION,
    messages: effectiveMessages,
  });

  // Extract the JSON object from the response (strips any accidental prose/fences)
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error('[agent-chat] No JSON found in response:', text);
    return Response.json({ error: 'Malformed response from model' }, { status: 500 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    console.error('[agent-chat] JSON parse error:', match[0], e);
    return Response.json({ error: 'Could not parse model response' }, { status: 500 });
  }

  const result = agentTurnSchema.safeParse(parsed);
  if (!result.success) {
    console.error('[agent-chat] Schema validation failed:', result.error.issues);
    return Response.json({ error: 'Invalid response shape from model' }, { status: 500 });
  }

  return Response.json(result.data);
}
