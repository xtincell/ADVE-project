/**
 * WAKANDA SEED -- Shuri Academy (160/200 FORTE->CULTE)
 *
 * EdTech brand with all 8 pillars validated. Near-top performer.
 * Creates: Strategy, 8 Pillars, PillarVersions,
 * ScoreSnapshots, DevotionSnapshots, CultIndexSnapshots, Drivers.
 */

import type { PrismaClient, Operator, Client, Strategy } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";
import {
  shuriPillarA,
  shuriPillarD,
  shuriPillarV,
  shuriPillarE,
  shuriPillarR,
  shuriPillarT,
  shuriPillarI,
  shuriPillarS,
} from "./data/shuri-pillars";
import type { WakandaUsers } from "./02-users";

export interface ShuriBrand {
  strategy: Strategy;
}

export async function seedShuriAcademy(
  prisma: PrismaClient,
  operator: Operator,
  clients: Record<string, Client>,
  users: WakandaUsers,
): Promise<ShuriBrand> {
  console.log("\n  -- Shuri Academy (160/200 FORTE->CULTE) --");

  // ================================================================
  // STRATEGY
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: IDS.stratShuri },
    update: {},
    create: {
      id: IDS.stratShuri,
      name: "Shuri Academy",
      description:
        "Plateforme EdTech panafricaine. Formations en ligne STEM et technologie vibranium. Modele freemium avec certifications payantes. Communaute de 15 000 etudiants actifs.",
      userId: users.shuri.id,
      operatorId: operator.id,
      clientId: IDS.clientShuri,
      status: "ACTIVE",
      isDummy: true,
      advertis_vector: {
        a: 21.0, d: 20.0, v: 19.0, e: 20.0,
        r: 20.0, t: 20.0, i: 20.0, s: 20.0,
        composite: 160.0, confidence: 0.92,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "ABONNEMENT",
        businessModelSubtype: "EdTech freemium -- formations STEM + certifications vibranium",
        economicModels: ["ABONNEMENT", "CERTIFICATION", "ENTREPRISE_B2B"],
        positioningArchetype: "SAGE",
        salesChannel: "DIGITAL",
        positionalGoodFlag: true,
        premiumScope: "FULL",
        bootState: "COMPLETED",
        freeLayer: {
          whatIsFree: "10 cours d'introduction STEM gratuits + acces communaute Discord + certificat de participation.",
          whatIsPaid: "Formation complete (5 000 XAF/mois ou 45 000 XAF/an). Certifications professionnelles (25 000-75 000 XAF). Licences entreprise sur devis.",
          conversionLever: "Les cours gratuits demontrent la qualite pedagogique. 35% des etudiants gratuits souscrivent dans les 60 jours.",
        },
        country: "Wakanda",
        sector: "Education & Formation Professionnelle",
      } as Prisma.InputJsonValue,
      notoriaPipeline: {
        currentStage: 3,
        stages: [
          { type: "ADVE_INTAKE", status: "COMPLETED", completedAt: "2026-01-20T11:00:00Z" },
          { type: "ADVE_UPDATE", status: "COMPLETED", completedAt: "2026-01-29T10:00:00Z" },
          { type: "I_GENERATION", status: "COMPLETED", completedAt: "2026-02-05T10:00:00Z" },
          { type: "S_SYNTHESIS", status: "RUNNING", startedAt: "2026-03-12T10:00:00Z" },
        ],
      } as Prisma.InputJsonValue,
      createdAt: T.intakeConverted,
    },
  });
  track("Strategy");

  // ================================================================
  // 8 PILLARS -- All VALIDATED, high scores
  // ================================================================
  const pillarDefs: {
    key: string;
    content: unknown;
    confidence: number;
    createdAt: Date;
  }[] = [
    { key: "a", content: shuriPillarA, confidence: 0.95, createdAt: T.bootAD },
    { key: "d", content: shuriPillarD, confidence: 0.94, createdAt: T.bootAD },
    { key: "v", content: shuriPillarV, confidence: 0.93, createdAt: T.bootVE },
    { key: "e", content: shuriPillarE, confidence: 0.94, createdAt: T.bootVE },
    { key: "r", content: shuriPillarR, confidence: 0.92, createdAt: T.rtisCascade },
    { key: "t", content: shuriPillarT, confidence: 0.92, createdAt: T.rtisCascade },
    { key: "i", content: shuriPillarI, confidence: 0.91, createdAt: T.notoriaStage2 },
    { key: "s", content: shuriPillarS, confidence: 0.93, createdAt: T.notoriaStage3 },
  ];

  for (const def of pillarDefs) {
    const pillarId = `wk-pillar-shuri-${def.key}`;
    await prisma.pillar.upsert({
      where: { id: pillarId },
      update: {},
      create: {
        id: pillarId,
        key: def.key,
        strategyId: strategy.id,
        content: def.content as Prisma.InputJsonValue,
        confidence: def.confidence,
        validationStatus: "VALIDATED",
        currentVersion: def.key === "a" || def.key === "d" ? 4 : def.key === "v" || def.key === "e" ? 3 : 2,
        createdAt: def.createdAt,
      },
    });
    track("Pillar");
  }
  console.log("  [OK] 8 pillars created (all VALIDATED)");

  // ================================================================
  // PILLAR VERSIONS -- Rich organic progression
  // ================================================================
  const versionDefs = [
    // Pillar A: 4 versions
    { pillarId: "wk-pillar-shuri-a", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- questionnaire initial EdTech", createdAt: T.bootAD },
    { pillarId: "wk-pillar-shuri-a", version: 2, author: "MESTOR", reason: "Vault Enrichment -- mission educative affirmee", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-shuri-a", version: 3, author: "MESTOR", reason: "Notoria ADVE_UPDATE -- hero's journey consolide", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-shuri-a", version: 4, author: "OPERATOR", reason: "Validation finale -- approuve par Shuri", createdAt: T.scoresValidated },
    // Pillar D: 4 versions
    { pillarId: "wk-pillar-shuri-d", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- personas etudiants", createdAt: T.bootAD },
    { pillarId: "wk-pillar-shuri-d", version: 2, author: "MESTOR", reason: "Vault Enrichment -- segments B2B ajoutes", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-shuri-d", version: 3, author: "MESTOR", reason: "Notoria update -- positionnement affine", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-shuri-d", version: 4, author: "OPERATOR", reason: "Validation finale -- positionnement verrouille", createdAt: T.scoresValidated },
    // Pillar V: 3 versions
    { pillarId: "wk-pillar-shuri-v", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- pricing freemium initial", createdAt: T.bootVE },
    { pillarId: "wk-pillar-shuri-v", version: 2, author: "MESTOR", reason: "Notoria update -- monetisation affinee", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-shuri-v", version: 3, author: "OPERATOR", reason: "Validation finale -- grille tarifaire verrouillee", createdAt: T.scoresValidated },
    // Pillar E: 3 versions
    { pillarId: "wk-pillar-shuri-e", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence -- parcours etudiant", createdAt: T.bootVE },
    { pillarId: "wk-pillar-shuri-e", version: 2, author: "MESTOR", reason: "Notoria update -- onboarding optimise", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-shuri-e", version: 3, author: "OPERATOR", reason: "Validation finale -- experience verrouillee", createdAt: T.scoresValidated },
    // R, T: 2 versions each
    { pillarId: "wk-pillar-shuri-r", version: 1, author: "PROTOCOLE_R", reason: "RTIS Cascade -- diagnostic risques EdTech", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-shuri-r", version: 2, author: "OPERATOR", reason: "Revision -- risques regulatoires ajoutes", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-shuri-t", version: 1, author: "PROTOCOLE_T", reason: "RTIS Cascade -- realite marche EdTech Afrique", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-shuri-t", version: 2, author: "OPERATOR", reason: "Revision -- donnees marche mises a jour", createdAt: T.notoriaStage1 },
    // I, S: 2 versions each
    { pillarId: "wk-pillar-shuri-i", version: 1, author: "PROTOCOLE_I", reason: "Notoria I_GENERATION -- catalogue actions genere", createdAt: T.notoriaStage2 },
    { pillarId: "wk-pillar-shuri-i", version: 2, author: "OPERATOR", reason: "Revision -- actions prioritaires selectionnees", createdAt: T.notoriaStage3 },
    { pillarId: "wk-pillar-shuri-s", version: 1, author: "PROTOCOLE_S", reason: "Notoria S_SYNTHESIS -- roadmap strategique generee", createdAt: T.notoriaStage3 },
    { pillarId: "wk-pillar-shuri-s", version: 2, author: "OPERATOR", reason: "Revision -- objectifs Q2 ajoutes", createdAt: T.scoresValidated },
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
  console.log(`  [OK] ${versionDefs.length} pillar versions (organic progression)`);

  // ================================================================
  // SCORE SNAPSHOTS -- 4 points (90 -> 120 -> 145 -> 160)
  // ================================================================
  const scoreHistory = [
    { date: T.bootVE, composite: 90, a: 15, d: 14, v: 13, e: 14, r: 10, t: 9, i: 7, s: 5, confidence: 0.55 },
    { date: T.rtisCascade, composite: 120, a: 18, d: 17, v: 16, e: 17, r: 14, t: 13, i: 11, s: 10, confidence: 0.70 },
    { date: T.notoriaStage2, composite: 145, a: 20, d: 19, v: 18, e: 19, r: 18, t: 17, i: 16, s: 14, confidence: 0.82 },
    { date: T.scoresValidated, composite: 160, a: 21, d: 20, v: 19, e: 20, r: 20, t: 20, i: 20, s: 20, confidence: 0.92 },
  ];

  for (let i = 0; i < scoreHistory.length; i++) {
    const s = scoreHistory[i];
    await prisma.scoreSnapshot.upsert({
      where: { id: `wk-score-shuri-${i}` },
      update: {},
      create: {
        id: `wk-score-shuri-${i}`,
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
  console.log(`  [OK] ${scoreHistory.length} score snapshots (90->120->145->160)`);

  // ================================================================
  // DEVOTION SNAPSHOTS -- 3 monthly
  // ================================================================
  const devotionHistory = [
    { date: new Date("2026-01-31"), spectateurs: 8000, interesses: 2000, participants: 600, engages: 100, ambassadeurs: 8, evangelistes: 0 },
    { date: new Date("2026-02-28"), spectateurs: 18000, interesses: 5000, participants: 1500, engages: 280, ambassadeurs: 22, evangelistes: 3 },
    { date: new Date("2026-03-31"), spectateurs: 32000, interesses: 9000, participants: 3200, engages: 550, ambassadeurs: 40, evangelistes: 7 },
  ];

  for (let i = 0; i < devotionHistory.length; i++) {
    const dv = devotionHistory[i];
    const total = dv.spectateurs + dv.interesses + dv.participants + dv.engages + dv.ambassadeurs + dv.evangelistes;
    await prisma.devotionSnapshot.upsert({
      where: { id: `wk-devotion-shuri-${i}` },
      update: {},
      create: {
        id: `wk-devotion-shuri-${i}`,
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
  // CULT INDEX SNAPSHOTS -- 2 points
  // ================================================================
  const cultHistory = [
    { date: new Date("2026-02-28"), index: 52, breakdown: { authenticity: 75, community: 48, ritual: 35, mythology: 58, exclusivity: 42 } },
    { date: new Date("2026-03-31"), index: 68, breakdown: { authenticity: 85, community: 62, ritual: 55, mythology: 72, exclusivity: 60 } },
  ];

  for (let i = 0; i < cultHistory.length; i++) {
    const ci = cultHistory[i];
    await prisma.cultIndexSnapshot.upsert({
      where: { id: `wk-cult-shuri-${i}` },
      update: {},
      create: {
        id: `wk-cult-shuri-${i}`,
        strategyId: strategy.id,
        engagementDepth: ci.breakdown.authenticity / 100,
        superfanVelocity: ci.breakdown.community / 100,
        communityCohesion: ci.breakdown.community / 100,
        brandDefenseRate: ci.breakdown.mythology / 100,
        ugcGenerationRate: ci.breakdown.exclusivity / 100,
        ritualAdoption: ci.breakdown.ritual / 100,
        evangelismScore: ci.breakdown.exclusivity / 100,
        compositeScore: ci.index,
        tier: ci.index >= 70 ? "STRONG" : ci.index >= 50 ? "GROWING" : "EMERGING",
        measuredAt: ci.date,
      },
    });
    track("CultIndexSnapshot");
  }

  // ================================================================
  // DRIVERS -- 5 channels
  // ================================================================
  const driverDefs = [
    { id: "wk-driver-shuri-website", name: "Shuri Academy Platform", channel: "WEBSITE" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-shuri-app", name: "Shuri Academy App", channel: "CUSTOM" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-shuri-linkedin", name: "LinkedIn Shuri Academy", channel: "LINKEDIN" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-shuri-youtube", name: "YouTube Shuri Academy", channel: "VIDEO" as const, channelType: "MEDIA" as const, status: "ACTIVE" as const },
    { id: "wk-driver-shuri-event", name: "Hackathons & Meetups", channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const, status: "ACTIVE" as const },
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
  console.log("  -- Shuri Academy complete --\n");

  return { strategy };
}
