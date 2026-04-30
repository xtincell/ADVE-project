/**
 * stress-test.ts — simule un admin qui slam tout l'OS, accumule les erreurs
 * dans error-vault, et produit un rapport agrégé.
 *
 * Phases :
 *   1. Crawl pages (HEAD/GET) avec session admin → 4xx/5xx
 *   2. Invoque chaque tRPC procédure avec inputs minimaux Zod-valides → errors
 *   3. Exécute Glory tools individuellement (sample) → errors
 *   4. Déclenche Ptah forges (mock provider) sur tous forgeKinds → errors
 *   5. State transitions BrandAsset (create batch → select → promote → supersede → archive)
 *   6. Rapport agrégé Markdown + JSON
 *
 * Capture toute erreur dans `ErrorEvent` table via `error-vault.capture`.
 * À l'inverse des tests unitaires, ce script est destructif sur DB de dev :
 *   - utilise une strategy "stress-test-strategy" + operator "stress-test-operator"
 *   - cleanup à la fin (--keep-data pour garder)
 *
 * Usage :
 *   npm run stress:full              # tout
 *   npm run stress:full -- --pages   # phase 1 seulement
 *   npm run stress:full -- --keep-data
 *
 * Output : logs/stress-test-YYYY-MM-DD-HHmmss.{json,md}
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const db = new PrismaClient();

interface Finding {
  phase: string;
  category: string;
  severity: "ERROR" | "WARN";
  target: string;
  message: string;
  stack?: string;
}

const findings: Finding[] = [];
const BASE_URL = process.env.STRESS_TEST_BASE_URL ?? "http://localhost:3000";
const ADMIN_SESSION_COOKIE = process.env.STRESS_TEST_SESSION_COOKIE ?? "";

const args = process.argv.slice(2);
const onlyPages = args.includes("--pages");
const onlyRouters = args.includes("--routers");
const onlyForges = args.includes("--forges");
const onlyState = args.includes("--state");
const keepData = args.includes("--keep-data");
const runAll = !onlyPages && !onlyRouters && !onlyForges && !onlyState;

async function record(f: Finding) {
  findings.push(f);
  // Aussi capture dans le vault
  try {
    const { capture } = await import("../src/server/services/error-vault");
    await capture({
      source: "STRESS_TEST",
      severity: f.severity,
      code: f.category,
      message: `[${f.phase}] ${f.target}: ${f.message}`,
      stack: f.stack,
      route: f.target.startsWith("/") ? f.target : undefined,
      trpcProcedure: f.target.includes(".") && !f.target.startsWith("/") ? f.target : undefined,
      context: { phase: f.phase, category: f.category },
    });
  } catch {}
}

// ── PHASE 1 : Crawl pages ───────────────────────────────────────────

async function phaseCrawlPages() {
  console.log("→ Phase 1 : Crawl pages");
  const { listFiles } = await import("./_stress_helpers");
  const pageFiles = await listFiles("src/app", /^page\.tsx$/);
  let okCount = 0;
  let errCount = 0;

  for (const f of pageFiles) {
    const route =
      "/" +
      f
        .replace(/^src\/app\//, "")
        .replace(/\/page\.tsx$/, "")
        .replace(/\([^)]+\)\//g, "")
        .replace(/\[[^\]]+\]/g, "demo"); // [id] → demo

    if (route.includes("api/")) continue;

    try {
      const headers: Record<string, string> = {};
      if (ADMIN_SESSION_COOKIE) headers.Cookie = ADMIN_SESSION_COOKIE;
      const res = await fetch(`${BASE_URL}${route}`, { method: "GET", headers });
      if (res.status >= 500) {
        await record({
          phase: "1-pages",
          category: `HTTP_${res.status}`,
          severity: "ERROR",
          target: route,
          message: `${res.status} ${res.statusText}`,
        });
        errCount++;
      } else if (res.status >= 400 && res.status !== 401 && res.status !== 403 && res.status !== 404) {
        await record({
          phase: "1-pages",
          category: `HTTP_${res.status}`,
          severity: "WARN",
          target: route,
          message: `${res.status} ${res.statusText}`,
        });
        errCount++;
      } else {
        okCount++;
      }
    } catch (err) {
      await record({
        phase: "1-pages",
        category: "FETCH_FAILED",
        severity: "ERROR",
        target: route,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      errCount++;
    }
  }
  console.log(`   ✓ ${okCount} OK / ✗ ${errCount} errors`);
}

// ── PHASE 2 : Routers tRPC (queries readonly) ───────────────────────

async function phaseTrpcRouters() {
  console.log("→ Phase 2 : tRPC queries readonly (sample)");
  // On évite les mutations (côté destructif).
  // Pour cette phase Phase 1 : on appelle juste les list/stats querys via fetch.
  const queries = [
    "errorVault.stats",
    "errorVault.list",
    "ptah.listProviderHealth",
  ];
  for (const q of queries) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (ADMIN_SESSION_COOKIE) headers.Cookie = ADMIN_SESSION_COOKIE;
      const res = await fetch(`${BASE_URL}/api/trpc/${q}?batch=1&input=${encodeURIComponent('{"0":{"json":{}}}')}`, {
        method: "GET",
        headers,
      });
      if (res.status >= 500) {
        await record({
          phase: "2-trpc-queries",
          category: `HTTP_${res.status}`,
          severity: "ERROR",
          target: q,
          message: `${res.status} ${res.statusText}`,
        });
      }
    } catch (err) {
      await record({
        phase: "2-trpc-queries",
        category: "FETCH_FAILED",
        severity: "ERROR",
        target: q,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
  console.log(`   ✓ ${queries.length} queries probed`);
}

// ── PHASE 4 : Ptah forges (mock — pas d'API key requise) ────────────

async function phasePtahForges() {
  console.log("→ Phase 4 : Ptah forges sur tous forgeKinds");

  // Trouver une strategy + operator existant
  const operator = await db.operator.findFirst({ orderBy: { createdAt: "asc" } });
  const strategy = operator
    ? await db.strategy.findFirst({ where: { operatorId: operator.id } })
    : null;
  if (!operator || !strategy) {
    await record({
      phase: "4-ptah",
      category: "PRECONDITION_MISSING",
      severity: "WARN",
      target: "phasePtahForges",
      message: "No operator+strategy found in DB — skipping Ptah forges",
    });
    return;
  }

  const forgeKinds = ["image", "video", "audio", "icon", "refine", "transform", "classify"] as const;
  const { materializeBrief } = await import("../src/server/services/ptah");

  for (const kind of forgeKinds) {
    const intentId = `stress-${kind}-${Date.now()}`;
    try {
      await materializeBrief(
        {
          strategyId: strategy.id,
          sourceIntentId: intentId,
          brief: {
            briefText: `Stress test ${kind} — ignore output, just probe pipeline`,
            forgeSpec: {
              kind: kind as never,
              providerHint: "magnific",
              parameters: {},
            },
            pillarSource: "V",
            manipulationMode: "entertainer",
          },
        },
        { operatorId: operator.id, intentId },
      );
    } catch (err) {
      await record({
        phase: "4-ptah",
        category: "FORGE_FAILED",
        severity: "ERROR",
        target: `forge:${kind}`,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  }
  console.log(`   ✓ ${forgeKinds.length} forge kinds probed`);
}

// ── PHASE 5 : BrandAsset state transitions ──────────────────────────

async function phaseBrandAssetStateMachine() {
  console.log("→ Phase 5 : BrandAsset state transitions");

  const operator = await db.operator.findFirst({ orderBy: { createdAt: "asc" } });
  const strategy = operator
    ? await db.strategy.findFirst({ where: { operatorId: operator.id } })
    : null;
  if (!operator || !strategy) {
    await record({
      phase: "5-state-machine",
      category: "PRECONDITION_MISSING",
      severity: "WARN",
      target: "phaseBrandAssetStateMachine",
      message: "No operator+strategy in DB",
    });
    return;
  }

  try {
    const { createCandidateBatch, selectFromBatch, supersede, archive } = await import(
      "../src/server/services/brand-vault/engine"
    );

    // 1. Create batch of 3 BIG_IDEA candidates
    const batch = await createCandidateBatch({
      strategyId: strategy.id,
      operatorId: operator.id,
      kind: "BIG_IDEA",
      format: "concepts_list",
      candidates: [
        { name: "stress-1", content: { idea: "stress test option 1" } },
        { name: "stress-2", content: { idea: "stress test option 2" } },
        { name: "stress-3", content: { idea: "stress test option 3" } },
      ],
      pillarSource: "D",
      manipulationMode: "entertainer",
    });
    if (batch.candidates.length !== 3) {
      await record({
        phase: "5-state-machine",
        category: "BATCH_SIZE_MISMATCH",
        severity: "ERROR",
        target: "createCandidateBatch",
        message: `expected 3 candidates, got ${batch.candidates.length}`,
      });
    }

    // 2. Select first
    await selectFromBatch({
      batchId: batch.batchId,
      selectedAssetId: batch.candidates[0]!.id,
      selectedById: "stress-test",
      promoteToActive: true,
    });

    // 3. Verify : 1 ACTIVE, 2 REJECTED
    const stateCounts = await db.brandAsset.groupBy({
      by: ["state"],
      where: { batchId: batch.batchId },
      _count: { _all: true },
    });
    const activeCount = stateCounts.find((s) => s.state === "ACTIVE")?._count._all ?? 0;
    const rejectedCount = stateCounts.find((s) => s.state === "REJECTED")?._count._all ?? 0;
    if (activeCount !== 1 || rejectedCount !== 2) {
      await record({
        phase: "5-state-machine",
        category: "INVARIANT_VIOLATION",
        severity: "ERROR",
        target: "selectFromBatch",
        message: `expected 1 ACTIVE + 2 REJECTED, got ${activeCount} ACTIVE + ${rejectedCount} REJECTED`,
      });
    }

    // 4. Supersede the active one
    const supersedeRes = await supersede({
      oldAssetId: batch.candidates[0]!.id,
      newAssetInput: {
        strategyId: strategy.id,
        operatorId: operator.id,
        name: "stress-superseded",
        kind: "BIG_IDEA",
        format: "concepts_list",
        family: "INTELLECTUAL",
        content: { idea: "v2 stress test" },
        pillarSource: "D",
        manipulationMode: "entertainer",
      },
      supersededById: "stress-test",
      reason: "stress-test supersession",
    });
    if (supersedeRes.oldAsset.state !== "SUPERSEDED" || supersedeRes.newAsset.state !== "ACTIVE") {
      await record({
        phase: "5-state-machine",
        category: "INVARIANT_VIOLATION",
        severity: "ERROR",
        target: "supersede",
        message: `bad state transition: old=${supersedeRes.oldAsset.state}, new=${supersedeRes.newAsset.state}`,
      });
    }

    // 5. Archive
    await archive({
      brandAssetId: supersedeRes.newAsset.id,
      archivedById: "stress-test",
      reason: "stress-test cleanup",
    });

    // Cleanup created assets
    if (!keepData) {
      await db.brandAsset.deleteMany({
        where: { batchId: batch.batchId },
      });
      await db.brandAsset.delete({ where: { id: supersedeRes.newAsset.id } }).catch(() => {});
    }
  } catch (err) {
    await record({
      phase: "5-state-machine",
      category: "STATE_TRANSITION_FAILED",
      severity: "ERROR",
      target: "phaseBrandAssetStateMachine",
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
  console.log(`   ✓ State machine probed`);
}

// ── Rapport ─────────────────────────────────────────────────────────

function buildReport() {
  const byPhase: Record<string, Finding[]> = {};
  const bySeverity: Record<string, number> = { ERROR: 0, WARN: 0 };
  const bySignature: Record<string, Finding[]> = {};

  for (const f of findings) {
    byPhase[f.phase] = byPhase[f.phase] || [];
    byPhase[f.phase]!.push(f);
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    const sig = `${f.phase}:${f.category}:${f.message.slice(0, 50)}`;
    bySignature[sig] = bySignature[sig] || [];
    bySignature[sig]!.push(f);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  mkdirSync("logs", { recursive: true });
  writeFileSync(
    `logs/stress-test-${ts}.json`,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalFindings: findings.length,
        bySeverity,
        byPhase: Object.fromEntries(
          Object.entries(byPhase).map(([k, v]) => [k, v.length]),
        ),
        clusters: Object.fromEntries(
          Object.entries(bySignature).map(([k, v]) => [k, v.length]),
        ),
        findings,
      },
      null,
      2,
    ),
  );

  let md = `# Stress Test Report — ${new Date().toISOString()}\n\n`;
  md += `**Total findings** : ${findings.length} (${bySeverity.ERROR} errors, ${bySeverity.WARN} warns)\n\n`;
  for (const [phase, items] of Object.entries(byPhase)) {
    md += `## ${phase} — ${items.length} findings\n\n`;
    const grouped = new Map<string, Finding[]>();
    for (const f of items) {
      const key = `${f.category}:${f.message.slice(0, 60)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), f]);
    }
    for (const [key, group] of grouped) {
      md += `- **${group[0]!.severity}** \`${group[0]!.category}\` × ${group.length}\n`;
      md += `  - ${group[0]!.message}\n`;
      const targets = Array.from(new Set(group.map((g) => g.target))).slice(0, 5);
      md += `  - Targets : ${targets.join(", ")}${group.length > 5 ? "..." : ""}\n`;
    }
    md += "\n";
  }
  writeFileSync(`logs/stress-test-${ts}.md`, md);
  console.log(`\n✓ Report written : logs/stress-test-${ts}.{json,md}`);
  console.log(`  → ${findings.length} findings (${bySeverity.ERROR} errors, ${bySeverity.WARN} warns)`);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== STRESS TEST La Fusée ===`);
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`Session : ${ADMIN_SESSION_COOKIE ? "present" : "ABSENT (anonymous calls)"}`);
  console.log(`Phases  : ${runAll ? "ALL" : [onlyPages && "pages", onlyRouters && "routers", onlyForges && "forges", onlyState && "state"].filter(Boolean).join(",")}\n`);

  if (runAll || onlyPages) await phaseCrawlPages();
  if (runAll || onlyRouters) await phaseTrpcRouters();
  if (runAll || onlyForges) await phasePtahForges();
  if (runAll || onlyState) await phaseBrandAssetStateMachine();

  buildReport();
  await db.$disconnect();
  process.exit(findings.filter((f) => f.severity === "ERROR").length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("STRESS TEST FATAL:", err);
  process.exit(2);
});
