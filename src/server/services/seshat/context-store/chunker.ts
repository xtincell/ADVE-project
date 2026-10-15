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
 * Bound an already selected chunk around the question's words. This only
 * chooses a contiguous verbatim excerpt; it neither ranks documents nor
 * changes the persisted index, source authority or citation identity.
 */
export function excerptForQuery(text: string, query: string, max: number): string {
  const budget = Math.max(0, Math.floor(max));
  if (text.length <= budget) return text;
  const normalize = (word: string) => word.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const terms = new Set((query.match(/[\p{L}\p{N}]+/gu) ?? [])
    .map(normalize).filter(word => word.length > 3 || /\d/.test(word)).slice(0, 64));
  const hits = [...text.matchAll(/[\p{L}\p{N}]+/gu)]
    .filter(match => terms.has(normalize(match[0])))
    .map(match => ({ word: normalize(match[0]), index: match.index }));
  let bestStart = 0;
  let bestScore = 0;
  for (const hit of hits) {
    const start = Math.max(0, Math.min(hit.index - Math.floor(budget / 4), text.length - budget));
    const words = new Set(hits.filter(other => other.index >= start && other.index < start + budget)
      .map(other => other.word));
    // A requested identifier (Q9, SKU42…) is more specific than incidental
    // prose words in an introduction. This is lexical selection, not meaning.
    const score = [...words].reduce((sum, word) => sum + (/\p{L}/u.test(word) && /\d/.test(word) ? 3 : 1), 0);
    if (score > bestScore) { bestStart = start; bestScore = score; }
  }
  return text.slice(bestStart, bestStart + budget);
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
