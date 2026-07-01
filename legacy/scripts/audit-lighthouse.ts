/**
 * scripts/audit-lighthouse.ts — Mobile Lighthouse audit (Tier 3.7).
 *
 * Spawns a headless Chromium via `lighthouse` CLI (must be installed:
 * `npm install -g lighthouse` or as a devDep), runs the mobile preset
 * against a list of canonical pages, and emits a Markdown report at
 * `reports/lighthouse-<date>.md` with per-page scores.
 *
 * Run with: `npx tsx scripts/audit-lighthouse.ts`
 *
 * The threshold is ≥0.85 for performance + accessibility on mobile per
 * the residual debt. Pages below the threshold are flagged.
 */

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";

const exec = promisify(execFile);

const PAGES: ReadonlyArray<{ slug: string; path: string }> = [
  { slug: "home", path: "/" },
  { slug: "intake", path: "/intake" },
  { slug: "console", path: "/console" },
  { slug: "agency", path: "/agency" },
  { slug: "creator", path: "/creator" },
  { slug: "cockpit", path: "/cockpit" },
  { slug: "changelog", path: "/changelog" },
  { slug: "status", path: "/status" },
];

const BASE_URL = process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000";
const THRESHOLD = 0.85;
const REPORT_DIR = "reports";

interface CategoryScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

interface LighthouseResult {
  slug: string;
  path: string;
  scores: CategoryScore | null;
  error: string | null;
}

async function runOnce(path: string): Promise<CategoryScore | null> {
  const url = `${BASE_URL}${path}`;
  try {
    const { stdout } = await exec(
      "npx",
      [
        "lighthouse",
        url,
        "--quiet",
        "--output=json",
        "--output-path=stdout",
        "--chrome-flags=--headless=new --disable-gpu --no-sandbox",
        "--preset=mobile",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--throttling.cpuSlowdownMultiplier=4",
      ],
      { maxBuffer: 50 * 1024 * 1024 },
    );
    const json = JSON.parse(stdout) as {
      categories: Record<string, { score: number | null }>;
    };
    return {
      performance: json.categories.performance?.score ?? 0,
      accessibility: json.categories.accessibility?.score ?? 0,
      bestPractices: json.categories["best-practices"]?.score ?? 0,
      seo: json.categories.seo?.score ?? 0,
    };
  } catch (err) {
    console.warn(`[audit-lighthouse] ${path} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function main() {
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const results: LighthouseResult[] = [];

  for (const page of PAGES) {
    process.stdout.write(`Auditing ${page.path} ... `);
    const scores = await runOnce(page.path);
    if (scores) {
      console.log(
        `perf=${scores.performance.toFixed(2)} a11y=${scores.accessibility.toFixed(2)} bp=${scores.bestPractices.toFixed(2)} seo=${scores.seo.toFixed(2)}`,
      );
      results.push({ slug: page.slug, path: page.path, scores, error: null });
    } else {
      console.log("FAILED");
      results.push({ slug: page.slug, path: page.path, scores: null, error: "lighthouse run failed" });
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const reportPath = `${REPORT_DIR}/lighthouse-${date}.md`;
  const md = renderReport(results, date);
  writeFileSync(reportPath, md, "utf8");
  console.log(`\n✓ Report written to ${reportPath}`);

  const failures = results.filter(
    (r) => r.scores && (r.scores.performance < THRESHOLD || r.scores.accessibility < THRESHOLD),
  );
  if (failures.length > 0) {
    console.warn(`\n⚠ ${failures.length} page(s) below ${THRESHOLD} threshold:`);
    for (const f of failures) {
      console.warn(`  - ${f.path}`);
    }
    process.exit(1);
  }
}

function renderReport(results: LighthouseResult[], date: string): string {
  const lines: string[] = [];
  lines.push(`# Lighthouse mobile audit — ${date}`);
  lines.push("");
  lines.push(`Threshold: ≥${THRESHOLD} on performance + accessibility.`);
  lines.push("");
  lines.push("| Page | Perf | A11y | Best practices | SEO | Status |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of results) {
    if (!r.scores) {
      lines.push(`| ${r.path} | — | — | — | — | ❌ ${r.error ?? "?"} |`);
      continue;
    }
    const ok =
      r.scores.performance >= THRESHOLD && r.scores.accessibility >= THRESHOLD;
    lines.push(
      `| ${r.path} | ${r.scores.performance.toFixed(2)} | ${r.scores.accessibility.toFixed(2)} | ${r.scores.bestPractices.toFixed(2)} | ${r.scores.seo.toFixed(2)} | ${ok ? "✅" : "⚠"} |`,
    );
  }
  lines.push("");
  lines.push("## Tuning checklist (if a page falls below threshold)");
  lines.push("");
  lines.push("- [ ] Defer non-critical JS via `next/dynamic` + `{ ssr: false }`.");
  lines.push("- [ ] Audit images: `next/image` with `priority` for hero only.");
  lines.push("- [ ] Inline critical CSS, lazy-load fonts (`display: swap` already on).");
  lines.push("- [ ] Move tRPC providers below SSR shell where possible.");
  lines.push("- [ ] Check Lighthouse a11y issues: alt text, color contrast, ARIA labels.");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
