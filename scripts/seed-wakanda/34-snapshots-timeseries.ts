/**
 * WAKANDA SEED — Telemetry timeseries (Seshat dense observation)
 *
 * Réveille Seshat sur les snapshots récurrents — pas un point isolé,
 * mais une série temporelle interprétable :
 *  - ScoreSnapshot weekly × 6 brands × 13 semaines = ~78
 *  - DevotionSnapshot weekly BLISS+SHURI+VIBRANIUM = ~39
 *  - CultIndexSnapshot weekly BLISS+SHURI = ~26
 *  - CommunitySnapshot weekly × 6 brands × 4 platforms = ~72
 *
 * Jusqu'ici les snapshots existants étaient un cliché unique. Cette
 * version ajoute la trajectoire — Seshat peut détecter les pentes,
 * Tarsis peut signaler les drifts.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { T } from "./constants";
import { track, daysAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

// ============================================================
// Score progression curves (deterministic by index 0..N-1)
// ============================================================
function blissScoreAt(weekIdx: number): { score: number; classification: string; vec: { a: number; d: number; v: number; e: number; r: number; t: number; i: number; s: number } } {
  // 0→200 sur 13 semaines, palier ICONE à w12+
  const t = Math.min(1, weekIdx / 12);
  const score = Math.round(140 + (200 - 140) * t);
  const per = score / 8;
  const vec = { a: Math.round(per), d: Math.round(per), v: Math.round(per), e: Math.round(per), r: Math.round(per), t: Math.round(per), i: Math.round(per), s: Math.round(per) };
  const classification = score >= 200 ? "ICONE" : score >= 188 ? "CULTE" : score >= 168 ? "FORTE" : score >= 140 ? "ORDINAIRE" : "FRAGILE";
  return { score, classification, vec };
}

function genericScoreAt(start: number, end: number, weekIdx: number, totalWeeks: number): { score: number; classification: string; vec: { a: number; d: number; v: number; e: number; r: number; t: number; i: number; s: number } } {
  const t = Math.min(1, weekIdx / Math.max(1, totalWeeks - 1));
  const score = Math.round(start + (end - start) * t);
  const per = score / 8;
  const vec = { a: Math.round(per), d: Math.round(per), v: Math.round(per), e: Math.round(per), r: Math.round(per), t: Math.round(per), i: Math.round(per), s: Math.round(per) };
  const classification = score >= 200 ? "ICONE" : score >= 188 ? "CULTE" : score >= 168 ? "FORTE" : score >= 140 ? "ORDINAIRE" : score >= 100 ? "FRAGILE" : "ZOMBIE";
  return { score, classification, vec };
}

export async function seedSnapshotsTimeseries(prisma: PrismaClient, brands: Brands) {

  // ============================================================
  // SCORE SNAPSHOTS — weekly × 13 weeks × 6 brands
  // ============================================================
  // BLISS — already has 1 snapshot at scoresValidated (10-bliss.ts);
  // we use distinct IDs (-ts-NN) to avoid collision.
  const brandConfig = [
    { id: brands.bliss.strategy.id,     prefix: "bliss",     weeks: 13, scoreFn: blissScoreAt,                                          startWeek: T.bootStart },
    { id: brands.vibranium.strategy.id, prefix: "vibranium", weeks: 8,  scoreFn: (i: number, n: number) => genericScoreAt(95, 132, i, n), startWeek: daysAfter(T.now, -56) },
    { id: brands.brew.strategy.id,      prefix: "brew",      weeks: 6,  scoreFn: (i: number, n: number) => genericScoreAt(78, 102, i, n), startWeek: daysAfter(T.now, -42) },
    { id: brands.panther.strategy.id,   prefix: "panther",   weeks: 4,  scoreFn: (i: number, n: number) => genericScoreAt(70, 88, i, n),  startWeek: daysAfter(T.now, -28) },
    { id: brands.shuri.strategy.id,     prefix: "shuri",     weeks: 11, scoreFn: (i: number, n: number) => genericScoreAt(110, 156, i, n), startWeek: daysAfter(T.now, -77) },
    { id: brands.jabari.strategy.id,    prefix: "jabari",    weeks: 13, scoreFn: (i: number, n: number) => genericScoreAt(58, 74, i, n),  startWeek: daysAfter(T.now, -91) },
  ];

  for (const cfg of brandConfig) {
    for (let w = 0; w < cfg.weeks; w++) {
      const measuredAt = daysAfter(cfg.startWeek, w * 7);
      const computed = cfg.prefix === "bliss"
        ? blissScoreAt(w)
        : (cfg.scoreFn as (i: number, n: number) => ReturnType<typeof blissScoreAt>)(w, cfg.weeks);
      const id = `wk-score-ts-${cfg.prefix}-w${String(w).padStart(2, "0")}`;
      await prisma.scoreSnapshot.upsert({
        where: { id },
        update: {},
        create: {
          id,
          strategyId: cfg.id,
          advertis_vector: computed.vec as Prisma.InputJsonValue,
          classification: computed.classification,
          confidence: 0.85 + (w / 100),
          trigger: w === 0 ? "boot" : w % 4 === 0 ? "cascade" : "weekly",
          measuredAt,
        },
      });
      track("ScoreSnapshot");
    }
  }

  // ============================================================
  // DEVOTION SNAPSHOTS — weekly BLISS + SHURI + VIBRANIUM
  // ============================================================
  // Devotion 6 segments: spectateur → evangeliste, devotionScore = weighted
  function blissDevotionAt(w: number) {
    const t = Math.min(1, w / 12);
    return {
      spectateur: 8500 + Math.round(11000 * t),
      interesse:  3200 + Math.round(4500 * t),
      participant: 1100 + Math.round(2400 * t),
      engage:     420 + Math.round(880 * t),
      ambassadeur: 60 + Math.round(180 * t),
      evangeliste: 12 + Math.round(38 * t),
    };
  }
  function shuriDevotionAt(w: number) {
    const t = Math.min(1, w / 10);
    return { spectateur: 4200 + Math.round(2600 * t), interesse: 1500 + Math.round(900 * t), participant: 480 + Math.round(280 * t), engage: 140 + Math.round(85 * t), ambassadeur: 18 + Math.round(22 * t), evangeliste: 4 + Math.round(8 * t) };
  }
  function vibraniumDevotionAt(w: number) {
    const t = Math.min(1, w / 7);
    return { spectateur: 2800 + Math.round(3500 * t), interesse: 950 + Math.round(1400 * t), participant: 280 + Math.round(420 * t), engage: 80 + Math.round(140 * t), ambassadeur: 8 + Math.round(20 * t), evangeliste: 1 + Math.round(5 * t) };
  }

  const devotionBrands: Array<{ strategyId: string; prefix: string; weeks: number; startWeek: Date; fn: (w: number) => { spectateur: number; interesse: number; participant: number; engage: number; ambassadeur: number; evangeliste: number } }> = [
    { strategyId: brands.bliss.strategy.id,     prefix: "bliss",     weeks: 13, startWeek: T.bootStart,             fn: blissDevotionAt },
    { strategyId: brands.shuri.strategy.id,     prefix: "shuri",     weeks: 11, startWeek: daysAfter(T.now, -77),   fn: shuriDevotionAt },
    { strategyId: brands.vibranium.strategy.id, prefix: "vibranium", weeks: 8,  startWeek: daysAfter(T.now, -56),   fn: vibraniumDevotionAt },
  ];

  for (const cfg of devotionBrands) {
    for (let w = 0; w < cfg.weeks; w++) {
      const measuredAt = daysAfter(cfg.startWeek, w * 7);
      const buckets = cfg.fn(w);
      // Devotion score weighted (simplifié) : evangelism+ambassadeur*5 + engage*3 + participant*1.5 + interesse*0.5
      const devotionScore = +(buckets.evangeliste * 5 + buckets.ambassadeur * 3 + buckets.engage * 1.5 + buckets.participant * 0.5).toFixed(2);
      const id = `wk-devot-ts-${cfg.prefix}-w${String(w).padStart(2, "0")}`;
      await prisma.devotionSnapshot.upsert({
        where: { id },
        update: {},
        create: {
          id,
          strategyId: cfg.strategyId,
          spectateur: buckets.spectateur,
          interesse: buckets.interesse,
          participant: buckets.participant,
          engage: buckets.engage,
          ambassadeur: buckets.ambassadeur,
          evangeliste: buckets.evangeliste,
          devotionScore,
          trigger: w === 0 ? "boot" : "weekly",
          measuredAt,
        },
      });
      track("DevotionSnapshot");
    }
  }

  // ============================================================
  // CULT INDEX SNAPSHOTS — weekly BLISS + SHURI
  // ============================================================
  function cultIndexAt(start: number, end: number, w: number, total: number, finalTier: string) {
    const t = Math.min(1, w / Math.max(1, total - 1));
    const composite = +(start + (end - start) * t).toFixed(3);
    return {
      engagementDepth:  +((composite * 0.92) + 0.05).toFixed(3),
      superfanVelocity: +((composite * 0.85) + 0.10).toFixed(3),
      communityCohesion: +((composite * 0.80) + 0.12).toFixed(3),
      brandDefenseRate: +((composite * 0.78) + 0.10).toFixed(3),
      ugcGenerationRate: +((composite * 0.95) + 0.02).toFixed(3),
      ritualAdoption:   +((composite * 0.88) + 0.06).toFixed(3),
      evangelismScore:  +((composite * 0.70) + 0.08).toFixed(3),
      compositeScore:   composite,
      tier: t < 0.3 ? "ORDINAIRE" : t < 0.65 ? "FORTE" : t < 0.92 ? "CULTE" : finalTier,
    };
  }

  const cultBrands = [
    { strategyId: brands.bliss.strategy.id, prefix: "bliss", weeks: 13, startWeek: T.bootStart,           start: 0.32, end: 0.94, finalTier: "ICONE" },
    { strategyId: brands.shuri.strategy.id, prefix: "shuri", weeks: 11, startWeek: daysAfter(T.now, -77), start: 0.20, end: 0.62, finalTier: "FORTE" },
  ];
  for (const cfg of cultBrands) {
    for (let w = 0; w < cfg.weeks; w++) {
      const measuredAt = daysAfter(cfg.startWeek, w * 7);
      const ci = cultIndexAt(cfg.start, cfg.end, w, cfg.weeks, cfg.finalTier);
      const id = `wk-cult-ts-${cfg.prefix}-w${String(w).padStart(2, "0")}`;
      await prisma.cultIndexSnapshot.upsert({
        where: { id },
        update: {},
        create: {
          id,
          strategyId: cfg.strategyId,
          engagementDepth: ci.engagementDepth,
          superfanVelocity: ci.superfanVelocity,
          communityCohesion: ci.communityCohesion,
          brandDefenseRate: ci.brandDefenseRate,
          ugcGenerationRate: ci.ugcGenerationRate,
          ritualAdoption: ci.ritualAdoption,
          evangelismScore: ci.evangelismScore,
          compositeScore: ci.compositeScore,
          tier: ci.tier,
          measuredAt,
        },
      });
      track("CultIndexSnapshot");
    }
  }

  // ============================================================
  // COMMUNITY SNAPSHOTS — weekly × brands × 4 platforms
  // ============================================================
  const platforms: Array<{ id: string; baseSize: number; baseHealth: number; baseSentiment: number; baseVelocity: number }> = [
    { id: "instagram", baseSize: 8500, baseHealth: 0.78, baseSentiment: 0.72, baseVelocity: 0.55 },
    { id: "tiktok",    baseSize: 4200, baseHealth: 0.82, baseSentiment: 0.78, baseVelocity: 0.68 },
    { id: "facebook",  baseSize: 12500, baseHealth: 0.62, baseSentiment: 0.55, baseVelocity: 0.32 },
    { id: "whatsapp",  baseSize: 1800, baseHealth: 0.92, baseSentiment: 0.85, baseVelocity: 0.78 },
  ];

  const commsBrands = [
    { strategyId: brands.bliss.strategy.id, prefix: "bliss", weeks: 13, growth: 5.2, startWeek: T.bootStart },
    { strategyId: brands.vibranium.strategy.id, prefix: "vibranium", weeks: 8, growth: 2.1, startWeek: daysAfter(T.now, -56) },
    { strategyId: brands.brew.strategy.id, prefix: "brew", weeks: 6, growth: 1.4, startWeek: daysAfter(T.now, -42) },
    { strategyId: brands.panther.strategy.id, prefix: "panther", weeks: 4, growth: 1.6, startWeek: daysAfter(T.now, -28) },
    { strategyId: brands.shuri.strategy.id, prefix: "shuri", weeks: 11, growth: 1.9, startWeek: daysAfter(T.now, -77) },
    { strategyId: brands.jabari.strategy.id, prefix: "jabari", weeks: 6, growth: 0.9, startWeek: daysAfter(T.now, -42) },
  ];

  // Sample only 1 weekly snapshot per brand per platform every 2 weeks (volume control)
  for (const cfg of commsBrands) {
    for (const p of platforms) {
      for (let w = 0; w < cfg.weeks; w += 2) {
        const measuredAt = daysAfter(cfg.startWeek, w * 7);
        const t = Math.min(1, w / Math.max(1, cfg.weeks - 1));
        const size = Math.round(p.baseSize * (1 + cfg.growth * t * 0.3));
        const id = `wk-comm-ts-${cfg.prefix}-${p.id}-w${String(w).padStart(2, "0")}`;
        await prisma.communitySnapshot.upsert({
          where: { id },
          update: {},
          create: {
            id,
            strategyId: cfg.strategyId,
            platform: p.id,
            size,
            health: +(p.baseHealth + 0.05 * t).toFixed(3),
            sentiment: +(p.baseSentiment + 0.04 * t).toFixed(3),
            velocity: +(p.baseVelocity + 0.10 * t).toFixed(3),
            activeRate: +(0.18 + 0.12 * t).toFixed(3),
            measuredAt,
          },
        });
        track("CommunitySnapshot");
      }
    }
  }

  console.log(
    `  [OK] Telemetry timeseries: 6×ScoreSnapshot weekly, 3×DevotionSnapshot weekly, 2×CultIndexSnapshot weekly, 6×CommunitySnapshot biweekly`,
  );
}
