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

/** Focus retrieval on the question clause naming this document. The caller's
 * original question remains intact; this never supplies inferred source text.
 */
export function sourceQueryForDocument(query: string, fileName: string | null): string {
  const clauses = query.split(/(?<=[.!?。！？])\s+|\n+/u).filter(Boolean);
  const title = new Set(sourceQueryTerms((fileName ?? "").replace(/\.(?:docx?|pdf|txt|md|xlsx?|csv|pptx?|html?)$/iu, "")));
  if (clauses.length < 2 || !title.size) return query;
  const scores = clauses.map(clause => sourceQueryTerms(clause).reduce((score, term) =>
    score + (title.has(term) ? /\d/u.test(term) ? 3 : 1 : 0), 0));
  const best = Math.max(...scores);
  return best ? clauses.filter((_, index) => scores[index] === best).join(" ") : query;
}

/** Quoted field names remain phrases, including short words such as "par". */
export function sourceQueryPhrases(query: string): string[] {
  return [...new Set([...query.matchAll(/[«“"]([^»”"]+)[»”"]/gu)]
    .map(match => normalizeSourceQuery(match[1]!).replace(/[^\p{L}\p{N}]+/gu, " ").trim())
    .filter(phrase => phrase.split(" ").length >= 2 && phrase.length <= 160))].slice(0, 16);
}

/** Same exact-phrase preference for document ranking and bounded excerpts. */
export function sourcePhraseScore(text: string, phrases: string[]): number {
  if (!phrases.length) return 0;
  const normalized = ` ${normalizeSourceQuery(text).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  return phrases.reduce((score, phrase) => score + (normalized.includes(` ${phrase} `)
    ? Math.min(40, 8 * phrase.split(" ").length) : 0), 0);
}

/**
 * Bound an already selected chunk around the question's words. This only
 * chooses a contiguous verbatim excerpt; it neither ranks documents nor
 * changes the persisted index, source authority or citation identity.
 */
export function excerptForQuery(text: string, query: string, max: number): string {
  const budget = Math.max(0, Math.floor(max));
  if (text.length <= budget) return text;
  if (!budget) return "";
  const phrases = sourceQueryPhrases(query);
  const phraseWords = phrases.map(phrase => phrase.split(" "));
  const terms = new Set([...sourceQueryTerms(query), ...phraseWords.flat()]);
  const hits: { word: string; index: number }[] = [];
  const phraseStarts: number[] = [];
  const tail: { word: string; index: number }[] = [];
  const maxPhraseWords = Math.max(0, ...phraseWords.map(words => words.length));
  for (const match of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = normalizeSourceQuery(match[0]);
    if (terms.has(word)) hits.push({ word, index: match.index });
    if (maxPhraseWords) {
      tail.push({ word, index: match.index });
      if (tail.length > maxPhraseWords) tail.shift();
      for (const words of phraseWords) if (words.at(-1) === word && tail.length >= words.length
        && words.every((value, offset) => tail[tail.length - words.length + offset]!.word === value)) {
        phraseStarts.push(tail[tail.length - words.length]!.index);
      }
    }
  }
  let bestStart = 0;
  let bestScore = -1;
  let previousStart = -1;
  let left = 0, right = 0, wordScore = 0;
  const counts = new Map<string, number>();
  const weight = (word: string) => /\p{L}/u.test(word) && /\d/.test(word) ? 3 : 1;
  // Exact fields anchor the window. Otherwise use every query-word position.
  // Moving pointers avoid rescanning all hits for every candidate in a large source.
  const starts = phraseStarts.length ? phraseStarts.sort((a, b) => a - b) : hits.map(hit => hit.index);
  for (const index of starts) {
    const start = Math.max(0, Math.min(index - Math.floor(budget / 4), text.length - budget));
    if (start === previousStart) continue;
    previousStart = start;
    while (right < hits.length && hits[right]!.index < start + budget) {
      const word = hits[right++]!.word;
      const count = counts.get(word) ?? 0;
      if (!count) wordScore += weight(word);
      counts.set(word, count + 1);
    }
    while (left < right && hits[left]!.index < start) {
      const word = hits[left++]!.word;
      const count = counts.get(word)! - 1;
      if (!count) { counts.delete(word); wordScore -= weight(word); }
      else counts.set(word, count);
    }
    const score = wordScore + (phraseStarts.length ? sourcePhraseScore(text.slice(start, start + budget), phrases) : 0);
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
