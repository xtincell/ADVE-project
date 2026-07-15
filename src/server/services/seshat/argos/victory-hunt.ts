/**
 * ADR-0154 — Hunter « chasse aux victoires » : le SEUL point LLM du flux
 * prospect-scoring. Réutilise le harnais Argos (grounding Brave RÉEL +
 * `executeStructuredLLMCall`, ADR-0067/0100) pour trouver des victoires dyadiques
 * DOCUMENTÉES d'un sujet vs un rival. Ne fabrique jamais de source : `sources` =
 * URLs Brave réelles uniquement (anti-hallucination).
 *
 * N'écrit JAMAIS `Epreuve`. La persistance passe par la quarantaine
 * `scoreur/candidates.createCandidates` (revue opérateur obligatoire). Sans clé
 * LLM/Brave → DEFERRED honnête, zéro candidate.
 */

import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { isTextLLMAvailable } from "@/server/services/llm-gateway";
import { victoryHarvestSchema, type VictoryHarvest } from "./schemas";
import { createCandidates, type CandidateInput } from "@/server/services/seshat/scoreur/candidates";

export interface HuntVictoriesInput {
  subjectStrategyId: string;
  subjectName: string;
  rivalName: string;
  sector?: string | null;
  market?: string | null;
  rivalStrategyId?: string | null;
  intentEmissionId?: string;
}

export interface HuntVictoriesResult {
  deferred: boolean;
  candidates: number;
  pending: number;
  autoRejected: number;
}

export async function huntVictories(input: HuntVictoriesInput): Promise<HuntVictoriesResult> {
  if (!isTextLLMAvailable()) {
    return { deferred: true, candidates: 0, pending: 0, autoRejected: 0 };
  }

  // ── Grounding internet RÉEL via Brave (ADR-0108), URLs sources non hallucinées.
  const { braveWebSearch, formatWebHits } = await import("@/server/services/seshat/web-search");
  const { wrapUntrusted } = await import("@/server/services/utils/untrusted-content");
  const query = [input.subjectName, "vs", input.rivalName, input.sector, input.market].filter(Boolean).join(" ");
  const search = await braveWebSearch(query, { count: 6 });
  const realHits = search.status === "OK" ? search.hits : [];
  const realUrls = new Set(realHits.map((h) => h.url));
  const grounding = realHits.length
    ? `\n\n${wrapUntrusted("RÉSULTATS WEB RÉELS (Brave)", formatWebHits(realHits), { max: 6000 })}\n` +
      "Ancre chaque victoire sur ces résultats. `sourceUrl` DOIT être l'une des URLs ci-dessus."
    : "";

  const system = [
    "Tu es Hunter (Argos by LaFusée). Tu cherches des VICTOIRES CONCURRENTIELLES DOCUMENTÉES",
    "d'une marque SUJET face à un RIVAL, pour un scoreur de force de marque (arènes :",
    "A=attention/notoriété, D=désirabilité/premium, V=viralité/croissance).",
    "Une victoire = un fait OBSERVÉ et SOURCÉ (part de marché, prix premium tenu, campagne virale,",
    "classement, récompense…). proposedResult=WIN si le sujet l'emporte sur le rival, LOSS sinon.",
    "Ne fabrique JAMAIS de source ni de fait : si tu n'as pas d'URL réelle, n'inclus pas la victoire.",
    "Réponds en français, factuel, une victoire = un fait précis avec sa source.",
  ].join("\n");
  const prompt = [
    `Sujet : ${input.subjectName}`,
    `Rival : ${input.rivalName}`,
    input.sector ? `Secteur : ${input.sector}` : "",
    input.market ? `Marché : ${input.market}` : "",
    "Liste les victoires dyadiques documentées (max 12).",
    grounding,
  ]
    .filter(Boolean)
    .join("\n");

  let data: VictoryHarvest;
  try {
    const res = await executeStructuredLLMCall<VictoryHarvest>({
      system,
      prompt,
      schema: victoryHarvestSchema,
      caller: "argos:hunter-victories",
      schemaTitle: "VictoryHarvest",
      maxOutputTokens: 2000,
    });
    data = res.data;
  } catch {
    return { deferred: true, candidates: 0, pending: 0, autoRejected: 0 };
  }

  // Ne garde que les victoires dont l'URL est un résultat Brave réel (anti-hallu).
  // Si Brave a défère (aucun hit réel), on laisse passer les sourceUrl telles
  // quelles — la garde `candidates` auto-REJECT celles sans source de toute façon.
  const items: CandidateInput[] = data.victories
    .map((v) => {
      const src = v.sourceUrl && (realUrls.size === 0 || realUrls.has(v.sourceUrl)) ? v.sourceUrl : null;
      const hit = realHits.find((h) => h.url === src);
      return {
        arena: v.arena,
        rivalName: v.rivalName || input.rivalName,
        rivalStrategyId: input.rivalStrategyId ?? null,
        proposedResult: v.proposedResult,
        claim: v.claim,
        sourceUrl: src,
        sourceTitle: hit?.title ?? null,
      } satisfies CandidateInput;
    });

  const r = await createCandidates(input.subjectStrategyId, items, input.intentEmissionId);
  return { deferred: false, candidates: r.created, pending: r.pending, autoRejected: r.autoRejected };
}
