/**
 * WAKANDA SEED — Ptah Forge (Phase 9 wake-up)
 *
 * Réveille Ptah en peuplant la matérialisation des briefs Artemis :
 *  - GenerativeTask (~32) : briefs forgés via Magnific/Adobe/Figma/Canva.
 *  - AssetVersion (~40) : versions matérialisées + lineage parent→upscale.
 *  - ForgeProviderHealth (4) : circuit breakers per provider.
 *
 * BLISS = ~24 forges (hero brand, deux campagnes Heritage + Glow).
 * Autres marques = ~8 forges total (couverture sobre).
 *
 * Lineage : sourceIntentId pointe vers l'IntentEmission INVOKE_GLORY_TOOL
 * Artemis (créés en 29-governance-trail.ts mais on accepte null si pas
 * de match exact — le lineage est qualitatif, pas FK strict).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

type ForgeSpec = {
  forgeKind: "image" | "video" | "audio" | "icon" | "refine" | "transform" | "design";
  provider: "magnific" | "adobe" | "figma" | "canva";
  providerModel: string;
  pillarSource: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
  manipulationMode: "peddler" | "dealer" | "facilitator" | "entertainer";
  prompt: string;
  estimatedCostUsd: number;
  realisedCostUsd?: number;
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "VETOED";
  expectedSuperfans?: number;
  realisedSuperfans?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  campaignId?: string;
};

function pseudoHashHex(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return (Math.abs(h).toString(16) + "0000000000000000000000000000000000000000000000000000000000000000").slice(0, 64);
}

function pseudoSecret(input: string): string {
  return `wkwhsec_${pseudoHashHex(input).slice(0, 32)}`;
}

export async function seedForge(prisma: PrismaClient, brands: Brands) {
  // ============================================================
  // 1) ForgeProviderHealth (4 providers)
  // ============================================================
  const providers: Array<{
    provider: "magnific" | "adobe" | "figma" | "canva";
    enabled: boolean;
    circuitState: "OPEN" | "CLOSED" | "HALF_OPEN";
    failureCount: number;
    totalRequests: number;
    totalFailures: number;
    totalCostUsd: number;
    lastFailureOffsetH?: number;
    circuitResetOffsetH?: number;
    lastSuccessOffsetH?: number;
  }> = [
    { provider: "magnific", enabled: true, circuitState: "CLOSED", failureCount: 0, totalRequests: 27, totalFailures: 1, totalCostUsd: 18.42, lastSuccessOffsetH: -2, lastFailureOffsetH: -120 },
    { provider: "adobe",    enabled: true, circuitState: "HALF_OPEN", failureCount: 2, totalRequests: 8, totalFailures: 2, totalCostUsd: 4.60, lastSuccessOffsetH: -36, lastFailureOffsetH: -3, circuitResetOffsetH: 0.5 },
    { provider: "figma",    enabled: true, circuitState: "CLOSED", failureCount: 0, totalRequests: 4, totalFailures: 0, totalCostUsd: 1.20, lastSuccessOffsetH: -8 },
    { provider: "canva",    enabled: false, circuitState: "OPEN", failureCount: 5, totalRequests: 6, totalFailures: 5, totalCostUsd: 0.85, lastFailureOffsetH: -1, circuitResetOffsetH: 24, lastSuccessOffsetH: -240 },
  ];

  for (const p of providers) {
    await prisma.forgeProviderHealth.upsert({
      where: { provider: p.provider },
      update: {},
      create: {
        provider: p.provider,
        enabled: p.enabled,
        circuitState: p.circuitState,
        failureCount: p.failureCount,
        lastFailureAt: p.lastFailureOffsetH != null ? hoursAfter(T.now, p.lastFailureOffsetH) : null,
        circuitResetAt: p.circuitResetOffsetH != null ? hoursAfter(T.now, p.circuitResetOffsetH) : null,
        lastSuccessAt: p.lastSuccessOffsetH != null ? hoursAfter(T.now, p.lastSuccessOffsetH) : null,
        totalRequests: p.totalRequests,
        totalFailures: p.totalFailures,
        totalCostUsd: p.totalCostUsd,
      },
    });
    track("ForgeProviderHealth");
  }

  // ============================================================
  // 2) GenerativeTask + AssetVersion — BLISS (hero, 24 forges)
  // ============================================================
  const blissId = brands.bliss.strategy.id;

  const blissForges: Array<{ at: Date; spec: ForgeSpec; cdn?: string }> = [
    // Heritage Collection — KV pack (8 forges)
    { at: hoursAfter(T.missionsStart, 4),  spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "I", manipulationMode: "facilitator", prompt: "BLISS Heritage — afro-futuristic editorial, model wearing vibranium-violet serum bottle, golden hour Wakanda landscape, 4:5", estimatedCostUsd: 0.22, realisedCostUsd: 0.21, status: "COMPLETED", expectedSuperfans: 1200, realisedSuperfans: 1480, width: 1080, height: 1350, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/kv-01.jpg" },
    { at: hoursAfter(T.missionsStart, 5),  spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "I", manipulationMode: "facilitator", prompt: "BLISS Heritage — packshot serum coffret, dark velvet background, vibranium glow accent, square crop", estimatedCostUsd: 0.18, realisedCostUsd: 0.18, status: "COMPLETED", expectedSuperfans: 800,  realisedSuperfans: 920,  width: 1080, height: 1080, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/packshot-01.jpg" },
    { at: hoursAfter(T.missionsStart, 6),  spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "I", manipulationMode: "facilitator", prompt: "BLISS Heritage — model close-up wearing serum on jawline, skin glow, cinematic", estimatedCostUsd: 0.20, realisedCostUsd: 0.20, status: "COMPLETED", expectedSuperfans: 950,  realisedSuperfans: 1100, width: 1080, height: 1350, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/kv-02.jpg" },
    { at: hoursAfter(T.missionsStart, 8),  spec: { forgeKind: "refine", provider: "magnific", providerModel: "upscale-2x",  pillarSource: "I", manipulationMode: "facilitator", prompt: "Upscale heritage KV-01 to 4K for OOH Biryongo", estimatedCostUsd: 0.06, realisedCostUsd: 0.06, status: "COMPLETED", width: 2160, height: 2700 }, cdn: "/cdn/wk/bliss/heritage/kv-01-4k.jpg" },
    { at: daysAfter(T.missionsStart, 1),   spec: { forgeKind: "image",  provider: "adobe",    providerModel: "firefly-v3",  pillarSource: "A", manipulationMode: "facilitator", prompt: "BLISS Heritage — narrative scene, intergenerational women applying serum, warm tones", estimatedCostUsd: 0.18, realisedCostUsd: 0.19, status: "COMPLETED", expectedSuperfans: 1500, realisedSuperfans: 1820, width: 1080, height: 1350, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/kv-narrative.jpg" },
    { at: daysAfter(T.missionsStart, 2),   spec: { forgeKind: "icon",   provider: "figma",    providerModel: "icon-set-9",  pillarSource: "I", manipulationMode: "facilitator", prompt: "BLISS Heritage — 9 ritual icons (apply, breathe, glow, bond, root, bloom, share, repeat, transmit)", estimatedCostUsd: 0.30, realisedCostUsd: 0.30, status: "COMPLETED", width: 512, height: 512 }, cdn: "/cdn/wk/bliss/heritage/icons.svg" },
    { at: daysAfter(T.missionsStart, 5),   spec: { forgeKind: "video",  provider: "magnific", providerModel: "kling-3",     pillarSource: "I", manipulationMode: "entertainer", prompt: "BLISS Heritage — 30s cinematic teaser, model rituel matin, voiceover whisper Wakandan, vibranium accents pulsing", estimatedCostUsd: 1.95, realisedCostUsd: 2.10, status: "COMPLETED", expectedSuperfans: 3500, realisedSuperfans: 4200, durationMs: 30_000, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/teaser-30s.mp4" },
    { at: daysAfter(T.missionsStart, 7),   spec: { forgeKind: "video",  provider: "magnific", providerModel: "kling-3",     pillarSource: "I", manipulationMode: "entertainer", prompt: "BLISS Heritage — 15s cutdown for Reels/TikTok", estimatedCostUsd: 1.10, realisedCostUsd: 1.10, status: "COMPLETED", expectedSuperfans: 2800, realisedSuperfans: 3100, durationMs: 15_000, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/teaser-15s.mp4" },
    // Heritage — secondary assets (4)
    { at: T.heritageLive,                  spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "E", manipulationMode: "facilitator", prompt: "BLISS Heritage — OOH layout horizontal, Biryongo skyline, copy 'L'éveil. Le rituel. La marque.'", estimatedCostUsd: 0.22, realisedCostUsd: 0.22, status: "COMPLETED", expectedSuperfans: 600,  realisedSuperfans: 720,  width: 2400, height: 1200, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/ooh.jpg" },
    { at: hoursAfter(T.heritageLive, 4),   spec: { forgeKind: "design", provider: "canva",    providerModel: "social-pack", pillarSource: "E", manipulationMode: "peddler",     prompt: "BLISS Heritage — pack 12 stories Instagram avec carrousel produit", estimatedCostUsd: 0.14, realisedCostUsd: 0.14, status: "COMPLETED", width: 1080, height: 1920, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/stories.zip" },
    { at: T.superfansWave1,                spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "E", manipulationMode: "dealer",      prompt: "BLISS Heritage — UGC composite remix from superfan submissions", estimatedCostUsd: 0.16, realisedCostUsd: 0.16, status: "COMPLETED", expectedSuperfans: 400,  realisedSuperfans: 580,  width: 1080, height: 1350, campaignId: IDS.campaignHeritage }, cdn: "/cdn/wk/bliss/heritage/ugc-remix.jpg" },
    { at: T.heritageMetrics,               spec: { forgeKind: "transform", provider: "adobe", providerModel: "firefly-v3",  pillarSource: "T", manipulationMode: "facilitator", prompt: "BLISS Heritage — adapt KV narrative to Lagos market, subtle palette warming", estimatedCostUsd: 0.16, realisedCostUsd: 0.17, status: "COMPLETED", expectedSuperfans: 250,  realisedSuperfans: 290,  width: 1080, height: 1350 }, cdn: "/cdn/wk/bliss/heritage/kv-lagos.jpg" },

    // Vibranium Glow — KV pack (8 forges)
    { at: hoursAfter(T.glowLaunch, 3),     spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "I", manipulationMode: "entertainer", prompt: "BLISS Glow — neon vibranium UV-night party, model laughing under blacklight, dewy skin, 4:5", estimatedCostUsd: 0.24, realisedCostUsd: 0.25, status: "COMPLETED", expectedSuperfans: 1700, realisedSuperfans: 2050, width: 1080, height: 1350, campaignId: IDS.campaignGlow }, cdn: "/cdn/wk/bliss/glow/kv-01.jpg" },
    { at: hoursAfter(T.glowLaunch, 4),     spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "I", manipulationMode: "entertainer", prompt: "BLISS Glow — packshot serum, neon purple/pink reflections, club energy", estimatedCostUsd: 0.20, realisedCostUsd: 0.20, status: "COMPLETED", expectedSuperfans: 900,  realisedSuperfans: 1020, width: 1080, height: 1080, campaignId: IDS.campaignGlow }, cdn: "/cdn/wk/bliss/glow/packshot.jpg" },
    { at: daysAfter(T.glowLaunch, 1),      spec: { forgeKind: "icon",   provider: "figma",    providerModel: "icon-set-9",  pillarSource: "E", manipulationMode: "entertainer", prompt: "BLISS Glow — 9 emoji-style night icons (party, sparkle, nightowl, neon, dance, mirror, kiss, glow, dawn)", estimatedCostUsd: 0.30, realisedCostUsd: 0.30, status: "COMPLETED", width: 512, height: 512 }, cdn: "/cdn/wk/bliss/glow/icons.svg" },
    { at: daysAfter(T.glowLaunch, 1),      spec: { forgeKind: "refine", provider: "magnific", providerModel: "upscale-2x",  pillarSource: "I", manipulationMode: "entertainer", prompt: "Upscale glow KV-01 4K", estimatedCostUsd: 0.06, realisedCostUsd: 0.06, status: "COMPLETED", width: 2160, height: 2700 }, cdn: "/cdn/wk/bliss/glow/kv-01-4k.jpg" },
    { at: daysAfter(T.glowLaunch, 2),      spec: { forgeKind: "video",  provider: "magnific", providerModel: "kling-3",     pillarSource: "I", manipulationMode: "entertainer", prompt: "BLISS Glow — 30s spot night-out, 4 friends getting ready, vibranium serum reflective shimmer", estimatedCostUsd: 1.85, realisedCostUsd: 1.92, status: "COMPLETED", expectedSuperfans: 3000, realisedSuperfans: 3450, durationMs: 30_000, campaignId: IDS.campaignGlow }, cdn: "/cdn/wk/bliss/glow/spot-30s.mp4" },
    { at: daysAfter(T.glowLaunch, 3),      spec: { forgeKind: "audio",  provider: "magnific", providerModel: "audio-9s",    pillarSource: "I", manipulationMode: "entertainer", prompt: "BLISS Glow — 9s sound logo, electro-Afro, hum + chime", estimatedCostUsd: 0.12, realisedCostUsd: 0.12, status: "COMPLETED", durationMs: 9_000, campaignId: IDS.campaignGlow }, cdn: "/cdn/wk/bliss/glow/sound-logo.mp3" },
    { at: hoursAfter(T.glowLaunch, 5),     spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "I", manipulationMode: "peddler",     prompt: "BLISS Glow — variant attempt, hard sell discount 30%", estimatedCostUsd: 0.20, realisedCostUsd: 0,    status: "VETOED" } },
    { at: daysAfter(T.glowLaunch, 4),      spec: { forgeKind: "design", provider: "canva",    providerModel: "social-pack", pillarSource: "E", manipulationMode: "entertainer", prompt: "BLISS Glow — pack stories TikTok, format 9:16", estimatedCostUsd: 0.12, realisedCostUsd: 0,    status: "FAILED" } },

    // Pending forges (in-flight)
    { at: hoursAfter(T.now, -2),           spec: { forgeKind: "image",  provider: "magnific", providerModel: "mystic",      pillarSource: "S", manipulationMode: "facilitator", prompt: "BLISS — concept Q2 expansion Lagos, palette éveil tropical", estimatedCostUsd: 0.22,                          status: "IN_PROGRESS" } },
    { at: hoursAfter(T.now, -1),           spec: { forgeKind: "video",  provider: "magnific", providerModel: "kling-3",     pillarSource: "S", manipulationMode: "facilitator", prompt: "BLISS — 15s teaser annonce expansion régionale", estimatedCostUsd: 1.10,                                  status: "CREATED" } },

    // App / launch (2)
    { at: T.appLaunch,                     spec: { forgeKind: "design", provider: "figma",    providerModel: "kit-ui",      pillarSource: "I", manipulationMode: "facilitator", prompt: "BLISS app — onboarding 5 screens UI", estimatedCostUsd: 0.40, realisedCostUsd: 0.42, status: "COMPLETED", width: 390, height: 844 }, cdn: "/cdn/wk/bliss/app/onboarding.fig" },
    { at: hoursAfter(T.appLaunch, 6),      spec: { forgeKind: "icon",   provider: "figma",    providerModel: "icon-set-9",  pillarSource: "I", manipulationMode: "facilitator", prompt: "BLISS app — 9 menu icons", estimatedCostUsd: 0.30, realisedCostUsd: 0.30, status: "COMPLETED", width: 64, height: 64 }, cdn: "/cdn/wk/bliss/app/menu-icons.svg" },
  ];

  // Other brands forges (lighter)
  const otherForges: Array<{ strategyId: string; at: Date; spec: ForgeSpec; cdn?: string }> = [
    { strategyId: brands.vibranium.strategy.id, at: daysAfter(T.now, -42), spec: { forgeKind: "image", provider: "adobe", providerModel: "firefly-v3", pillarSource: "I", manipulationMode: "facilitator", prompt: "Vibranium Tech — KV onboarding fintech mobile, hand holding phone, vibranium UI accent", estimatedCostUsd: 0.18, realisedCostUsd: 0.18, status: "COMPLETED", expectedSuperfans: 600, realisedSuperfans: 740, width: 1080, height: 1350 }, cdn: "/cdn/wk/vibranium/kv-onboarding.jpg" },
    { strategyId: brands.vibranium.strategy.id, at: daysAfter(T.now, -30), spec: { forgeKind: "video", provider: "magnific", providerModel: "kling-3", pillarSource: "I", manipulationMode: "facilitator", prompt: "Vibranium Tech — 20s tutorial épargne automatique", estimatedCostUsd: 1.40, realisedCostUsd: 1.45, status: "COMPLETED", expectedSuperfans: 1200, realisedSuperfans: 1380, durationMs: 20_000 }, cdn: "/cdn/wk/vibranium/tutorial.mp4" },
    { strategyId: brands.brew.strategy.id,      at: daysAfter(T.now, -20), spec: { forgeKind: "image", provider: "adobe", providerModel: "firefly-v3", pillarSource: "I", manipulationMode: "entertainer", prompt: "Wakanda Brew — bouteille craft beer, pleine lune, fauve panthère silhouette", estimatedCostUsd: 0.18, realisedCostUsd: 0.19, status: "COMPLETED", expectedSuperfans: 400, realisedSuperfans: 460, width: 1080, height: 1350 }, cdn: "/cdn/wk/brew/kv-night.jpg" },
    { strategyId: brands.panther.strategy.id,   at: daysAfter(T.now, -12), spec: { forgeKind: "image", provider: "magnific", providerModel: "mystic", pillarSource: "I", manipulationMode: "entertainer", prompt: "Panther Athletics — sprinter training dawn, vibranium track lines, dynamic motion blur", estimatedCostUsd: 0.22, realisedCostUsd: 0.23, status: "COMPLETED", expectedSuperfans: 800, realisedSuperfans: 920, width: 1080, height: 1350 }, cdn: "/cdn/wk/panther/kv-sprinter.jpg" },
    { strategyId: brands.shuri.strategy.id,     at: daysAfter(T.now, -45), spec: { forgeKind: "image", provider: "adobe", providerModel: "firefly-v3", pillarSource: "I", manipulationMode: "facilitator", prompt: "Shuri Academy — student coding, futurist classroom, holographic UI", estimatedCostUsd: 0.18, realisedCostUsd: 0.18, status: "COMPLETED", expectedSuperfans: 500, realisedSuperfans: 580, width: 1080, height: 1350 }, cdn: "/cdn/wk/shuri/kv-classroom.jpg" },
    { strategyId: brands.shuri.strategy.id,     at: daysAfter(T.now, -10), spec: { forgeKind: "design", provider: "figma", providerModel: "kit-ui", pillarSource: "I", manipulationMode: "facilitator", prompt: "Shuri Academy — landing page redesign", estimatedCostUsd: 0.40, realisedCostUsd: 0.40, status: "COMPLETED", width: 1440, height: 3200 }, cdn: "/cdn/wk/shuri/landing.fig" },
    { strategyId: brands.jabari.strategy.id,    at: daysAfter(T.now, -50), spec: { forgeKind: "image", provider: "adobe", providerModel: "firefly-v3", pillarSource: "I", manipulationMode: "dealer", prompt: "Jabari Heritage — gorilla mountain mist, traditional weapon, ancestor lineage", estimatedCostUsd: 0.18, realisedCostUsd: 0.18, status: "COMPLETED", expectedSuperfans: 350, realisedSuperfans: 410, width: 1080, height: 1350 }, cdn: "/cdn/wk/jabari/kv-mountain.jpg" },
    { strategyId: brands.jabari.strategy.id,    at: hoursAfter(T.now, -3), spec: { forgeKind: "video", provider: "magnific", providerModel: "kling-3", pillarSource: "I", manipulationMode: "dealer", prompt: "Jabari Heritage — 60s documentaire ancêtres, voix off Mbaku", estimatedCostUsd: 2.30, realisedCostUsd: 0, status: "FAILED" } },
  ];

  // ============================================================
  // 3) INSERT GenerativeTask + AssetVersion (with lineage)
  // ============================================================

  async function insertForge(strategyId: string, idx: number, scope: string, at: Date, spec: ForgeSpec, cdn?: string): Promise<{ taskId: string; assetId: string | null }> {
    const taskId = `wk-task-${scope}-${String(idx).padStart(3, "0")}`;
    const completedAt = spec.status === "COMPLETED" ? hoursAfter(at, spec.forgeKind === "video" ? 6 : 1.5) : null;
    const expiresAt = ["CREATED", "IN_PROGRESS", "COMPLETED"].includes(spec.status) ? hoursAfter(at, 12) : null;

    await prisma.generativeTask.upsert({
      where: { id: taskId },
      update: {},
      create: {
        id: taskId,
        intentId: `wk-intent-fake-${taskId}`,  // unique satisfait, pas de FK strict
        sourceIntentId: null,
        sourceBrandAssetId: null,
        campaignId: spec.campaignId ?? null,
        briefId: null,
        operatorId: IDS.operator,
        strategyId,
        forgeKind: spec.forgeKind,
        provider: spec.provider,
        providerModel: spec.providerModel,
        providerTaskId: spec.status === "CREATED" ? null : `${spec.provider}_task_${pseudoHashHex(taskId).slice(0, 12)}`,
        status: spec.status,
        promptHash: pseudoHashHex(`${spec.prompt}|${spec.provider}|${spec.providerModel}`),
        parameters: { prompt: spec.prompt, width: spec.width ?? 1080, height: spec.height ?? 1350, durationMs: spec.durationMs } as Prisma.InputJsonValue,
        pillarSource: spec.pillarSource,
        manipulationMode: spec.manipulationMode,
        resultUrls: spec.status === "COMPLETED"
          ? ({ urls: [`https://signed.${spec.provider}.example/${pseudoHashHex(taskId).slice(0, 16)}`] } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        estimatedCostUsd: spec.estimatedCostUsd,
        realisedCostUsd: spec.realisedCostUsd ?? null,
        expectedSuperfans: spec.expectedSuperfans ?? null,
        realisedSuperfans: spec.realisedSuperfans ?? null,
        createdAt: at,
        completedAt,
        expiresAt,
        webhookSecret: pseudoSecret(taskId),
        errorMessage: spec.status === "FAILED" ? "Provider returned 502 after 30s timeout (fixture)" : spec.status === "VETOED" ? "MANIPULATION_COHERENCE veto by Mestor pre-flight" : null,
      },
    });
    track("GenerativeTask");

    if (spec.status !== "COMPLETED") return { taskId, assetId: null };

    const assetId = `wk-asset-${scope}-${String(idx).padStart(3, "0")}`;
    const url = `https://signed.${spec.provider}.example/${pseudoHashHex(taskId).slice(0, 16)}`;
    await prisma.assetVersion.upsert({
      where: { id: assetId },
      update: {},
      create: {
        id: assetId,
        parentAssetId: null,
        generativeTaskId: taskId,
        operatorId: IDS.operator,
        strategyId,
        kind: spec.forgeKind === "icon" ? "icon" : spec.forgeKind === "video" ? "video" : spec.forgeKind === "audio" ? "audio" : "image",
        url,
        cdnUrl: cdn ?? `/cdn/wk/${scope}/${assetId}.bin`,
        width: spec.width ?? null,
        height: spec.height ?? null,
        durationMs: spec.durationMs ?? null,
        fileSizeBytes: spec.forgeKind === "video" ? 18_500_000 : spec.forgeKind === "audio" ? 320_000 : 1_250_000,
        metadata: {
          provider: spec.provider,
          providerModel: spec.providerModel,
          campaign: spec.campaignId,
          pillarSource: spec.pillarSource,
          manipulationMode: spec.manipulationMode,
        } as Prisma.InputJsonValue,
        cultIndexDeltaObserved: spec.realisedSuperfans && spec.expectedSuperfans
          ? +(((spec.realisedSuperfans - spec.expectedSuperfans) / Math.max(1, spec.expectedSuperfans)) * 0.05).toFixed(4)
          : null,
        createdAt: completedAt ?? at,
      },
    });
    track("AssetVersion");
    return { taskId, assetId };
  }

  // BLISS forges with parent lineage for the upscale forge (kv-01-4k from kv-01)
  let blissParentMap: Record<string, string> = {};
  for (let i = 0; i < blissForges.length; i++) {
    const { at, spec, cdn } = blissForges[i];
    const result = await insertForge(blissId, i, "bliss", at, spec, cdn);
    if (result.assetId) blissParentMap[`bliss-${i}`] = result.assetId;
  }

  // Wire upscale parents (kv-01 → kv-01-4k for both heritage and glow)
  if (blissParentMap["bliss-0"] && blissParentMap["bliss-3"]) {
    await prisma.assetVersion.update({
      where: { id: blissParentMap["bliss-3"] },
      data: { parentAssetId: blissParentMap["bliss-0"] },
    });
  }
  if (blissParentMap["bliss-12"] && blissParentMap["bliss-15"]) {
    await prisma.assetVersion.update({
      where: { id: blissParentMap["bliss-15"] },
      data: { parentAssetId: blissParentMap["bliss-12"] },
    });
  }

  // Other brands
  for (let i = 0; i < otherForges.length; i++) {
    const { strategyId, at, spec, cdn } = otherForges[i];
    const scope = strategyId.replace("wk-strategy-", "");
    await insertForge(strategyId, i, scope, at, spec, cdn);
  }

  console.log(
    `  [OK] Ptah forge: 4 providers, ${blissForges.length} BLISS forges + ${otherForges.length} other forges, lineage upscale → 4K wired`,
  );
}
