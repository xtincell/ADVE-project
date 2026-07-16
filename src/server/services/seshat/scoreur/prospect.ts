/**
 * ADR-0154 — Prospect Scoring : placer une marque externe sur le leaderboard.
 *
 * Voie produit gouvernée (remplace les harnais dev `run-moulinette` /
 * `onboard-external-brand`). Pour UNE marque : shell Client+Strategy (ADR-0098) →
 * re-scan empreinte publique (footprint → `FollowerSnapshot` → arènes A/V,
 * ADR-0153) → `scoreBrand`. 100 % déterministe, zéro LLM. Idempotent.
 *
 * Le scoreur lit `FollowerSnapshot` (pas le pilier E) : on appelle donc
 * `enrichPublicFootprint` directement avec les déclarations de l'opérateur
 * (site/réseaux), best-effort — Apify défère sans clé, l'arène A reste alors
 * absente (RD large), jamais fabriquée (P22-2).
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { MarketScale } from "@/domain/market-scale";
import { classifyCanonicalSector } from "@/domain/sector-taxonomy";
import { scoreBrand, resolveLeagueForStrategy } from "./index";

export interface ProspectInput {
  operatorId: string;
  ownerUserId: string;
  name: string;
  sectorRaw?: string | null;
  countryCode?: string | null;
  marketScale?: MarketScale | null;
  websiteUrl?: string | null;
  socialLinksRaw?: string | null;
}

/**
 * Assure Client + Strategy shell sous l'opérateur (idempotent par nom). Secteur
 * canonicalisé (ADR-0152), échelle déclarée (ADR-0126, jamais devinée).
 */
export async function ensureProspectShell(input: ProspectInput): Promise<{ clientId: string; strategyId: string }> {
  const sector = input.sectorRaw ? classifyCanonicalSector(input.sectorRaw).code : null;
  const countryCode = input.countryCode?.trim().slice(0, 2).toUpperCase() || null;

  let client = await db.client.findFirst({
    where: { operatorId: input.operatorId, name: input.name },
    select: { id: true },
  });
  if (!client) {
    client = await db.client.create({
      data: { name: input.name, operatorId: input.operatorId, sector },
      select: { id: true },
    });
  } else if (sector) {
    await db.client.update({ where: { id: client.id }, data: { sector } });
  }

  let strategy = await db.strategy.findFirst({
    where: { clientId: client.id },
    select: { id: true },
  });
  if (!strategy) {
    strategy = await db.strategy.create({
      data: {
        name: input.name,
        userId: input.ownerUserId,
        operatorId: input.operatorId,
        clientId: client.id,
        status: "ACTIVE",
        countryCode,
        ...(input.marketScale ? { marketScale: input.marketScale } : {}),
        businessContext: { origin: "PROSPECT_SCORING", sector } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  } else {
    // Complète l'échelle/pays déclarés si encore vides (ADR-0126 : jamais écraser).
    const cur = await db.strategy.findUnique({ where: { id: strategy.id }, select: { marketScale: true, countryCode: true } });
    const patch: Prisma.StrategyUpdateInput = {};
    if (!cur?.marketScale && input.marketScale) patch.marketScale = input.marketScale;
    if (!cur?.countryCode && countryCode) patch.countryCode = countryCode;
    if (Object.keys(patch).length) await db.strategy.update({ where: { id: strategy.id }, data: patch });
  }

  return { clientId: client.id, strategyId: strategy.id };
}

export interface ScoreProspectResult {
  strategyId: string;
  footprintStatus: "OK" | "DEFERRED" | "NO_SIGNAL";
  verdict: Awaited<ReturnType<typeof scoreBrand>>["verdict"];
  epreuveCount: number;
  league: Awaited<ReturnType<typeof resolveLeagueForStrategy>>;
}

/** Onboarde (idempotent) → collecte l'empreinte → score → verdict + ligue. */
export async function scoreProspect(input: ProspectInput): Promise<ScoreProspectResult> {
  const { strategyId } = await ensureProspectShell(input);

  // Empreinte publique → FollowerSnapshot (arènes A/V). Best-effort : ne casse
  // jamais le score. Apify défère sans clé → footprintStatus DEFERRED honnête.
  let footprintStatus: ScoreProspectResult["footprintStatus"] = "NO_SIGNAL";
  try {
    const { enrichPublicFootprint } = await import("@/server/services/quick-intake/public-enrichment");
    const enriched = await enrichPublicFootprint({
      companyName: input.name,
      country: input.countryCode ?? null,
      sector: input.sectorRaw ?? null,
      websiteUrl: input.websiteUrl ?? null,
      socialLinksRaw: input.socialLinksRaw ?? null,
      strategyId,
      budgetMs: 30_000,
    });
    footprintStatus = enriched.enrichment.apify === "DEFERRED" ? "DEFERRED" : "OK";

    // Les faits coûteux du scan entrent dans la base de marques Seshat
    // (audit 2026-07-16 `prospect-scan-facts-lost` : presse, domaine, MX/SPF,
    // maps, perf étaient collectés puis JETÉS — re-payables, et le prospect
    // mesuré n'entrait jamais au répertoire). Best-effort, jamais bloquant.
    try {
      const { buildFootprintFacts } = await import("@/server/services/quick-intake/footprint-facts");
      const { computeFootprintScore } = await import("@/server/services/quick-intake/footprint-score");
      const { recordFootprintObservation } = await import("@/server/services/seshat/brand-registry");
      const score = computeFootprintScore(enriched);
      await recordFootprintObservation({
        name: input.name,
        websiteUrl: input.websiteUrl ?? null,
        countryCode: input.countryCode ?? null,
        sectorSlug: input.sectorRaw ?? null,
        total: score.total,
        measuredWeight: score.measuredWeight,
        dimensions: score.dimensions.map((d) => ({
          key: d.key, label: d.label, details: d.details, measured: d.measured, score: d.score, weight: d.weight,
        })),
        followerCounts: enriched.followerCounts,
        facts: buildFootprintFacts(enriched),
        source: "PROSPECT_SCORING",
      });
    } catch (err) {
      console.warn("[scoreur] observation d'empreinte non enregistrée:", err instanceof Error ? err.message : err);
    }
  } catch {
    footprintStatus = "DEFERRED";
  }

  const scored = await scoreBrand(strategyId, { persist: true });
  const league = await resolveLeagueForStrategy(strategyId);
  return { strategyId, footprintStatus, verdict: scored.verdict, epreuveCount: scored.epreuveCount, league };
}
