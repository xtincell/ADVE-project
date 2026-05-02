/**
 * SESHAT — Text chunker for BRAND_SOURCE indexing.
 *
 * Splits raw text from a BrandDataSource into RAG-friendly chunks bounded by
 * paragraph/sentence boundaries. Each chunk becomes one BrandContextNode.
 */

const MAX_CHARS_PER_CHUNK = 2500;
const MIN_CHARS_PER_CHUNK = 200;

export interface SourceChunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}

/**
 * Split text on paragraph boundaries first; if a paragraph exceeds
 * MAX_CHARS_PER_CHUNK, fall back to sentence boundaries; if a sentence
 * still exceeds, hard-cut at the limit. Whitespace-only chunks are dropped.
 */
export function chunkText(input: string): SourceChunk[] {
  const text = (input ?? "").trim();
  if (!text) return [];
  if (text.length <= MAX_CHARS_PER_CHUNK) {
    return [{ index: 0, text, charStart: 0, charEnd: text.length }];
  }

  const paragraphs = text.split(/\n{2,}/);
  const chunks: SourceChunk[] = [];
  let buffer = "";
  let bufferStart = 0;
  let cursor = 0;

  const pushBuffer = () => {
    const trimmed = buffer.trim();
    if (trimmed.length >= MIN_CHARS_PER_CHUNK || (trimmed.length > 0 && chunks.length === 0)) {
      chunks.push({
        index: chunks.length,
        text: trimmed,
        charStart: bufferStart,
        charEnd: bufferStart + buffer.length,
      });
    } else if (trimmed.length > 0 && chunks.length > 0) {
      const previous = chunks[chunks.length - 1]!;
      previous.text = `${previous.text}\n\n${trimmed}`.slice(0, MAX_CHARS_PER_CHUNK * 2);
      previous.charEnd = bufferStart + buffer.length;
    }
    buffer = "";
  };

  for (const para of paragraphs) {
    if (para.length > MAX_CHARS_PER_CHUNK) {
      pushBuffer();
      bufferStart = cursor;
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (sentence.length > MAX_CHARS_PER_CHUNK) {
          let i = 0;
          while (i < sentence.length) {
            const slice = sentence.slice(i, i + MAX_CHARS_PER_CHUNK);
            buffer = slice;
            bufferStart = cursor + i;
            pushBuffer();
            i += MAX_CHARS_PER_CHUNK;
          }
        } else if (buffer.length + sentence.length + 1 > MAX_CHARS_PER_CHUNK) {
          pushBuffer();
          bufferStart = cursor;
          buffer = sentence;
        } else {
          if (buffer.length === 0) bufferStart = cursor;
          buffer += (buffer.length === 0 ? "" : " ") + sentence;
        }
      }
      pushBuffer();
      cursor += para.length + 2;
      continue;
    }

    if (buffer.length + para.length + 2 > MAX_CHARS_PER_CHUNK) {
      pushBuffer();
      bufferStart = cursor;
      buffer = para;
    } else {
      if (buffer.length === 0) bufferStart = cursor;
      buffer += (buffer.length === 0 ? "" : "\n\n") + para;
    }
    cursor += para.length + 2;
  }
  pushBuffer();

  return chunks;
}
