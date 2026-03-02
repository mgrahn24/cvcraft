import { put } from '@vercel/blob';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return new Response('No file provided', { status: 400 });

  const ext = file.name.split('.').pop() ?? 'jpg';
  const blob = await put(`headshots/${Date.now()}.${ext}`, file, {
    access: 'public',
    contentType: file.type || 'image/jpeg',
  });

  return Response.json({ url: blob.url });
}
