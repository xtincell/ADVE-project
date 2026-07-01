/**
 * Brand Resolver — Find or create Client + Strategy from brief data
 *
 * Fuzzy-matches on company/brand name to avoid duplicates.
 * Returns clientResolution metadata for the operator to review.
 */

import { db } from "@/lib/db";
import type { ParsedBrief, ClientResolution } from "./types";

// ── Fuzzy match helpers ─────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function fuzzyMatch(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  // Simple Levenshtein distance ratio
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(na, nb);
  const ratio = 1 - dist / maxLen;
  return ratio;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

// ── Resolve client ──────────────────────────────────────────────────────────

export async function resolveClient(briefClient: ParsedBrief["client"]): Promise<ClientResolution> {
  const clients = await db.client.findMany({
    where: { status: { not: "DELETED" } },
    select: { id: true, name: true, contactEmail: true },
  });

  // Try exact email match first
  if (briefClient.contactEmail) {
    const emailMatch = clients.find(
      (c) => c.contactEmail?.toLowerCase() === briefClient.contactEmail?.toLowerCase()
    );
    if (emailMatch) {
      const strategy = await findPrimaryStrategy(emailMatch.id);
      return {
        found: true,
        clientId: emailMatch.id,
        strategyId: strategy?.id,
        confidence: 1.0,
        matchedOn: "exact_email",
      };
    }
  }

  // Try name matching (company name or brand name)
  let bestMatch: { clientId: string; score: number; matchedOn: string; strategyId?: string } | null = null;

  for (const client of clients) {
    const companyScore = fuzzyMatch(client.name, briefClient.companyName);
    const brandScore = fuzzyMatch(client.name, briefClient.brandName);
    const score = Math.max(companyScore, brandScore);
    const matchedOn = companyScore >= brandScore ? "company_name" : "brand_name";

    if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
      const strategy = await findPrimaryStrategy(client.id);
      bestMatch = {
        clientId: client.id,
        score,
        matchedOn: score === 1.0 ? `exact_${matchedOn}` : `fuzzy_${matchedOn}`,
        strategyId: strategy?.id,
      };
    }
  }

  if (bestMatch) {
    return {
      found: true,
      clientId: bestMatch.clientId,
      strategyId: bestMatch.strategyId,
      confidence: bestMatch.score,
      matchedOn: bestMatch.matchedOn,
    };
  }

  return { found: false, confidence: 0 };
}

// ── Find primary strategy for a client ──────────────────────────────────────

async function findPrimaryStrategy(clientId: string) {
  return db.strategy.findFirst({
    where: { clientId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
}

// ── Create new client + strategy (Fast Track mode) ──────────────────────────

export async function createClientAndStrategy(
  brief: ParsedBrief,
  operatorId: string,
): Promise<{ clientId: string; strategyId: string }> {
  const client = await db.client.create({
    data: {
      name: brief.client.companyName,
      contactName: brief.client.brandName,
      contactEmail: brief.client.contactEmail ?? null,
      sector: brief.client.sector ?? null,
      country: brief.client.country ?? null,
      status: "ACTIVE",
      operator: { connect: { id: operatorId } },
    },
  });

  const strategy = await db.strategy.create({
    data: {
      name: `${brief.client.brandName} — Strategy`,
      description: brief.context.marketContext,
      businessContext: JSON.stringify({
        sector: brief.client.sector,
        country: brief.client.country,
        competitors: brief.context.competitors,
        ambition: brief.context.ambition,
      }),
      brandNature: "PRODUCT",
      status: "IN_PROGRESS",
      clientId: client.id,
      userId: operatorId,
      operatorId,
    },
  });

  return { clientId: client.id, strategyId: strategy.id };
}
