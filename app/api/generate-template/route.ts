import { generateObject } from 'ai';
import { models } from '@/lib/ai/models';
import { cvGenerationSchema, cvBrandExtractionSchema } from '@/lib/ai/schemas';
import {
  CV_TEMPLATE_GENERATION_SYSTEM_PROMPT,
  CV_TEMPLATE_GENERATION_USER_PROMPT,
  CV_BRAND_EXTRACTION_SYSTEM_PROMPT,
  CV_BRAND_EXTRACTION_USER_PROMPT,
} from '@/lib/ai/prompts';

export const maxDuration = 120;

/** Fetch a URL server-side and return raw + cleaned HTML (best-effort, no auth). */
async function fetchWebpage(url: string): Promise<{ raw: string; clean: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CVCraft/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const raw = await res.text();
    const clean = raw
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\s{3,}/g, ' ')
      .trim();
    return { raw, clean };
  } catch {
    return null;
  }
}

/**
 * Extract the best candidate logo URL from raw HTML.
 * Priority: <img logo> → apple-touch-icon → og:image
 */
function extractLogoUrl(html: string, baseUrl: string): string | null {
  function resolve(src: string): string | null {
    if (!src || src.startsWith('data:')) return null;
    try { return new URL(src, baseUrl).href; } catch { return null; }
  }

  // 1. <img> with "logo" in id, class, or alt attribute
  for (const match of html.matchAll(/<img\b[^>]+>/gi)) {
    const tag = match[0];
    if (/(?:id|class|alt)="[^"]*logo[^"]*"/i.test(tag)) {
      const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
      if (src) { const url = resolve(src); if (url) return url; }
    }
  }

  // 2. <link rel="apple-touch-icon"> — larger than a standard favicon
  const appleIcon = html.match(/<link\b[^>]*\brel="apple-touch-icon(?:-precomposed)?"[^>]*>/i);
  if (appleIcon) {
    const href = appleIcon[0].match(/\bhref="([^"]+)"/i)?.[1];
    if (href) { const url = resolve(href); if (url) return url; }
  }

  // 3. og:image — usually a representative image
  const ogImage = html.match(/<meta\b[^>]*\bproperty="og:image"[^>]*>/i);
  if (ogImage) {
    const content = ogImage[0].match(/\bcontent="([^"]+)"/i)?.[1];
    if (content) { const url = resolve(content); if (url) return url; }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      description: string;
      brandUrl?: string;
    };

    const { description, brandUrl } = body;
    if (!description?.trim()) {
      return new Response('description is required', { status: 400 });
    }

    // Optional brand extraction from URL
    let brandContext: string | undefined;
    if (brandUrl?.trim()) {
      const page = await fetchWebpage(brandUrl.trim());
      if (page) {
        // Extract logo deterministically from raw HTML before LLM sees it
        const logoUrl = extractLogoUrl(page.raw, brandUrl.trim());

        try {
          const { object: brand } = await generateObject({
            model: models.generate,
            schema: cvBrandExtractionSchema,
            system: CV_BRAND_EXTRACTION_SYSTEM_PROMPT,
            prompt: CV_BRAND_EXTRACTION_USER_PROMPT(brandUrl.trim(), page.clean),
          });

          const lines: string[] = [];
          if (brand.companyName) lines.push(`Company: ${brand.companyName}`);
          if (logoUrl)           lines.push(`Logo URL: ${logoUrl}`);
          if (brand.primaryColor)   lines.push(`Primary colour: ${brand.primaryColor}`);
          if (brand.secondaryColor) lines.push(`Secondary colour: ${brand.secondaryColor}`);
          if (brand.fontFamily)     lines.push(`Website font: ${brand.fontFamily}`);
          lines.push(`Brand tone: ${brand.tone}`);
          lines.push(`Suggested DaisyUI theme: ${brand.suggestedDaisyTheme}`);
          lines.push(`Suggested Google Font: ${brand.suggestedFont}`);
          if (brand.brandNotes) lines.push(`Notes: ${brand.brandNotes}`);
          brandContext = lines.join('\n');
        } catch {
          // Brand extraction is best-effort — build minimal context with just the logo if we got one
          if (logoUrl) brandContext = `Logo URL: ${logoUrl}`;
        }
      }
    }

    const { object } = await generateObject({
      model: models.generate,
      schema: cvGenerationSchema,
      system: CV_TEMPLATE_GENERATION_SYSTEM_PROMPT,
      prompt: CV_TEMPLATE_GENERATION_USER_PROMPT(description, brandContext),
    });

    return Response.json({ ...object, brandContext });
  } catch (err) {
    console.error('[generate-template]', err);
    return new Response(String(err), { status: 500 });
  }
}
