import { put, del, head } from '@vercel/blob';

export const maxDuration = 15;

export async function POST(req: Request) {
  const { html, slug, isPrivate } = await req.json() as { html: string; slug: string; isPrivate?: boolean };

  if (!html || !slug) {
    return new Response('Missing html or slug', { status: 400 });
  }

  // Blobs are private — raw CDN URLs always return 403.
  // The /p/[slug] route is the only access path; it fetches content server-side using the token.
  // Access control (public vs private sites) is enforced there, not at the storage layer.
  await Promise.all([
    put(`published/${slug}.html`, html, {
      access: 'private',
      contentType: 'text/html',
      allowOverwrite: true,
    }),
    // Metadata: single source of truth for access control.
    // ownerId is null until user auth is introduced.
    put(`published/${slug}.meta.json`, JSON.stringify({ isPrivate: isPrivate ?? false, ownerId: null }), {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
    }),
  ]);

  return Response.json({ slug });
}

export async function DELETE(req: Request) {
  const { slug } = await req.json() as { slug: string };
  if (!slug) return new Response('Missing slug', { status: 400 });

  try {
    const [htmlBlob, metaBlob] = await Promise.all([
      head(`published/${slug}.html`).catch(() => null),
      head(`published/${slug}.meta.json`).catch(() => null),
    ]);
    const urls = [htmlBlob?.url, metaBlob?.url].filter(Boolean) as string[];
    if (urls.length > 0) await del(urls);
  } catch {
    // ignore — blob may already be gone
  }

  return Response.json({ ok: true });
}
