/**
 * Backfill des collecteurs de signaux marché (rationalisation 2026-07-16,
 * audit Seshat) : `registerCollectionDaemon` n'avait qu'UN caller — la
 * mutation tRPC manuelle — donc une marque nouvellement créée ne collectait
 * AUCUN signal marché tant qu'un opérateur n'y pensait pas. Ce backfill
 * idempotent (appelé par le cron external-feeds) enregistre un daemon DAILY
 * pour chaque stratégie active avec un pays qui n'en a pas encore. La
 * mutation manuelle reste la voie de réglage fin (fréquence, stop).
 *
 * Module feuille (importe signal-collector ET weak-signal-analyzer — les
 * garder séparés évite le cycle signal-collector ↔ weak-signal-analyzer).
 *
 * Gating : appelé seulement quand un provider texte est disponible (le caller
 * vérifie `isTextLLMAvailable`) — on n'enfile pas des jobs LLM condamnés.
 */

import { db } from "@/lib/db";
import { registerCollectionDaemon } from "./signal-collector";
import { buildSearchContext } from "./weak-signal-analyzer";

export async function ensureSignalDaemonsForActiveStrategies(
  opts?: { max?: number },
): Promise<{ registered: number; existing: number; skipped: number }> {
  const strategies = await db.strategy.findMany({
    where: { countryCode: { not: null }, status: { not: "ARCHIVED" } },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: opts?.max ?? 50,
  });
  let registered = 0;
  let existing = 0;
  let skipped = 0;
  for (const s of strategies) {
    const has = await db.process.findFirst({
      where: {
        strategyId: s.id,
        type: "DAEMON",
        status: { in: ["RUNNING", "PAUSED"] },
        name: { startsWith: "market-collector-" },
      },
      select: { id: true },
    });
    if (has) {
      existing++;
      continue;
    }
    try {
      const ctx = await buildSearchContext(s.id);
      if (!ctx.sector) {
        skipped++;
        continue;
      }
      await registerCollectionDaemon({
        strategyId: s.id,
        sector: ctx.sector,
        market: ctx.market,
        countryCode: ctx.countryCode,
        countryName: ctx.countryName,
        primaryLanguage: ctx.primaryLanguage,
        purchasingPowerIndex: ctx.purchasingPowerIndex,
        keywords: ctx.keywords,
        competitors: ctx.competitors,
        frequency: "DAILY",
      });
      registered++;
    } catch {
      skipped++;
    }
  }
  return { registered, existing, skipped };
}
