/**
 * Mestor gate `BRIEF_VS_ADVE_COHERENCE` (C6 — PROPAGATION-MAP §6b).
 *
 * # Rôle
 *
 * Assure que le **contenu d'un brief** entrant est cohérent avec le **noyau
 * ADVE** de la marque (Authenticité / Distinction / Valeur / Engagement) avant
 * qu'une action de production ne le matérialise. Frontière de *contenu* —
 * orthogonale aux deux couches préexistantes :
 *   - édition ADVE (ADR-0023 `OPERATOR_AMEND_PILLAR` + gate `PILLAR_COHERENCE`) ;
 *   - présence du brief (ADR-0049 Brief Mandatory Gate, couche en-dessous).
 *
 * # Implémentation : déterministe-first (advisory)
 *
 * Conforme à la doctrine « Fusée non-dépendante du LLM » : la cohérence est
 * mesurée par **recouvrement de vocabulaire** (`computeBriefAdveCoherence`,
 * pur, variance = 0, zéro LLM). Verdict :
 *   - `PASS`  — brief cohérent OU noyau ADVE pas encore établi (NOT_APPLICABLE)
 *               OU brief trop court pour juger.
 *   - `WARN`  — divergence flagrante (vocabulaire quasi-disjoint). **Non
 *               bloquant** : le dispatch continue, l'avertissement est surfacé à
 *               l'opérateur (parité manuelle ADR-0060 — l'opérateur amende le
 *               brief ou l'ADVE, ou procède « à mes risques »).
 *
 * Le verdict `BLOCK` + l'enforcement dur (refus de dispatch) restent l'escalade
 * **Phase 24 closure-target #14** : un blocage automatique sur un heuristique de
 * recouvrement serait trop fragile (synonymes, langue). L'advisory déterministe
 * est l'incrément sûr et utile qui ferme C6 sans casser le pipeline.
 *
 * # Références
 *
 * - ADR-0084 (Layer 5 — imports `@/domain`, `@/lib`, `@/server/governance`,
 *   sibling `@/server/services` ; jamais `@/server/trpc`/`@/components`/`@/app`).
 * - ADR-0049 (Brief Mandatory Gate — couche présence en-dessous).
 * - ADR-0023 (OPERATOR_AMEND_PILLAR — surface d'écriture ADVE sœur).
 * - ADR-0060 (parité manuelle — le WARN est surfacé, jamais silencieux).
 * - PROPAGATION-MAP §6b C6 ; STATE_FINAL_BLUEPRINT §3 + §21.2 D-3.1.
 */

import { ADVE_STORAGE_KEYS, type PillarKey } from "@/domain";

import {
  computeBriefAdveCoherence,
  flattenPillarText,
} from "./brief-adve-coherence-score";
import type { GateContext, GateResult } from "./gate-types";

export interface BriefVsAdveCoherenceInput {
  readonly strategyId: string;
  readonly brief: {
    readonly content: string;
    readonly pillarBindings?: readonly PillarKey[];
  };
}

/**
 * Charge le texte aplati du noyau ADVE (a/d/v/e) d'une stratégie. Best-effort :
 * un échec DB renvoie "" → la gate conclut NOT_APPLICABLE → PASS (jamais bloquer
 * sur une erreur d'infra).
 */
async function loadAdveText(
  strategyId: string,
  injectedDb?: GateContext["db"],
): Promise<string> {
  try {
    const db = injectedDb ?? (await import("@/lib/db")).db;
    const pillars = await db.pillar.findMany({
      where: { strategyId, key: { in: [...ADVE_STORAGE_KEYS] } },
      select: { content: true },
    });
    return pillars.map((p) => flattenPillarText(p.content)).join(" ");
  } catch {
    return "";
  }
}

export async function briefVsAdveCoherenceGate(
  input: BriefVsAdveCoherenceInput,
  ctx: GateContext,
): Promise<GateResult> {
  const adveText = await loadAdveText(input.strategyId, ctx.db);
  const coherence = computeBriefAdveCoherence(input.brief.content, adveText);

  if (coherence.band === "NOT_APPLICABLE") {
    return {
      verdict: "PASS",
      reason:
        coherence.adveTokenCount < coherence.briefTokenCount
          ? "Noyau ADVE pas encore établi — cohérence non applicable."
          : "Brief trop court pour évaluer la cohérence.",
      evidence: coherence,
    };
  }

  if (coherence.band === "DIVERGENT") {
    return {
      verdict: "WARN",
      reason:
        `Brief faiblement aligné sur le noyau ADVE (recouvrement ${Math.round(
          coherence.score * 100,
        )}%). Vérifier que le brief décline bien l'identité de la marque, ou amender l'ADVE / le brief.`,
      evidence: coherence,
    };
  }

  return {
    verdict: "PASS",
    reason: `Brief cohérent avec le noyau ADVE (recouvrement ${Math.round(
      coherence.score * 100,
    )}%).`,
    evidence: coherence,
  };
}
