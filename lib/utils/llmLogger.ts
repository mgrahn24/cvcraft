import fs from 'fs';
import path from 'path';

interface LLMLogEntry {
  route: string;
  model: string;
  request: string | Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  response: unknown;
}

export function logLLMCall({ route, model, request, inputTokens, outputTokens, durationMs, response }: LLMLogEntry) {
  console.log(
    `\n━━ LLM [${route}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `\n  model:    ${model}`,
    `\n  request:  ${
      typeof request === 'string'
        ? request.length > 300 ? request.slice(0, 300) + '…' : request
        : JSON.stringify(request)
    }`,
    `\n  tokens:   in=${inputTokens}  out=${outputTokens}  total=${inputTokens + outputTokens}`,
    `\n  time:     ${durationMs}ms`,
    `\n  response: ${JSON.stringify(response, null, 2)}`,
    '\n',
  );
}

interface DebugRunOptions {
  title: string;
  daisyTheme: string;
  fontFamily: string;
  components: Array<{ html: string }>;
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  systemPrompt: string;
  userPrompt: string;
}

export function writeDebugRun({
  title, daisyTheme, fontFamily, components,
  model, inputTokens, outputTokens, durationMs,
  systemPrompt, userPrompt,
}: DebugRunOptions) {
  // Only write locally — Vercel always sets VERCEL=1
  if (process.env.VERCEL) return;

  const html = buildDebugHtml(title, daisyTheme, fontFamily, components);

  try {
    const debugRoot = path.join(process.cwd(), 'debug');

    // Timestamped run folder: YYYY-MM-DD_HH-MM-SS_title-slug
    const now = new Date();
    const ts = now.toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
    const titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    const runDir = path.join(debugRoot, `${ts}_${titleSlug}`);

    fs.mkdirSync(runDir, { recursive: true });

    fs.writeFileSync(path.join(runDir, 'page.html'), html, 'utf8');

    const log = {
      timestamp: now.toISOString(),
      title,
      model,
      daisyVariant: process.env.DAISY_VARIANT ?? 'underused',
      daisyTheme,
      fontFamily,
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      durationMs,
      systemPrompt,
      userPrompt,
    };
    fs.writeFileSync(path.join(runDir, 'log.json'), JSON.stringify(log, null, 2), 'utf8');

    // Keep debug/latest.html pointing at the newest run for quick preview
    fs.writeFileSync(path.join(debugRoot, 'latest.html'), html, 'utf8');

    console.log(`  [debug] written → debug/${ts}_${titleSlug}/`);
  } catch (err) {
    console.warn('  [debug] Failed to write debug run:', err);
  }
}

function buildDebugHtml(
  title: string,
  daisyTheme: string,
  fontFamily: string,
  components: Array<{ html: string }>,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Poppins:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Raleway:wght@400;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css" rel="stylesheet" type="text/css" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <style>body { font-family: '${fontFamily}', sans-serif; }</style>
</head>
<body data-theme="${daisyTheme}">
${components.map((c) => c.html).join('\n')}
</body>
</html>`;
}
