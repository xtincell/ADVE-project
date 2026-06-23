/**
 * site-prober/index.ts — orchestrator + CLI.
 *
 * A black-box production tester. It maps the site, hammers it with concurrent
 * workers (simulating many simultaneous visitors), and lights up every leak it
 * can find — broken branchements, auth gaps, server errors, info disclosure,
 * missing security headers, console/JS crashes, broken assets.
 *
 * READ-ONLY by design: only GET/HEAD are issued. No POST, no webhook/cron/
 * payment triggering, no DB writes. Safe to run against production you own.
 *
 * Usage:
 *   npx tsx scripts/site-prober                     # full run vs default base
 *   PROBE_BASE_URL=https://x.app npx tsx scripts/site-prober
 *   npx tsx scripts/site-prober --concurrency 20 --max-pages 400
 *   npx tsx scripts/site-prober --no-browser        # HTTP-only (no Chromium)
 *   npx tsx scripts/site-prober --burst 3           # add load-simulation waves
 *   npx tsx scripts/site-prober --quick             # seeds only, no crawl
 */

import {
  DEFAULT_CONFIG,
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  LEGACY_REDIRECTS,
  API_PROBES,
  SENSITIVE_FILES,
  BROWSER_SEED_PAGES,
  classify,
  type ProberConfig,
} from "./config";
import { probeUrl, getRequestCount, extractLinks } from "./http";
import {
  runHttpAnalyzers,
  analyzeApi,
  analyzeSensitiveFile,
} from "./analyzers";
import { runBrowserPass, analyzeBrowser } from "./browser";
import {
  dedupe,
  countBySeverity,
  writeReport,
  printSummary,
} from "./report";
import type { Finding, HttpResult, ProbeReport } from "./types";

// ─── CLI parsing ────────────────────────────────────────────────────────────

function parseArgs(): ProberConfig & { quick: boolean; skipSideEffects: boolean } {
  const a = process.argv.slice(2);
  const get = (flag: string, dflt: number) => {
    const i = a.indexOf(flag);
    return i >= 0 && a[i + 1] ? Number(a[i + 1]) : dflt;
  };
  const cfg: ProberConfig & { quick: boolean; skipSideEffects: boolean } = {
    ...DEFAULT_CONFIG,
    concurrency: get("--concurrency", DEFAULT_CONFIG.concurrency),
    maxPages: get("--max-pages", DEFAULT_CONFIG.maxPages),
    maxDepth: get("--max-depth", DEFAULT_CONFIG.maxDepth),
    burstWaves: get("--burst", DEFAULT_CONFIG.burstWaves),
    runBrowser: !a.includes("--no-browser"),
    quick: a.includes("--quick"),
    skipSideEffects: a.includes("--skip-sideeffects"),
  };
  const baseIdx = a.indexOf("--base");
  if (baseIdx >= 0 && a[baseIdx + 1]) cfg.baseUrl = a[baseIdx + 1]!;
  cfg.baseUrl = cfg.baseUrl.replace(/\/+$/, "");
  return cfg;
}

// ─── Concurrency pool (the "plusieurs personnes") ────────────────────────────

async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  onTick?: () => void,
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];
  const run = async () => {
    for (;;) {
      const item = queue.shift();
      if (item === undefined) break;
      results.push(await worker(item));
      onTick?.();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, run));
  return results;
}

// ─── Crawl (BFS link discovery) ──────────────────────────────────────────────

async function crawl(
  cfg: ProberConfig,
  origin: string,
  seeds: string[],
): Promise<{ results: HttpResult[]; assets: Map<string, string>; external: Set<string> }> {
  const visited = new Set<string>();
  const results: HttpResult[] = [];
  const assets = new Map<string, string>(); // assetUrl -> first page it appeared on
  const external = new Set<string>();
  let frontier = seeds.filter((u) => {
    const norm = u.replace(/#.*$/, "");
    if (visited.has(norm)) return false;
    visited.add(norm);
    return true;
  });

  for (let depth = 0; depth <= cfg.maxDepth && frontier.length; depth++) {
    if (visited.size > cfg.maxPages) break;
    const batch = frontier.slice(0, Math.max(0, cfg.maxPages - results.length));
    process.stdout.write(`\n  crawl depth ${depth}: ${batch.length} urls `);
    const pageResults = await pool(
      batch,
      cfg.concurrency,
      (url) => probeUrl(url, classify(new URL(url).pathname), cfg),
      () => process.stdout.write("·"),
    );
    results.push(...pageResults);

    const next = new Set<string>();
    for (const r of pageResults) {
      if (!r.ok || !/text\/html/.test(r.contentType) || !r.bodySample) continue;
      const { links, assets: pageAssets, external: ext } = extractLinks(r.bodySample, r.finalUrl, origin);
      for (const a of pageAssets) if (!assets.has(a)) assets.set(a, r.url);
      for (const e of ext) external.add(e);
      for (const l of links) {
        const norm = l.replace(/#.*$/, "");
        if (visited.has(norm) || visited.size >= cfg.maxPages) continue;
        // stay on same origin & skip obvious file downloads
        if (new URL(norm).origin !== origin) continue;
        visited.add(norm);
        next.add(norm);
      }
    }
    frontier = [...next];
  }
  return { results, assets, external };
}

// ─── Burst / load simulation ─────────────────────────────────────────────────

async function burst(cfg: ProberConfig, origin: string): Promise<Finding[]> {
  const targets = ["/", "/pricing", "/intake", "/login", "/LaGuilde", "/argos"].map((p) => origin + p);
  const findings: Finding[] = [];
  console.log(`\n  burst: ${cfg.burstWaves} vague(s) × ${cfg.burstConcurrency} requêtes simultanées sur ${targets.length} pages clés`);
  for (let wave = 0; wave < cfg.burstWaves; wave++) {
    const jobs = Array.from({ length: cfg.burstConcurrency }, (_, i) => targets[i % targets.length]!);
    const t0 = Date.now();
    const res = await pool(jobs, cfg.burstConcurrency, (u) => probeUrl(u, "public", { ...cfg, jitterMs: 0, maxRetries: 0 }));
    const errs = res.filter((r) => !r.ok || r.status >= 500);
    const slow = res.filter((r) => r.ok && r.timingMs > 8000);
    const avg = Math.round(res.reduce((s, r) => s + r.timingMs, 0) / res.length);
    console.log(`    vague ${wave + 1}: ${res.length} req en ${Date.now() - t0}ms · avg ${avg}ms · ${errs.length} erreurs · ${slow.length} lentes`);
    if (errs.length) findings.push({ id: `burst-error:wave${wave}`, severity: "HIGH", category: "load", title: `${errs.length} erreurs sous charge (vague ${wave + 1})`, target: `${cfg.burstConcurrency} req simultanées`, detail: `Sous ${cfg.burstConcurrency} requêtes concurrentes, ${errs.length} ont échoué/5xx. Possible saturation, rate-limit, ou cold-start serverless.`, evidence: errs.slice(0, 3).map((e) => `${e.url} → ${e.status || e.networkError}`).join(" | "), source: "http" });
    if (slow.length > res.length / 2) findings.push({ id: `burst-slow:wave${wave}`, severity: "MEDIUM", category: "load", title: `Latence dégradée sous charge (vague ${wave + 1})`, target: `${cfg.burstConcurrency} req simultanées`, detail: `${slow.length}/${res.length} requêtes > 8s sous charge concurrente.`, source: "http" });
  }
  return findings;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const cfg = parseArgs();
  const origin = new URL(cfg.baseUrl).origin;
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  console.log("🔎 site-prober — testeur black-box read-only");
  console.log(`   cible      : ${cfg.baseUrl}`);
  console.log(`   concurrence: ${cfg.concurrency}  · max-pages ${cfg.maxPages} · depth ${cfg.maxDepth} · browser ${cfg.runBrowser}`);

  const findings: Finding[] = [];
  const allHttp: HttpResult[] = [];

  // ── Phase 1: targeted seeds (public + protected + legacy + sensitive files) ──
  console.log("\n▸ Phase 1 — sondage ciblé (routes connues + branchements + fichiers sensibles)");
  const seedPaths = [
    ...new Set([
      ...PUBLIC_ROUTES,
      ...PROTECTED_ROUTES,
      ...Object.keys(LEGACY_REDIRECTS),
      ...SENSITIVE_FILES,
    ]),
  ];
  const seedUrls = seedPaths.map((p) => origin + p);
  const seedResults = await pool(seedUrls, cfg.concurrency, (u) => probeUrl(u, classify(new URL(u).pathname), cfg), () => process.stdout.write("·"));
  allHttp.push(...seedResults);
  for (const r of seedResults) {
    const path = new URL(r.url).pathname;
    if (SENSITIVE_FILES.includes(path)) findings.push(...analyzeSensitiveFile(r));
    else findings.push(...runHttpAnalyzers(r, cfg));
  }

  // ── Phase 2: API surface (anonymous, GET-only) ──
  console.log("\n▸ Phase 2 — surface API (GET anonyme, jamais de POST)");
  const apiToProbe = cfg.skipSideEffects ? API_PROBES.filter((p) => !p.sideEffecting) : API_PROBES;
  const skippedSE = API_PROBES.length - apiToProbe.length;
  if (skippedSE > 0) console.log(`  (--skip-sideeffects: ${skippedSE} endpoints à effet de bord ignorés)`);
  else console.log(`  ⚠️  ${API_PROBES.filter((p) => p.sideEffecting).length} endpoints à effet de bord seront appelés UNE fois (sans retry, hors burst). --skip-sideeffects pour s'abstenir.`);
  const apiResults = await pool(apiToProbe, cfg.concurrency, async (p) => {
    // never retry a side-effecting endpoint — one call only
    const r = await probeUrl(origin + p.path, "api", p.sideEffecting ? { ...cfg, maxRetries: 0 } : cfg);
    return { r, meta: p };
  }, () => process.stdout.write("·"));
  for (const { r, meta } of apiResults) {
    allHttp.push(r);
    findings.push(...analyzeApi(r, meta));
  }

  // ── Phase 3: crawl (discover the rest of the public surface) ──
  let crawledCount = 0;
  if (!cfg.quick) {
    console.log("\n▸ Phase 3 — crawl du graphe public (découverte des branchements)");
    const crawlSeeds = PUBLIC_ROUTES.map((p) => origin + p);
    const { results, assets, external } = await crawl(cfg, origin, crawlSeeds);
    crawledCount = results.length;
    // analyze crawl results not already covered by seeds
    const seen = new Set(allHttp.map((r) => r.url));
    for (const r of results) {
      if (!seen.has(r.url)) {
        allHttp.push(r);
        findings.push(...runHttpAnalyzers(r, cfg));
      }
    }
    // ── Phase 3b: asset liveness (broken images/scripts/styles) ──
    console.log(`\n▸ Phase 3b — vérif ${assets.size} assets same-origin référencés`);
    const assetList = [...assets.entries()].slice(0, 400);
    const assetResults = await pool(assetList, cfg.concurrency, async ([url, from]) => {
      const r = await probeUrl(url, "unknown", cfg, from);
      return r;
    }, () => process.stdout.write("·"));
    const OVERSIZED = 1_000_000; // 1 MB
    for (const r of assetResults) {
      if (r.ok && r.status >= 400) findings.push({ id: `broken-asset:${r.url}`, severity: r.status >= 500 ? "HIGH" : "MEDIUM", category: "broken-asset", title: `Asset ${r.status}`, target: r.url, detail: `Asset référencé mais renvoie ${r.status}`, source: "http", discoveredFrom: r.discoveredFrom });
      else if (!r.ok) findings.push({ id: `dead-asset:${r.url}`, severity: "MEDIUM", category: "broken-asset", title: "Asset injoignable", target: r.url, detail: r.networkError ?? "network error", source: "http", discoveredFrom: r.discoveredFrom });
      else if (r.bytes > OVERSIZED && /image|font|octet-stream/.test(r.contentType)) findings.push({ id: `oversized-asset:${r.url}`, severity: r.bytes > 3_000_000 ? "MEDIUM" : "LOW", category: "perf-asset", title: `Asset lourd (${(r.bytes / 1e6).toFixed(1)} Mo)`, target: r.url, detail: `${(r.bytes / 1e6).toFixed(1)} Mo servis — coûteux sur mobile/bande passante limitée (marché Afrique). Compresser/convertir en WebP/AVIF ou servir via next/image.`, source: "http", discoveredFrom: r.discoveredFrom });
    }
    console.log(`\n  (${external.size} liens externes ignorés — hors périmètre)`);
  }

  // ── Phase 4: burst / load ──
  if (cfg.burstWaves > 0) {
    console.log("\n▸ Phase 4 — simulation de charge (plusieurs visiteurs simultanés)");
    findings.push(...(await burst(cfg, origin)));
  }

  // ── Phase 5: real browser ──
  const browserResults = [];
  if (cfg.runBrowser) {
    console.log("\n▸ Phase 5 — navigateur réel (console/JS/hydration/assets) — plusieurs onglets en parallèle");
    // browse the high-value seeds + a sample of crawled HTML pages
    const htmlUrls = allHttp.filter((r) => r.ok && r.status === 200 && /text\/html/.test(r.contentType)).map((r) => r.finalUrl);
    const browseSet = [...new Set([...BROWSER_SEED_PAGES.map((p) => origin + p), ...htmlUrls])].slice(0, 40);
    const { results, skipped } = await runBrowserPass(browseSet, cfg, 4);
    browserResults.push(...results);
    if (skipped) {
      console.log(`  ⚠️  navigateur sauté : ${skipped}`);
      findings.push({ id: "browser-skipped", severity: "INFO", category: "tooling", title: "Passe navigateur ignorée", target: cfg.baseUrl, detail: skipped + " — relance avec Chromium installé pour la couche console/JS.", source: "browser" });
    }
    findings.push(...analyzeBrowser(results));
  }

  // ── Aggregate + write ──
  const deduped = dedupe(findings);
  const finishedAt = new Date().toISOString();
  const report: ProbeReport = {
    baseUrl: cfg.baseUrl,
    startedAt,
    finishedAt,
    durationMs: Date.now() - t0,
    config: { ...cfg },
    stats: {
      urlsProbed: new Set(allHttp.map((r) => r.url)).size,
      requestsSent: getRequestCount(),
      pagesCrawled: crawledCount,
      browserPages: browserResults.filter((b) => !b.skippedReason).length,
      findingsBySeverity: countBySeverity(deduped),
    },
    findings: deduped,
    siteMap: allHttp.map((r) => ({ url: r.url, status: r.status, expectation: r.expectation })),
    httpResults: allHttp,
    browserResults,
  };

  const { md, json } = writeReport(report);
  printSummary(report);
  console.log(`\n📄 Rapport Markdown : ${md}`);
  console.log(`📦 Données JSON     : ${json}\n`);

  // exit non-zero if anything critical/high — useful in CI
  const bad = report.stats.findingsBySeverity.CRITICAL + report.stats.findingsBySeverity.HIGH;
  process.exitCode = bad > 0 ? 2 : 0;
}

main().catch((e) => {
  console.error("site-prober a planté :", e);
  process.exitCode = 1;
});
