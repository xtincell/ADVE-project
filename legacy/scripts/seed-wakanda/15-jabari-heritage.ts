/**
 * WAKANDA SEED -- Jabari Heritage (110/200 ORDINAIRE)
 *
 * Cultural tourism / experience brand with 6 active + 2 locked pillars.
 * Edge cases: LOCKED pillars (I, S), stale pillars (some have staleAt
 * set 7 days ago to test staleness detection system).
 * Creates: Strategy, 8 Pillars, PillarVersions,
 * ScoreSnapshots, Drivers.
 */

import type { PrismaClient, Operator, Client, Strategy } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";
import {
  jabariPillarA,
  jabariPillarD,
  jabariPillarV,
  jabariPillarE,
  jabariPillarR,
  jabariPillarT,
} from "./data/jabari-pillars";
import type { WakandaUsers } from "./02-users";

export interface JabariBrand {
  strategy: Strategy;
}

export async function seedJabariHeritage(
  prisma: PrismaClient,
  operator: Operator,
  clients: Record<string, Client>,
  users: WakandaUsers,
): Promise<JabariBrand> {
  console.log("\n  -- Jabari Heritage (110/200 ORDINAIRE) --");

  // ================================================================
  // STRATEGY
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: IDS.stratJabari },
    update: {},
    create: {
      id: IDS.stratJabari,
      name: "Jabari Heritage",
      description:
        "Tourisme culturel et experiences immersives dans les montagnes Jabari. Retraites spirituelles, treks guides, gastronomie ancestrale. Marque d'experience premium.",
      userId: users.mbaku.id,
      operatorId: operator.id,
      clientId: IDS.clientJabari,
      status: "ACTIVE",
      isDummy: true,
      advertis_vector: {
        a: 18.0, d: 16.0, v: 14.0, e: 15.0,
        r: 13.0, t: 12.0, i: 0.0, s: 0.0,
        composite: 110.0, confidence: 0.65,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "EXPERIENCE",
        businessModelSubtype: "Tourisme culturel premium -- retraites et experiences Jabari",
        economicModels: ["EXPERIENCE", "VENTE_DIRECTE", "ABONNEMENT"],
        positioningArchetype: "EXPLORATEUR",
        salesChannel: "HYBRID",
        positionalGoodFlag: true,
        premiumScope: "FULL",
        bootState: "COMPLETED",
        freeLayer: {
          whatIsFree: "Visite virtuelle 360 du village Jabari + podcast hebdomadaire 'Voix de la Montagne'.",
          whatIsPaid: "Retraite 3 jours (350 000 XAF), Trek guide 1 jour (75 000 XAF), Experience gastronomique (120 000 XAF). Club des Anciens (15 000 XAF/mois).",
          conversionLever: "La visite virtuelle cree un desir d'experience physique. 25% des visiteurs virtuels reservent dans les 90 jours.",
        },
        country: "Wakanda",
        sector: "Tourisme & Experiences Culturelles",
      } as Prisma.InputJsonValue,
      notoriaPipeline: {
        currentStage: 1,
        stages: [
          { type: "ADVE_INTAKE", status: "COMPLETED", completedAt: "2026-01-20T11:00:00Z" },
          { type: "ADVE_UPDATE", status: "PARTIAL", startedAt: "2026-01-29T10:00:00Z", note: "Piliers R et T generes mais I et S bloques en attente de contrat RTIS" },
        ],
      } as Prisma.InputJsonValue,
      createdAt: T.intakeConverted,
    },
  });
  track("Strategy");

  // ================================================================
  // Staleness edge case: 7 days before "now"
  // ================================================================
  const staleDate = daysAfter(T.now, -7);

  // ================================================================
  // 8 PILLARS -- 6 active (various statuses) + 2 LOCKED (I, S)
  // ================================================================
  const pillarDefs: {
    key: string;
    content: unknown;
    confidence: number;
    validationStatus: string;
    createdAt: Date;
    staleAt?: Date;
  }[] = [
    { key: "a", content: jabariPillarA, confidence: 0.88, validationStatus: "VALIDATED", createdAt: T.bootAD },
    { key: "d", content: jabariPillarD, confidence: 0.82, validationStatus: "VALIDATED", createdAt: T.bootAD, staleAt: staleDate },
    { key: "v", content: jabariPillarV, confidence: 0.75, validationStatus: "REVIEW", createdAt: T.bootVE, staleAt: staleDate },
    { key: "e", content: jabariPillarE, confidence: 0.78, validationStatus: "VALIDATED", createdAt: T.bootVE },
    { key: "r", content: jabariPillarR, confidence: 0.70, validationStatus: "REVIEW", createdAt: T.rtisCascade },
    { key: "t", content: jabariPillarT, confidence: 0.68, validationStatus: "DRAFT", createdAt: T.rtisCascade, staleAt: staleDate },
  ];

  for (const def of pillarDefs) {
    const pillarId = `wk-pillar-jabari-${def.key}`;
    const createData: Record<string, unknown> = {
      id: pillarId,
      key: def.key,
      strategyId: strategy.id,
      content: def.content as Prisma.InputJsonValue,
      confidence: def.confidence,
      validationStatus: def.validationStatus,
      currentVersion: def.key === "a" ? 3 : def.key === "d" ? 2 : 1,
      createdAt: def.createdAt,
    };
    if (def.staleAt) {
      createData.staleAt = def.staleAt;
    }
    await prisma.pillar.upsert({
      where: { id: pillarId },
      update: {},
      create: createData as any,
    });
    track("Pillar");
  }

  // LOCKED pillars I and S -- empty content, edge case for UI
  for (const key of ["i", "s"] as const) {
    const pillarId = `wk-pillar-jabari-${key}`;
    await prisma.pillar.upsert({
      where: { id: pillarId },
      update: {},
      create: {
        id: pillarId,
        key,
        strategyId: strategy.id,
        content: {
          _locked: true,
          _reason: "Contrat RTIS requis pour debloquer les piliers I et S",
          _placeholder: true,
        } as Prisma.InputJsonValue,
        confidence: 0.0,
        validationStatus: "LOCKED",
        currentVersion: 0,
        createdAt: T.rtisCascade,
      },
    });
    track("Pillar");
  }
  console.log("  [OK] 8 pillars created (6 active, 2 LOCKED; 3 with staleAt)");

  // ================================================================
  // PILLAR VERSIONS
  // ================================================================
  const versionDefs = [
    { pillarId: "wk-pillar-jabari-a", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- questionnaire tourisme culturel", createdAt: T.bootAD },
    { pillarId: "wk-pillar-jabari-a", version: 2, author: "MESTOR", reason: "Vault Enrichment -- heritage Jabari enrichi", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-jabari-a", version: 3, author: "OPERATOR", reason: "Validation -- approuve par M'Baku", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-jabari-d", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- personas voyageurs", createdAt: T.bootAD },
    { pillarId: "wk-pillar-jabari-d", version: 2, author: "MESTOR", reason: "Vault Enrichment -- segments tourisme ajoutes", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-jabari-v", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- pricing experiences initial", createdAt: T.bootVE },
    { pillarId: "wk-pillar-jabari-e", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- parcours visiteur", createdAt: T.bootVE },
    { pillarId: "wk-pillar-jabari-r", version: 1, author: "PROTOCOLE_R", reason: "RTIS Cascade -- diagnostic risques tourisme", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-jabari-t", version: 1, author: "PROTOCOLE_T", reason: "RTIS Cascade -- realite marche tourisme Wakanda", createdAt: T.rtisCascade },
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
  // SCORE SNAPSHOTS -- 3 points (70 -> 95 -> 110)
  // ================================================================
  const scoreHistory = [
    { date: T.bootVE, composite: 70, a: 13, d: 12, v: 10, e: 11, r: 8, t: 7, i: 0, s: 0, confidence: 0.40 },
    { date: T.notoriaStage1, composite: 95, a: 16, d: 14, v: 12, e: 13, r: 11, t: 10, i: 0, s: 0, confidence: 0.55 },
    { date: T.scoresValidated, composite: 110, a: 18, d: 16, v: 14, e: 15, r: 13, t: 12, i: 0, s: 0, confidence: 0.65 },
  ];

  for (let i = 0; i < scoreHistory.length; i++) {
    const s = scoreHistory[i];
    await prisma.scoreSnapshot.upsert({
      where: { id: `wk-score-jabari-${i}` },
      update: {},
      create: {
        id: `wk-score-jabari-${i}`,
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
  console.log(`  [OK] ${scoreHistory.length} score snapshots (70->95->110)`);

  // ================================================================
  // DRIVERS -- 3 channels
  // ================================================================
  const driverDefs = [
    { id: "wk-driver-jabari-event", name: "Retraites & Treks Jabari", channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-jabari-website", name: "Site Jabari Heritage", channel: "WEBSITE" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-jabari-social", name: "Instagram Jabari Heritage", channel: "INSTAGRAM" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
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
  console.log("  -- Jabari Heritage complete --\n");

  return { strategy };
}
