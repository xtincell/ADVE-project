/**
 * MCP Council server (ADR-0180/0182) — expose le CONSEIL DE MARQUE à un agent
 * externe (le propre client Claude de l'opérateur, qui « réfléchit dans le
 * cockpit »).
 *
 *   - `ask`        — pose une question au coordinateur (dossier complet + RAG),
 *     réponse texte ancrée dans l'ADVE réel ;
 *   - `deliberate` — analyse adversariale : draft coordinateur → 4 experts
 *     A/D/V/E qui challengent → synthèse. Retourne le JSON structuré.
 *
 * Scopé à strategyId (fail-closed BRAND via enforceBrandScope). Les appels LLM
 * passent par le Gateway (budget Thot + cascade). Advisory LECTURE SEULE — le
 * conseil n'écrit jamais un pilier.
 */

import { z } from "zod";
import { askCouncilOnce, deliberate } from "@/server/services/mestor/council";
import { db } from "@/lib/db";
import { checkPaidTier } from "@/server/services/glory-tools/tier-gate";
import {
  consumeAssistantBudget,
  consumeDeliberationBudget,
} from "@/server/services/mestor/council/rate-limit";

/**
 * Garde de coût de la voie MCP.
 *
 * La voie tRPC porte un gate d'abonnement et un budget dédié (4 délibérations
 * / 10 min) — posés précisément parce qu'une délibération coûte 5 appels LLM
 * sur le budget de la marque. Cette voie-ci, ouverte le même sprint, n'avait
 * NI l'un NI l'autre : un agent externe pouvait boucler `deliberate` sans
 * limite. Fermer une porte et laisser l'autre ouverte ne ferme rien
 * (relecture adversariale 2026-07-27).
 *
 * Le budget est keyé sur la MARQUE et non sur un utilisateur : côté MCP
 * l'appelant est une clé d'API, et c'est le budget de la marque qu'on protège.
 * Préfixe distinct ⇒ un agent ne ferme pas le chat du fondateur, et
 * réciproquement.
 */
async function assertCouncilAffordable(
  strategyId: string,
  kind: "ask" | "deliberate",
): Promise<{ error: string } | null> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { operatorId: true },
  });
  if (!strategy?.operatorId) {
    return { error: "TIER_GATE_DENIED: marque introuvable ou sans opérateur rattaché." };
  }
  const gate = await checkPaidTier(strategy.operatorId, undefined, strategyId);
  if (!gate.allowed) {
    return {
      error: `TIER_GATE_DENIED: ${gate.reason ?? "abonnement payant requis pour le conseil de marque."}`,
    };
  }
  const ok =
    kind === "deliberate"
      ? await consumeDeliberationBudget(`mcp:${strategyId}`)
      : await consumeAssistantBudget(`mcp:${strategyId}`);
  if (!ok) {
    return {
      error:
        "RATE_LIMITED: budget du conseil épuisé pour cette marque — chaque analyse mobilise plusieurs appels. Réessayez dans quelques minutes.",
    };
  }
  return null;
}

export const serverName = "council";
export const serverDescription =
  "Serveur MCP Conseil de marque — un coordinateur qui connaît toute la stratégie ADVE-RTIS + 4 experts adversariaux (Authenticité/Distinction/Valeur/Engagement). `ask` pour une réponse ancrée dans le dossier réel ; `deliberate` pour une analyse adversariale (draft → critiques → synthèse). Lecture seule, scopé à strategyId.";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export const tools: ToolDefinition[] = [
  {
    name: "ask",
    description:
      "Pose une question stratégique au conseil de marque. Le coordinateur répond en s'appuyant sur le dossier complet de la marque (8 piliers verbatim, score, recherche sémantique, communauté mesurée). Réponse ancrée dans les données réelles — aucun chiffre fabriqué. Lecture seule.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la marque"),
      question: z.string().min(3).max(4_000).describe("Question stratégique"),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const question = input.question as string;
      const denied = await assertCouncilAffordable(strategyId, "ask");
      if (denied) return denied;
      const r = await askCouncilOnce({ strategyId, question });
      return { strategyId, question, answer: r.text };
    },
  },
  {
    name: "deliberate",
    description:
      "Lance une analyse ADVERSARIALE du conseil sur un sujet : le coordinateur rédige une position, les 4 experts (A/D/V/E) la challengent au nom de leur pilier, le coordinateur synthétise (critiques acceptées/rejetées + désaccords non résolus). Coûteux (jusqu'à 6 appels) — à réserver aux décisions structurantes. Retourne le JSON structuré. Lecture seule.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la marque"),
      topic: z.string().min(3).max(2_000).describe("Sujet soumis au conseil"),
      draft: z.string().max(8_000).optional().describe("Position déjà rédigée à challenger (sinon le coordinateur la rédige)"),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const topic = input.topic as string;
      const draft = typeof input.draft === "string" ? input.draft : undefined;
      const denied = await assertCouncilAffordable(strategyId, "deliberate");
      if (denied) return denied;
      return deliberate({ strategyId, topic, draft });
    },
  },
];
