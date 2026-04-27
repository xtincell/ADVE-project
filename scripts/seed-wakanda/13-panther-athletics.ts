/**
 * WAKANDA SEED -- Panther Athletics (60/200 ZOMBIE)
 *
 * Early-stage sportswear brand with minimal content.
 * Creates: Strategy, 2 Pillars (1 partial + 1 near-empty),
 * PillarVersions, 1 ScoreSnapshot. No drivers yet.
 *
 * Edge case: brand still in QUESTIONS_DONE boot state,
 * notoriaPipeline not started.
 */

import type { PrismaClient, Operator, Client, Strategy } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track } from "./helpers";
import { pantherPillarA } from "./data/panther-pillars";
import type { WakandaUsers } from "./02-users";

export interface PantherBrand {
  strategy: Strategy;
}

export async function seedPantherAthletics(
  prisma: PrismaClient,
  operator: Operator,
  clients: Record<string, Client>,
  users: WakandaUsers,
): Promise<PantherBrand> {
  console.log("\n  -- Panther Athletics (60/200 ZOMBIE) --");

  // ================================================================
  // STRATEGY
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: IDS.stratPanther },
    update: {},
    create: {
      id: IDS.stratPanther,
      name: "Panther Athletics",
      description:
        "Marque de sportswear wakandaise. Vetements techniques inspires des Dora Milaje. Projet en phase de decouverte, questionnaire rempli mais peu exploite.",
      userId: users.amara.id,
      operatorId: operator.id,
      clientId: IDS.clientPanther,
      status: "ACTIVE",
      isDummy: true,
      advertis_vector: {
        a: 15.0, d: 10.0, v: 0.0, e: 0.0,
        r: 0.0, t: 0.0, i: 0.0, s: 0.0,
        composite: 60.0, confidence: 0.30,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "DIRECT_TO_CONSUMER",
        businessModelSubtype: "Sportswear DTC -- e-commerce + pop-up stores",
        economicModels: ["VENTE_DIRECTE"],
        positioningArchetype: "HERO",
        salesChannel: "DIGITAL",
        positionalGoodFlag: false,
        premiumScope: "NONE",
        bootState: "QUESTIONS_DONE",
        freeLayer: {
          whatIsFree: "Programme d'entrainement basique gratuit sur le site (3 routines/semaine).",
          whatIsPaid: "Vetements techniques (leggings 18 000 XAF, brassiere 12 000 XAF, ensemble complet 35 000 XAF).",
          conversionLever: "Les programmes gratuits incluent des athletes portant la collection, creant un desir organique.",
        },
        country: "Wakanda",
        sector: "Sportswear & Fitness",
      } as Prisma.InputJsonValue,
      notoriaPipeline: {
        currentStage: 0,
        stages: [],
      } as Prisma.InputJsonValue,
      createdAt: T.intake,
    },
  });
  track("Strategy");

  // ================================================================
  // 2 PILLARS -- A partial (15, 0.45) + D near-empty (~10)
  // ================================================================
  // Pillar A -- partial content, DRAFT
  const pillarAId = "wk-pillar-panther-a";
  await prisma.pillar.upsert({
    where: { id: pillarAId },
    update: {},
    create: {
      id: pillarAId,
      key: "a",
      strategyId: strategy.id,
      content: pantherPillarA as Prisma.InputJsonValue,
      confidence: 0.45,
      validationStatus: "DRAFT",
      currentVersion: 1,
      createdAt: T.bootAD,
    },
  });
  track("Pillar");

  // Pillar D -- near-empty skeleton, minimal score
  const pillarDId = "wk-pillar-panther-d";
  await prisma.pillar.upsert({
    where: { id: pillarDId },
    update: {},
    create: {
      id: pillarDId,
      key: "d",
      strategyId: strategy.id,
      content: {
        personas: [],
        positioning: "A definir",
        competitors: [],
        toneOfVoice: "Non defini",
        _placeholder: true,
      } as Prisma.InputJsonValue,
      confidence: 0.20,
      validationStatus: "DRAFT",
      currentVersion: 1,
      createdAt: T.bootAD,
    },
  });
  track("Pillar");
  console.log("  [OK] 2 pillars created (A partial DRAFT, D near-empty)");

  // ================================================================
  // PILLAR VERSIONS
  // ================================================================
  const versionDefs = [
    { pillarId: pillarAId, version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- questionnaire partiel sportswear", createdAt: T.bootAD },
    { pillarId: pillarDId, version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- squelette D genere automatiquement", createdAt: T.bootAD },
  ];

  for (const v of versionDefs) {
    await prisma.pillarVersion.upsert({
      where: { id: `${v.pillarId}-v${v.version}` },
      update: {},
      create: {
        id: `${v.pillarId}-v${v.version}`,
        pillarId: v.pillarId,
        version: v.version,
        content: {} as Prisma.InputJsonValue,
        diff: { type: "INITIAL", summary: v.reason } as Prisma.InputJsonValue,
        author: v.author,
        reason: v.reason,
        createdAt: v.createdAt,
      },
    });
    track("PillarVersion");
  }
  console.log(`  [OK] ${versionDefs.length} pillar versions`);

  // ================================================================
  // SCORE SNAPSHOT -- 1 point only (60)
  // ================================================================
  await prisma.scoreSnapshot.upsert({
    where: { id: "wk-score-panther-0" },
    update: {},
    create: {
      id: "wk-score-panther-0",
      strategyId: strategy.id,
      advertis_vector: {
        a: 15, d: 10, v: 0, e: 0,
        r: 0, t: 0, i: 0, s: 0,
        composite: 60, confidence: 0.30,
      } as Prisma.InputJsonValue,
      classification: "ZOMBIE",
      confidence: 0.30,
      measuredAt: T.bootAD,
    },
  });
  track("ScoreSnapshot");
  console.log("  [OK] 1 score snapshot (60 ZOMBIE)");

  // No drivers, no devotion, no cult index for this early-stage brand

  console.log("  -- Panther Athletics complete --\n");

  return { strategy };
}
