/**
 * Local validation — reproduces canonSync.syncUpgraders against a real DB and
 * reads back the SAME gauges the cockpit shows (getStrategyAdvertisCompletion
 * + per-pillar readiness). Proves the prod result (100 % everywhere) before
 * deploy. Run: DATABASE_URL=... npx tsx scripts/validate-canon-gauges.ts
 */
import { db } from "@/lib/db";
import {
  UPGRADERS_CANON_PILLARS,
  UPGRADERS_STRATEGY_NAME,
  UPGRADERS_BUSINESS_CONTEXT,
} from "@/server/services/canon/upgraders-canon";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { scoreObject } from "@/server/services/advertis-scorer";
import { getStrategyAdvertisCompletion, getStrategyReadiness } from "@/server/governance/pillar-readiness";
import { computePillarS } from "@/server/services/rtis-protocols/strategy";
import { PILLAR_STORAGE_KEYS } from "@/domain";

type PK = Parameters<typeof writePillarAndScore>[0]["pillarKey"];

async function main() {
  // ── reproduce sync: resolve operator + FK-safe owner ──
  const operator = await db.operator.findUnique({ where: { slug: "upgraders" } });
  if (!operator) throw new Error("operator 'upgraders' absent — seed first");

  // FK fix path: no session → upsert NEFER → real User id.
  const nefer = await db.user.upsert({
    where: { email: "nefer@upgraders.io" },
    update: { role: "ADMIN", operatorId: operator.id },
    create: { name: "NEFER", email: "nefer@upgraders.io", role: "ADMIN", operatorId: operator.id },
    select: { id: true },
  });

  let strategy = await db.strategy.findFirst({ where: { name: UPGRADERS_STRATEGY_NAME } });
  if (!strategy) {
    let client = await db.client.findFirst({ where: { operatorId: operator.id, name: "UPgraders" } });
    client ??= await db.client.create({
      data: { name: "UPgraders", sector: UPGRADERS_BUSINESS_CONTEXT.sector, country: UPGRADERS_BUSINESS_CONTEXT.country, operatorId: operator.id },
    });
    strategy = await db.strategy.create({
      data: {
        name: UPGRADERS_STRATEGY_NAME, status: "ACTIVE", clientId: client.id,
        userId: nefer.id, operatorId: operator.id, businessContext: UPGRADERS_BUSINESS_CONTEXT,
      },
    });
    console.log(`[sync] strategy CREATED (FK ownerId=${nefer.id})`);
  } else {
    console.log(`[sync] strategy exists (${strategy.id})`);
  }

  // ── write 8 canon pillars through the gateway (REPLACE_FULL) ──
  for (const p of UPGRADERS_CANON_PILLARS) {
    const res = await writePillarAndScore({
      strategyId: strategy.id,
      pillarKey: p.key as PK,
      operation: { type: "REPLACE_FULL", content: p.content as Record<string, unknown> },
      author: { system: "OPERATOR", reason: "validate-canon-gauges" },
      options: { targetStatus: "VALIDATED" },
    });
    console.log(`  ${p.key.toUpperCase()} write ok=${res.success} warnings=${res.warnings.length}${res.error ? " ERR=" + res.error : ""}`);
  }

  // ── recompute S + score (mirror sync 2-bis / 3) ──
  const sp = await db.pillar.findMany({ where: { strategyId: strategy.id, key: { in: [...PILLAR_STORAGE_KEYS] } } });
  const pm: Record<string, Record<string, unknown> | null> = {};
  for (const r of sp) pm[r.key] = (r.content ?? null) as Record<string, unknown> | null;
  const sContent = (pm.s ?? {}) as Record<string, unknown>;
  sContent.computed = computePillarS(pm, { roadmap: Array.isArray(sContent.roadmap) ? (sContent.roadmap as unknown[]) : undefined });
  await db.pillar.update({ where: { strategyId_key: { strategyId: strategy.id, key: "s" } }, data: { content: sContent as object } });

  const vector = await scoreObject("strategy", strategy.id);

  // ── READ BACK THE DOUBLE GAUGE per pillar (exact pillar.assess source) ──
  const { assessPillar } = await import("@/server/services/pillar-maturity/assessor");
  const { getContracts } = await import("@/server/services/pillar-maturity/contracts-loader");
  const contracts = getContracts();

  const satisfiesLoose = (content: Record<string, unknown>, path: string): boolean => {
    const parts = path.split(".");
    let cur: unknown = content;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") return false;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur != null && cur !== "" && !(Array.isArray(cur) && cur.length === 0);
  };

  const dbPillars = await db.pillar.findMany({ where: { strategyId: strategy.id, key: { in: [...PILLAR_STORAGE_KEYS] } } });
  const contentByKey: Record<string, Record<string, unknown>> = {};
  for (const r of dbPillars) contentByKey[r.key] = (r.content ?? {}) as Record<string, unknown>;

  console.log("\n══════ DOUBLE JAUGE par pilier (source pillar.assess) ══════");
  let allFull = true;
  for (const sk of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
    const content = contentByKey[sk] ?? {};
    const contract = contracts[sk];
    const assessment = assessPillar(sk, content, contract);
    const completePct = assessment.completionPct;
    const enrichedReqs = contract?.stages.ENRICHED ?? [];
    const enrichedSat = enrichedReqs.filter((r) => satisfiesLoose(content, r.path)).length;
    const enrichedPct = enrichedReqs.length > 0 ? Math.round((enrichedSat / enrichedReqs.length) * 100) : 100;
    const full = enrichedPct >= 100 && completePct >= 100;
    if (!full) allFull = false;
    const missing = completePct >= 100 ? "" : `  ✗ COMPLETE manquants: ${assessment.missing.slice(0, 10).join(", ")}`;
    const missingEnr = enrichedPct >= 100 ? "" : `  ✗ ENRICHED manquants: ${enrichedReqs.filter((r) => !satisfiesLoose(content, r.path)).map((r) => r.path).slice(0, 10).join(", ")}`;
    console.log(`  ${sk.toUpperCase()}: Suffisant ${enrichedPct}% | Complet ${completePct}% ${full ? "✓" : "✗"}${missing}${missingEnr}`);
  }

  const completion = await getStrategyAdvertisCompletion(strategy.id);
  console.log("────────────────────────────────────────────────");
  console.log(`  ADVE : ${completion.advePct}%  ·  ADVERTIS (8) : ${completion.advertisPct}%  ·  Composite : ${vector.composite}/200`);
  const roadmapRoutes = (sContent.computed as { roadmapRoutes?: unknown[] }).roadmapRoutes ?? [];
  console.log(`  Sélecteur S (roadmapRoutes) : ${roadmapRoutes.length} trajectoires`);
  console.log("════════════════════════════════════════════════");
  console.log(allFull ? "RESULT: ✅ CHAQUE DOUBLE JAUGE À 100 %" : "RESULT: ❌ DES JAUGES < 100 % (voir manquants ci-dessus)");

  await db.$disconnect();
  process.exit(allFull ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
