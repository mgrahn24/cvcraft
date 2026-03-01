import { streamText } from 'ai';
import { models } from '@/lib/ai/models';
import { GENERATION_SYSTEM_PROMPT, GENERATION_USER_PROMPT, type GenerationProjectContext } from '@/lib/ai/prompts';
import { logLLMCall, writeDebugRun } from '@/lib/utils/llmLogger';

// ── Reference URL scraping ────────────────────────────────────────────────────

/** Block private/local network addresses to prevent SSRF */
function isSafeUrl(raw: string): boolean {
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const h = url.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  // Block RFC-1918 / loopback / link-local ranges (simple string prefix check)
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
  }
  return true;
}

/** Strip HTML tags and extract readable text from a page, capped to ~4 000 chars */
function extractPageText(html: string): string {
  // Drop non-visible sections
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  const titleMatch = stripped.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const text = stripped
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const body = text.slice(0, 4000);
  return title ? `Page title: ${title}\n\n${body}` : body;
}

async function fetchReferenceContent(url: string): Promise<string | null> {
  if (!isSafeUrl(url)) return null;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Blitz/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) return null;
    const html = await res.text();
    return extractPageText(html);
  } catch {
    return null;
  }
}

export const maxDuration = 60;

export async function POST(req: Request) {
  const { description, projectContext, referenceUrl } = await req.json() as {
    description: string;
    projectContext?: GenerationProjectContext;
    referenceUrl?: string;
  };

  const debugMode = req.headers.get('X-Blitz-Debug') === '1';

  if (!description || typeof description !== 'string') {
    return new Response('Missing description', { status: 400 });
  }

  const referenceContent = referenceUrl ? await fetchReferenceContent(referenceUrl) : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      const startMs = Date.now();

      // Accumulated response for logging + debug output
      const parsedResponse: {
        theme: object | null;
        title: string;
        components: Array<{ id: string; type: string; label: string; html: string }>;
      } = { theme: null, title: 'Untitled', components: [] };

      try {
        const resolvedUserPrompt = GENERATION_USER_PROMPT(description, projectContext, referenceContent ?? undefined);

        // streamText gives token-by-token streaming from Groq, unlike streamObject
        // which buffers the full JSON before streaming. We ask the LLM to output
        // JSONL (one JSON object per line) so we can parse components as they arrive.
        const result = streamText({
          model: models.generate,
          system: GENERATION_SYSTEM_PROMPT,
          prompt: resolvedUserPrompt,
          temperature: 0.7,
        });

        let buf = '';
        let rawOutput = '';
        let order = 0;
        let themeSent = false;
        let pageTitle = 'Untitled';
        let appName = '';
        let currentPageSlug: string | null = null; // null = single-page mode

        const processObj = (obj: Record<string, unknown>) => {
          if (obj.theme && !themeSent) {
            // Metadata line
            if (obj.title) pageTitle = obj.title as string;
            if (obj.appName) appName = obj.appName as string;
            parsedResponse.theme = obj.theme as object;
            parsedResponse.title = pageTitle;
            emit({
              t: 'theme',
              daisyTheme: (obj.theme as Record<string, string>).daisyTheme ?? 'light',
              fontFamily: (obj.theme as Record<string, string>).fontFamily ?? 'Inter',
              title: obj.title ?? 'Untitled',
              appName: obj.appName ?? obj.title ?? 'Untitled',
            });
            themeSent = true;
          } else if (obj.page && obj.name) {
            // Page marker — start of a new page in multi-page output
            currentPageSlug = obj.page as string;
            order = 0; // reset component order for this page
            emit({ t: 'page', slug: obj.page, name: obj.name });
          } else if (obj.id && (obj.html || obj.columns)) {
            // Component line — regular, layout, or site-wide ("site":true)
            const isSite = obj.site === true;
            parsedResponse.components.push({ id: obj.id as string, type: (obj.type as string) ?? 'custom', label: (obj.label as string) ?? `Section ${order + 1}`, html: (obj.html as string) ?? '' });
            emit({
              t: isSite ? 'sc' : 'c', // 'sc' = site-wide component
              id: obj.id,
              ct: obj.type ?? 'custom',
              label: obj.label ?? `Section ${order + 1}`,
              html: (obj.html as string) ?? '',
              columns: obj.columns ?? null,
              order: isSite ? 0 : order++,
              pageSlug: isSite ? null : currentPageSlug,
            });
          }
        };

        for await (const chunk of result.textStream) {
          rawOutput += chunk;
          buf += chunk;

          // Process complete lines — each line should be a JSON object
          const lines = buf.split('\n');
          buf = lines.pop() ?? ''; // keep the last partial line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('```')) continue;
            try { processObj(JSON.parse(trimmed)); } catch { /* skip malformed */ }
          }
        }

        // Process any text remaining in the buffer after the stream ends
        const remaining = buf.trim();
        if (remaining && !remaining.startsWith('```')) {
          try { processObj(JSON.parse(remaining)); } catch { /* ignore */ }
        }

        emit({ t: 'done', title: pageTitle, appName: appName || pageTitle });

        const usage = await result.usage;

        if (debugMode) {
          emit({
            t: 'debug',
            model: models.generate.modelId,
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            durationMs: Date.now() - startMs,
            systemPrompt: GENERATION_SYSTEM_PROMPT,
            userPrompt: resolvedUserPrompt,
            rawOutput,
          });
        }

        const durationMs = Date.now() - startMs;
        logLLMCall({
          route: 'POST /api/generate',
          model: models.generate.modelId,
          request: description,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          durationMs,
          response: parsedResponse,
        });
        writeDebugRun({
          title: pageTitle,
          daisyTheme: (parsedResponse.theme as { daisyTheme?: string } | null)?.daisyTheme ?? 'light',
          fontFamily: (parsedResponse.theme as { fontFamily?: string } | null)?.fontFamily ?? 'Inter',
          components: parsedResponse.components,
          model: models.generate.modelId,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          durationMs,
          systemPrompt: GENERATION_SYSTEM_PROMPT,
          userPrompt: resolvedUserPrompt,
        });
      } catch (err) {
        emit({ t: 'err', msg: String(err) });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
