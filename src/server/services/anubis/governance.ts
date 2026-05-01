/**
 * Anubis governance — gates pre-flight per ADR-0011 §3 (téléologie KPI
 * cost_per_superfan_recruited) + audience targeting valid + manipulation
 * coherence (réutilise la logique Ptah pour cohérence narrative).
 */

import { db } from "@/lib/db";
import {
  ManipulationCoherenceError,
  checkManipulationCoherence,
} from "@/server/services/ptah/governance";
import type { ManipulationMode } from "@/server/services/ptah/types";
import type { LaunchAdCampaignInput } from "./types";

export class AnubisAudienceError extends Error {
  readonly reason = "ANUBIS_AUDIENCE_TARGETING_VALID";
  constructor(message: string) {
    super(message);
    this.name = "AnubisAudienceError";
  }
}

export class AnubisCostPerSuperfanError extends Error {
  readonly reason = "ANUBIS_COST_PER_SUPERFAN_OVER_BENCHMARK";
  constructor(
    public readonly projected: number,
    public readonly benchmark: number,
    public readonly ratio: number,
  ) {
    super(
      `Projected cost_per_superfan_recruited (${projected.toFixed(2)}) is ${ratio.toFixed(2)}× above sectoral benchmark (${benchmark.toFixed(2)}). Thot veto under ADR-0011 §3.`,
    );
    this.name = "AnubisCostPerSuperfanError";
  }
}

export class AnubisOAuthMissingError extends Error {
  readonly reason = "ANUBIS_OAUTH_MISSING";
  constructor(public readonly provider: string) {
    super(
      `No active IntegrationConnection for provider=${provider}. Connect via /console/integrations before launching campaigns.`,
    );
    this.name = "AnubisOAuthMissingError";
  }
}

const COST_PER_SUPERFAN_VETO_RATIO = 2.0;

/**
 * Téléologie ADR §3 : refuse une LaunchAdCampaign si le projected
 * cost_per_superfan_recruited > 2× benchmark sectoriel.
 *
 * benchmarkCostPerSuperfan optionnel — si absent, on tente une lecture
 * sur MarketBenchmark (metric=COST_PER_SUPERFAN, par sector). Si rien
 * trouvé, on tolère (warning seulement, pas de veto).
 */
export async function assertCostPerSuperfanFits(
  input: LaunchAdCampaignInput,
): Promise<{ projected: number; benchmark: number | null; ratio: number | null }> {
  const projected = input.expectedSuperfans > 0
    ? input.budget / input.expectedSuperfans
    : Number.POSITIVE_INFINITY;

  let benchmark = input.benchmarkCostPerSuperfan ?? null;
  if (benchmark == null) {
    // Try to derive from MarketBenchmark
    const strategy = await db.strategy.findUnique({
      where: { id: input.strategyId },
      select: { businessContext: true, countryCode: true },
    });
    if (strategy?.countryCode) {
      const ctx = (strategy.businessContext ?? {}) as { sector?: string };
      const sector = ctx.sector;
      if (sector) {
        const row = await db.marketBenchmark.findFirst({
          where: {
            country: strategy.countryCode,
            sector,
            metric: "COST_PER_SUPERFAN",
          },
          select: { p50: true },
        });
        benchmark = row?.p50 ?? null;
      }
    }
  }

  if (benchmark == null || benchmark <= 0) {
    return { projected, benchmark: null, ratio: null };
  }
  const ratio = projected / benchmark;
  if (ratio > COST_PER_SUPERFAN_VETO_RATIO) {
    throw new AnubisCostPerSuperfanError(projected, benchmark, ratio);
  }
  return { projected, benchmark, ratio };
}

/**
 * Audience targeting valid — countries non-vides, age range cohérent.
 */
export function assertAudienceValid(input: LaunchAdCampaignInput): void {
  if (input.audienceTargeting.countries.length === 0) {
    throw new AnubisAudienceError("audienceTargeting.countries cannot be empty");
  }
  const age = input.audienceTargeting.ageRange;
  if (age && (age[0] < 13 || age[1] > 99 || age[0] >= age[1])) {
    throw new AnubisAudienceError(`audienceTargeting.ageRange [${age[0]}, ${age[1]}] invalid`);
  }
}

/**
 * Vérifie qu'une OAuth IntegrationConnection ACTIVE existe pour le
 * provider ad network ciblé. Sinon refuse la campagne (ADR §10.3).
 */
export async function assertOAuthScopeActive(
  operatorId: string,
  platform: LaunchAdCampaignInput["platform"],
): Promise<void> {
  const provider = platform === "META_ADS" ? "meta"
    : platform === "GOOGLE_ADS" ? "google"
    : platform === "TIKTOK_ADS" ? "tiktok"
    : "x";
  const connection = await db.integrationConnection.findFirst({
    where: {
      operatorId,
      provider,
      // expired tokens excluded: expiresAt > now
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    select: { id: true, scopes: true },
  });
  if (!connection) {
    throw new AnubisOAuthMissingError(provider);
  }
  // Verify scopes include ads_management or adwords (provider-specific)
  const requiredScopes: Record<string, string[]> = {
    meta:   ["ads_management"],
    google: ["https://www.googleapis.com/auth/adwords"],
    tiktok: ["ad.write"],
    x:      ["ads.read"],
  };
  const required = requiredScopes[provider] ?? [];
  const missing = required.filter((s) => !connection.scopes.includes(s));
  if (missing.length > 0) {
    throw new AnubisOAuthMissingError(`${provider} (missing scopes: ${missing.join(", ")})`);
  }
}

/**
 * Manipulation coherence : reuse Ptah's gate pattern.
 * Wrapper local pour matcher la signature Anubis (mode + strategyId).
 */
export async function assertManipulationFitsMix(
  strategyId: string,
  manipulationMode: ManipulationMode,
  override = false,
): Promise<void> {
  await checkManipulationCoherence(
    strategyId,
    {
      // Provide a minimal-shape ForgeBrief just to satisfy the gate
      briefText: `[anubis] mode=${manipulationMode}`,
      forgeSpec: { kind: "image", parameters: {} },
      pillarSource: "I",
      manipulationMode,
    } as never,
    override,
  );
}

export { ManipulationCoherenceError };
