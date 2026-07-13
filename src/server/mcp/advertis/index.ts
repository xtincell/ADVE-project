/**
 * ADVERTIS (outbound) MCP Server — expose UNE marque à un agent (ADR-0142).
 *
 * Contrepartie lecture de `advertis-inbound` (qui INGÈRE des signaux vers les
 * piliers). Ce serveur EXPOSE la marque à un agent externe : sa carte
 * d'identité ADVERTIS, ses 5 comportements AARRR (mesurés depuis la donnée
 * réelle — les gates superfan d'ADR-0141), et son échelle d'engagement.
 *
 * Doctrine :
 *   - Lecture seule, scopée à `strategyId`. Zéro mutation, zéro LLM.
 *   - Les 5 comportements AARRR sont LE cœur exposé (mandat opérateur : « ces
 *     métriques sont les 5 métriques AARRR, la forme varie, le type de
 *     comportement non »). Chacun porte son état honnête (MEASURED /
 *     DECLARED_ONLY / NOT_INSTRUMENTED) — jamais un chiffre fabriqué (P22-2).
 *   - La valeur mesurée dérive des `SuperfanProfile` (gates VIEWED/INTERACTED/
 *     PAID/RECOMMENDED/SHARED) : le gate « a payé » = les clients réels du
 *     registre manuel (ADR-0141).
 *
 * TURNKEY restant (dette, ADR-0142) : le jeton agent scopé-marque (aujourd'hui
 * l'accès MCP est ADMIN ou clé-serveur — un agent passe `strategyId` en
 * paramètre ; le scoping par marque via jeton dédié est l'incrément suivant).
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { classifyTier } from "@/domain/brand-tier";
import { AARRR_INTENTS, type AarrrIntent } from "@/domain/touchpoints";
import {
  CONDITION_TO_AARRR,
  metConditions,
  type SuperfanCondition,
  type SuperfanConditionMap,
} from "@/domain/superfan-conditions";

export const serverName = "advertis";
export const serverDescription =
  "Serveur MCP Advertis (sortant) — expose une marque à un agent : carte d'identité ADVERTIS, 5 comportements AARRR mesurés (gates superfan), échelle d'engagement. Lecture seule, scopée à strategyId.";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

async function loadPillar(strategyId: string, key: string): Promise<Record<string, unknown>> {
  const p = await db.pillar.findFirst({
    where: { strategyId, key },
    select: { content: true },
  });
  return asRecord(p?.content);
}

/** État honnête d'un comportement AARRR exposé. */
type BehaviorState = "MEASURED" | "DECLARED_ONLY" | "NOT_INSTRUMENTED";

// ── Tools ────────────────────────────────────────────────────────────────

export const tools: ToolDefinition[] = [
  // ---- Brand card (identité ADVERTIS) ----
  {
    name: "getBrandCard",
    description:
      "Carte d'identité ADVERTIS de la marque : nom, secteur, archétype, positionnement, palier de maturité + score composite. Lecture seule.",
    inputSchema: z.object({ strategyId: z.string().describe("ID de la marque") }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const strategy = await db.strategy.findUnique({
        where: { id: strategyId },
        select: { id: true, name: true, sector: true, advertis_vector: true },
      });
      if (!strategy) return { error: "NOT_FOUND", strategyId };
      const [pillarA, pillarD] = await Promise.all([
        loadPillar(strategyId, "a"),
        loadPillar(strategyId, "d"),
      ]);
      const vec = asRecord(strategy.advertis_vector);
      const composite = typeof vec.compositeScore === "number" ? vec.compositeScore : null;
      return {
        strategyId: strategy.id,
        name: strategy.name,
        sector: strategy.sector ?? pillarA.secteur ?? null,
        archetype: pillarA.archetype ?? null,
        accroche: pillarA.accroche ?? null,
        positionnement: pillarD.positionnement ?? null,
        promesseMaitre: pillarD.promesseMaitre ?? null,
        compositeScore: composite,
        tier: composite != null ? classifyTier(composite) : null,
      };
    },
  },

  // ---- 5 comportements AARRR (le cœur exposé) ----
  {
    name: "getAarrrBehaviors",
    description:
      "Les 5 comportements AARRR de la marque (Acquisition, Activation, Rétention, Revenue, Referral). Pour chacun : la définition déclarée (pilier E), la valeur MESURÉE depuis la donnée réelle (gates superfan) et son état honnête (MEASURED / DECLARED_ONLY / NOT_INSTRUMENTED). C'est le cœur de l'exposition d'une marque à un agent.",
    inputSchema: z.object({ strategyId: z.string().describe("ID de la marque") }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: { id: true } });
      if (!strategy) return { error: "NOT_FOUND", strategyId };

      const pillarE = await loadPillar(strategyId, "e");
      const declared = asRecord(pillarE.aarrr);

      const profiles = await db.superfanProfile.findMany({
        where: { strategyId },
        select: { segment: true, interactions: true, lastActiveAt: true, metadata: true },
      });

      // Comptes par gate franchi (dérivés de la donnée réelle, ADR-0141).
      const gateCount: Record<SuperfanCondition, number> = {
        VIEWED: 0, INTERACTED: 0, PAID: 0, RECOMMENDED: 0, SHARED: 0,
      };
      let retained = 0; // RÉTENTION : comportement récurrent (répète + revient récemment).
      const sixtyDaysAgo = Date.now() - 60 * 86_400_000;
      for (const p of profiles) {
        const conds = metConditions(asRecord(p.metadata).conditions as SuperfanConditionMap);
        for (const c of conds) gateCount[c] += 1;
        if (p.interactions >= 2 && p.lastActiveAt && p.lastActiveAt.getTime() >= sixtyDaysAgo) {
          retained += 1;
        }
      }

      // Valeur mesurée + état par étape AARRR.
      const measuredByStage = (stage: AarrrIntent): { value: number | null; state: BehaviorState } => {
        // Gates dont le comportement mappe sur cette étape (ADR-0141).
        const gates = (Object.keys(CONDITION_TO_AARRR) as SuperfanCondition[]).filter(
          (c) => CONDITION_TO_AARRR[c] === stage,
        );
        if (stage === "RETENTION") {
          // Pas de gate one-shot : comportement récurrent mesuré à part.
          return { value: retained, state: profiles.length > 0 ? "MEASURED" : "NOT_INSTRUMENTED" };
        }
        if (stage === "ACQUISITION") {
          // « a vu » per-personne n'est pas instrumenté (audience = agrégat
          // followers, pas un gate par personne) — honnête.
          const seen = profiles.length;
          return { value: seen, state: seen > 0 ? "MEASURED" : "NOT_INSTRUMENTED" };
        }
        const value = gates.reduce((n, g) => n + gateCount[g], 0);
        return { value, state: value > 0 ? "MEASURED" : "NOT_INSTRUMENTED" };
      };

      const stageKey: Record<AarrrIntent, string> = {
        ACQUISITION: "acquisition",
        ACTIVATION: "activation",
        RETENTION: "retention",
        REVENUE: "revenue",
        REFERRAL: "referral",
      };

      const behaviors = AARRR_INTENTS.map((stage) => {
        const declaredText = typeof declared[stageKey[stage]] === "string" ? (declared[stageKey[stage]] as string) : null;
        const m = measuredByStage(stage);
        // Si rien mesuré mais une définition déclarée existe → DECLARED_ONLY.
        const state: BehaviorState =
          m.state === "MEASURED" ? "MEASURED" : declaredText ? "DECLARED_ONLY" : "NOT_INSTRUMENTED";
        return {
          stage,
          declared: declaredText,
          measuredPeople: m.value,
          state,
        };
      });

      return {
        strategyId,
        framework: "AARRR",
        trackedPeople: profiles.length,
        behaviors,
        note:
          "measuredPeople = personnes trackées ayant franchi le comportement (gates superfan, ADR-0141). " +
          "REVENUE = clients réels (registre manuel). ACQUISITION per-personne non instrumentée (audience = agrégat).",
      };
    },
  },

  // ---- Échelle d'engagement (Devotion Ladder) ----
  {
    name: "getEngagementLadder",
    description:
      "Distribution de l'audience trackée sur l'échelle d'engagement (6 rungs, du spectateur à l'évangéliste) + nombre de superfans actifs.",
    inputSchema: z.object({ strategyId: z.string().describe("ID de la marque") }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const profiles = await db.superfanProfile.findMany({
        where: { strategyId },
        select: { engagementDepth: true },
      });
      const rungs = { SPECTATEUR: 0, INTERESSE: 0, PARTICIPANT: 0, ENGAGE: 0, AMBASSADEUR: 0, EVANGELISTE: 0 };
      for (const p of profiles) {
        const d = p.engagementDepth;
        if (d >= 0.85) rungs.EVANGELISTE += 1;
        else if (d >= 0.65) rungs.AMBASSADEUR += 1;
        else if (d >= 0.45) rungs.ENGAGE += 1;
        else if (d >= 0.25) rungs.PARTICIPANT += 1;
        else if (d >= 0.1) rungs.INTERESSE += 1;
        else rungs.SPECTATEUR += 1;
      }
      const activeSuperfans = rungs.AMBASSADEUR + rungs.EVANGELISTE; // ≥ 0.65
      return { strategyId, total: profiles.length, rungs, activeSuperfans };
    },
  },
];
