import { inflateRawSync } from 'zlib';

function decodeXmlEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function xmlToText(xml: string) {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
  );
}

function parseZipLocalEntries(buffer: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;

    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + fileNameLength;
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) break;

    const name = buffer.toString('utf8', nameStart, nameEnd);
    const raw = buffer.subarray(dataStart, dataEnd);
    let content: Buffer;
    if (method === 0) {
      content = raw;
    } else if (method === 8) {
      content = inflateRawSync(raw);
    } else {
      offset = dataEnd;
      continue;
    }
    entries.set(name, content);
    offset = dataEnd;
  }

  return entries;
}

function extractDocxText(buffer: Buffer) {
  const entries = parseZipLocalEntries(buffer);
  const parts = ['word/document.xml', 'word/footnotes.xml', 'word/endnotes.xml', 'word/comments.xml']
    .map((name) => entries.get(name))
    .filter((v): v is Buffer => !!v)
    .map((buf) => xmlToText(buf.toString('utf8')));
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function decodePdfLiteralString(input: string) {
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const n = input[i + 1];
    if (!n) break;
    if (n === 'n') out += '\n';
    else if (n === 'r') out += '\r';
    else if (n === 't') out += '\t';
    else if (n === 'b') out += '\b';
    else if (n === 'f') out += '\f';
    else if (/[0-7]/.test(n)) {
      const oct = input.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] ?? n;
      out += String.fromCharCode(parseInt(oct, 8));
      i += oct.length - 1;
    } else out += n;
    i += 1;
  }
  return out;
}

function extractPdfText(buffer: Buffer) {
  const latin = buffer.toString('latin1');
  const textChunks: string[] = [];
  const re = /\((?:\\.|[^\\()])*\)/g;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(latin))) {
    const raw = m[0].slice(1, -1);
    const decoded = decodePdfLiteralString(raw).trim();
    if (decoded && /[A-Za-z0-9]/.test(decoded)) textChunks.push(decoded);
  }
  return textChunks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function extractTextFromFileBuffer(buffer: Buffer, fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || mime.startsWith('text/')) {
    return buffer.toString('utf8');
  }
  if (lowerName.endsWith('.docx') || mime.includes('wordprocessingml.document')) {
    return extractDocxText(buffer);
  }
  if (lowerName.endsWith('.pdf') || mime.includes('pdf')) {
    return extractPdfText(buffer);
  }
  return buffer.toString('utf8');
}
