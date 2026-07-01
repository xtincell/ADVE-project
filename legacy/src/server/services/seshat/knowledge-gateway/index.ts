/**
 * knowledge-gateway — la frontière de connaissance de Seshat (ADR-0108).
 *
 * DOCTRINE (directive opérateur 2026-06-28) :
 *   « Les mécaniques impliquant la recherche internet sont gouvernées par Seshat
 *   qui gouverne la connaissance. L'information est d'abord stockée chez Seshat
 *   afin que les autres restent mécaniques et indépendants de la recherche
 *   internet. Si un Glory tool a besoin d'une info, il interroge Seshat — de
 *   manière mécanique ET intelligente (base de données + LLM). Si le LLM est
 *   indisponible, les données LLM sont ignorées et le système continue avec la
 *   base de données. Cette mécanique doit être découplée pour que le step LLM
 *   puisse être skip — et ça de manière fondamentale dans toute La Fusée. »
 *
 * Conséquences architecturales encodées ici :
 *   1. `retrieve` (DB) est OBLIGATOIRE et DÉTERMINISTE — la matière revient
 *      toujours, qu'un LLM réponde ou pas. C'est le socle mécanique.
 *   2. `enrich` (LLM) est OPTIONNEL et DÉCOUPLÉ — c'est l'étage intelligent.
 *      Il n'est tenté que si (a) un consommateur le fournit, (b) il n'est pas
 *      explicitement skippé, et (c) un provider texte est réellement disponible
 *      (`isTextLLMAvailable`). S'il échoue, on l'IGNORE — `facts` reste servi.
 *   3. Aucun caller ne court-circuite Seshat pour aller chercher du LLM/internet
 *      « à côté » : il interroge Seshat, qui décide mécaniquement quoi servir.
 *
 * Le résultat est un type discriminé honnête : le consommateur sait toujours si
 * l'étage LLM a été appliqué, sauté (indispo / par choix) ou a échoué.
 */

import { isTextLLMAvailable } from "@/server/services/llm-gateway";

/** Statut de l'étage LLM découplé pour une requête de connaissance. */
export type KnowledgeLlmStep =
  | "APPLIED" // enrich fourni, LLM dispo, succès
  | "SKIPPED_NO_ENRICHER" // aucun enrich demandé — DB pure
  | "SKIPPED_BY_CALLER" // enrich fourni mais skipLlm=true
  | "SKIPPED_UNAVAILABLE" // enrich fourni mais aucun provider texte sain
  | "FAILED"; // enrich tenté mais a levé — ignoré, on garde la DB

export interface KnowledgeResult<F, E> {
  /** Matière déterministe issue de la base — TOUJOURS présente. */
  facts: F;
  /** Étage intelligent (LLM) — `null` dès que le step est sauté ou échoue. */
  enrichment: E | null;
  /** Trace honnête de ce qui s'est passé sur l'étage LLM. */
  llmStep: KnowledgeLlmStep;
  /** Origine effective de la réponse. */
  source: "DB" | "DB+LLM";
}

export interface QueryKnowledgeOptions<F, E> {
  /**
   * Récupération DÉTERMINISTE depuis la base Seshat (KnowledgeEntry, dossiers de
   * référence, MarketCostSnapshot, feeds ingérés…). Obligatoire. Ne doit jamais
   * appeler de LLM ni partir sur internet — c'est le socle mécanique.
   */
  retrieve: () => Promise<F>;
  /**
   * Étage intelligent OPTIONNEL. Reçoit la matière DB et la raffine via LLM
   * (synthèse, ranking, mise en relation). Découplé : si absent / skippé /
   * indisponible / en échec, on sert `facts` tels quels.
   */
  enrich?: (facts: F) => Promise<E>;
  /** Force le skip de l'étage LLM même s'il est fourni et disponible. */
  skipLlm?: boolean;
  /** Étiquette pour les logs de diagnostic (facilite le triage des trous). */
  label?: string;
}

/**
 * Point d'interrogation canonique de la connaissance Seshat.
 *
 * Garantit l'invariant fondamental « DB d'abord, LLM ensuite et skippable » :
 * `retrieve()` court toujours ; `enrich()` n'est qu'un bonus opportuniste. Le
 * LLM ne peut JAMAIS faire échouer une requête de connaissance — au pire il est
 * absent.
 */
export async function queryKnowledge<F, E = never>(
  opts: QueryKnowledgeOptions<F, E>,
): Promise<KnowledgeResult<F, E>> {
  // 1. Socle mécanique — la matière DB revient toujours.
  const facts = await opts.retrieve();

  // 2. Étage LLM découplé — tenté seulement si pertinent ET possible.
  if (!opts.enrich) {
    return { facts, enrichment: null, llmStep: "SKIPPED_NO_ENRICHER", source: "DB" };
  }
  if (opts.skipLlm) {
    return { facts, enrichment: null, llmStep: "SKIPPED_BY_CALLER", source: "DB" };
  }
  if (!isTextLLMAvailable()) {
    if (opts.label) {
      console.warn(`[seshat/knowledge-gateway] ${opts.label}: aucun provider texte sain — étage LLM sauté, on continue sur la DB.`);
    }
    return { facts, enrichment: null, llmStep: "SKIPPED_UNAVAILABLE", source: "DB" };
  }

  try {
    const enrichment = await opts.enrich(facts);
    return { facts, enrichment, llmStep: "APPLIED", source: "DB+LLM" };
  } catch (err) {
    // L'étage LLM ne peut pas casser une requête de connaissance — on l'ignore.
    console.warn(
      `[seshat/knowledge-gateway] ${opts.label ?? "query"}: étage LLM en échec, ignoré (on garde la DB).`,
      err instanceof Error ? err.message : err,
    );
    return { facts, enrichment: null, llmStep: "FAILED", source: "DB" };
  }
}
