/**
 * WAKANDA SEED -- Vibranium Tech (140/200 FORTE)
 *
 * B2B tech brand with 8 pillars (6 complete, 2 partial).
 * Creates: Strategy, 8 Pillars, PillarVersions,
 * ScoreSnapshots, DevotionSnapshots, CultIndexSnapshots, Drivers.
 */

import type { PrismaClient, Operator, Client, Strategy } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";
import {
  vibraniumPillarA,
  vibraniumPillarD,
  vibraniumPillarV,
  vibraniumPillarE,
  vibraniumPillarR,
  vibraniumPillarT,
  vibraniumPillarI,
  vibraniumPillarS,
} from "./data/vibranium-pillars";
import type { WakandaUsers } from "./02-users";

export interface VibraniumBrand {
  strategy: Strategy;
}

export async function seedVibraniumTech(
  prisma: PrismaClient,
  operator: Operator,
  clients: Record<string, Client>,
  users: WakandaUsers,
): Promise<VibraniumBrand> {
  console.log("\n  -- Vibranium Tech (140/200 FORTE) --");

  // ================================================================
  // STRATEGY
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: IDS.stratVibranium },
    update: {},
    create: {
      id: IDS.stratVibranium,
      name: "Vibranium Tech",
      description:
        "Plateforme SaaS B2B de gestion energetique au vibranium. Solutions industrielles pour entreprises africaines. Modele abonnement avec tiers personnalises.",
      userId: users.tchalla.id,
      operatorId: operator.id,
      clientId: IDS.clientVibranium,
      status: "ACTIVE",
      isDummy: true,
      advertis_vector: {
        a: 19.0, d: 18.0, v: 17.0, e: 18.0,
        r: 17.0, t: 16.0, i: 15.0, s: 12.0,
        composite: 140.0, confidence: 0.78,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "ABONNEMENT",
        businessModelSubtype: "SaaS B2B -- energie vibranium pour industrie",
        economicModels: ["ABONNEMENT", "LICENCE", "CONSULTING"],
        positioningArchetype: "EXPERT",
        salesChannel: "DIGITAL",
        positionalGoodFlag: false,
        premiumScope: "PARTIAL",
        bootState: "COMPLETED",
        freeLayer: {
          whatIsFree: "Audit energetique gratuit 30 jours + dashboard basique consommation vibranium.",
          whatIsPaid: "Modules avances (predictif IA, optimisation temps reel, alertes). Plans: Starter 500K XAF/mois, Pro 1.5M XAF/mois, Enterprise sur devis.",
          conversionLever: "L'audit gratuit revele 15-25% d'economies potentielles, motivant l'upgrade vers le plan payant.",
        },
        country: "Wakanda",
        sector: "Energie & Technologie Industrielle",
      } as Prisma.InputJsonValue,
      notoriaPipeline: {
        currentStage: 2,
        stages: [
          { type: "ADVE_INTAKE", status: "COMPLETED", completedAt: "2026-01-20T11:00:00Z" },
          { type: "ADVE_UPDATE", status: "COMPLETED", completedAt: "2026-01-29T10:00:00Z" },
          { type: "I_GENERATION", status: "REVIEW", startedAt: "2026-02-05T10:00:00Z" },
        ],
      } as Prisma.InputJsonValue,
      createdAt: T.intakeConverted,
    },
  });
  track("Strategy");

  // ================================================================
  // 8 PILLARS -- 6 complete + 2 partial (I, S)
  // ================================================================
  const pillarDefs: {
    key: string;
    content: unknown;
    confidence: number;
    validationStatus: string;
    createdAt: Date;
  }[] = [
    { key: "a", content: vibraniumPillarA, confidence: 0.92, validationStatus: "VALIDATED", createdAt: T.bootAD },
    { key: "d", content: vibraniumPillarD, confidence: 0.90, validationStatus: "VALIDATED", createdAt: T.bootAD },
    { key: "v", content: vibraniumPillarV, confidence: 0.88, validationStatus: "VALIDATED", createdAt: T.bootVE },
    { key: "e", content: vibraniumPillarE, confidence: 0.90, validationStatus: "VALIDATED", createdAt: T.bootVE },
    { key: "r", content: vibraniumPillarR, confidence: 0.85, validationStatus: "VALIDATED", createdAt: T.rtisCascade },
    { key: "t", content: vibraniumPillarT, confidence: 0.82, validationStatus: "VALIDATED", createdAt: T.rtisCascade },
    { key: "i", content: vibraniumPillarI, confidence: 0.60, validationStatus: "DRAFT", createdAt: T.notoriaStage2 },
    { key: "s", content: vibraniumPillarS, confidence: 0.50, validationStatus: "DRAFT", createdAt: T.notoriaStage3 },
  ];

  for (const def of pillarDefs) {
    const pillarId = `wk-pillar-vibranium-${def.key}`;
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
        currentVersion: def.key === "a" || def.key === "d" ? 3 : def.key === "v" || def.key === "e" ? 2 : 1,
        createdAt: def.createdAt,
      },
    });
    track("Pillar");
  }
  console.log("  [OK] 8 pillars created (6 validated, 2 DRAFT)");

  // ================================================================
  // PILLAR VERSIONS
  // ================================================================
  const versionDefs = [
    { pillarId: "wk-pillar-vibranium-a", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- questionnaire initial", createdAt: T.bootAD },
    { pillarId: "wk-pillar-vibranium-a", version: 2, author: "MESTOR", reason: "Vault Enrichment -- noyau identitaire affine", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-vibranium-a", version: 3, author: "OPERATOR", reason: "Validation finale -- approuve par T'Challa", createdAt: T.scoresValidated },
    { pillarId: "wk-pillar-vibranium-d", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- personas B2B", createdAt: T.bootAD },
    { pillarId: "wk-pillar-vibranium-d", version: 2, author: "MESTOR", reason: "Vault Enrichment -- concurrents ajoutes", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-vibranium-d", version: 3, author: "OPERATOR", reason: "Validation finale -- positionnement verrouille", createdAt: T.scoresValidated },
    { pillarId: "wk-pillar-vibranium-v", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- pricing SaaS initial", createdAt: T.bootVE },
    { pillarId: "wk-pillar-vibranium-v", version: 2, author: "MESTOR", reason: "Notoria update -- unit economics valides", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-vibranium-e", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- parcours client B2B", createdAt: T.bootVE },
    { pillarId: "wk-pillar-vibranium-e", version: 2, author: "MESTOR", reason: "Notoria update -- funnel onboarding affine", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-vibranium-r", version: 1, author: "PROTOCOLE_R", reason: "RTIS Cascade -- diagnostic risques", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-vibranium-t", version: 1, author: "PROTOCOLE_T", reason: "RTIS Cascade -- realite marche B2B", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-vibranium-i", version: 1, author: "PROTOCOLE_I", reason: "Notoria I_GENERATION -- catalogue actions draft", createdAt: T.notoriaStage2 },
    { pillarId: "wk-pillar-vibranium-s", version: 1, author: "PROTOCOLE_S", reason: "Notoria S_SYNTHESIS -- roadmap brouillon", createdAt: T.notoriaStage3 },
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
  // SCORE SNAPSHOTS -- 3 points (95 -> 120 -> 140)
  // ================================================================
  const scoreHistory = [
    { date: T.bootVE, composite: 95, a: 14, d: 13, v: 12, e: 13, r: 11, t: 10, i: 8, s: 6, confidence: 0.55 },
    { date: T.notoriaStage1, composite: 120, a: 17, d: 16, v: 15, e: 16, r: 14, t: 13, i: 11, s: 9, confidence: 0.68 },
    { date: T.scoresValidated, composite: 140, a: 19, d: 18, v: 17, e: 18, r: 17, t: 16, i: 15, s: 12, confidence: 0.78 },
  ];

  for (let i = 0; i < scoreHistory.length; i++) {
    const s = scoreHistory[i];
    await prisma.scoreSnapshot.upsert({
      where: { id: `wk-score-vibranium-${i}` },
      update: {},
      create: {
        id: `wk-score-vibranium-${i}`,
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
  console.log(`  [OK] ${scoreHistory.length} score snapshots (95->120->140)`);

  // ================================================================
  // DEVOTION SNAPSHOTS
  // ================================================================
  const devotionHistory = [
    { date: new Date("2026-02-15"), spectateurs: 5000, interesses: 800, participants: 200, engages: 30, ambassadeurs: 0, evangelistes: 0 },
    { date: new Date("2026-03-31"), spectateurs: 12000, interesses: 2200, participants: 550, engages: 85, ambassadeurs: 5, evangelistes: 0 },
  ];

  for (let i = 0; i < devotionHistory.length; i++) {
    const dv = devotionHistory[i];
    const total = dv.spectateurs + dv.interesses + dv.participants + dv.engages + dv.ambassadeurs + dv.evangelistes;
    await prisma.devotionSnapshot.upsert({
      where: { id: `wk-devotion-vibranium-${i}` },
      update: {},
      create: {
        id: `wk-devotion-vibranium-${i}`,
        strategyId: strategy.id,
        spectateur: dv.spectateurs,
        interesse: dv.interesses,
        participant: dv.participants,
        engage: dv.engages,
        ambassadeur: dv.ambassadeurs,
        evangeliste: dv.evangelistes,
        devotionScore: total > 0 ? ((dv.engages + dv.ambassadeurs * 2 + dv.evangelistes * 3) / total) * 100 : 0,
        measuredAt: dv.date,
      },
    });
    track("DevotionSnapshot");
  }

  // ================================================================
  // CULT INDEX SNAPSHOT
  // ================================================================
  await prisma.cultIndexSnapshot.upsert({
    where: { id: "wk-cult-vibranium-0" },
    update: {},
    create: {
      id: "wk-cult-vibranium-0",
      strategyId: strategy.id,
      engagementDepth: 0.55,
      superfanVelocity: 0.28,
      communityCohesion: 0.20,
      brandDefenseRate: 0.42,
      ugcGenerationRate: 0.15,
      ritualAdoption: 0.20,
      evangelismScore: 0.10,
      compositeScore: 38,
      tier: "EMERGING",
      measuredAt: new Date("2026-03-31"),
    },
  });
  track("CultIndexSnapshot");

  // ================================================================
  // DRIVERS -- 4 channels
  // ================================================================
  const driverDefs = [
    { id: "wk-driver-vibranium-app", name: "Vibranium Dashboard App", channel: "CUSTOM" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-vibranium-social", name: "LinkedIn Vibranium Tech", channel: "LINKEDIN" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-vibranium-partnerships", name: "Partenariats Industriels", channel: "CUSTOM" as const, channelType: "PHYSICAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-vibranium-pr", name: "Relations Presse B2B", channel: "PR" as const, channelType: "MEDIA" as const, status: "ACTIVE" as const },
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

  console.log("  [OK] Devotion, cult index, drivers");
  console.log("  -- Vibranium Tech complete --\n");

  return { strategy };
}
