import { extractTextFromFileBuffer } from '@/lib/utils/fileTextExtract';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return new Response('No file provided', { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = extractTextFromFileBuffer(buffer, file.name, file.type || '');

    if (!text || text.trim().length < 30) {
      return new Response('Could not extract enough text from file', { status: 422 });
    }

    return Response.json({ text });
  } catch (err) {
    console.error('[extract-text-file]', err);
    return new Response('Failed to extract text from file', { status: 500 });
  }
}
