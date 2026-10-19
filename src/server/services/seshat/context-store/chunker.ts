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

export function normalizeSourceQuery(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Same words for retrieval and excerpt selection, including BMC and Q6. */
export function sourceQueryTerms(query: string): string[] {
  const stop = new Set(["les", "des", "une", "pour", "avec", "dans", "sur", "qui", "que", "est", "sont", "par", "aux", "ces", "ses", "leur", "leurs", "the", "and", "with", "from", "this", "that"]);
  return [...new Set((query.match(/[\p{L}\p{N}]+/gu) ?? []).map(normalizeSourceQuery)
    .filter(word => (word.length >= 3 || /\d/.test(word)) && !stop.has(word)))].slice(0, 64);
}

/**
 * Bound an already selected chunk around the question's words. This only
 * chooses a contiguous verbatim excerpt; it neither ranks documents nor
 * changes the persisted index, source authority or citation identity.
 */
export function excerptForQuery(text: string, query: string, max: number): string {
  const budget = Math.max(0, Math.floor(max));
  if (text.length <= budget) return text;
  const terms = new Set(sourceQueryTerms(query));
  const hits = [...text.matchAll(/[\p{L}\p{N}]+/gu)]
    .filter(match => terms.has(normalizeSourceQuery(match[0])))
    .map(match => ({ word: normalizeSourceQuery(match[0]), index: match.index }));
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
 * Bound contiguous ORIGINAL text, preferring paragraphs, sentences, then words.
 * Ranges use UTF-16 offsets into the unmodified input (the same units as slice).
 * Only whitespace between chunks is omitted; no sentence or tail is rewritten.
 * The optional bound lets other source readers reuse this canonical splitter.
 */
export function chunkText(input: string, options: { maxChars?: number } = {}): SourceChunk[] {
  const text = input ?? "";
  const max = options.maxChars ?? MAX_CHARS_PER_CHUNK;
  if (!Number.isSafeInteger(max) || max < 2) throw new RangeError("Source chunk bound must be an integer of at least 2 characters");
  const chunks: SourceChunk[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    while (cursor < text.length && /\s/u.test(text[cursor]!)) cursor++;
    if (cursor === text.length) break;
    const start = cursor;
    let end = Math.min(start + max, text.length);
    // A hard bound must never split an astral character's surrogate pair.
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]!) && /[\uDC00-\uDFFF]/.test(text[end]!)) end--;
    if (end < text.length) {
      const window = text.slice(start, end);
      const minimum = Math.min(MIN_CHARS_PER_CHUNK, Math.floor(max / 2));
      const lastBoundary = (pattern: RegExp, afterMatch = false) => {
        let last = 0;
        for (const match of window.matchAll(pattern)) {
          const position = match.index + (afterMatch ? match[0].length : 0);
          if (position >= minimum) last = position;
        }
        return last;
      };
      const boundary = lastBoundary(/\r?\n[\t ]*\r?\n+/g)
        || lastBoundary(/[.!?。！？]["'»”)]?(?=\s)/gu, true)
        || lastBoundary(/\s+/gu);
      if (boundary) end = start + boundary;
    }
    while (end > start && /\s/u.test(text[end - 1]!)) end--;
    chunks.push({ index: chunks.length, text: text.slice(start, end), charStart: start, charEnd: end });
    cursor = end;
  }
  return chunks;
}
