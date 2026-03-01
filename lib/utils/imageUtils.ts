/**
 * Compact placeholder written into the LLM prompt in place of base64 data URLs.
 * The system prompt instructs the LLM to preserve this value exactly.
 */
const PLACEHOLDER = '[blitz-img]';

/**
 * Strip base64 data URLs from img src attributes before sending HTML to the LLM.
 * A typical uploaded JPEG is 300–700 KB as base64 — far too large for a prompt.
 * The compact placeholder keeps the structure intact so the LLM can reason about
 * the component without seeing (or corrupting) the image data.
 */
export function stripDataUrls(html: string): string {
  return html.replace(/\bsrc="data:[^"]*"/g, `src="${PLACEHOLDER}"`);
}

/**
 * Restore base64 data URLs into LLM-output HTML using the pre-submit original HTML
 * as the source of truth.
 *
 * Matching strategy (in priority order):
 *  1. data-blitz-upload hint — precise, survives reordering
 *  2. Positional — fallback for images that have no hint attribute
 */
export function restoreDataUrls(llmHtml: string, originalHtml: string): string {
  if (!llmHtml.includes(PLACEHOLDER)) return llmHtml;

  // Build lookup from original HTML
  const hintMap = new Map<string, string>(); // hint → dataUrl
  const positional: string[] = [];           // dataUrls without a hint, in order

  originalHtml.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\bsrc="(data:[^"]*)"/);
    if (!srcMatch) return tag;
    const dataUrl = srcMatch[1];
    const hintMatch = tag.match(/data-blitz-upload="([^"]*)"/);
    if (hintMatch?.[1]) {
      hintMap.set(hintMatch[1], dataUrl);
    } else {
      positional.push(dataUrl);
    }
    return tag;
  });

  if (hintMap.size === 0 && positional.length === 0) return llmHtml;

  let posIdx = 0;
  return llmHtml.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!tag.includes(`src="${PLACEHOLDER}"`)) return tag;
    const hintMatch = tag.match(/data-blitz-upload="([^"]*)"/);
    if (hintMatch?.[1] && hintMap.has(hintMatch[1])) {
      return tag.replace(`src="${PLACEHOLDER}"`, `src="${hintMap.get(hintMatch[1])}"`);
    }
    if (posIdx < positional.length) {
      return tag.replace(`src="${PLACEHOLDER}"`, `src="${positional[posIdx++]}"`);
    }
    return tag;
  });
}
