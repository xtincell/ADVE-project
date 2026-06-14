/**
 * RSS/Atom — fetch + parse DÉTERMINISTE (zéro LLM, zéro clé) pour les feeds
 * externes Seshat (ADR-0037 PR-G → réalisé ADR-0094 suite). Remplace la synthèse
 * LLM par de vrais articles. Source par défaut : Google News RSS (public).
 */

export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  summary: string;
}

// ── Parsing pur (testable sans réseau) ─────────────────────────────────────────

function stripMarkup(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/&(?:lt|#60);/gi, "<")
    .replace(/&(?:gt|#62);/gi, ">")
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:#39|apos);/gi, "'")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstField(block: string, tags: string[]): string {
  for (const tag of tags) {
    const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
    if (m && m[1]) return stripMarkup(m[1]);
  }
  return "";
}

function atomLink(block: string): string {
  // <link rel="alternate" href="..."/> ou <link href="..."/>
  const alt = /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i.exec(block);
  if (alt) return alt[1]!;
  const any = /<link[^>]*href="([^"]+)"/i.exec(block);
  return any ? any[1]! : "";
}

function blocks(xml: string, tag: string): string[] {
  return xml.match(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, "gi")) ?? [];
}

/** Parse un flux RSS 2.0 ou Atom en items (max 25). Tolérant, ne throw jamais. */
export function parseRssItems(xml: string, limit = 25): RssItem[] {
  if (!xml || typeof xml !== "string") return [];
  const raw = [...blocks(xml, "item"), ...blocks(xml, "entry")];
  const items: RssItem[] = [];
  for (const b of raw) {
    const title = firstField(b, ["title"]);
    if (!title) continue;
    const link = firstField(b, ["link"]) || atomLink(b);
    const pubDate = firstField(b, ["pubDate", "published", "updated", "dc:date"]);
    const summary = firstField(b, ["description", "summary", "content"]);
    items.push({ title, link, pubDate, summary });
    if (items.length >= limit) break;
  }
  return items;
}

// ── Construction déterministe du digest (signaux) ──────────────────────────────

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "pour", "sur", "dans",
  "au", "aux", "ce", "cette", "par", "avec", "plus", "son", "ses", "leur", "leurs", "que",
  "qui", "the", "of", "to", "in", "and", "for", "on", "with", "from", "new", "news", "via",
  "ans", "fcfa", "dont", "vers", "selon", "entre", "sont", "été", "être", "fait", "face",
]);

function topKeywords(items: RssItem[], n: number): Array<{ word: string; count: number }> {
  const freq = new Map<string, number>();
  for (const it of items) {
    const tokens = it.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3 && !STOPWORDS.has(t));
    for (const t of new Set(tokens)) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()]
    .map(([word, count]) => ({ word, count }))
    .filter((k) => k.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * Digest déterministe (macro + weak signals) à partir des items réels.
 * macroSignals = thèmes récurrents (fréquence ≥ 2) ; weakSignals = articles
 * récents marquants. trendTracker volontairement omis (pas de fabrication).
 */
export function buildDigestFromItems(
  items: RssItem[],
  ctx: { sector: string },
): {
  macroSignals: Array<{ trend: string; evidence: string; timeHorizon: "SHORT" | "MEDIUM" | "LONG" }>;
  weakSignals: Array<{ event: string; causalChain: string[]; impactCategory: string; urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }>;
} {
  const kws = topKeywords(items, 5);
  const macroSignals = kws.map((k) => {
    const example = items.find((it) => it.title.toLowerCase().includes(k.word));
    return {
      trend: k.word,
      evidence: `${k.count} articles récents le mentionnent${example ? ` (ex. « ${example.title.slice(0, 120)} »)` : ""}`,
      timeHorizon: "SHORT" as const,
    };
  });
  const weakSignals = items.slice(0, 3).map((it) => ({
    event: it.title.slice(0, 200),
    causalChain: [it.link].filter(Boolean),
    impactCategory: ctx.sector,
    urgency: "MEDIUM" as const,
  }));
  return { macroSignals, weakSignals };
}

// ── Fetch durci (https-only, timeout, cap taille) ──────────────────────────────

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8_000;

/** Récupère le XML d'un flux. https only. Retourne null sur échec (best-effort). */
export async function fetchRssText(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LaFuseeBot/1.0 (+https://lafusee.upgraders.io/trust-center)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
