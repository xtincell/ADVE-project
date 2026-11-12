import { z } from "zod";
import { db } from "@/lib/db";
import { watchlistSchema } from "@/domain/creative-intelligence";
import type { CreativeSourceInput } from "@/domain/creative-sources";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { assertActiveMarket } from ".";
import { collectCreativeSource } from "./source-collection";

export const watchAutomationSchema = z.object({ strategyId: z.string().min(1), enabled: z.boolean() });
export async function setCreativeWatchAutomation(input: z.infer<typeof watchAutomationSchema>) {
  const strategy = await db.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { countryCode: true } });
  if (!strategy.countryCode) throw new Error("Le pays de la marque est requis.");
  await assertActiveMarket(db, strategy.countryCode);
  await db.$executeRaw`UPDATE "Strategy" SET "businessContext" = jsonb_set(COALESCE("businessContext", '{}'::jsonb), '{creativeWatchAutomation}', ${JSON.stringify(input.enabled)}::jsonb), "updatedAt" = NOW() WHERE "id" = ${input.strategyId}`;
  return { enabled: input.enabled };
}
export async function refreshCreativeWatchlist(strategyId: string, operatorId: string | null) {
  // Shared by manual and scheduled refreshes. A crashed process releases the lease.
  return db.$transaction(async tx => {
    const [lease] = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${`creative-watch:${strategyId}`})) AS acquired`;
    if (!lease?.acquired) return { state: "ALREADY_RUNNING" as const };
    return collectWatchlist(strategyId, operatorId);
  }, { timeout: 115000, maxWait: 5000 });
}
async function collectWatchlist(strategyId: string, operatorId: string | null) {
  const strategy = await db.strategy.findUniqueOrThrow({ where: { id: strategyId }, select: { countryCode: true, businessContext: true } });
  const context = strategy.businessContext as Record<string, unknown> | null;
  const parsed = watchlistSchema.safeParse(context?.creativeWatchlist);
  if (!parsed.success || !strategy.countryCode || typeof context?.sector !== "string" || !context.sector.trim()) return { state: "DEGRADED" as const, reason: "MISSING_PREREQUISITE" as const };
  await assertActiveMarket(db, strategy.countryCode);
  const supportedRows = parsed.data.flatMap(w => w.accounts.flatMap<Pick<CreativeSourceInput, "provider" | "account">>(a => {
    if (a.collection) return [a.collection];
    if (a.platform === "YOUTUBE" && /^UC[\w-]{22}$/.test(a.accountId)) return [{ provider: "YOUTUBE" as const, account: a.accountId }];
    if (a.platform === "OTHER" && new URL(a.url).hostname === "bsky.app" && a.accountId.startsWith("did:")) return [{ provider: "BLUESKY" as const, account: a.accountId }];
    return [];
  }));
  const supported = [...new Map(supportedRows.map(a => [JSON.stringify([a.provider, a.account]), a])).values()];
  if (!supported.length) return { state: "DEGRADED" as const, reason: "MISSING_PREREQUISITE" as const };
  // Rotate by attempts, including deferred/failed reads. Missing keys cannot starve public sources.
  const attempts = await db.intentEmission.findMany({ where: { strategyId, intentKind: "SESHAT_REFRESH_CREATIVE_WATCHLIST", completedAt: { not: null } }, orderBy: { emittedAt: "desc" }, select: { result: true, emittedAt: true }, take: 200 });
  const attemptedAt = new Map<string, number>();
  for (const emission of attempts) {
    const result = emission.result as { results?: Array<{ accountId?: string }> } | null;
    for (const row of result?.results ?? []) if (row.accountId && !attemptedAt.has(row.accountId)) attemptedAt.set(row.accountId, emission.emittedAt.getTime());
  }
  const latest = [...supported].sort((a, b) => (attemptedAt.get(a.account) ?? 0) - (attemptedAt.get(b.account) ?? 0));
  const results = [];
  for (const account of latest.slice(0, 2)) {
    try {
      const result = await collectCreativeSource({ strategyId, provider: account.provider, account: account.account, sector: context.sector, countryCode: strategy.countryCode, limit: 20, youtubeFormat: "VIDEO_UNCLASSIFIED" }, operatorId);
      results.push({ provider: account.provider, accountId: account.account, result });
    } catch { results.push({ provider: account.provider, accountId: account.account, result: { state: "DEGRADED" as const, reason: "VENDOR_OUTAGE" as const } }); }
  }
  return { status: "BATCH_COMPLETED" as const, observedAt: new Date().toISOString(), results, totalSupportedAccounts: supported.length, accountsDeferredByRunLimit: Math.max(0, supported.length - results.length), unsupportedAccounts: parsed.data.reduce((n, w) => n + w.accounts.length, 0) - supportedRows.length, duplicateAccounts: supportedRows.length - supported.length, limitation: "Deux comptes par passage, rotation sur les dernières tentatives. Fournisseur et identifiant de collecte explicites ; détection automatique limitée à YouTube UC… et Bluesky did:…. Chaque source conserve son état réel d'accès." };
}

/** Reuses argos-hunt's authenticated cron, in explicit mode=corpus, independently of the LLM. */
export async function runCreativeWatchCron() {
  const markets = await db.country.findMany({ where: { status: "ACTIVE" }, select: { code: true } });
  const strategies = await db.strategy.findMany({ where: { archivedAt: null, businessContext: { path: ["creativeWatchAutomation"], equals: true }, countryCode: { in: markets.map(m => m.code) } }, select: { id: true, userId: true, operatorId: true, client: { select: { operatorId: true } } }, take: 500, orderBy: { id: "asc" } });
  const recent = await db.intentEmission.findMany({ where: { intentKind: "SESHAT_REFRESH_CREATIVE_WATCHLIST", strategyId: { in: strategies.map(s => s.id) } }, orderBy: { emittedAt: "desc" }, distinct: ["strategyId"], select: { strategyId: true, emittedAt: true } });
  strategies.sort((a, b) => (recent.find(r => r.strategyId === a.id)?.emittedAt.getTime() ?? 0) - (recent.find(r => r.strategyId === b.id)?.emittedAt.getTime() ?? 0));
  const receipts = [];
  for (const strategy of strategies.slice(0, 2)) {
    const intentId = await openEmission({ kind: "SESHAT_REFRESH_CREATIVE_WATCHLIST", strategyId: strategy.id, payload: { strategyId: strategy.id }, caller: "cron:argos-corpus" });
    try {
      const operatorId = strategy.operatorId ?? strategy.client?.operatorId ?? (await getOperatorContext(strategy.userId)).operatorId;
      const result = await refreshCreativeWatchlist(strategy.id, operatorId);
      await closeEmission({ intentId, status: "OK", result, costUsd: 0 });
      receipts.push({ strategyId: strategy.id, intentId, result });
    } catch {
      const result = { state: "DEGRADED" as const, reason: "VENDOR_OUTAGE" as const };
      await closeEmission({ intentId, status: "FAILED", result, costUsd: 0 });
      receipts.push({ strategyId: strategy.id, intentId, result });
    }
  }
  return { enabledBrandsInWindow: strategies.length, brandsDeferredByRunLimit: Math.max(0, strategies.length - receipts.length), receipts, limitation: "Fenêtre maximale : 500 marques ; deux marques et deux comptes par marque à chaque passage. Cadence de six heures dans les schedulers existants, sur activation explicite." };
}
