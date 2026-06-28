/**
 * bureau-etudes/ — Acteur Bureau d'étude (ADR-0110).
 *
 * Time-spine `ResearchWave` (vagues d'étude) + comparaison inter-vagues
 * déterministe (z-test, `statistics.ts`). Le catalogue de méthodes
 * (`MethodologyReference`) est une table de référence seedée. Zéro LLM.
 */

import { db } from "@/lib/db";
import { marginOfErrorPct, waveOnWaveSignificance, type WaveComparison } from "./statistics";
import { fuseEstimates, type SourcePoint } from "./fusion";

export * from "./statistics";
export * from "./fusion";

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

// ── Provenance & fusion (ADR-0114) ───────────────────────────────────────────

/** Fusionne des estimations chiffrées des sources d'une étude (pondérées fiabilité). */
export async function fuseStudySources(studyId: string, valueKey: string) {
  const sources = await db.marketSource.findMany({
    where: { studyId },
    select: { reliability: true, provenanceClass: true, content: true, title: true },
  });
  // On extrait la valeur numérique du champ `content` si elle y est encodée
  // JSON sous `valueKey` — déterministe, jamais d'inférence LLM.
  const points: SourcePoint[] = [];
  for (const s of sources) {
    let value: number | null = null;
    if (s.content) {
      try {
        const parsed = JSON.parse(s.content) as Record<string, unknown>;
        const v = parsed[valueKey];
        if (typeof v === "number" && Number.isFinite(v)) value = v;
      } catch {
        /* contenu non-JSON → pas de valeur extractible */
      }
    }
    if (value !== null) points.push({ value, reliability: s.reliability, provenanceClass: s.provenanceClass });
  }
  return fuseEstimates(points);
}

/** Snapshots concurrents d'une étude (provenance rattachée). */
export async function listCompetitorsByStudy(studyId: string) {
  return db.competitorSnapshot.findMany({ where: { studyId }, orderBy: { measuredAt: "desc" } });
}

/** Classe la provenance d'une source (FIRST_PARTY/SYNDICATED/AI_INFERRED/PUBLIC). */
export async function setSourceProvenance(input: { sourceId: string; provenanceClass: string; reliability?: number }) {
  return db.marketSource.update({
    where: { id: input.sourceId },
    data: { provenanceClass: input.provenanceClass, ...(input.reliability !== undefined ? { reliability: input.reliability } : {}) },
  });
}

// ── Console marketplace (ADR-0114) — picker d'études + sources provenance ─────

/** Liste les études de marché récentes (picker console) avec compteurs. */
export async function listStudies(opts?: { limit?: number }) {
  return db.marketStudy.findMany({
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
    select: {
      id: true, title: true, status: true, methodologyKey: true, createdAt: true,
      _count: { select: { sources: true, waves: true, competitorSnapshots: true } },
    },
  });
}

/** Sources d'une étude avec leur classe de provenance (pour pondération/affichage). */
export async function listStudySources(studyId: string) {
  return db.marketSource.findMany({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, sourceType: true, url: true, reliability: true, provenanceClass: true },
  });
}
