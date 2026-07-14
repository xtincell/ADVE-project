/**
 * Filtre de PERTINENCE déterministe (zéro LLM) — ADR-0143.
 *
 * La langue n'est pas un filtre : on interroge Google News dans plusieurs
 * langues (feed-sources.ts), donc le flux brut mélange des articles très
 * pertinents et du bruit. Cette mécanique tranche la pertinence SANS LLM :
 * chevauchement de mots-clés entre les articles et l'ensemble de sujets suivis
 * (la marque, son secteur, thèmes…), phrase exacte pondérée, bonus fraîcheur.
 * Purement fonctionnel → testable sans réseau ni base.
 */

import type { RssItem } from "./rss";

export interface RankedItem extends RssItem {
  /** Score de pertinence déterministe (plus haut = plus pertinent). */
  relevance: number;
}

const STOPWORDS = new Set([
  "le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "pour", "sur",
  "dans", "au", "aux", "ce", "cette", "par", "avec", "plus", "son", "ses", "leur",
  "que", "qui", "the", "of", "to", "in", "and", "for", "on", "with", "from", "new",
  "news", "via", "ans", "dont", "vers", "selon", "entre", "sont", "est", "une",
]);

/** Minuscule + suppression des diacritiques (comparaison robuste inter-langues). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** Bonus fraîcheur ∈ [0,1], décroissant linéairement sur ~30 jours. */
function recencyBonus(pubDate: string | undefined, now: number): number {
  if (!pubDate) return 0;
  const t = Date.parse(pubDate);
  if (Number.isNaN(t)) return 0;
  const ageDays = (now - t) / 86_400_000;
  if (ageDays < 0) return 0;
  return Math.max(0, 1 - ageDays / 30);
}

/**
 * Trie ET FILTRE des items par pertinence à un ensemble de sujets suivis.
 *   - phrase exacte d'un sujet dans le titre  → +5 (mention forte)
 *   - phrase exacte dans le résumé            → +3
 *   - mot-clé de sujet présent dans le titre  → +1
 *   - mot-clé présent (résumé seulement)      → +0.5
 *   - fraîcheur                               → +[0,1] (départage)
 * Un item sans AUCUN recouvrement de sujet (score sujet = 0) est ÉCARTÉ — c'est
 * le filtre de pertinence. Déduplication par titre. `now` injectable (tests).
 */
export function rankItemsByRelevance(
  items: RssItem[],
  subjects: string[],
  opts?: { limit?: number; now?: number },
): RankedItem[] {
  const limit = opts?.limit ?? 12;
  const now = opts?.now ?? Date.now();
  // Le PREMIER sujet est la marque (« on parle de MOI ») → poids 2× : une
  // mention de la marque prime sur une simple actualité sectorielle.
  const subj = subjects
    .map((s, i) => ({ phrase: norm(s).trim(), tokens: new Set(tokenize(s)), weight: i === 0 ? 2 : 1 }))
    .filter((s) => s.phrase.length >= 2 && s.tokens.size > 0);
  if (subj.length === 0) return [];

  const seen = new Set<string>();
  const scored: RankedItem[] = [];
  for (const it of items) {
    if (!it.title) continue;
    const key = norm(it.title);
    if (seen.has(key)) continue;
    const title = norm(it.title);
    const full = norm(`${it.title} ${it.summary ?? ""}`);
    const titleTokens = new Set(tokenize(it.title));
    const fullTokens = new Set(tokenize(`${it.title} ${it.summary ?? ""}`));

    let subjectScore = 0;
    for (const sub of subj) {
      let s = 0;
      if (sub.phrase.length >= 3) {
        if (title.includes(sub.phrase)) s += 5;
        else if (full.includes(sub.phrase)) s += 3;
      }
      for (const t of sub.tokens) {
        if (titleTokens.has(t)) s += 1;
        else if (fullTokens.has(t)) s += 0.5;
      }
      subjectScore += s * sub.weight;
    }
    if (subjectScore <= 0) continue; // pertinence : aucun lien → écarté

    seen.add(key);
    const relevance = Math.round((subjectScore + recencyBonus(it.pubDate, now)) * 100) / 100;
    scored.push({ ...it, relevance });
  }

  scored.sort((a, b) => b.relevance - a.relevance);
  return scored.slice(0, limit);
}
