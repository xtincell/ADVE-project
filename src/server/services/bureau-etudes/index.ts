/**
 * bureau-etudes/ — Acteur Bureau d'étude (ADR-0110).
 *
 * Time-spine `ResearchWave` (vagues d'étude) + comparaison inter-vagues
 * déterministe (z-test, `statistics.ts`). Le catalogue de méthodes
 * (`MethodologyReference`) est une table de référence seedée. Zéro LLM.
 */

import { db } from "@/lib/db";
import { marginOfErrorPct, waveOnWaveSignificance, type WaveComparison } from "./statistics";

export * from "./statistics";

export interface CreateWaveInput {
  studyId: string;
  waveLabel: string;
  periodLabel: string;
  fieldStart?: Date;
  fieldEnd?: Date;
  cadence?: string;
  targetN?: number;
  isRolling?: boolean;
}

export async function createResearchWave(input: CreateWaveInput) {
  return db.researchWave.create({
    data: {
      studyId: input.studyId,
      waveLabel: input.waveLabel,
      periodLabel: input.periodLabel,
      fieldStart: input.fieldStart ?? null,
      fieldEnd: input.fieldEnd ?? null,
      cadence: input.cadence ?? null,
      targetN: input.targetN ?? null,
      isRolling: input.isRolling ?? false,
    },
  });
}

export async function recordWaveAchieved(input: { waveId: string; achievedN: number }) {
  return db.researchWave.update({
    where: { id: input.waveId },
    data: { achievedN: input.achievedN },
  });
}

export async function listWaves(studyId: string) {
  const waves = await db.researchWave.findMany({
    where: { studyId },
    orderBy: { createdAt: "asc" },
  });
  // Annoter chaque vague de sa marge d'erreur déterministe (selon achievedN).
  return waves.map((w) => ({
    ...w,
    marginOfErrorPct: w.achievedN ? marginOfErrorPct(w.achievedN) : null,
  }));
}

/**
 * Compare une métrique-proportion entre deux vagues (significativité déterministe).
 * p1/p2 ∈ [0,1] (ex. taux de considération). Aucun LLM.
 */
export async function compareWaves(input: {
  waveIdA: string;
  waveIdB: string;
  p1: number;
  p2: number;
  confidenceLevel?: number;
}): Promise<WaveComparison & { n1: number | null; n2: number | null }> {
  const [a, b] = await Promise.all([
    db.researchWave.findUniqueOrThrow({ where: { id: input.waveIdA }, select: { achievedN: true } }),
    db.researchWave.findUniqueOrThrow({ where: { id: input.waveIdB }, select: { achievedN: true } }),
  ]);
  const n1 = a.achievedN ?? 0;
  const n2 = b.achievedN ?? 0;
  const cmp = waveOnWaveSignificance(input.p1, n1, input.p2, n2, input.confidenceLevel ?? 0.95);
  return { ...cmp, n1: a.achievedN, n2: b.achievedN };
}
