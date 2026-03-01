import type { PageState, PageEntry, SavedPage, Component } from '@/types';

const AUTOSAVE_KEY = 'blitz-autosave';   // legacy single-page key (read-only migration)
const PROJECT_KEY = 'blitz-project';
const SAVES_KEY = 'blitz-saves';

// ── Project (multi-page) save/load ─────────────────────────────────────────

interface ProjectSave {
  version: 2;
  entries: PageEntry[];
  activePageId: string | null;
  appName: string;
  publishedSlug?: string;
  publishedPrivate?: boolean;
  siteComponents?: Component[];
}

export function saveProject(
  entries: PageEntry[],
  activePageId: string | null,
  appName: string,
  publishedSlug?: string | null,
  publishedPrivate?: boolean,
  siteComponents?: Component[]
): void {
  try {
    const data: ProjectSave = {
      version: 2,
      entries,
      activePageId,
      appName,
      ...(publishedSlug ? { publishedSlug, publishedPrivate: publishedPrivate ?? false } : {}),
      ...(siteComponents && siteComponents.length > 0 ? { siteComponents } : {}),
    };
    localStorage.setItem(PROJECT_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or unavailable — silently ignore
  }
}

export function loadProject(): { entries: PageEntry[]; activePageId: string | null; appName: string; publishedSlug: string | null; publishedPrivate: boolean; siteComponents: Component[] } | null {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProjectSave;
    if (parsed?.version !== 2 || !Array.isArray(parsed.entries)) return null;
    return {
      entries: parsed.entries,
      activePageId: parsed.activePageId,
      appName: parsed.appName ?? '',
      publishedSlug: parsed.publishedSlug ?? null,
      publishedPrivate: parsed.publishedPrivate ?? false,
      siteComponents: parsed.siteComponents ?? [],
    };
  } catch {
    return null;
  }
}

// ── Legacy single-page autosave (migration only) ────────────────────────────

export function loadAutosaveLegacy(): PageState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PageState;
    if (!parsed?.components || !parsed?.theme) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Named saves ────────────────────────────────────────────────────────────

export function loadSaves(): SavedPage[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPage[];
  } catch {
    return [];
  }
}

export function savePage(
  name: string,
  entries: PageEntry[],
  activePageId: string | null,
  appName: string,
  publishedSlug?: string | null,
  publishedPrivate?: boolean
): SavedPage {
  const fallbackName = appName || entries[0]?.content.title || 'Untitled';
  const entry: SavedPage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || fallbackName,
    timestamp: new Date().toISOString(),
    entries,
    activePageId,
    appName,
    ...(publishedSlug ? { publishedSlug, publishedPrivate: publishedPrivate ?? false } : {}),
  };
  const existing = loadSaves();
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify([entry, ...existing]));
  } catch {
    // ignore
  }
  return entry;
}

export function deleteSave(id: string): void {
  const saves = loadSaves().filter((s) => s.id !== id);
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch {
    // ignore
  }
}

// ── Standalone HTML export ─────────────────────────────────────────────────

function fontQueryParam(fontFamily: string): string {
  return encodeURIComponent(fontFamily).replace(/%20/g, '+');
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Tailwind CDN config — must appear before the CDN <script> tag.
 * Maps DaisyUI semantic color names to their CSS variable expressions so that
 * gradient utilities (from-primary, to-base-200, bg-gradient-*, etc.) generate
 * correct CSS. Without this the CDN skips or incorrectly overrides the gradient
 * rules that DaisyUI provides in its own stylesheet.
 */
const TAILWIND_CDN_CONFIG = `  <!-- Tailwind CDN config: DaisyUI colors → CSS variables (must precede CDN) -->
  <script>
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

/** Render a component's HTML for export — handles layout containers specially.
 *  Each component is wrapped in a div with the component's id so that
 *  internal anchor links (#componentId) scroll correctly in the exported page. */
function renderComponentHtml(c: import('@/types').Component): string {
  let inner: string;
  if (c.type !== 'layout' || !c.columns) {
    inner = c.html;
  } else {
    const colDivs = c.columns
      .map((col) => `<div class="flex flex-col gap-4">${col.map((child) => child.html).join('\n')}</div>`)
      .join('\n');
    inner = `<div class="grid gap-4" style="grid-template-columns:repeat(${c.columns.length},minmax(0,1fr))">${colDivs}</div>`;
  }
  return `<div id="${c.id}">\n${inner}\n</div>`;
}

/** Single-page export */
export function buildSinglePageHtml(page: PageState, title: string, siteComponents: Component[] = []): string {
  const { theme, components } = page;
  const fontParam = fontQueryParam(theme.fontFamily);
  const siteHeader = siteComponents.filter((c) => c.type !== 'footer');
  const siteFooter = siteComponents.filter((c) => c.type === 'footer');
  const body = [
    ...siteHeader.map(renderComponentHtml),
    ...components.map(renderComponentHtml),
    ...siteFooter.map(renderComponentHtml),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme.daisyTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>

  <!-- Google Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />

  <!-- DaisyUI -->
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

/** Multi-page export: hash-based page router — pages switch via href="#slug" links */
function buildMultiPageHtml(entries: PageEntry[], title: string, siteComponents: Component[] = []): string {
  // Use theme/font from the first entry (first page wins for <head>)
  const firstEntry = entries[0];
  const { theme } = firstEntry.content;
  const fontParam = fontQueryParam(theme.fontFamily);
  const slugList = entries.map((e) => `'${e.slug}'`).join(',');

  const siteHeader = siteComponents.filter((c) => c.type !== 'footer');
  const siteFooter = siteComponents.filter((c) => c.type === 'footer');

  // Page sections — first page visible, rest hidden; the hash router toggles them
  const pageSections = entries
    .map((e, i) => {
      const body = [
        ...siteHeader.map(renderComponentHtml),
        ...e.content.components.map(renderComponentHtml),
        ...siteFooter.map(renderComponentHtml),
      ].join('\n');
      return `  <!-- Page: ${escapeHtml(e.name)} -->\n  <div id="page-${e.slug}"${i > 0 ? ' style="display:none"' : ''}>\n${body}\n  </div>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en" data-theme="${theme.daisyTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>

  <!-- Google Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />

  <!-- DaisyUI -->
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

  <!-- Page router:
       • href="#slug"           → switch to that page
       • href="#slug~section"   → switch to page, then scroll to #section
       • unknown hash           → in-page anchor scroll (browser default) -->
  <script>
    (function () {
      var pages = [${slugList}];
      function show(slug) {
        pages.forEach(function (s) {
          var el = document.getElementById('page-' + s);
          if (el) el.style.display = s === slug ? '' : 'none';
        });
      }
      function onHash() {
        var hash = location.hash.replace(/^#\\/?/, '');
        if (!hash) { show(pages[0]); return; }
        var tilde = hash.indexOf('~');
        if (tilde !== -1) {
          var pageSlug = hash.slice(0, tilde);
          var sectionId = hash.slice(tilde + 1);
          if (pages.indexOf(pageSlug) !== -1) {
            show(pageSlug);
            setTimeout(function () {
              var el = document.getElementById(sectionId);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 50);
            return;
          }
        }
        if (pages.indexOf(hash) !== -1) { show(hash); return; }
        // Unknown hash = in-page anchor — let browser scroll, don't switch pages
      }
      document.addEventListener('DOMContentLoaded', onHash);
      window.addEventListener('hashchange', onHash);
    })();
  </script>
</head>
<body style="font-family: '${theme.fontFamily}', sans-serif;">

${pageSections}

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

/**
 * Build the complete HTML string for the project without triggering a download.
 * Safe to call from both browser and server contexts.
 */
export function buildProjectHtml(
  entries: PageEntry[],
  activePageId: string | null,
  livePage: PageState | null,
  siteComponents: Component[] = []
): string {
  if (entries.length === 0) return '';
  const syncedEntries = entries.map((e) =>
    e.id === activePageId && livePage ? { ...e, content: livePage } : e
  );
  const title = syncedEntries[0].content.title || 'Page';
  return syncedEntries.length === 1
    ? buildSinglePageHtml(syncedEntries[0].content, title, siteComponents)
    : buildMultiPageHtml(syncedEntries, title, siteComponents);
}

/**
 * Download the project as a standalone HTML file.
 * `livePage` is the current unsaved state of the active page (not yet synced to entries).
 * `activePageId` identifies which entry to replace with `livePage` before export.
 */
export function downloadStandaloneHtml(
  entries: PageEntry[],
  activePageId: string | null,
  livePage: PageState | null,
  siteComponents: Component[] = []
): void {
  if (entries.length === 0) return;

  const html = buildProjectHtml(entries, activePageId, livePage, siteComponents);
  const syncedEntries = entries.map((e) =>
    e.id === activePageId && livePage ? { ...e, content: livePage } : e
  );
  const title = syncedEntries[0].content.title || 'Page';
  const filename =
    syncedEntries.length === 1
      ? `${(syncedEntries[0].content.title || 'page').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.html`
      : `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-site.html`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
