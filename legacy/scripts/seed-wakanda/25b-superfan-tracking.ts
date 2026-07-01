/**
 * WAKANDA SEED — Batch 3: Suivi superfans dans le temps + calibration.
 *
 * `SuperfanProfile`/`DevotionSnapshot`/`AttributionEvent` étaient déjà semés
 * (25-community / 26-intelligence) mais SANS série temporelle de followers ni
 * sessions de capture Tarsis ni snapshot de calibration d'attribution. Ce batch
 * ferme la voie « suivi superfans (série temporelle) » + alimente la revue de
 * calibration (Epic 6 Phase 23).
 *
 * Déterministe (courbes calculées), zéro LLM.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

export async function seedSuperfanTracking(prisma: PrismaClient) {
  // ── FollowerSnapshot — 6 semaines × plateformes (courbe Heritage) ────
  // Croissance déterministe : base × (1 + growth)^week.
  const curves: Array<{
    strategyId: string;
    platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE" | "FACEBOOK" | "LINKEDIN" | "TWITTER";
    handle: string;
    base: number;
    weeklyGrowth: number;
    weeks: number;
  }> = [
    { strategyId: IDS.stratBliss, platform: "INSTAGRAM", handle: "@bliss.wakanda", base: 12000, weeklyGrowth: 0.25, weeks: 6 },
    { strategyId: IDS.stratBliss, platform: "TIKTOK", handle: "@blisswakanda", base: 8000, weeklyGrowth: 0.42, weeks: 6 },
    { strategyId: IDS.stratBliss, platform: "YOUTUBE", handle: "BLISS by Wakanda", base: 2000, weeklyGrowth: 0.28, weeks: 6 },
    { strategyId: IDS.stratVibranium, platform: "LINKEDIN", handle: "Vibranium Tech", base: 4000, weeklyGrowth: 0.12, weeks: 4 },
    { strategyId: IDS.stratShuri, platform: "INSTAGRAM", handle: "@shuri.academy", base: 6000, weeklyGrowth: 0.18, weeks: 4 },
  ];

  let snapshotCount = 0;
  for (const c of curves) {
    for (let w = 0; w < c.weeks; w++) {
      const followerCount = Math.round(c.base * Math.pow(1 + c.weeklyGrowth, w));
      const id = `wk-follower-${c.strategyId.replace("wk-strategy-", "")}-${c.platform.toLowerCase()}-w${w}`;
      await prisma.followerSnapshot.upsert({
        where: { id },
        update: {},
        create: {
          id,
          strategyId: c.strategyId,
          platform: c.platform,
          handle: c.handle,
          followerCount,
          followingCount: Math.round(followerCount * 0.02),
          mentionsCount: Math.round(followerCount * 0.05 * (1 + w * 0.3)),
          source: "CONNECTOR",
          capturedAt: daysAfter(T.heritageLive, w * 7),
        },
      });
      snapshotCount++;
    }
  }
  track("FollowerSnapshot", snapshotCount);

  // ── TarsisCaptureSession — signaux faibles terrain (weak signals) ────
  const sessions: Array<{ id: string; strategyId: string; campaignId?: string; status: string; signals: number; payload: Prisma.InputJsonValue }> = [
    {
      id: "wk-tarsis-bliss-heritage",
      strategyId: IDS.stratBliss,
      campaignId: IDS.campaignHeritage,
      status: "CLOSED",
      signals: 24,
      payload: {
        memes: ["#RéveléePasInventée", "panthère-glow", "vibranium-skin"],
        hashtags: ["#BlissHeritage", "#WakandaBeauty", "#GlowAfricain"],
        emergingCommunities: ["beauté afro-premium", "diaspora skincare"],
        darkSentiment: { ratio: 0.06, themes: ["prix élevé"] },
        _mocked: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: "wk-tarsis-bliss-glow",
      strategyId: IDS.stratBliss,
      campaignId: IDS.campaignGlow,
      status: "ACTIVE",
      signals: 11,
      payload: {
        memes: ["glow-challenge"],
        hashtags: ["#VibraniumGlow", "#GlowUpWakanda"],
        emergingCommunities: ["gen-z beauté"],
        darkSentiment: { ratio: 0.03, themes: [] },
        _mocked: true,
      } as Prisma.InputJsonValue,
    },
    {
      id: "wk-tarsis-vib",
      strategyId: IDS.stratVibranium,
      status: "ACTIVE",
      signals: 7,
      payload: {
        memes: ["paiement-sans-frontière"],
        hashtags: ["#VibraniumPay"],
        emergingCommunities: ["fintech diaspora"],
        darkSentiment: { ratio: 0.09, themes: ["sécurité", "frais cachés"] },
        _mocked: true,
      } as Prisma.InputJsonValue,
    },
  ];
  for (const s of sessions) {
    await prisma.tarsisCaptureSession.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: s.strategyId,
        campaignId: s.campaignId ?? null,
        signalsCount: s.signals,
        payload: s.payload,
        status: s.status,
        capturedAt: s.status === "CLOSED" ? T.heritageMetrics : daysAfter(T.now, -3),
        closedAt: s.status === "CLOSED" ? T.notoriaStage3 : null,
      },
    });
    track("TarsisCaptureSession");
  }

  // ── Calibration snapshot d'attribution (Epic 6 — IntentEmission) ─────
  // Les snapshots de calibration vivent dans IntentEmission.payload (Phase 23).
  // Mock honnête : `_mocked: true` (données réelles = connecteur CRM/Tarsis live).
  const calibrations: Array<{ id: string; strategyId: string; rocAuc: number; rmse: number; mocked: boolean }> = [
    { id: "wk-calib-bliss", strategyId: IDS.stratBliss, rocAuc: 0.82, rmse: 0.21, mocked: true },
    { id: "wk-calib-vib", strategyId: IDS.stratVibranium, rocAuc: 0.74, rmse: 0.28, mocked: true },
  ];
  for (const cal of calibrations) {
    await prisma.intentEmission.upsert({
      where: { id: cal.id },
      update: {},
      create: {
        id: cal.id,
        intentKind: "RUN_ATTRIBUTION_CALIBRATION",
        strategyId: cal.strategyId,
        caller: "seed:wakanda",
        governor: "SESHAT",
        status: "OK",
        observationStatus: "OBSERVED",
        observedAt: T.scoresValidated,
        payload: { strategyId: cal.strategyId, scope: "SUPERFAN_ATTRIBUTION", _mocked: cal.mocked } as Prisma.InputJsonValue,
        result: {
          snapshot: {
            rocAuc: cal.rocAuc,
            rmse: cal.rmse,
            thresholds: { rocAucMin: 0.7, rmseMax: 0.3 },
            verdict: cal.rocAuc >= 0.7 && cal.rmse <= 0.3 ? "PASS" : "FAIL",
            mocked: cal.mocked,
          },
        } as Prisma.InputJsonValue,
        emittedAt: T.scoresValidated,
        completedAt: T.scoresValidated,
      },
    });
    track("IntentEmission");
  }

  console.log(
    `[OK] Superfan tracking: ${snapshotCount} FollowerSnapshots + ${sessions.length} Tarsis sessions + ${calibrations.length} calibration snapshots`,
  );
}
