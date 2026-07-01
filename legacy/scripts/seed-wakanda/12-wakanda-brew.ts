/**
 * WAKANDA SEED -- Wakanda Brew (95/200 ORDINAIRE)
 *
 * Artisanal beverage brand with 4 pillars (2 complete, 2 partial).
 * No RTIS pillars generated yet -- intake phase only.
 * Creates: Strategy, 4 Pillars, PillarVersions,
 * ScoreSnapshots, Drivers.
 */

import type { PrismaClient, Operator, Client, Strategy } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track } from "./helpers";
import {
  brewPillarA,
  brewPillarD,
  brewPillarV,
  brewPillarE,
} from "./data/wakanda-brew-pillars";
import type { WakandaUsers } from "./02-users";

export interface BrewBrand {
  strategy: Strategy;
}

export async function seedWakandaBrew(
  prisma: PrismaClient,
  operator: Operator,
  clients: Record<string, Client>,
  users: WakandaUsers,
): Promise<BrewBrand> {
  console.log("\n  -- Wakanda Brew (95/200 ORDINAIRE) --");

  // ================================================================
  // STRATEGY
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: IDS.stratBrew },
    update: {},
    create: {
      id: IDS.stratBrew,
      name: "Wakanda Brew",
      description:
        "Brasserie artisanale wakandaise. Bieres infusees aux plantes ancestrales et houblon local. Distribution en bars, restaurants et retail.",
      userId: users.ramonda.id,
      operatorId: operator.id,
      clientId: IDS.clientBrew,
      status: "ACTIVE",
      isDummy: true,
      advertis_vector: {
        a: 16.0, d: 15.0, v: 13.0, e: 12.0,
        r: 0.0, t: 0.0, i: 0.0, s: 0.0,
        composite: 95.0, confidence: 0.58,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "PRODUCTION",
        businessModelSubtype: "Brasserie artisanale -- production et distribution locale",
        economicModels: ["VENTE_DIRECTE", "DISTRIBUTION_RETAIL", "HORECA"],
        positioningArchetype: "ARTISAN",
        salesChannel: "PHYSICAL",
        positionalGoodFlag: false,
        premiumScope: "PARTIAL",
        bootState: "COMPLETED",
        freeLayer: {
          whatIsFree: "Degustations gratuites dans les bars partenaires chaque vendredi soir.",
          whatIsPaid: "Gamme complete (Pack 6 a 8 500 XAF, Fut 30L a 45 000 XAF, coffret collector a 25 000 XAF).",
          conversionLever: "La degustation gratuite convertit 40% des gouteurs en acheteurs du pack 6.",
        },
        country: "Wakanda",
        sector: "Boissons & Brasserie Artisanale",
      } as Prisma.InputJsonValue,
      notoriaPipeline: {
        currentStage: 1,
        stages: [
          { type: "ADVE_INTAKE", status: "COMPLETED", completedAt: "2026-01-20T11:00:00Z" },
        ],
      } as Prisma.InputJsonValue,
      createdAt: T.intakeConverted,
    },
  });
  track("Strategy");

  // ================================================================
  // 4 PILLARS -- A, D complete; V, E partial. No R-T-I-S.
  // ================================================================
  const pillarDefs: {
    key: string;
    content: unknown;
    confidence: number;
    validationStatus: string;
    createdAt: Date;
  }[] = [
    { key: "a", content: brewPillarA, confidence: 0.88, validationStatus: "VALIDATED", createdAt: T.bootAD },
    { key: "d", content: brewPillarD, confidence: 0.85, validationStatus: "VALIDATED", createdAt: T.bootAD },
    { key: "v", content: brewPillarV, confidence: 0.60, validationStatus: "REVIEW", createdAt: T.bootVE },
    { key: "e", content: brewPillarE, confidence: 0.55, validationStatus: "REVIEW", createdAt: T.bootVE },
  ];

  for (const def of pillarDefs) {
    const pillarId = `wk-pillar-brew-${def.key}`;
    await prisma.pillar.upsert({
      where: { id: pillarId },
      update: {},
      create: {
        id: pillarId,
        key: def.key,
        strategyId: strategy.id,
        content: def.content as Prisma.InputJsonValue,
        confidence: def.confidence,
        validationStatus: def.validationStatus,
        currentVersion: def.key === "a" || def.key === "d" ? 2 : 1,
        createdAt: def.createdAt,
      },
    });
    track("Pillar");
  }
  console.log("  [OK] 4 pillars created (A+D validated, V+E in review)");

  // ================================================================
  // PILLAR VERSIONS
  // ================================================================
  const versionDefs = [
    { pillarId: "wk-pillar-brew-a", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- questionnaire initial brasserie", createdAt: T.bootAD },
    { pillarId: "wk-pillar-brew-a", version: 2, author: "OPERATOR", reason: "Validation -- approuve par Ramonda", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-brew-d", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- personas consommateurs", createdAt: T.bootAD },
    { pillarId: "wk-pillar-brew-d", version: 2, author: "OPERATOR", reason: "Validation -- positionnement verrouille", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-brew-v", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- gamme et pricing initial", createdAt: T.bootVE },
    { pillarId: "wk-pillar-brew-e", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- parcours client bars et retail", createdAt: T.bootVE },
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
        diff: { type: v.version === 1 ? "INITIAL" : "MERGE_DEEP", summary: v.reason } as Prisma.InputJsonValue,
        author: v.author,
        reason: v.reason,
        createdAt: v.createdAt,
      },
    });
    track("PillarVersion");
  }
  console.log(`  [OK] ${versionDefs.length} pillar versions`);

  // ================================================================
  // SCORE SNAPSHOTS -- 2 points (65 -> 95)
  // ================================================================
  const scoreHistory = [
    { date: T.bootVE, composite: 65, a: 12, d: 11, v: 9, e: 8, r: 0, t: 0, i: 0, s: 0, confidence: 0.42 },
    { date: T.recosReviewed, composite: 95, a: 16, d: 15, v: 13, e: 12, r: 0, t: 0, i: 0, s: 0, confidence: 0.58 },
  ];

  for (let i = 0; i < scoreHistory.length; i++) {
    const s = scoreHistory[i];
    await prisma.scoreSnapshot.upsert({
      where: { id: `wk-score-brew-${i}` },
      update: {},
      create: {
        id: `wk-score-brew-${i}`,
        strategyId: strategy.id,
        advertis_vector: {
          a: s.a, d: s.d, v: s.v, e: s.e,
          r: s.r, t: s.t, i: s.i, s: s.s,
          composite: s.composite, confidence: s.confidence,
        } as Prisma.InputJsonValue,
        classification: s.composite <= 80 ? "ZOMBIE" : s.composite <= 120 ? "ORDINAIRE" : s.composite <= 160 ? "FORTE" : s.composite <= 180 ? "CULTE" : "ICONE",
        confidence: s.confidence,
        measuredAt: s.date,
      },
    });
    track("ScoreSnapshot");
  }
  console.log(`  [OK] ${scoreHistory.length} score snapshots (65->95)`);

  // ================================================================
  // DRIVERS -- 3 channels
  // ================================================================
  const driverDefs = [
    { id: "wk-driver-brew-event", name: "Degustations Wakanda Brew", channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-brew-retail", name: "Distribution Retail", channel: "CUSTOM" as const, channelType: "PHYSICAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-brew-social", name: "Instagram Wakanda Brew", channel: "INSTAGRAM" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
  ];

  for (const drv of driverDefs) {
    await prisma.driver.upsert({
      where: { id: drv.id },
      update: {},
      create: {
        id: drv.id,
        strategyId: strategy.id,
        name: drv.name,
        channel: drv.channel,
        channelType: drv.channelType,
        status: drv.status,
        formatSpecs: {} as Prisma.InputJsonValue,
        constraints: {} as Prisma.InputJsonValue,
        briefTemplate: {} as Prisma.InputJsonValue,
        qcCriteria: {} as Prisma.InputJsonValue,
        pillarPriority: {} as Prisma.InputJsonValue,
        createdAt: T.driversConfigured,
      },
    });
    track("Driver");
  }

  console.log("  [OK] Drivers configured");
  console.log("  -- Wakanda Brew complete --\n");

  return { strategy };
}
