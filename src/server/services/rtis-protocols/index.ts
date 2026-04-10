/**
 * RTIS Protocols — 4 agents spécialisés de l'essaim MESTOR
 *
 * Cascade ADVERTIS : R → T → I → S
 * Chaque protocole puise dans les piliers précédents.
 * Chaque protocole écrit via le Pillar Gateway (quand implémenté — Chantier 1).
 *
 * Architecture :
 *   MESTOR Commandant
 *     └── Hyperviseur (plan d'orchestration)
 *           ├── Protocole Risk (R)     — diagnostic ADVE
 *           ├── Protocole Track (T)    — confrontation réalité
 *           ├── Protocole Innovation (I) — potentiel total
 *           └── Protocole Strategy (S) — roadmap → superfan
 */

import { executeProtocoleRisk, type ProtocoleRiskResult } from "./risk";
import { executeProtocoleTrack, type ProtocoleTrackResult } from "./track";
import { executeProtocoleInnovation, type ProtocoleInnovationResult } from "./innovation";
import { executeProtocoleStrategy, type ProtocoleStrategyResult } from "./strategy";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import type { PillarKey } from "@/lib/types/advertis-vector";

export { executeProtocoleRisk, executeProtocoleTrack, executeProtocoleInnovation, executeProtocoleStrategy };
export type { ProtocoleRiskResult, ProtocoleTrackResult, ProtocoleInnovationResult, ProtocoleStrategyResult };

export type ProtocoleResult =
  | ProtocoleRiskResult
  | ProtocoleTrackResult
  | ProtocoleInnovationResult
  | ProtocoleStrategyResult;

/**
 * Write a protocol result to the pillar via the Gateway.
 * Respects LOI 1: all writes go through the Gateway.
 */
async function persistViaGateway(
  strategyId: string,
  result: ProtocoleResult,
): Promise<void> {
  if (result.error || Object.keys(result.content).length === 0) return;

  const protocolName = `PROTOCOLE_${result.pillarKey.toUpperCase()}` as const;

  await writePillarAndScore({
    strategyId,
    pillarKey: result.pillarKey as PillarKey,
    operation: { type: "MERGE_DEEP", patch: result.content },
    author: {
      system: protocolName as "PROTOCOLE_R" | "PROTOCOLE_T" | "PROTOCOLE_I" | "PROTOCOLE_S",
      reason: `Cascade RTIS — protocole ${result.pillarKey.toUpperCase()}`,
    },
    options: {
      targetStatus: "AI_PROPOSED",
      confidenceDelta: result.confidence > 0 ? result.confidence * 0.1 : 0,
    },
  });
}

/**
 * Execute the full RTIS cascade in ADVERTIS order : R → T → I → S
 * Each protocol generates content, then writes via the Pillar Gateway.
 */
export async function executeRTISCascade(
  strategyId: string,
): Promise<{
  results: ProtocoleResult[];
  errors: string[];
}> {
  const results: ProtocoleResult[] = [];
  const errors: string[] = [];

  // R — puise dans ADVE
  const rResult = await executeProtocoleRisk(strategyId);
  results.push(rResult);
  if (rResult.error) errors.push(`R: ${rResult.error}`);
  else await persistViaGateway(strategyId, rResult);

  // T — puise dans ADVE + R
  const tResult = await executeProtocoleTrack(strategyId);
  results.push(tResult);
  if (tResult.error) errors.push(`T: ${tResult.error}`);
  else await persistViaGateway(strategyId, tResult);

  // I — puise dans ADVE + R + T
  const iResult = await executeProtocoleInnovation(strategyId);
  results.push(iResult);
  if (iResult.error) errors.push(`I: ${iResult.error}`);
  else await persistViaGateway(strategyId, iResult);

  // S — puise dans ADVE + R + T + I
  const sResult = await executeProtocoleStrategy(strategyId);
  results.push(sResult);
  if (sResult.error) errors.push(`S: ${sResult.error}`);
  else await persistViaGateway(strategyId, sResult);

  return { results, errors };
}
