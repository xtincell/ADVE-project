/**
 * reference-context.ts — Injecte le corpus Seshat (campagnes récoltées par Hunter)
 * dans le contexte d'idéation des Glory tools (ADR-0108, Phase 24).
 *
 * Avant : le corpus `CampaignReferenceDossier` (Argos/Hunter) était **write-only**
 * — récolté puis enfermé dans un chemin mort, jamais lu par un tool LLM. Ici on le
 * branche : pour un tool d'idéation/benchmark, le moteur Glory charge les références
 * **réelles** pertinentes (verdict PASS, secteur/marché de la marque) et les fournit
 * au LLM comme **matière d'inspiration ancrée**, pas comme l'ADVE seul.
 *
 * Déterministe à la récupération (lecture DB filtrée + formatage pur). Le contenu
 * est **non fiable** (externe) → l'appelant l'enveloppe via `wrapUntrusted`.
 */

import { db } from "@/lib/db";

export interface ReferenceDossierLite {
  brand: string;
  campaign: string | null;
  sector: string | null;
  market: string | null;
  dna: unknown;
  editorial: unknown;
}

function strArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, max);
}

/**
 * Formate une liste de dossiers de référence en un bloc lisible (PUR, sans I/O).
 * Surface la matière utile à l'idéation : marque, campagne, secteur, voix, axes,
 * key-phrases, codes visuels. Retourne "" si aucune référence.
 */
export function formatReferenceDossiers(dossiers: ReferenceDossierLite[]): string {
  if (dossiers.length === 0) return "";
  const lines: string[] = [
    "--- RÉFÉRENCES DE CAMPAGNES RÉELLES (corpus Seshat / Hunter) ---",
    "Campagnes existantes récoltées, à utiliser comme inspiration et points de comparaison —",
    "PAS à copier. Croise-les avec le noyau de marque pour proposer du distinctif.",
  ];
  dossiers.forEach((d, i) => {
    const dna = (d.dna && typeof d.dna === "object" ? d.dna : {}) as Record<string, unknown>;
    const voice = typeof dna.voice === "string" ? dna.voice : null;
    const axes = strArray(dna.axes, 4);
    const keyPhrases = strArray(dna.keyPhrases, 4);
    const codes = strArray(dna.visualCodes, 4);
    lines.push(`\n[${i + 1}] ${d.brand}${d.campaign ? ` — « ${d.campaign} »` : ""}${d.sector ? ` (${d.sector}${d.market ? `, ${d.market}` : ""})` : ""}`);
    if (voice) lines.push(`  Voix : ${voice}`);
    if (axes.length) lines.push(`  Axes : ${axes.join(" · ")}`);
    if (keyPhrases.length) lines.push(`  Key-phrases : ${keyPhrases.join(" · ")}`);
    if (codes.length) lines.push(`  Codes visuels : ${codes.join(" · ")}`);
  });
  lines.push("--- FIN RÉFÉRENCES ---");
  return lines.join("\n");
}

/**
 * Récupération DÉTERMINISTE des dossiers de référence pertinents pour une
 * stratégie (DB pure, zéro LLM, zéro internet). Filtre : verdict PASS uniquement,
 * priorité au secteur de la marque, puis récence. C'est le socle mécanique servi
 * par Seshat — il revient toujours, indépendamment de la disponibilité d'un LLM.
 */
export async function retrieveReferenceDossiers(
  strategyId: string,
  opts?: { limit?: number },
): Promise<ReferenceDossierLite[]> {
  const limit = opts?.limit ?? 5;

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { businessContext: true, countryCode: true },
  });
  const sector =
    strategy?.businessContext && typeof strategy.businessContext === "object"
      ? (strategy.businessContext as Record<string, unknown>).sector
      : undefined;
  const sectorStr = typeof sector === "string" ? sector : undefined;

  // Priorité aux références du même secteur ; complète avec des références récentes.
  const sectorMatched = sectorStr
    ? await db.campaignReferenceDossier.findMany({
        where: { safetyVerdict: "PASS", sector: sectorStr },
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: { brand: true, campaign: true, sector: true, market: true, dna: true, editorial: true },
      })
    : [];

  let dossiers = sectorMatched;
  if (dossiers.length < limit) {
    const fill = await db.campaignReferenceDossier.findMany({
      where: { safetyVerdict: "PASS", ...(sectorStr ? { NOT: { sector: sectorStr } } : {}) },
      orderBy: { publishedAt: "desc" },
      take: limit - dossiers.length,
      select: { brand: true, campaign: true, sector: true, market: true, dna: true, editorial: true },
    });
    dossiers = [...dossiers, ...fill];
  }

  return dossiers;
}

/**
 * Charge les références Seshat pertinentes via le Knowledge Gateway et renvoie le
 * bloc texte formaté (à neutraliser par l'appelant). "" si rien de pertinent.
 *
 * Passe par `queryKnowledge` (frontière de connaissance Seshat, ADR-0108) : la
 * récupération DB est le socle mécanique. Pas d'étage `enrich` ici — l'intelligence
 * (croisement références × ADVE) est faite par le LLM du Glory tool consommateur,
 * lui-même déjà découplé/skippable. Seshat reste le point d'interrogation unique.
 */
export async function buildReferenceContextText(strategyId: string, opts?: { limit?: number }): Promise<string> {
  const { queryKnowledge } = await import("./knowledge-gateway");
  const { facts } = await queryKnowledge<ReferenceDossierLite[]>({
    retrieve: () => retrieveReferenceDossiers(strategyId, opts),
    label: `reference-context(strategy=${strategyId})`,
  });
  return formatReferenceDossiers(facts);
}
