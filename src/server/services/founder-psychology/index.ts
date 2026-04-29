/**
 * founder-psychology — mechanizes "founder = first superfan" (MISSION drift 5.9).
 *
 * Layer 3 — Crew Programs sub-system (Ground Tier).
 * Governor: INFRASTRUCTURE.
 *
 * Mission contribution: CHAIN_VIA:devotion-engine. The founder's
 * own conversion to evangelist of their brand is the *bootstrap mass*
 * for the cult formation. Without an active founder superfan, the
 * brand has no narrator and the propellant cannot ignite. This service
 * delivers the rituals, the celebrations, and the milestone signals
 * that keep the founder believing in their own brand harder over time.
 *
 * The math: a founder who logs in daily, makes high-stakes brand
 * decisions, and consumes the Oracle as scripture is structurally
 * primed to convert their network. We measure that priming as
 * `FounderCultIndex` 0-100.
 */

import { db } from "@/lib/db";

// ── Founder Cult Index ────────────────────────────────────────────────

export interface FounderCultIndexBreakdown {
  /** 0-100 composite score. */
  readonly score: number;
  /** Sub-components, each 0-25. */
  readonly engagement: number; // login frequency, dwell time
  readonly ownership: number; // decisions made (oracle edits, intent triggers)
  readonly recruitment: number; // links shared, mentions, public posts (proxied via signals)
  readonly internalization: number; // brand vocabulary in their messages, ritual completion
  /** Tier: SPECTATEUR | INTERESSE | PARTICIPANT | ENGAGE | AMBASSADEUR | EVANGELISTE */
  readonly tier: string;
}

const TIER_THRESHOLDS = [
  { tier: "EVANGELISTE", min: 85 },
  { tier: "AMBASSADEUR", min: 65 },
  { tier: "ENGAGE", min: 45 },
  { tier: "PARTICIPANT", min: 25 },
  { tier: "INTERESSE", min: 10 },
  { tier: "SPECTATEUR", min: 0 },
] as const;

function tierOf(score: number): string {
  for (const t of TIER_THRESHOLDS) if (score >= t.min) return t.tier;
  return "SPECTATEUR";
}

export async function computeFounderCultIndex(
  founderId: string,
  strategyId: string,
): Promise<FounderCultIndexBreakdown> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000); // rolling 30d

  // Engagement — logins + dwell time approximations via session activity
  const [sessions, recentIntents, ritualCompletions, devotionRow] = await Promise.all([
    db.session.count({
      where: { userId: founderId, expires: { gte: since } },
    }).catch(() => 0),
    db.intentEmission.count({
      where: { strategyId, caller: { contains: founderId }, emittedAt: { gte: since } },
    }).catch(() => 0),
    db.intentEmission.count({
      where: {
        strategyId,
        intentKind: { in: ["MAINTAIN_APOGEE", "EXPAND_TO_ADJACENT_SECTOR"] },
        emittedAt: { gte: since },
      },
    }).catch(() => 0),
    db.devotionProfile?.findFirst?.({
      where: { strategyId, identifier: founderId },
    }).catch(() => null) ?? null,
  ]);

  // Each sub-score caps at 25
  const engagement = Math.min(25, sessions * 1.5);
  const ownership = Math.min(25, recentIntents * 2);
  const recruitment = Math.min(25, Math.round((devotionRow?.engagementDepth ?? 0) * 25));
  const internalization = Math.min(25, ritualCompletions * 5);

  const score = Math.round(engagement + ownership + recruitment + internalization);
  return {
    score,
    engagement,
    ownership,
    recruitment,
    internalization,
    tier: tierOf(score),
  };
}

// ── Weekly digest — the ritual ─────────────────────────────────────────

export interface WeeklyDigestSection {
  readonly heading: string;
  readonly body: string;
  readonly sentiment: "celebrate" | "alert" | "neutral";
}

export interface WeeklyDigest {
  readonly founderId: string;
  readonly strategyId: string;
  readonly weekOf: string; // ISO date (Monday)
  readonly cultIndex: FounderCultIndexBreakdown;
  readonly sections: WeeklyDigestSection[];
  readonly callToActionIntent?: string;
}

export async function composeWeeklyDigest(
  founderId: string,
  strategyId: string,
): Promise<WeeklyDigest> {
  const cultIndex = await computeFounderCultIndex(founderId, strategyId);

  // Most engaged superfans this week
  const recentDevoted = await db.devotionProfile?.findMany?.({
    where: { strategyId, lastSeenAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
    orderBy: { engagementDepth: "desc" },
    take: 3,
  }).catch(() => []);

  // Recent IntentEmission completions (achievements)
  const recentCompletions = await db.intentEmission.findMany({
    where: { strategyId, status: "OK", completedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { intentKind: true, completedAt: true },
  }).catch(() => []);

  const sections: WeeklyDigestSection[] = [];

  // Section 1 — superfans nouveaux
  if (recentDevoted && recentDevoted.length > 0) {
    sections.push({
      heading: `${recentDevoted.length} ${recentDevoted.length === 1 ? "nouveau superfan" : "nouveaux superfans"} cette semaine`,
      body: recentDevoted
        .map((d, i) => `${i + 1}. profile=${d.identifier?.slice(0, 8)}… engagementDepth=${(d.engagementDepth * 100).toFixed(0)}%`)
        .join("\n"),
      sentiment: "celebrate",
    });
  }

  // Section 2 — orchestration completed
  if (recentCompletions.length > 0) {
    sections.push({
      heading: `${recentCompletions.length} orchestration${recentCompletions.length === 1 ? "" : "s"} OK`,
      body: recentCompletions.map((c) => `• ${c.intentKind} @ ${c.completedAt?.toISOString()?.slice(0, 16)}`).join("\n"),
      sentiment: "neutral",
    });
  }

  // Section 3 — founder's own ritual state
  sections.push({
    heading: `Ton statut ce jour: ${cultIndex.tier} (score ${cultIndex.score}/100)`,
    body: `Engagement ${cultIndex.engagement}/25 · Ownership ${cultIndex.ownership}/25 · Recruitment ${cultIndex.recruitment}/25 · Internalisation ${cultIndex.internalization}/25`,
    sentiment: cultIndex.score >= 65 ? "celebrate" : cultIndex.score < 25 ? "alert" : "neutral",
  });

  // Call-to-action — nudge the next ritual
  let cta: string | undefined;
  if (cultIndex.tier === "SPECTATEUR" || cultIndex.tier === "INTERESSE") {
    cta = "RUN_QUICK_INTAKE"; // re-engage with their own brand
  } else if (cultIndex.tier === "AMBASSADEUR" && cultIndex.recruitment < 15) {
    cta = "EXPAND_TO_ADJACENT_SECTOR"; // ready to widen
  }

  return {
    founderId,
    strategyId,
    weekOf: lastMondayIso(),
    cultIndex,
    sections,
    callToActionIntent: cta,
  };
}

function lastMondayIso(): string {
  const d = new Date();
  const day = d.getDay() || 7; // 1..7 (Mon..Sun)
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ── Milestones (palier transition celebrations) ───────────────────────

export interface MilestoneEvent {
  readonly strategyId: string;
  readonly fromTier: string;
  readonly toTier: string;
  readonly observedAt: Date;
}

export async function recordMilestone(event: MilestoneEvent): Promise<void> {
  // Persist as a synthetic IntentEmission so it appears in audit trail.
  await db.intentEmission.create({
    data: {
      intentKind: `PROMOTE_${event.fromTier}_TO_${event.toTier}`,
      strategyId: event.strategyId,
      payload: { fromTier: event.fromTier, toTier: event.toTier, observedAt: event.observedAt.toISOString() },
      result: { celebrated: true },
      caller: "founder-psychology:recordMilestone",
      governor: "INFRASTRUCTURE",
      status: "OK",
      startedAt: event.observedAt,
      completedAt: new Date(),
    },
  }).catch(() => undefined);
}
