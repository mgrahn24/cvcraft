import { get } from '@vercel/blob';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  if (!url) return new Response('Missing url param', { status: 400 });

  try {
    const result = await get(url, { access: 'private' });
    if (!result) return new Response('Not found', { status: 404 });

    if (!result.stream) return new Response('Not found', { status: 404 });

    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[photo proxy]', err);
    return new Response('Error fetching image', { status: 500 });
  }
}
