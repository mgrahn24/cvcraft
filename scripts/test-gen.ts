#!/usr/bin/env node
/**
 * Blitz Generation Test Suite
 *
 * Runs a battery of prompts through /api/generate and saves each result as a
 * standalone HTML file plus a .debug.json sidecar, then produces a summary
 * report (index.html) showing theme variety, component-type diversity, and
 * timing metrics.
 *
 * Usage:
 *   npx tsx scripts/test-gen.ts [options]
 *   npm run test:gen
 *
 * Options:
 *   --url   <url>        Base URL of the running dev server (default: http://localhost:3000)
 *   --out   <dir>        Output directory base (default: test-results)
 *   --quick              Run the curated 5-case set instead of all 15
 *   --filter <ids>       Comma-separated test IDs to run (e.g. --filter saas-pm,coffee)
 *   --concurrency <n>    Run N tests in parallel (default: 1)
 *
 * Each run creates test-results/YYYY-MM-DD_HH-MM/
 *   {id}.html            Rendered standalone page
 *   {id}.debug.json      Raw LLM output, prompts, model, token counts, timing
 *   index.html           Summary report
 */

import fs from 'node:fs';
import path from 'node:path';

// ── CLI args ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i !== -1 ? argv[i + 1] : undefined;
}
function hasFlag(flag: string): boolean {
  return argv.includes(flag);
}

const BASE_URL = getArg('--url') ?? 'http://localhost:3000';
const OUT_DIR_BASE = getArg('--out') ?? 'test-results';
const QUICK = hasFlag('--quick');
const FILTER = getArg('--filter')?.split(',').map((s) => s.trim());
const CONCURRENCY = parseInt(getArg('--concurrency') ?? '1', 10);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Component {
  id: string;
  type: string;
  label: string;
  html: string;
  order: number;
  columns?: Component[][];
}

interface Theme {
  daisyTheme: string;
  fontFamily: string;
}

interface DebugInfo {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Server-side wall time from first token to done */
  serverDurationMs: number;
  systemPrompt: string;
  userPrompt: string;
  rawOutput: string;
}

interface GenerationResult {
  theme: Theme | null;
  title: string;
  appName: string;
  siteComponents: Component[];
  components: Component[];
  errors: string[];
  /** Wall-clock time from fetch start to stream close (client-side) */
  durationMs: number;
  firstComponentMs: number | null;
  debug: DebugInfo | null;
}

interface TestCase {
  id: string;
  category: string;
  description: string;
}

// ── Test Cases ────────────────────────────────────────────────────────────────

const ALL_TEST_CASES: TestCase[] = [
  {
    id: 'saas-pm',
    category: 'SaaS',
    description:
      'Project management SaaS called "TaskFlow" — team collaboration, kanban boards, time tracking, integrations with Slack and GitHub, free trial',
  },
  {
    id: 'restaurant',
    category: 'Food & Drink',
    description:
      'Upscale Italian restaurant called "Trattoria Bella" — seasonal tasting menu, extensive wine cellar, private dining room, online reservations',
  },
  {
    id: 'portfolio',
    category: 'Personal',
    description:
      'Creative portfolio for a freelance UI/UX designer and frontend engineer — case studies, skills, testimonials, contact form',
  },
  {
    id: 'ecommerce',
    category: 'E-Commerce',
    description:
      'Premium sneaker store called "SoleMate" — trending drops, size guide, brand filters (Nike, Adidas, New Balance), loyalty rewards, cart',
  },
  {
    id: 'agency',
    category: 'Creative',
    description:
      'Digital creative agency called "Prism Studio" — branding, web design, motion graphics, award-winning work showcase, case studies',
  },
  {
    id: 'healthcare',
    category: 'Healthcare',
    description:
      'Family medical clinic called "Greenfield Health" — doctors, services, appointment booking, patient portal, insurance accepted',
  },
  {
    id: 'fitness-app',
    category: 'Mobile App',
    description:
      'Fitness tracking app called "FitPulse" — AI coaching, workout plans, nutrition tracking, before/after results, app store download, pricing tiers',
  },
  {
    id: 'coffee',
    category: 'Local Business',
    description:
      'Artisan coffee shop called "Grounds & Glory" — single-origin beans, pour-over and espresso brewing methods, multiple café locations, loyalty card app',
  },
  {
    id: 'nonprofit',
    category: 'Non-Profit',
    description:
      'Ocean conservation non-profit called "RewildNow" — mission and impact stats, donate button, volunteer sign-up, latest campaigns, partners',
  },
  {
    id: 'conference',
    category: 'Event',
    description:
      'Developer conference called "DevSummit 2025" — keynote speakers, schedule tracks, gold/silver sponsors, ticket tiers, venue and hotel info',
  },
  {
    id: 'education',
    category: 'Education',
    description:
      'Online coding bootcamp called "CodeCraft Academy" — full-stack and data science courses, career outcomes, student reviews, enrollment, financing options',
  },
  {
    id: 'lawfirm',
    category: 'Professional Services',
    description:
      'Boutique law firm called "Mercer & Associates" — practice areas (corporate, IP, litigation), attorney profiles, case results, free consultation form',
  },
  {
    id: 'realestate',
    category: 'Real Estate',
    description:
      'Real estate agency called "KeyStone Properties" — featured listings with photos, neighborhood guides, mortgage calculator, agent profiles, open houses',
  },
  {
    id: 'music',
    category: 'Entertainment',
    description:
      'Indie electronic music artist called "Neon Drift" — discography, upcoming tour dates, merch store, music video embed, press/booking contact',
  },
  {
    id: 'analytics-saas',
    category: 'SaaS',
    description:
      'B2B data analytics platform called "DataLens" — live dashboards, 50+ integrations, enterprise security, usage-based pricing tiers, free trial CTA',
  },
];

/** Curated 5-case set for quick iteration — covers major category clusters */
const QUICK_TEST_IDS = ['saas-pm', 'restaurant', 'portfolio', 'nonprofit', 'music'];

// ── HTML Builder (inlined from lib/utils/storage.ts) ─────────────────────────

function fontQueryParam(fontFamily: string): string {
  return encodeURIComponent(fontFamily).replace(/%20/g, '+');
}

const TAILWIND_CDN_CONFIG = `  <script>
    tailwind={config:{theme:{extend:{colors:{
      'base-100':'oklch(var(--b1) / <alpha-value>)',
      'base-200':'oklch(var(--b2) / <alpha-value>)',
      'base-300':'oklch(var(--b3) / <alpha-value>)',
      'base-content':'oklch(var(--bc) / <alpha-value>)',
      'primary':'oklch(var(--p) / <alpha-value>)',
      'primary-content':'oklch(var(--pc) / <alpha-value>)',
      'secondary':'oklch(var(--s) / <alpha-value>)',
      'secondary-content':'oklch(var(--sc) / <alpha-value>)',
      'accent':'oklch(var(--a) / <alpha-value>)',
      'accent-content':'oklch(var(--ac) / <alpha-value>)',
      'neutral':'oklch(var(--n) / <alpha-value>)',
      'neutral-content':'oklch(var(--nc) / <alpha-value>)',
      'info':'oklch(var(--in) / <alpha-value>)',
      'info-content':'oklch(var(--inc) / <alpha-value>)',
      'success':'oklch(var(--su) / <alpha-value>)',
      'success-content':'oklch(var(--suc) / <alpha-value>)',
      'warning':'oklch(var(--wa) / <alpha-value>)',
      'warning-content':'oklch(var(--wac) / <alpha-value>)',
      'error':'oklch(var(--er) / <alpha-value>)',
      'error-content':'oklch(var(--erc) / <alpha-value>)',
    }}}}}
  </script>`;

function renderComponentHtml(c: Component): string {
  let inner: string;
  if (c.type !== 'layout' || !c.columns) {
    inner = c.html;
  } else {
    const colDivs = c.columns
      .map(
        (col) =>
          `<div class="flex flex-col gap-4">${col.map((child) => child.html).join('\n')}</div>`
      )
      .join('\n');
    inner = `<div class="grid gap-4" style="grid-template-columns:repeat(${c.columns.length},minmax(0,1fr))">${colDivs}</div>`;
  }
  return `<div id="${c.id}">\n${inner}\n</div>`;
}

function buildHtml(result: GenerationResult, testCase: TestCase): string {
  const theme = result.theme ?? { daisyTheme: 'light', fontFamily: 'Inter' };
  const fontParam = fontQueryParam(theme.fontFamily);
  const siteHeader = result.siteComponents.filter((c) => c.type !== 'footer');
  const siteFooter = result.siteComponents.filter((c) => c.type === 'footer');
  const allComponents = [...result.components].sort((a, b) => a.order - b.order);

  const body = [
    ...siteHeader.map(renderComponentHtml),
    ...allComponents.map(renderComponentHtml),
    ...siteFooter.map(renderComponentHtml),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme.daisyTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${result.title || testCase.id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <link
    href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css"
    rel="stylesheet"
    type="text/css"
  />

${TAILWIND_CDN_CONFIG}

  <!-- Tailwind Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    body { font-family: '${theme.fontFamily}', sans-serif; }
  </style>
</head>
<body style="font-family: '${theme.fontFamily}', sans-serif;">

${body}

  <!-- Alpine.js -->
  <script
    defer
    src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
  ></script>

  <!-- Lucide icons -->
  <script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.lucide) window.lucide.createIcons();
    });
  </script>
</body>
</html>`;
}

// ── SSE Stream Parser ─────────────────────────────────────────────────────────

async function runGeneration(testCase: TestCase): Promise<GenerationResult> {
  const result: GenerationResult = {
    theme: null,
    title: '',
    appName: '',
    siteComponents: [],
    components: [],
    errors: [],
    durationMs: 0,
    firstComponentMs: null,
    debug: null,
  };

  const start = Date.now();
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Blitz-Debug': '1',
      },
      body: JSON.stringify({ description: testCase.description }),
    });
  } catch (err) {
    result.errors.push(`Fetch failed: ${err}`);
    result.durationMs = Date.now() - start;
    return result;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    result.errors.push(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    result.durationMs = Date.now() - start;
    return result;
  }

  if (!response.body) {
    result.errors.push('No response body');
    result.durationMs = Date.now() - start;
    return result;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  outer: while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch (err) {
      result.errors.push(`Stream read error: ${err}`);
      break;
    }

    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const json = trimmed.slice(6).trim();
      if (!json || json === '[DONE]') continue;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(json) as Record<string, unknown>;
      } catch {
        continue;
      }

      const t = event.t as string;

      if (t === 'theme') {
        result.theme = {
          daisyTheme: (event.daisyTheme as string) ?? 'light',
          fontFamily: (event.fontFamily as string) ?? 'Inter',
        };
        result.title = (event.title as string) ?? '';
        result.appName = (event.appName as string) ?? '';
      } else if (t === 'sc') {
        if (result.firstComponentMs === null) result.firstComponentMs = Date.now() - start;
        result.siteComponents.push({
          id: (event.id as string) ?? '',
          type: (event.ct as string) ?? 'custom',
          label: (event.label as string) ?? '',
          html: (event.html as string) ?? '',
          order: (event.order as number) ?? 0,
          columns: event.columns as Component[][] | undefined,
        });
      } else if (t === 'c') {
        if (result.firstComponentMs === null) result.firstComponentMs = Date.now() - start;
        result.components.push({
          id: (event.id as string) ?? '',
          type: (event.ct as string) ?? 'custom',
          label: (event.label as string) ?? '',
          html: (event.html as string) ?? '',
          order: (event.order as number) ?? 0,
          columns: event.columns as Component[][] | undefined,
        });
      } else if (t === 'done') {
        if (event.title) result.title = event.title as string;
        if (event.appName) result.appName = event.appName as string;
        // don't break — wait for the t:'debug' event that follows
      } else if (t === 'debug') {
        result.debug = {
          model: (event.model as string) ?? '',
          inputTokens: (event.inputTokens as number) ?? 0,
          outputTokens: (event.outputTokens as number) ?? 0,
          serverDurationMs: (event.durationMs as number) ?? 0,
          systemPrompt: (event.systemPrompt as string) ?? '',
          userPrompt: (event.userPrompt as string) ?? '',
          rawOutput: (event.rawOutput as string) ?? '',
        };
        break outer;
      } else if (t === 'err') {
        result.errors.push(`API error: ${JSON.stringify(event)}`);
        break outer;
      }
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ── Debug file writer ─────────────────────────────────────────────────────────

function writeDebugFile(
  filePath: string,
  testCase: TestCase,
  result: GenerationResult
): void {
  const allComps = [...result.siteComponents, ...result.components];
  const typeCounts: Record<string, number> = {};
  for (const c of allComps) typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1;

  const payload = {
    testId: testCase.id,
    category: testCase.category,
    description: testCase.description,

    // Client-side measurements
    clientDurationMs: result.durationMs,
    firstComponentMs: result.firstComponentMs,

    // Theme / output summary
    theme: result.theme,
    title: result.title,
    appName: result.appName,
    componentCount: allComps.length,
    componentTypeCounts: typeCounts,
    errors: result.errors,

    // Server-side measurements & prompts (from t:'debug' event)
    ...(result.debug
      ? {
          model: result.debug.model,
          inputTokens: result.debug.inputTokens,
          outputTokens: result.debug.outputTokens,
          totalTokens: result.debug.inputTokens + result.debug.outputTokens,
          serverDurationMs: result.debug.serverDurationMs,
          systemPrompt: result.debug.systemPrompt,
          userPrompt: result.debug.userPrompt,
          rawLlmOutput: result.debug.rawOutput,
        }
      : { note: 'No debug event received — server may not support X-Blitz-Debug header' }),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

// ── Metrics ───────────────────────────────────────────────────────────────────

function allTypes(result: GenerationResult): string[] {
  return [
    ...new Set([...result.siteComponents, ...result.components].map((c) => c.type)),
  ];
}

// ── Report Generator ──────────────────────────────────────────────────────────

function pill(text: string, bg: string): string {
  const dark = bg.startsWith('#1') || bg.startsWith('#0') || bg.startsWith('#2') || bg.startsWith('#3');
  const fg = dark ? '#f8fafc' : '#1e293b';
  return `<span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:1px 8px;font-size:0.72rem;font-weight:500;margin:1px;">${text}</span>`;
}

const THEME_COLORS: Record<string, string> = {
  light: '#e0f2fe', corporate: '#dbeafe', winter: '#ede9fe', nord: '#f0fdf4',
  cupcake: '#fce7f3', bumblebee: '#fef9c3', valentine: '#fce7f3', pastel: '#f5f3ff',
  lemonade: '#fefce8', aqua: '#ecfeff', acid: '#ecfccb', cmyk: '#fff7ed',
  fantasy: '#f3e8ff', retro: '#fef3c7', lofi: '#f1f5f9',
  dark: '#1e293b', dim: '#334155', night: '#0f172a', dracula: '#1e1b4b',
  luxury: '#292524', coffee: '#3b1f14', black: '#000000',
};
function themeColor(t: string): string {
  return THEME_COLORS[t] ?? '#e5e7eb';
}

function buildReport(
  results: Array<{ testCase: TestCase; result: GenerationResult; htmlFile: string; debugFile: string }>
): string {
  const timestamp = new Date().toLocaleString();
  const passed = results.filter((r) => r.result.errors.length === 0);

  const themes = results.map((r) => r.result.theme?.daisyTheme).filter(Boolean) as string[];
  const uniqueThemes = [...new Set(themes)];

  const fonts = results.map((r) => r.result.theme?.fontFamily).filter(Boolean) as string[];
  const uniqueFonts = [...new Set(fonts)];

  const avgTime =
    results.length
      ? results.reduce((a, r) => a + r.result.durationMs, 0) / results.length / 1000
      : 0;

  // Component type frequency across all runs
  const globalTypeCounts: Record<string, number> = {};
  for (const { result } of results) {
    for (const c of [...result.siteComponents, ...result.components]) {
      globalTypeCounts[c.type] = (globalTypeCounts[c.type] ?? 0) + 1;
    }
  }
  const sortedTypes = Object.entries(globalTypeCounts).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedTypes[0]?.[1] ?? 1;

  const rows = results
    .map(({ testCase, result, htmlFile, debugFile }) => {
      const types = allTypes(result);
      const total = result.siteComponents.length + result.components.length;
      const ok = result.errors.length === 0;
      const ttf = result.firstComponentMs
        ? (result.firstComponentMs / 1000).toFixed(1) + 's'
        : '—';
      const dbg = result.debug;

      return `
    <tr>
      <td><a href="${path.basename(htmlFile)}" target="_blank" rel="noopener">${testCase.id}</a>&nbsp;<a href="${path.basename(debugFile)}" target="_blank" rel="noopener" title="debug JSON" style="font-size:0.75rem;color:#94a3b8">[dbg]</a></td>
      <td style="color:#6b7280;font-size:0.8rem">${testCase.category}</td>
      <td style="font-weight:600;color:${ok ? '#16a34a' : '#dc2626'}">${ok ? '✓' : '✗'}</td>
      <td>${result.theme ? pill(result.theme.daisyTheme, themeColor(result.theme.daisyTheme)) : '—'}</td>
      <td style="font-size:0.8rem">${result.theme?.fontFamily ?? '—'}</td>
      <td style="text-align:center">${total}</td>
      <td style="font-size:0.75rem;color:#6b7280">${types.join(' · ')}</td>
      <td style="text-align:center;color:#6b7280">${ttf}</td>
      <td style="text-align:center">${(result.durationMs / 1000).toFixed(1)}s</td>
      <td style="text-align:center;font-size:0.8rem">${dbg ? dbg.inputTokens.toLocaleString() : '—'}</td>
      <td style="text-align:center;font-size:0.8rem">${dbg ? dbg.outputTokens.toLocaleString() : '—'}</td>
      <td style="font-size:0.72rem;color:#dc2626;max-width:220px;word-break:break-word">${result.errors.join('; ')}</td>
    </tr>`;
    })
    .join('');

  const typeChart = sortedTypes
    .map(
      ([type, count]) => `
    <tr>
      <td style="padding:3px 8px;font-size:0.8rem;white-space:nowrap">${type}</td>
      <td style="padding:3px 8px;width:100%">
        <div style="background:#6366f1;height:14px;border-radius:3px;width:${Math.round((count / maxCount) * 100)}%"></div>
      </td>
      <td style="padding:3px 8px;font-size:0.8rem;color:#6b7280;white-space:nowrap">${count}×</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blitz Test Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 32px 24px; background: #f8fafc; color: #0f172a; }
    h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 4px; }
    h2 { font-size: 0.9rem; font-weight: 600; margin: 0 0 12px; color: #374151; text-transform: uppercase; letter-spacing: .06em; }
    .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 28px; }
    .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: white; border-radius: 10px; padding: 14px 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); min-width: 120px; }
    .stat-value { font-size: 1.75rem; font-weight: 700; line-height: 1; }
    .stat-label { color: #6b7280; font-size: 0.72rem; margin-top: 4px; text-transform: uppercase; letter-spacing: .05em; }
    .pills { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; margin-bottom: 24px; }
    .card-header { padding: 12px 18px; border-bottom: 1px solid #f1f5f9; }
    table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
    th { background: #f8fafc; text-align: left; padding: 8px 10px; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafafa; }
    a { color: #6366f1; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Blitz Generation Test Report</h1>
  <div class="meta">
    ${timestamp} &nbsp;·&nbsp; ${BASE_URL} &nbsp;·&nbsp; ${results.length} tests
    ${QUICK ? '&nbsp;·&nbsp; <strong>quick mode</strong>' : ''}
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${passed.length}/${results.length}</div>
      <div class="stat-label">Passed</div>
    </div>
    <div class="stat">
      <div class="stat-value">${uniqueThemes.length}</div>
      <div class="stat-label">Unique Themes</div>
      <div class="pills">${uniqueThemes.map((t) => pill(t, themeColor(t))).join('')}</div>
    </div>
    <div class="stat">
      <div class="stat-value">${uniqueFonts.length}</div>
      <div class="stat-label">Unique Fonts</div>
      <div style="font-size:0.75rem;color:#6b7280;margin-top:4px">${uniqueFonts.join(', ')}</div>
    </div>
    <div class="stat">
      <div class="stat-value">${sortedTypes.length}</div>
      <div class="stat-label">Component Types</div>
    </div>
    <div class="stat">
      <div class="stat-value">${avgTime.toFixed(1)}s</div>
      <div class="stat-label">Avg. Time</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h2>Results</h2></div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Category</th>
          <th>OK</th>
          <th>Theme</th>
          <th>Font</th>
          <th style="text-align:center">Comps</th>
          <th>Types</th>
          <th style="text-align:center">→1st</th>
          <th style="text-align:center">Total</th>
          <th style="text-align:center">In tok</th>
          <th style="text-align:center">Out tok</th>
          <th>Errors</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="card">
    <div class="card-header"><h2>Component Type Frequency</h2></div>
    <div style="padding:10px 14px">
      <table style="width:100%;border-collapse:collapse">${typeChart}</table>
    </div>
  </div>
</body>
</html>`;
}

// ── Concurrency helper ────────────────────────────────────────────────────────

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let TEST_CASES = QUICK
    ? ALL_TEST_CASES.filter((tc) => QUICK_TEST_IDS.includes(tc.id))
    : ALL_TEST_CASES;

  if (FILTER) {
    TEST_CASES = TEST_CASES.filter((tc) => FILTER.includes(tc.id));
    if (TEST_CASES.length === 0) {
      console.error(`No test cases matched filter: ${FILTER.join(', ')}`);
      console.error(`Available IDs: ${ALL_TEST_CASES.map((tc) => tc.id).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`\nBlitz Generation Test Suite`);
  console.log(`  Server:      ${BASE_URL}`);
  console.log(`  Tests:       ${TEST_CASES.length}${QUICK ? ' (quick)' : ''}`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  console.log(`  Output:      ${OUT_DIR_BASE}/\n`);

  // Verify server is reachable
  try {
    const probe = await fetch(`${BASE_URL}/`);
    if (!probe.ok && probe.status !== 404 && probe.status !== 200) throw new Error(`HTTP ${probe.status}`);
  } catch (err) {
    console.error(`Cannot reach ${BASE_URL} — is the dev server running?`);
    console.error(`  npm run dev`);
    console.error(`  Error: ${err}`);
    process.exit(1);
  }

  // Create timestamped output directory
  const ts = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 16);
  const runDir = path.join(OUT_DIR_BASE, ts);
  fs.mkdirSync(runDir, { recursive: true });

  const reportEntries: Array<{
    testCase: TestCase;
    result: GenerationResult;
    htmlFile: string;
    debugFile: string;
  }> = new Array(TEST_CASES.length);

  const activeLabel = new Map<number, string>();

  function printConcurrentStatus() {
    process.stdout.write('\r' + [...activeLabel.values()].join('  ') + '          ');
  }

  await runWithConcurrency(TEST_CASES, CONCURRENCY, async (testCase, i) => {
    const prefix = `[${i + 1}/${TEST_CASES.length}]`;

    if (CONCURRENCY === 1) {
      process.stdout.write(`${prefix} ${testCase.id.padEnd(18)} `);
    } else {
      activeLabel.set(i, `${prefix}${testCase.id}…`);
      printConcurrentStatus();
    }

    const result = await runGeneration(testCase);
    const htmlFile = path.join(runDir, `${testCase.id}.html`);
    const debugFile = path.join(runDir, `${testCase.id}.debug.json`);

    // Write HTML
    fs.writeFileSync(htmlFile, buildHtml(result, testCase), 'utf-8');

    // Write debug sidecar
    writeDebugFile(debugFile, testCase, result);

    if (CONCURRENCY === 1) {
      if (result.errors.length === 0) {
        const total = result.siteComponents.length + result.components.length;
        const types = allTypes(result).join(' ');
        const tok = result.debug
          ? `  ${result.debug.inputTokens}in/${result.debug.outputTokens}out tok`
          : '';
        console.log(
          `OK  ${total} comps  theme=${result.theme?.daisyTheme ?? '?'}  ${(result.durationMs / 1000).toFixed(1)}s${tok}  [${types}]`
        );
      } else {
        console.log(`ERR  ${result.errors[0].slice(0, 80)}`);
      }
    } else {
      activeLabel.delete(i);
      const ok = result.errors.length === 0;
      const total = result.siteComponents.length + result.components.length;
      const line = ok
        ? `${prefix} ${testCase.id.padEnd(18)} OK  ${total} comps  ${(result.durationMs / 1000).toFixed(1)}s`
        : `${prefix} ${testCase.id.padEnd(18)} ERR  ${result.errors[0].slice(0, 60)}`;
      process.stdout.write('\r' + line + '\n');
      printConcurrentStatus();
    }

    reportEntries[i] = { testCase, result, htmlFile, debugFile };
  });

  if (CONCURRENCY > 1) process.stdout.write('\n');

  // Write report
  const reportFile = path.join(runDir, 'index.html');
  fs.writeFileSync(reportFile, buildReport(reportEntries), 'utf-8');

  const passCount = reportEntries.filter((e) => e.result.errors.length === 0).length;
  const uniqueThemes = new Set(reportEntries.map((e) => e.result.theme?.daisyTheme).filter(Boolean)).size;

  console.log(`\nDone — ${passCount}/${TEST_CASES.length} passed, ${uniqueThemes} unique themes`);
  console.log(`Report: ${path.resolve(reportFile)}\n`);
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
