/**
 * WAKANDA SEED — Governance trail (Mestor wake-up)
 *
 * Réveille Mestor en peuplant le hash-chain Intent :
 *  - IntentEmission (~150) : trace de toutes les mutations gouvernées
 *    sur les 3 mois, distribuées sur les 5 governors actifs.
 *  - IntentEmissionEvent (~600) : phases PROPOSED→COMPLETED par intent.
 *  - IntentQueue (~12) : intents async encore en file (cron picker).
 *  - CostDecision (~80) : audit Thot per intent costé.
 *
 * Hash-chain simplifié (selfHash/prevHash dummy mais non-null) — l'audit
 * de cohérence n'est pas un test bloquant sur les seeds.
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

type IntentSpec = {
  kind: string;
  governor: "MESTOR" | "ARTEMIS" | "SESHAT" | "THOT" | "INFRASTRUCTURE";
  caller: string;
  status?: "OK" | "VETOED" | "DOWNGRADED" | "FAILED" | "QUEUED" | "PENDING";
  costUsd?: number;
  async?: boolean;
};

// Pseudo-hash deterministic — sha256-shaped string, not real crypto, just
// keeps the DB column non-empty for fixtures.
function pseudoHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  const hex = (Math.abs(h).toString(16) + "0000000000000000").slice(0, 16);
  return `wkhash_${hex}`;
}

export async function seedGovernanceTrail(prisma: PrismaClient, brands: Brands) {
  const blissId = brands.bliss.strategy.id;
  const vibraniumId = brands.vibranium.strategy.id;
  const brewId = brands.brew.strategy.id;
  const pantherId = brands.panther.strategy.id;
  const shuriId = brands.shuri.strategy.id;
  const jabariId = brands.jabari.strategy.id;

  // ============================================================
  // BLISS — Trail principal (hero brand, 3 mois d'activité)
  // ============================================================
  const blissTrail: Array<{ at: Date; spec: IntentSpec }> = [
    // Week 1 — boot
    { at: T.intake,           spec: { kind: "RUN_QUICK_INTAKE",        governor: "MESTOR", caller: "router:quick-intake.complete",                  costUsd: 0.04 } },
    { at: T.intakeConverted,  spec: { kind: "LIFT_INTAKE_TO_STRATEGY", governor: "MESTOR", caller: "intake.lift",                                   costUsd: 0.18, async: true } },
    { at: T.bootStart,        spec: { kind: "RUN_BOOT_SEQUENCE",       governor: "MESTOR", caller: "post-paywall.bootstrap",                        costUsd: 0.62, async: true } },
    { at: T.bootAD,           spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase1",                          costUsd: 0.21 } },
    { at: T.bootVE,           spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase2",                          costUsd: 0.19 } },
    { at: T.docsUploaded,     spec: { kind: "WRITE_PILLAR",            governor: "INFRASTRUCTURE", caller: "boot-sequence:vault-ingest",            costUsd: 0.06 } },
    // Week 2 — RTIS
    { at: T.rtisCascade,      spec: { kind: "RUN_RTIS_CASCADE",        governor: "MESTOR", caller: "boot-sequence:rtis",                            costUsd: 0.48 } },
    { at: hoursAfter(T.rtisCascade, 1), spec: { kind: "SCORE_PILLAR",  governor: "INFRASTRUCTURE", caller: "rtis-cascade:r",                        costUsd: 0.04 } },
    { at: hoursAfter(T.rtisCascade, 2), spec: { kind: "SCORE_PILLAR",  governor: "INFRASTRUCTURE", caller: "rtis-cascade:t",                        costUsd: 0.04 } },
    { at: hoursAfter(T.rtisCascade, 3), spec: { kind: "SCORE_PILLAR",  governor: "INFRASTRUCTURE", caller: "rtis-cascade:i",                        costUsd: 0.04 } },
    { at: hoursAfter(T.rtisCascade, 4), spec: { kind: "SCORE_PILLAR",  governor: "INFRASTRUCTURE", caller: "rtis-cascade:s",                        costUsd: 0.04 } },
    { at: T.vaultEnrichment,  spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.refresh",                              costUsd: 0.32 } },
    { at: T.recosReviewed,    spec: { kind: "APPLY_RECOMMENDATIONS",   governor: "MESTOR", caller: "router:recommendation.applyBatch",              costUsd: 0.11 } },
    // Week 3-4
    { at: T.notoriaStage1,    spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.stage1",                               costUsd: 0.26 } },
    { at: T.driversConfigured, spec: { kind: "JEHUTY_FEED_REFRESH",    governor: "SESHAT", caller: "jehuty.refresh.cron",                           costUsd: 0.08 } },
    { at: T.notoriaStage2,    spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.stage2",                               costUsd: 0.28 } },
    { at: T.campaignBriefed,  spec: { kind: "INVOKE_GLORY_TOOL",       governor: "ARTEMIS", caller: "glory:campaign-brief-360",                     costUsd: 0.42 } },
    { at: hoursAfter(T.campaignBriefed, 6), spec: { kind: "EXECUTE_GLORY_SEQUENCE", governor: "ARTEMIS", caller: "artemis:campaign-prep-bliss",     costUsd: 1.12, async: true } },
    // Week 5-8 — Production
    { at: T.campaignPlanning, spec: { kind: "BUILD_PLAN",              governor: "MESTOR", caller: "campaign:heritage.plan",                        costUsd: 0.18 } },
    { at: T.missionsStart,    spec: { kind: "INVOKE_GLORY_TOOL",       governor: "ARTEMIS", caller: "glory:kv-art-direction-brief",                 costUsd: 0.22 } },
    { at: hoursAfter(T.missionsStart, 4), spec: { kind: "PTAH_MATERIALIZE_BRIEF", governor: "MESTOR", caller: "ptah:forge.kv-heritage",             costUsd: 0.85, async: true } },
    { at: daysAfter(T.missionsStart, 2), spec: { kind: "INVOKE_GLORY_TOOL", governor: "ARTEMIS", caller: "glory:script-spot-30s",                   costUsd: 0.31 } },
    { at: daysAfter(T.missionsStart, 5), spec: { kind: "PTAH_MATERIALIZE_BRIEF", governor: "MESTOR", caller: "ptah:forge.video-teaser",             costUsd: 1.95, async: true } },
    { at: T.heritageLive,     spec: { kind: "RUN_RTIS_CASCADE",        governor: "MESTOR", caller: "campaign:heritage.live-cascade",                costUsd: 0.21 } },
    { at: T.superfansWave1,   spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",                           costUsd: 0.07 } },
    { at: T.heritageMetrics,  spec: { kind: "RANK_PEERS",              governor: "SESHAT", caller: "console:hyperviseur",                           costUsd: 0.05 } },
    // Week 9-12 — Maturity
    { at: T.notoriaStage3,    spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.stage3",                               costUsd: 0.31 } },
    { at: T.heritagePost,     spec: { kind: "INVOKE_GLORY_TOOL",       governor: "ARTEMIS", caller: "glory:retrospective-360",                      costUsd: 0.18 } },
    { at: T.glowLaunch,       spec: { kind: "EXECUTE_GLORY_SEQUENCE",  governor: "ARTEMIS", caller: "artemis:campaign-prep-glow",                   costUsd: 0.96, async: true } },
    { at: hoursAfter(T.glowLaunch, 3), spec: { kind: "PTAH_MATERIALIZE_BRIEF", governor: "MESTOR", caller: "ptah:forge.kv-glow",                    costUsd: 0.78, async: true } },
    { at: daysAfter(T.glowLaunch, 1), spec: { kind: "PTAH_MATERIALIZE_BRIEF", governor: "MESTOR", caller: "ptah:forge.glow-icon-set",               costUsd: 0.45, async: true } },
    { at: T.appLaunch,        spec: { kind: "BUILD_PLAN",              governor: "MESTOR", caller: "app-launch.plan",                               costUsd: 0.15 } },
    { at: T.ambassadorLaunch, spec: { kind: "ACTIVATE_RETAINER",       governor: "THOT", caller: "monetization:retainer.activate",                  costUsd: 0.02 } },
    { at: T.scoresValidated,  spec: { kind: "PROMOTE_FORTE_TO_CULTE",  governor: "MESTOR", caller: "tier-promote.bliss",                            costUsd: 0.12 } },
    { at: hoursAfter(T.scoresValidated, 2), spec: { kind: "PROMOTE_CULTE_TO_ICONE", governor: "MESTOR", caller: "tier-promote.bliss",              costUsd: 0.14 } },
    // Sentinel apogee
    { at: daysAfter(T.scoresValidated, 5), spec: { kind: "MAINTAIN_APOGEE", governor: "MESTOR", caller: "sentinel.apogee.weekly",                   costUsd: 0.18, async: true } },
    { at: daysAfter(T.scoresValidated, 6), spec: { kind: "DEFEND_OVERTON",  governor: "SESHAT", caller: "sentinel.overton.weekly",                  costUsd: 0.09, async: true } },
    // Edge cases — VETO + DOWNGRADE + FAILED
    { at: hoursAfter(T.glowLaunch, 5), spec: { kind: "PTAH_MATERIALIZE_BRIEF", governor: "MESTOR", caller: "ptah:forge.kv-glow-extra", status: "VETOED",     costUsd: 0 } },
    { at: T.notoriaStage3,    spec: { kind: "EXECUTE_GLORY_SEQUENCE", governor: "ARTEMIS", caller: "artemis:experimental-seq", status: "DOWNGRADED", costUsd: 0.32 } },
    { at: daysAfter(T.appLaunch, 1), spec: { kind: "INVOKE_GLORY_TOOL",  governor: "ARTEMIS", caller: "glory:naming-app", status: "FAILED",       costUsd: 0.04 } },
    // Recurring cron-like cadence — JEHUTY weekly
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((wk) => ({
      at: daysAfter(T.intakeConverted, wk * 7),
      spec: { kind: "JEHUTY_FEED_REFRESH" as const, governor: "SESHAT" as const, caller: "jehuty.refresh.cron",                                       costUsd: 0.06 + wk * 0.002 } satisfies IntentSpec,
    })),
    // Recurring — RANK_PEERS weekly
    ...[1, 3, 5, 7, 9, 11].map((wk) => ({
      at: hoursAfter(daysAfter(T.intakeConverted, wk * 7), 4),
      spec: { kind: "RANK_PEERS" as const, governor: "SESHAT" as const, caller: "console:hyperviseur",                                                costUsd: 0.05 } satisfies IntentSpec,
    })),
    // Pillar writes during 3 months
    ...[3, 8, 14, 21, 30, 45, 60, 75, 85].map((dayOff, idx) => ({
      at: daysAfter(T.bootStart, dayOff),
      spec: { kind: "WRITE_PILLAR" as const, governor: "INFRASTRUCTURE" as const, caller: `pillar-gateway:bliss-${idx}`,                              costUsd: 0.05 + idx * 0.005 } satisfies IntentSpec,
    })),
  ];

  // Other brands — lighter trail (~10 each)
  const otherBrandTrails: Array<{ strategyId: string; emissions: Array<{ at: Date; spec: IntentSpec }> }> = [
    {
      strategyId: vibraniumId,
      emissions: [
        { at: daysAfter(T.now, -55), spec: { kind: "RUN_QUICK_INTAKE",        governor: "MESTOR", caller: "router:quick-intake.complete",  costUsd: 0.04 } },
        { at: daysAfter(T.now, -52), spec: { kind: "RUN_BOOT_SEQUENCE",       governor: "MESTOR", caller: "post-paywall.bootstrap",        costUsd: 0.58, async: true } },
        { at: daysAfter(T.now, -50), spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase1",          costUsd: 0.20 } },
        { at: daysAfter(T.now, -48), spec: { kind: "RUN_RTIS_CASCADE",        governor: "MESTOR", caller: "boot-sequence:rtis",            costUsd: 0.45 } },
        { at: daysAfter(T.now, -40), spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.refresh",              costUsd: 0.27 } },
        { at: daysAfter(T.now, -30), spec: { kind: "INVOKE_GLORY_TOOL",       governor: "ARTEMIS", caller: "glory:positioning",            costUsd: 0.18 } },
        { at: daysAfter(T.now, -25), spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",           costUsd: 0.07 } },
        { at: daysAfter(T.now, -15), spec: { kind: "RANK_PEERS",              governor: "SESHAT", caller: "console:hyperviseur",           costUsd: 0.05 } },
        { at: daysAfter(T.now, -8),  spec: { kind: "PROMOTE_FRAGILE_TO_ORDINAIRE", governor: "MESTOR", caller: "tier-promote.vibranium", costUsd: 0.10 } },
      ],
    },
    {
      strategyId: brewId,
      emissions: [
        { at: daysAfter(T.now, -42), spec: { kind: "RUN_QUICK_INTAKE",        governor: "MESTOR", caller: "router:quick-intake.complete",  costUsd: 0.04 } },
        { at: daysAfter(T.now, -40), spec: { kind: "RUN_BOOT_SEQUENCE",       governor: "MESTOR", caller: "post-paywall.bootstrap",        costUsd: 0.55, async: true } },
        { at: daysAfter(T.now, -38), spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase1",          costUsd: 0.19 } },
        { at: daysAfter(T.now, -35), spec: { kind: "RUN_RTIS_CASCADE",        governor: "MESTOR", caller: "boot-sequence:rtis",            costUsd: 0.42 } },
        { at: daysAfter(T.now, -25), spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.refresh",              costUsd: 0.24 } },
        { at: daysAfter(T.now, -10), spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",           costUsd: 0.06 } },
        { at: daysAfter(T.now, -3),  spec: { kind: "PROMOTE_ZOMBIE_TO_FRAGILE", governor: "MESTOR", caller: "tier-promote.brew",          costUsd: 0.09 } },
      ],
    },
    {
      strategyId: pantherId,
      emissions: [
        { at: daysAfter(T.now, -30), spec: { kind: "RUN_QUICK_INTAKE",        governor: "MESTOR", caller: "router:quick-intake.complete", costUsd: 0.04 } },
        { at: daysAfter(T.now, -28), spec: { kind: "RUN_BOOT_SEQUENCE",       governor: "MESTOR", caller: "post-paywall.bootstrap",       costUsd: 0.50, async: true } },
        { at: daysAfter(T.now, -25), spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase1",         costUsd: 0.18 } },
        { at: daysAfter(T.now, -20), spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.refresh",             costUsd: 0.22 } },
        { at: daysAfter(T.now, -5),  spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",          costUsd: 0.06 } },
      ],
    },
    {
      strategyId: shuriId,
      emissions: [
        { at: daysAfter(T.now, -75), spec: { kind: "RUN_QUICK_INTAKE",        governor: "MESTOR", caller: "router:quick-intake.complete", costUsd: 0.04 } },
        { at: daysAfter(T.now, -72), spec: { kind: "RUN_BOOT_SEQUENCE",       governor: "MESTOR", caller: "post-paywall.bootstrap",       costUsd: 0.61, async: true } },
        { at: daysAfter(T.now, -70), spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase1",         costUsd: 0.21 } },
        { at: daysAfter(T.now, -65), spec: { kind: "RUN_RTIS_CASCADE",        governor: "MESTOR", caller: "boot-sequence:rtis",           costUsd: 0.46 } },
        { at: daysAfter(T.now, -55), spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.refresh",             costUsd: 0.28 } },
        { at: daysAfter(T.now, -45), spec: { kind: "INVOKE_GLORY_TOOL",       governor: "ARTEMIS", caller: "glory:tone-charter",          costUsd: 0.19 } },
        { at: daysAfter(T.now, -30), spec: { kind: "INVOKE_GLORY_TOOL",       governor: "ARTEMIS", caller: "glory:persona-bank",          costUsd: 0.22 } },
        { at: daysAfter(T.now, -15), spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",          costUsd: 0.07 } },
        { at: daysAfter(T.now, -7),  spec: { kind: "PROMOTE_ORDINAIRE_TO_FORTE", governor: "MESTOR", caller: "tier-promote.shuri",       costUsd: 0.13 } },
      ],
    },
    {
      strategyId: jabariId,
      emissions: [
        { at: daysAfter(T.now, -90), spec: { kind: "RUN_QUICK_INTAKE",        governor: "MESTOR", caller: "router:quick-intake.complete", costUsd: 0.04 } },
        { at: daysAfter(T.now, -88), spec: { kind: "RUN_BOOT_SEQUENCE",       governor: "MESTOR", caller: "post-paywall.bootstrap",       costUsd: 0.45, async: true } },
        { at: daysAfter(T.now, -85), spec: { kind: "FILL_ADVE",               governor: "MESTOR", caller: "boot-sequence:phase1",         costUsd: 0.17 } },
        { at: daysAfter(T.now, -60), spec: { kind: "GENERATE_RECOMMENDATIONS", governor: "MESTOR", caller: "notoria.refresh",             costUsd: 0.21 } },
        { at: daysAfter(T.now, -40), spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",          costUsd: 0.06 } },
        { at: daysAfter(T.now, -15), spec: { kind: "DISCARD_RECOMMENDATIONS", governor: "MESTOR", caller: "router:recommendation.discardBatch", costUsd: 0.02 } },
        { at: daysAfter(T.now, -2),  spec: { kind: "JEHUTY_FEED_REFRESH",     governor: "SESHAT", caller: "jehuty.refresh.cron",          costUsd: 0.06 } },
      ],
    },
  ];

  // ============================================================
  // INSERT — IntentEmission + IntentEmissionEvent + CostDecision
  // ============================================================

  let prevHashByStrategy: Record<string, string | null> = {};

  async function insertEmission(strategyId: string, idx: number, at: Date, spec: IntentSpec): Promise<string> {
    const id = `wk-intent-${strategyId.replace("wk-strategy-", "")}-${String(idx).padStart(3, "0")}`;
    const status = spec.status ?? "OK";
    const completedAt = ["OK", "VETOED", "DOWNGRADED", "FAILED"].includes(status)
      ? hoursAfter(at, spec.async ? 6 : 1)
      : null;
    const prevHash = prevHashByStrategy[strategyId] ?? null;
    const selfHash = pseudoHash(`${id}|${spec.kind}|${at.toISOString()}|${prevHash ?? "genesis"}`);
    prevHashByStrategy[strategyId] = selfHash;

    await prisma.intentEmission.upsert({
      where: { id },
      update: {},
      create: {
        id,
        intentKind: spec.kind,
        strategyId,
        payload: { strategyId, kind: spec.kind, source: "wakanda-seed" } as Prisma.InputJsonValue,
        result: status === "OK"
          ? ({ ok: true, durationMs: spec.async ? 18_000 : 1_200, summary: `${spec.kind} completed` } as Prisma.InputJsonValue)
          : status === "VETOED"
          ? ({ ok: false, vetoReason: "MANIPULATION_COHERENCE", summary: "Mode hors mix stratégique" } as Prisma.InputJsonValue)
          : status === "DOWNGRADED"
          ? ({ ok: true, downgrade: { from: "PRO", to: "BASE" }, summary: "Tier downgrade by Thot" } as Prisma.InputJsonValue)
          : status === "FAILED"
          ? ({ ok: false, error: "PROVIDER_TIMEOUT", summary: "Upstream provider timed out after 30s" } as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        caller: spec.caller,
        version: 1,
        governor: spec.governor,
        costUsd: spec.costUsd ? new Prisma.Decimal(spec.costUsd) : null,
        startedAt: at,
        status,
        prevHash,
        selfHash,
        emittedAt: at,
        completedAt,
      },
    });
    track("IntentEmission");
    return id;
  }

  async function insertEvents(intentId: string, at: Date, status: string, isAsync: boolean) {
    const phases: Array<{ phase: string; offsetMin: number; partial?: object }> = [
      { phase: "PROPOSED", offsetMin: 0 },
      { phase: "DELIBERATED", offsetMin: 1 },
      { phase: "DISPATCHED", offsetMin: 2 },
    ];
    if (isAsync) phases.push({ phase: "EXECUTING", offsetMin: 4, partial: { progress: 0.4 } });
    if (status === "OK") phases.push({ phase: "COMPLETED", offsetMin: isAsync ? 360 : 5 });
    else if (status === "VETOED") phases.push({ phase: "VETOED", offsetMin: 2 });
    else if (status === "DOWNGRADED") phases.push({ phase: "DOWNGRADED", offsetMin: 3 });
    else if (status === "FAILED") phases.push({ phase: "FAILED", offsetMin: isAsync ? 60 : 4 });

    for (let i = 0; i < phases.length; i++) {
      const p = phases[i];
      const eventId = `${intentId}-evt${i}`;
      await prisma.intentEmissionEvent.upsert({
        where: { id: eventId },
        update: {},
        create: {
          id: eventId,
          intentId,
          phase: p.phase,
          stepIndex: i,
          stepTotal: phases.length,
          stepName: p.phase.toLowerCase(),
          partial: (p.partial ?? null) as Prisma.InputJsonValue | null,
          emittedAt: new Date(at.getTime() + p.offsetMin * 60_000),
        },
      });
      track("IntentEmissionEvent");
    }
  }

  async function insertCostDecision(intentId: string, intentKind: string, strategyId: string, at: Date, costUsd: number, status: string) {
    if (costUsd <= 0) return;
    const id = `wk-costdec-${intentId.replace("wk-intent-", "")}`;
    const decision = status === "VETOED" ? "VETO" : status === "DOWNGRADED" ? "DOWNGRADE" : "ALLOW";
    await prisma.costDecision.upsert({
      where: { id },
      update: {},
      create: {
        id,
        intentEmissionId: intentId,
        intentKind,
        operatorId: IDS.operator,
        strategyId,
        decision,
        estimatedUsd: new Prisma.Decimal(costUsd),
        remainingBudgetUsd: new Prisma.Decimal(Math.max(0, 250 - costUsd * 12)),
        downgradeFromTier: decision === "DOWNGRADE" ? "PRO" : null,
        downgradeToTier: decision === "DOWNGRADE" ? "BASE" : null,
        reason: decision === "VETO"
          ? "Manipulation mode hors mix Strategy.manipulationMix"
          : decision === "DOWNGRADE"
          ? "Budget tier insufficient for PRO — auto-downgrade to BASE"
          : "Within capacity envelope",
        decidedAt: at,
      },
    });
    track("CostDecision");
  }

  // BLISS — sort by date, insert
  const blissSorted = [...blissTrail].sort((a, b) => a.at.getTime() - b.at.getTime());
  for (let i = 0; i < blissSorted.length; i++) {
    const { at, spec } = blissSorted[i];
    const id = await insertEmission(blissId, i, at, spec);
    await insertEvents(id, at, spec.status ?? "OK", !!spec.async);
    if (spec.costUsd && spec.costUsd > 0) {
      await insertCostDecision(id, spec.kind, blissId, at, spec.costUsd, spec.status ?? "OK");
    }
  }

  // Other brands
  for (const trail of otherBrandTrails) {
    const sorted = [...trail.emissions].sort((a, b) => a.at.getTime() - b.at.getTime());
    for (let i = 0; i < sorted.length; i++) {
      const { at, spec } = sorted[i];
      const id = await insertEmission(trail.strategyId, i, at, spec);
      await insertEvents(id, at, spec.status ?? "OK", !!spec.async);
      if (spec.costUsd && spec.costUsd > 0) {
        await insertCostDecision(id, spec.kind, trail.strategyId, at, spec.costUsd, spec.status ?? "OK");
      }
    }
  }

  // ============================================================
  // INTENT QUEUE — async pending (cron picker fixture)
  // ============================================================
  const queueRows: Array<{ kind: string; strategyId: string; offsetH: number; attempts: number; status: "PENDING" | "RUNNING" | "FAILED" }> = [
    { kind: "PTAH_REGENERATE_FADING_ASSET", strategyId: blissId,     offsetH: -2,  attempts: 0, status: "PENDING" },
    { kind: "ENRICH_ORACLE",                strategyId: blissId,     offsetH: -1,  attempts: 0, status: "PENDING" },
    { kind: "MAINTAIN_APOGEE",              strategyId: blissId,     offsetH: 0.5, attempts: 0, status: "PENDING" },
    { kind: "EXPORT_ORACLE",                strategyId: blissId,     offsetH: 1,   attempts: 0, status: "PENDING" },
    { kind: "EXECUTE_GLORY_SEQUENCE",       strategyId: vibraniumId, offsetH: -3,  attempts: 1, status: "RUNNING" },
    { kind: "ENRICH_ORACLE",                strategyId: vibraniumId, offsetH: 2,   attempts: 0, status: "PENDING" },
    { kind: "DEFEND_OVERTON",               strategyId: shuriId,     offsetH: -1,  attempts: 0, status: "PENDING" },
    { kind: "PTAH_MATERIALIZE_BRIEF",       strategyId: shuriId,     offsetH: 0,   attempts: 0, status: "PENDING" },
    { kind: "RUN_RTIS_CASCADE",             strategyId: brewId,      offsetH: -4,  attempts: 2, status: "FAILED" },
    { kind: "FILL_ADVE",                    strategyId: pantherId,   offsetH: -2,  attempts: 0, status: "PENDING" },
    { kind: "GENERATE_RECOMMENDATIONS",     strategyId: pantherId,   offsetH: 1,   attempts: 0, status: "PENDING" },
    { kind: "JEHUTY_FEED_REFRESH",          strategyId: jabariId,    offsetH: 3,   attempts: 0, status: "PENDING" },
  ];

  for (let i = 0; i < queueRows.length; i++) {
    const row = queueRows[i];
    const intentId = `wk-queue-${i.toString().padStart(2, "0")}`;
    await prisma.intentQueue.upsert({
      where: { intentId },
      update: {},
      create: {
        intentId,
        kind: row.kind,
        strategyId: row.strategyId,
        payload: { kind: row.kind, strategyId: row.strategyId, source: "wakanda-seed" } as Prisma.InputJsonValue,
        enqueuedAt: hoursAfter(T.now, row.offsetH - 1),
        attempts: row.attempts,
        status: row.status,
        lastError: row.status === "FAILED" ? "Provider timeout (30s) — retry scheduled" : null,
        notBefore: hoursAfter(T.now, row.offsetH),
      },
    });
    track("IntentQueue");
  }

  console.log(
    `  [OK] Governance trail: ${blissSorted.length} BLISS + ${otherBrandTrails.reduce((s, t) => s + t.emissions.length, 0)} other intents, ${queueRows.length} queued, costed decisions logged`,
  );
}
