import { head } from '@vercel/blob';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let blobUrl: string;
  let isPrivate = false;

  try {
    // Fetch HTML blob and metadata in parallel
    const [htmlBlob, metaBlob] = await Promise.all([
      head(`published/${slug}.html`),
      head(`published/${slug}.meta.json`).catch(() => null),
    ]);
    blobUrl = htmlBlob.url;

    if (metaBlob) {
      const metaRes = await fetch(metaBlob.url, { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
      const meta = await metaRes.json() as { isPrivate?: boolean; ownerId?: string | null };
      isPrivate = meta.isPrivate ?? false;
    }
  } catch {
    return new Response('Not found', { status: 404 });
  }

  // ── Access control ────────────────────────────────────────────────────────
  // This is the single place to enforce visibility. When user auth is added:
  //   const session = await getSession(request);
  //   if (isPrivate && session?.userId !== ownerId) {
  //     return new Response('Unauthorized', { status: 401 });
  //   }
  // For now there are no users, so private sites are accessible to anyone with the link
  // (effectively "unlisted" — not discoverable, but not blocked). The flag is stored
  // and ready for enforcement once auth is introduced.
  void isPrivate; // referenced above — suppress lint until auth is wired

  // Blobs are private — must authenticate server-side to retrieve content.
  const res = await fetch(blobUrl, { headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
  if (!res.ok) return new Response('Not found', { status: 404 });

  const html = await res.text();
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Private sites get no-store so browsers don't cache between users once auth lands.
      // Public sites get aggressive edge caching.
      'Cache-Control': isPrivate
        ? 'private, no-store'
        : 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
