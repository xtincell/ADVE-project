/**
 * Contexte documentaire d'une marque, pour l'ancrage de la génération.
 *
 * Notoria LISAIT déjà les sources — mais ainsi (`engine.ts`, avant ce module) :
 *
 *     take: 5                                  // 5 documents maximum, sans tri
 *     .slice(0, 500)                           // 500 caractères par document
 *     if (missionType === "ADVE_UPDATE")       // 1 mission sur 7
 *
 * Un PRD de 62 pages fait ~95 000 caractères : la marque possédait sa
 * documentation et le moteur n'en voyait que la page de garde. Et les deux
 * missions qui remplissent l'ADVE à la NAISSANCE de la marque
 * (`ADVE_INTAKE_PARTIAL`, `ADVE_BOOT_FILL`) n'en voyaient rien du tout — d'où
 * des fiches fondatrices bâties par inférence pure.
 *
 * Ce module remplace la troncature aveugle par trois choses :
 *
 *  1. **un ordre** — `certainty` d'abord (une pièce OFFICIELLE prime une note
 *     ARBITRAIRE), puis la plus récente ;
 *  2. **un budget explicite** réparti entre les documents, au lieu d'un couperet
 *     par document ;
 *  3. **un identifiant porté par chaque extrait** — sans lui, aucune
 *     vérification n'est possible en aval (c'est ce qui bloquait le contrôle
 *     adversarial contre les sources).
 *
 * Zéro LLM : c'est de la sélection, pas de l'interprétation. Le contenu reste
 * non fiable (uploadé par un tiers) et l'appelant DOIT continuer de le ceinturer
 * avec `wrapUntrusted` (OWASP LLM01).
 */

import { db } from "@/lib/db";
import { compareCertainty, type SourceCertainty } from "@/domain/source-certainty";
import {
  ensureSourcesIndexed,
  retrieveSourceChunksForField,
} from "@/server/services/vault-enrichment/source-rag";

/** Un extrait de source, traçable jusqu'au document dont il sort. */
export type SourceExcerpt = {
  sourceId: string;
  fileName: string;
  certainty: SourceCertainty;
  /** Position du début de l'extrait dans `rawContent` — rend l'extrait retrouvable. */
  offset: number;
  text: string;
};

/**
 * Comment les extraits ont été choisis. Ce n'est pas de la décoration : un
 * contexte assemblé sans embeddings est moins bien ciblé, et l'appelant a le
 * droit de le savoir plutôt que de le découvrir dans la qualité du résultat.
 */
export type SourceRetrievalMode = "SEMANTIC" | "DETERMINISTIC" | "NONE";

export type BrandSourceContext = {
  excerpts: SourceExcerpt[];
  /** Documents réellement lus (au moins un extrait). */
  documentsUsed: number;
  /** Documents disponibles mais laissés de côté faute de budget. */
  documentsSkipped: number;
  /** Caractères de documentation effectivement injectés. */
  charsUsed: number;
  /**
   * Vrai quand la marque n'a AUCUNE source exploitable. L'appelant doit le dire
   * honnêtement plutôt que de produire comme si de rien n'était.
   */
  empty: boolean;
  /** Voie de sélection réellement empruntée. */
  retrieval: SourceRetrievalMode;
};

/**
 * Budget par défaut. À comparer aux 4 000 caractères de l'ancien plafond global
 * — et aux 8 000 déjà accordés au seul contenu du pilier courant. La
 * documentation de la marque ne peut pas rester le parent pauvre du prompt.
 */
export const DEFAULT_SOURCE_BUDGET = 24_000;

/** Plancher utile : en dessous, un extrait ne porte plus de sens. */
const MIN_EXCERPT = 800;

/**
 * Sélection des passages les plus pertinents d'un document pour une requête.
 *
 * **Voie de repli.** Le chemin nominal est le RAG à embeddings du repo
 * (`vault-enrichment/source-rag.ts` → index canonique `BRAND_SOURCE`) ; ceci ne
 * sert QUE lorsqu'aucun fournisseur d'embedding n'est configuré, cas fréquent
 * en local et en préproduction. Déterministe : on découpe en paragraphes, on
 * score par recouvrement de termes, on garde les meilleurs dans l'ordre du
 * document (un texte lu en désordre perd son sens). Sans requête, on prend la
 * tête du document.
 *
 * Ce n'est pas un moteur de recherche — c'est ce qui évite de ne montrer que la
 * page de garde quand le moteur n'est pas branché.
 */
function selectPassages(raw: string, query: string | undefined, budget: number): { text: string; offset: number } {
  const text = raw.trim();
  if (text.length <= budget) return { text, offset: 0 };
  if (!query || query.trim().length < 3) return { text: text.slice(0, budget), offset: 0 };

  const terms = Array.from(
    new Set(
      query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 4),
    ),
  );
  if (terms.length === 0) return { text: text.slice(0, budget), offset: 0 };

  // Paragraphes avec leur position réelle — l'offset doit rester exploitable.
  const paras: Array<{ start: number; body: string; score: number }> = [];
  let cursor = 0;
  for (const body of text.split(/\n{2,}/)) {
    const start = text.indexOf(body, cursor);
    cursor = start + body.length;
    if (body.trim().length < 40) continue;
    const hay = body
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const t of terms) if (hay.includes(t)) score += 1;
    paras.push({ start, body, score });
  }
  if (paras.length === 0) return { text: text.slice(0, budget), offset: 0 };

  const ranked = [...paras].sort((a, b) => b.score - a.score || a.start - b.start);
  const kept: typeof paras = [];
  let used = 0;
  for (const p of ranked) {
    if (used + p.body.length > budget) continue;
    kept.push(p);
    used += p.body.length + 2;
    if (used >= budget) break;
  }
  if (kept.length === 0) return { text: text.slice(0, budget), offset: 0 };

  kept.sort((a, b) => a.start - b.start);
  const first = kept[0];
  return {
    // « […] » signale les coupes : le lecteur (humain ou modèle) sait qu'il lit
    // des passages, pas un document continu.
    text: kept.map((p) => p.body).join("\n\n[…]\n\n"),
    offset: first ? first.start : 0,
  };
}

/**
 * Récupération sémantique sur l'index canonique `BRAND_SOURCE` — le MÊME pool
 * que celui lu par le conseil de marque. C'est ce partage qui rend la
 * vérification adversariale possible : sans lui, le producteur et le critique
 * ne regardent pas les mêmes documents.
 *
 * Renvoie `null` quand le retrieval ne rend rien (pas de fournisseur
 * d'embedding, ou index vide) — l'appelant retombe alors sur la voie
 * déterministe, et le dit.
 */
async function retrieveSemantic(
  strategyId: string,
  query: string,
  budget: number,
  maxDocuments: number,
  ensureIndexed: boolean,
): Promise<SourceExcerpt[] | null> {
  // L'indexation N'EST PAS un effet de bord de la lecture.
  //
  // Ce bloc appelait `ensureSourcesIndexed` inconditionnellement, « au cas où
  // un document déposé n'aurait jamais été indexé ». Conséquence : le livre de
  // marque, qui compose QUATRE volets, déclenchait quatre passes complètes
  // d'indexation + embedding à chaque ouverture de page — des dizaines
  // d'appels sérialisés sur une marque documentée. La page ne rendait jamais.
  //
  // L'indexation appartient à l'ingestion (`INDEX_BRAND_SOURCE`, déjà branché
  // sur le dépôt). Un chemin de LECTURE lit ce qui est indexé ; si rien ne
  // l'est, il le dit (la page Sources affiche « Pas encore analysable »)
  // plutôt que de le réparer en silence au prix d'un temps de réponse.
  if (ensureIndexed) {
    try {
      await ensureSourcesIndexed(strategyId);
    } catch (err) {
      console.warn(
        "[notoria:source-context] indexation préalable ignorée :",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Assez de chunks pour remplir le budget, borné pour ne pas balayer l'index.
  const topK = Math.min(40, Math.max(6, Math.ceil(budget / MIN_EXCERPT)));
  const hits = await retrieveSourceChunksForField(strategyId, query, topK);
  if (hits.length === 0) return null;

  // Le plus fiable d'abord, puis le plus pertinent — une pièce OFFICIELLE prime
  // une note ARBITRAIRE même si cette dernière colle mieux à la requête.
  const ordered = [...hits].sort((a, b) => {
    const c = compareCertainty(
      (b.certainty ?? "ARBITRARY") as SourceCertainty,
      (a.certainty ?? "ARBITRARY") as SourceCertainty,
    );
    if (c !== 0) return c;
    return b.similarity - a.similarity;
  });

  const excerpts: SourceExcerpt[] = [];
  const documents = new Set<string>();
  let remaining = budget;
  for (const h of ordered) {
    if (remaining < MIN_EXCERPT) break;
    if (!h.sourceId) continue;
    if (!documents.has(h.sourceId) && documents.size >= maxDocuments) continue;
    const text = h.text.length > remaining ? h.text.slice(0, remaining) : h.text;
    if (!text) continue;
    documents.add(h.sourceId);
    excerpts.push({
      sourceId: h.sourceId,
      fileName: h.fileName,
      certainty: (h.certainty ?? "INFERRED") as SourceCertainty,
      offset: h.charStart ?? 0,
      text,
    });
    remaining -= text.length;
  }

  return excerpts.length > 0 ? excerpts : null;
}

/**
 * Charge la documentation déclarée d'une marque, ordonnée par certitude et
 * bornée par un budget explicite.
 *
 * @param query Le sujet en cours (pilier, champ) — sert à choisir les passages.
 *              Sans requête, on prend la tête de chaque document.
 */
export async function loadBrandSourceContext(
  strategyId: string,
  opts: {
    query?: string;
    budget?: number;
    maxDocuments?: number;
    /**
     * Indexer les sources non encore indexées avant de lire. **Faux par
     * défaut** : réservé aux chemins ASYNCHRONES (enrichissement, mission
     * Notoria). Un chemin de lecture qui l'active fait payer une passe
     * d'embedding à chaque affichage.
     */
    ensureIndexed?: boolean;
  } = {},
): Promise<BrandSourceContext> {
  const budget = opts.budget ?? DEFAULT_SOURCE_BUDGET;
  const maxDocuments = opts.maxDocuments ?? 12;

  const rows = await db.brandDataSource.findMany({
    where: {
      strategyId,
      processingStatus: { in: ["EXTRACTED", "PROCESSED"] },
      NOT: { rawContent: null },
    },
    // `certainty` était absent du select : une pièce OFFICIELLE et une note
    // ARBITRAIRE pesaient exactement pareil dans le prompt.
    select: { id: true, fileName: true, certainty: true, rawContent: true, updatedAt: true },
  });

  const usable = rows.filter((r) => (r.rawContent ?? "").trim().length > 0);
  // OFFICIAL > DECLARED > INFERRED > ARBITRARY, puis le plus récent.
  //
  // `compareCertainty(a, b)` rend POSITIF quand `a` est plus fiable ; dans un
  // `sort`, un retour positif place `a` APRÈS `b`. Il faut donc l'inverser pour
  // obtenir « le plus fiable d'abord » — sans ce signe, on servait au modèle les
  // notes ARBITRAIRES avant les pièces OFFICIELLES.
  usable.sort((a, b) => {
    const c = compareCertainty(b.certainty as SourceCertainty, a.certainty as SourceCertainty);
    if (c !== 0) return c;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  if (usable.length === 0) {
    return {
      excerpts: [],
      documentsUsed: 0,
      documentsSkipped: 0,
      charsUsed: 0,
      empty: true,
      retrieval: "NONE",
    };
  }

  // Chemin nominal : le RAG du repo, sur l'index que le conseil lit aussi.
  const query = opts.query?.trim();
  if (query && query.length >= 3) {
    const semantic = await retrieveSemantic(
      strategyId,
      query,
      budget,
      maxDocuments,
      opts.ensureIndexed ?? false,
    );
    if (semantic) {
      const used = new Set(semantic.map((e) => e.sourceId)).size;
      return {
        excerpts: semantic,
        documentsUsed: used,
        documentsSkipped: Math.max(0, usable.length - used),
        charsUsed: semantic.reduce((n, e) => n + e.text.length, 0),
        empty: false,
        retrieval: "SEMANTIC",
      };
    }
  }

  const candidates = usable.slice(0, maxDocuments);
  const excerpts: SourceExcerpt[] = [];
  let remaining = budget;

  for (const [i, row] of candidates.entries()) {
    const left = candidates.length - i;
    // Part équitable du budget restant, jamais en dessous du plancher utile.
    const share = Math.max(MIN_EXCERPT, Math.floor(remaining / left));
    if (remaining < MIN_EXCERPT) break;
    const { text, offset } = selectPassages(row.rawContent ?? "", opts.query, Math.min(share, remaining));
    if (!text) continue;
    excerpts.push({
      sourceId: row.id,
      fileName: row.fileName ?? "(sans nom)",
      certainty: row.certainty as SourceCertainty,
      offset,
      text,
    });
    remaining -= text.length;
  }

  const charsUsed = excerpts.reduce((n, e) => n + e.text.length, 0);
  return {
    excerpts,
    documentsUsed: excerpts.length,
    documentsSkipped: Math.max(0, usable.length - excerpts.length),
    charsUsed,
    empty: excerpts.length === 0,
    retrieval: excerpts.length === 0 ? "NONE" : "DETERMINISTIC",
  };
}

/**
 * Rend le contexte sous forme de bloc de prompt — **avec l'identifiant de
 * chaque source**, pour que ce qui en est tiré reste vérifiable.
 *
 * L'appelant reste responsable de passer le résultat dans `wrapUntrusted`.
 */
export function renderSourceContext(ctx: BrandSourceContext): string {
  if (ctx.empty) return "";
  const parts = ctx.excerpts.map(
    (e) => `[source:${e.sourceId} | ${e.fileName} | certitude:${e.certainty} | offset:${e.offset}]\n${e.text}`,
  );
  const skipped =
    ctx.documentsSkipped > 0
      ? `\n\n(${ctx.documentsSkipped} document(s) supplémentaire(s) non inclus — budget de contexte atteint.)`
      : "";
  // Dégradation dite, pas subie : sans embeddings, les extraits sont choisis par
  // recouvrement de termes — moins bien ciblés, et le lecteur doit le savoir.
  const degraded =
    ctx.retrieval === "DETERMINISTIC"
      ? "\n\n(Sélection par recouvrement de termes — recherche sémantique indisponible sur cet environnement.)"
      : "";
  return parts.join("\n\n---\n\n") + skipped + degraded;
}
