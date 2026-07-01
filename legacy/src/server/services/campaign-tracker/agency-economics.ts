/**
 * Campaign Tracker — Économie agence (Phase 19, ADR-0052 Cluster F).
 *
 * Layer 4 — orchestrate Layer 2/3.
 *
 * Sous-clusters Vague 3 (2) :
 *   - economics.activityMargins   — agrège marges anonymisées cross-clients (k≥5)
 *   - economics.resourceSaturation — forecast capacity heatmap agency-wide
 *
 * Cluster F est strict multi-tenant : agrégation **k-anonymity (k≥5 tenants par bucket)**
 * + stockage data lake séparé `agency-economics-aggregates` jamais joiné aux strategy IDs.
 * Désanonymisation impossible par construction.
 *
 * Cf. docs/governance/adr/0052-campaign-module-canonical-trajectory-instrument.md
 * + ADR enfant `0058-anonymization.md` (à créer avant promotion MVP → PRODUCTION)
 */

import { db } from "@/lib/db";
import {
  type AgencyMarginsResult,
  type ActivityTypeMargin,
  type ResourceSaturationResult,
  type ResourceSaturationForecast,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster economics.activityMargins (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

const K_ANONYMITY_THRESHOLD = 5; // k≥5 tenants par bucket — non-désanonymisable

interface RecomputeActivityMarginsInput {
  readonly strategyId: string; // strategyId du caller — ACL gate
  readonly operatorId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly market?: string; // ISO-2 country code optionnel
}

/**
 * MVP : agrège CampaignAction.coutUnitaire × volume par category (ATL/BTL/TTL)
 * cross-tenants. Si bucket size < K_ANONYMITY_THRESHOLD → degradationCode +
 * meanMargin/variance retournés à 0 (non-révélés).
 *
 * PRODUCTION : data lake séparé `agency-economics-aggregates` (cf. ADR enfant).
 */
export async function recomputeAgencyActivityMargins(
  input: RecomputeActivityMarginsInput,
): Promise<AgencyMarginsResult> {
  const degradationCodes: string[] = [];

  // MVP : on agrège directement sur la table CampaignAction. PRODUCTION utilisera
  // un data lake séparé pour garantir non-désanonymisation par construction.
  // ACL : seul un opérateur Console UPgraders devrait invoquer cette capability ;
  // la gate finale est dans le router (`requireRole("UPGRADERS_LEAD")`). Vague 3
  // ship en MVP avec gate manifest seul (capability tier "B" + missionContribution
  // CHAIN_VIA:thot — Console-side).

  const actions = await db.campaignAction.findMany({
    where: {
      createdAt: {
        gte: input.periodStart,
        lte: input.periodEnd,
      },
    },
    select: {
      category: true,
      actionType: true,
      coutUnitaire: true,
      campaign: {
        select: {
          strategy: {
            select: {
              countryCode: true,
              tenantId: true,
            },
          },
        },
      },
    },
  });

  // Group by category × subType × market.
  type BucketKey = `${string}|${string}|${string}`;
  const buckets = new Map<
    BucketKey,
    {
      category: "ATL" | "BTL" | "TTL";
      subType: string | null;
      market: string | null;
      tenantIds: Set<string>;
      margins: number[];
    }
  >();

  for (const a of actions) {
    if (input.market && a.campaign.strategy?.countryCode !== input.market) continue;
    const tenantId = a.campaign.strategy?.tenantId ?? "_UNKNOWN_";
    const market = a.campaign.strategy?.countryCode ?? null;
    const key: BucketKey = `${a.category}|${a.actionType}|${market ?? ""}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        category: a.category as "ATL" | "BTL" | "TTL",
        subType: a.actionType,
        market,
        tenantIds: new Set(),
        margins: [],
      };
      buckets.set(key, bucket);
    }
    bucket.tenantIds.add(tenantId);
    if (typeof a.coutUnitaire === "number") {
      bucket.margins.push(a.coutUnitaire);
    }
  }

  const margins: ActivityTypeMargin[] = [];
  let kAnonymityViolations = 0;

  for (const bucket of buckets.values()) {
    const tenantBucketSize = bucket.tenantIds.size;
    const meetsK = tenantBucketSize >= K_ANONYMITY_THRESHOLD;
    const codes: string[] = [];
    if (!meetsK) {
      codes.push("K_ANONYMITY_VIOLATION_HIDDEN");
      kAnonymityViolations += 1;
    }

    const meanMargin = meetsK && bucket.margins.length > 0
      ? bucket.margins.reduce((a, b) => a + b, 0) / bucket.margins.length
      : 0;
    const variance = meetsK && bucket.margins.length > 1
      ? bucket.margins.reduce((acc, m) => acc + (m - meanMargin) ** 2, 0) / bucket.margins.length
      : 0;

    margins.push({
      category: bucket.category,
      subType: bucket.subType,
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      market: bucket.market,
      meanMargin,
      variance,
      tenantBucketSize,
      degradationCodes: codes,
    });
  }

  if (kAnonymityViolations > 0) {
    degradationCodes.push(`K_ANONYMITY_VIOLATIONS_${kAnonymityViolations}`);
  }

  return {
    margins,
    degradationCodes,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sous-cluster economics.resourceSaturation (PARTIAL/MVP)
// ─────────────────────────────────────────────────────────────────────────

interface EvaluateResourceSaturationInput {
  readonly strategyId: string; // ACL gate
  readonly operatorId: string;
  readonly weeksAhead?: number; // default 8
}

const SATURATION_BLOCKING_THRESHOLD = 0.85;

/**
 * MVP : agrège CampaignTeamMember × dates futures, projetté semaine par semaine
 * sur weeksAhead semaines. Capacité disponible = placeholder (constante 40h/sem).
 *
 * PRODUCTION : intégrera Imhotep `talent-availability-engine` (existant ou à câbler).
 */
export async function evaluateResourceSaturation(
  input: EvaluateResourceSaturationInput,
): Promise<ResourceSaturationResult> {
  const weeksAhead = input.weeksAhead ?? 8;
  const degradationCodes: string[] = [];

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + weeksAhead * 7);

  // MVP : on agrège tous les CampaignTeamMember sans filtre tenant (Console UPgraders only).
  let teamMembers: Array<{
    id: string;
    role: string;
    campaign: {
      startDate: Date | null;
      endDate: Date | null;
    };
  }> = [];
  try {
    teamMembers = await db.campaignTeamMember.findMany({
      where: {
        campaign: {
          OR: [
            { startDate: { gte: now, lte: horizon } },
            { endDate: { gte: now, lte: horizon } },
            { AND: [{ startDate: { lte: now } }, { endDate: { gte: horizon } }] },
          ],
        },
      },
      select: {
        id: true,
        role: true,
        campaign: { select: { startDate: true, endDate: true } },
      },
    });
  } catch {
    degradationCodes.push("CAMPAIGN_TEAM_MEMBER_QUERY_FAILED");
  }

  // MVP : 1 CampaignTeamMember = 40h/sem prévues. Capacité réelle = placeholder.
  // Pas de scope tenant — agency-wide vue.
  const HOURS_PLANNED_PER_MEMBER_PER_WEEK = 40;
  const HOURS_AVAILABLE_PER_ROLE_PER_WEEK = 200; // placeholder MVP — PRODUCTION lira Imhotep talent-availability

  const forecast: ResourceSaturationForecast[] = [];
  for (let w = 0; w < weeksAhead; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Group by role.
    const byRole = new Map<string, number>();
    for (const tm of teamMembers) {
      const cs = tm.campaign.startDate;
      const ce = tm.campaign.endDate;
      if (!cs || !ce) continue;
      // Member implicated this week if campaign overlap.
      if (cs <= weekEnd && ce >= weekStart) {
        const role = String(tm.role);
        byRole.set(role, (byRole.get(role) ?? 0) + HOURS_PLANNED_PER_MEMBER_PER_WEEK);
      }
    }

    let totalHoursPlanned = 0;
    let totalHoursAvailable = 0;
    const bottlenecks: Array<{
      role: string;
      hoursOver: number;
      missionIds: readonly string[];
    }> = [];
    for (const [role, hours] of byRole) {
      totalHoursPlanned += hours;
      totalHoursAvailable += HOURS_AVAILABLE_PER_ROLE_PER_WEEK;
      if (hours > HOURS_AVAILABLE_PER_ROLE_PER_WEEK) {
        bottlenecks.push({
          role,
          hoursOver: hours - HOURS_AVAILABLE_PER_ROLE_PER_WEEK,
          missionIds: [],
        });
      }
    }

    const saturationRatio = totalHoursAvailable > 0 ? totalHoursPlanned / totalHoursAvailable : 0;

    forecast.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      saturationRatio,
      bottlenecks,
      blocking: saturationRatio > SATURATION_BLOCKING_THRESHOLD,
    });
  }

  degradationCodes.push("MVP_PLACEHOLDER_CAPACITY_LIMITS");

  return {
    forecast,
    degradationCodes,
  };
}
