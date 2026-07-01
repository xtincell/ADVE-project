/**
 * Campaign Tracker — Negative space audit (Phase 19, ADR-0052 Cluster H).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-cluster Vague 3 (1) :
 *   - audit.negativeSpace — détecte ce qui n'a PAS été fait et qui aurait dû l'être
 *
 * 6 catégories de findings (cf. ADR-0052 §10) :
 *   - BRAND_OBLIGATION_UNCOVERED      — pillars Manifesto exigés non servis
 *   - LADDER_RUNG_ORPHAN              — devotion ladder rungs orphelins (fuite)
 *   - TACTICAL_ACTIVATION_MISSING     — Tarsis détecte communauté non ciblée
 *   - CHANNEL_FIT_GAP                 — channels manquants critiques cascade ADVERTIS
 *   - ORACLE_RECONCILIATION_PARTIAL   — sections Oracle non rafraîchies
 *   - DORMANT_TOOL_HINT               — Glory tools pertinents non invoqués
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 */

import { db } from "@/lib/db";
import {
  type NegativeSpaceAuditResult,
  type NegativeSpaceFinding,
} from "./types";

interface AuditNegativeSpaceInput {
  readonly strategyId: string;
  readonly operatorId: string;
  readonly campaignId: string;
}

/**
 * Audit cross-Neteru. MVP shippe 3 catégories sur 6 (les plus calculables sans
 * dépendances externes) : BRAND_OBLIGATION_UNCOVERED, LADDER_RUNG_ORPHAN,
 * DORMANT_TOOL_HINT. Les 3 autres (TACTICAL_ACTIVATION_MISSING, CHANNEL_FIT_GAP,
 * ORACLE_RECONCILIATION_PARTIAL) restent PARTIAL — câblage Tarsis + cascade
 * ADVERTIS rules + Oracle reconciliation tracker à ship en promotion PRODUCTION.
 */
export async function auditCampaignNegativeSpace(
  input: AuditNegativeSpaceInput,
): Promise<NegativeSpaceAuditResult> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      strategyId: true,
      manifestoSnapshotContent: true,
      aarrTargets: true,
      actions: {
        select: {
          id: true,
          name: true,
          actionType: true,
          pillarServed: true,
          devotionRungTargeted: true,
          bigIdeaCoherenceScore: true,
        },
      },
    },
  });
  if (!campaign) throw new Error(`Campaign ${input.campaignId} not found`);
  if (campaign.strategyId !== input.strategyId) {
    throw new Error(`Campaign ${input.campaignId} not in strategy ${input.strategyId}`);
  }

  const findings: NegativeSpaceFinding[] = [];
  const degradationCodes: string[] = [];

  // ─── #1 BRAND_OBLIGATION_UNCOVERED ───
  const requiredPillars = extractObligatoryPillars(campaign.manifestoSnapshotContent);
  const servedPillars = new Set<string>();
  for (const a of campaign.actions) {
    for (const p of a.pillarServed) servedPillars.add(p);
  }
  for (const required of requiredPillars) {
    if (!servedPillars.has(required)) {
      findings.push({
        category: "BRAND_OBLIGATION_UNCOVERED",
        severity: "WARNING",
        description: `Pillar ${required} déclaré obligatoire dans Manifesto mais 0 CampaignAction ne le sert.`,
        recommendation: `Ajouter au moins une CampaignAction avec pillarServed inclut "${required}", ou retirer l'obligation du Manifesto.`,
        relatedEntityIds: [campaign.id],
      });
    }
  }
  if (requiredPillars.length === 0) {
    degradationCodes.push("MISSING_MANIFESTO_OBLIGATIONS");
  }

  // ─── #2 LADDER_RUNG_ORPHAN ───
  // Si campagne acquiert "APPRENTI" mais aucune action ne cible "PRATIQUANT" rung suivant
  // → fuite. Idem pour PRATIQUANT → INITIE, etc.
  const rungOrder = ["APPRENTI", "PRATIQUANT", "INITIE", "FIDELE", "EVANGELISTE"] as const;
  const rungsTargeted = new Set(
    campaign.actions
      .map((a) => a.devotionRungTargeted)
      .filter((r): r is string => r !== null),
  );
  for (let i = 0; i < rungOrder.length - 1; i++) {
    const current = rungOrder[i]!;
    const next = rungOrder[i + 1]!;
    if (rungsTargeted.has(current) && !rungsTargeted.has(next)) {
      findings.push({
        category: "LADDER_RUNG_ORPHAN",
        severity: "WARNING",
        description: `Devotion ladder : actions ciblent ${current} mais aucune action ne pousse vers ${next}. Risque de fuite.`,
        recommendation: `Ajouter une CampaignAction avec devotionRungTargeted="${next}" pour préserver la cascade.`,
        relatedEntityIds: [campaign.id],
      });
    }
  }

  // ─── #3 DORMANT_TOOL_HINT ───
  // Si bigIdeaCoherenceScore moyen < 0.4 sur les actions échantillonnées,
  // suggère d'invoquer Glory tool `claim-variant-generator` pour redresser.
  const scoredActions = campaign.actions.filter((a) => typeof a.bigIdeaCoherenceScore === "number");
  if (scoredActions.length >= 3) {
    const meanScore =
      scoredActions.reduce((acc, a) => acc + (a.bigIdeaCoherenceScore ?? 0), 0) / scoredActions.length;
    if (meanScore < 0.4) {
      findings.push({
        category: "DORMANT_TOOL_HINT",
        severity: "INFO",
        description: `Mean bigIdeaCoherenceScore = ${meanScore.toFixed(2)} (<0.4). Glory tool dédié non invoqué.`,
        recommendation: `Invoquer le Glory tool 'claim-variant-generator' pour produire des variants alignés avec BigIdea + Manifesto, puis re-tester checkBigIdeaCoherence.`,
        relatedEntityIds: campaign.actions.map((a) => a.id),
      });
    }
  }

  // ─── #4-6 PARTIAL — placeholders ───
  degradationCodes.push("CHANNEL_FIT_GAP_NOT_IMPLEMENTED");
  degradationCodes.push("TACTICAL_ACTIVATION_MISSING_NOT_IMPLEMENTED");
  degradationCodes.push("ORACLE_RECONCILIATION_PARTIAL_NOT_IMPLEMENTED");

  // Compteurs.
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;
  const infoCount = findings.filter((f) => f.severity === "INFO").length;

  return {
    campaignId: campaign.id,
    findings,
    criticalCount,
    warningCount,
    infoCount,
    degradationCodes,
  };
}

/**
 * Extrait les pillars obligatoires depuis Manifesto.content.
 * MVP : si content contient `obligations: ["A", "D", ...]`, prendre tel quel ;
 * sinon scan textual heuristic (marqueurs explicites). PRODUCTION : Glory tool
 * `manifesto-obligations-extractor`.
 */
function extractObligatoryPillars(manifestoContent: unknown): readonly string[] {
  if (!manifestoContent || typeof manifestoContent !== "object") return [];
  const content = manifestoContent as Record<string, unknown>;
  if (Array.isArray(content.obligations)) {
    return content.obligations.filter((o): o is string =>
      typeof o === "string" && /^[ADVERTIS]$/.test(o),
    );
  }
  return [];
}
