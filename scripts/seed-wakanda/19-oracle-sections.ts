/**
 * WAKANDA SEED — Batch 4: Oracle 35 sections first-class (Phase 21 F-B).
 *
 * La voie « oracle 35 sections » n'était pas irriguée : `OracleSection` (entité
 * first-class, 35 × strategyId) + `OracleSnapshot` vides. Ce batch pose les 35
 * sections pour les 6 marques avec des états réalistes (COMPLETE/PENDING/STALE/
 * FAILED) + 2 snapshots PDF figés pour BLISS.
 *
 * Tiers canon (SECTION_REGISTRY) : 1-23 CORE · 24-30 BIG4_BASELINE · 31-35
 * DISTINCTIVE. Déterministe, zéro LLM (payloads démo figés).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track } from "./helpers";

type SectionStatus = "PENDING" | "GENERATING" | "COMPLETE" | "FAILED" | "STALE";

function tierOf(sectionId: number): "CORE" | "BIG4_BASELINE" | "DISTINCTIVE" {
  if (sectionId <= 23) return "CORE";
  if (sectionId <= 30) return "BIG4_BASELINE";
  return "DISTINCTIVE";
}

const SECTION_TITLES: Record<number, string> = {
  1: "Executive Summary", 2: "Contexte & Défi", 3: "Plateforme Stratégique", 4: "Proposition de Valeur",
  5: "Territoire Créatif", 6: "Expérience & Engagement", 7: "SWOT Interne", 8: "SWOT Externe",
  9: "Signaux & Opportunités", 10: "Catalogue d'Actions", 11: "Plan d'Activation", 12: "Fenêtre d'Overton",
  13: "Médias & Distribution", 14: "Production & Livrables", 15: "Profil Superfan", 16: "KPIs & Mesure",
  17: "Croissance & Évolution", 18: "Budget", 19: "Timeline & Gouvernance", 20: "Équipe",
  21: "Conditions & Prochaines Étapes", 22: "Crew Program (Imhotep)", 23: "Plan Comms (Anubis)",
  24: "McKinsey 7S", 25: "BCG Growth-Share", 26: "Bain NPS", 27: "Deloitte Greenhouse",
  28: "McKinsey 3 Horizons", 29: "BCG Strategy Palette", 30: "Deloitte Budget",
  31: "Cult Index", 32: "Manipulation Matrix", 33: "Devotion Ladder", 34: "Overton Distinctive", 35: "Tarsis Weak Signals",
};

export async function seedOracleSections(prisma: PrismaClient) {
  const profiles: Array<{
    strategyId: string;
    completeThrough: number;
    baseConfidence: number;
    overrides?: Record<number, SectionStatus>;
  }> = [
    { strategyId: IDS.stratBliss, completeThrough: 35, baseConfidence: 0.95 },
    { strategyId: IDS.stratVibranium, completeThrough: 27, baseConfidence: 0.82, overrides: { 34: "STALE" } },
    { strategyId: IDS.stratShuri, completeThrough: 23, baseConfidence: 0.8, overrides: { 31: "COMPLETE", 32: "COMPLETE", 34: "STALE" } },
    { strategyId: IDS.stratBrew, completeThrough: 16, baseConfidence: 0.72, overrides: { 35: "FAILED" } },
    { strategyId: IDS.stratPanther, completeThrough: 11, baseConfidence: 0.68 },
    { strategyId: IDS.stratJabari, completeThrough: 21, baseConfidence: 0.74, overrides: { 12: "STALE" } },
  ];

  let total = 0;
  for (const p of profiles) {
    const short = p.strategyId.replace("wk-strategy-", "");
    for (let sectionId = 1; sectionId <= 35; sectionId++) {
      const status: SectionStatus = p.overrides?.[sectionId] ?? (sectionId <= p.completeThrough ? "COMPLETE" : "PENDING");
      const isComplete = status === "COMPLETE" || status === "STALE";
      const id = `wk-oracle-${short}-${sectionId}`;
      await prisma.oracleSection.upsert({
        where: { id },
        update: {},
        create: {
          id,
          strategyId: p.strategyId,
          sectionId,
          tier: tierOf(sectionId) as Prisma.OracleSectionCreateInput["tier"],
          status: status as Prisma.OracleSectionCreateInput["status"],
          payload: isComplete
            ? ({ title: SECTION_TITLES[sectionId], body: `Section ${sectionId} — ${SECTION_TITLES[sectionId]} (démo Wakanda)`, _deterministic: true } as Prisma.InputJsonValue)
            : undefined,
          confidence: isComplete ? p.baseConfidence : null,
          lastGenerationStartedAt: isComplete || status === "FAILED" ? T.notoriaStage2 : null,
          lastGenerationCompletedAt: isComplete ? T.notoriaStage3 : null,
          lastError: status === "FAILED" ? ({ errorCode: "ZOD_VALIDATION_FAILED", errorMessage: "Section payload failed schema validation", attempts: 2 } as Prisma.InputJsonValue) : undefined,
          errorCode: status === "FAILED" ? "ZOD_VALIDATION_FAILED" : null,
          generationCount: status === "FAILED" ? 2 : status === "STALE" ? 2 : isComplete ? 1 : 0,
          staleAt: status === "STALE" ? T.scoresValidated : null,
        },
      });
      total++;
    }
    track("OracleSection", 35);
  }

  // ── OracleSnapshot — PDF figés (BLISS, 2 versions) ───────────────────
  const snapshots = [
    { id: "wk-oracle-snap-bliss-v1", takenAt: T.notoriaStage2, version: 1 },
    { id: "wk-oracle-snap-bliss-v2", takenAt: T.scoresValidated, version: 2 },
  ];
  for (const s of snapshots) {
    await prisma.oracleSnapshot.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: IDS.stratBliss,
        takenAt: s.takenAt,
        schemaVersion: s.version,
        lang: "fr",
        snapshotJson: {
          brand: "BLISS by Wakanda",
          tier: "ICONE",
          sections: 35,
          generatedAt: s.takenAt.toISOString(),
          _deterministic: true,
        } as Prisma.InputJsonValue,
      },
    });
    track("OracleSnapshot");
  }

  console.log(`[OK] Oracle: ${total} sections (6 marques × 35) + ${snapshots.length} snapshots`);
}
