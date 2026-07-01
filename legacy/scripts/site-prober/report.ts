/**
 * site-prober/report.ts — aggregate findings into JSON + Markdown.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Finding, ProbeReport, Severity } from "./types";
import { SEVERITY_ORDER } from "./types";

const SEV_EMOJI: Record<Severity, string> = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🔵",
  INFO: "⚪",
};

/**
 * Collapse site-wide noise (missing security headers, x-powered-by) into one
 * finding per header instead of one per page — otherwise crawling 200+ routes
 * buries the real signal under hundreds of identical rows.
 */
export function aggregateNoisy(findings: Finding[]): Finding[] {
  const COLLAPSE = new Set(["security-header", "header-leak"]);
  const passthrough: Finding[] = [];
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    if (COLLAPSE.has(f.category)) {
      const key = `${f.category}::${f.title}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(f);
    } else {
      passthrough.push(f);
    }
  }
  const collapsed: Finding[] = [];
  for (const [key, items] of groups) {
    const first = items[0]!;
    const n = items.length;
    const sample = items
      .slice(0, 5)
      .map((x) => {
        try {
          return new URL(x.target).pathname;
        } catch {
          return x.target;
        }
      })
      .join(", ");
    collapsed.push({
      ...first,
      id: key,
      target: `site-wide (${n} page${n > 1 ? "s" : ""})`,
      detail: `${first.detail} — sur ${n} réponse${n > 1 ? "s" : ""} HTML. Ex : ${sample}${n > 5 ? " …" : ""}. À corriger en une fois (en-têtes globaux next.config.ts / vercel.json).`,
    });
  }
  return [...passthrough, ...collapsed];
}

export function dedupe(findings: Finding[]): Finding[] {
  const seen = new Map<string, Finding>();
  for (const f of findings) {
    const existing = seen.get(f.id);
    if (!existing || SEVERITY_ORDER[f.severity] < SEVERITY_ORDER[existing.severity]) {
      seen.set(f.id, f);
    }
  }
  return [...seen.values()].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.category.localeCompare(b.category) ||
      a.target.localeCompare(b.target),
  );
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const c: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of findings) c[f.severity]++;
  return c;
}

function table(rows: string[][], headers: string[]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map((c) => c.replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`).join("\n");
  return [head, sep, body].join("\n");
}

export function renderMarkdown(report: ProbeReport): string {
  const f = report.findings;
  const counts = report.stats.findingsBySeverity;
  const byCat = new Map<string, Finding[]>();
  for (const x of f) {
    if (!byCat.has(x.category)) byCat.set(x.category, []);
    byCat.get(x.category)!.push(x);
  }

  const lines: string[] = [];
  lines.push(`# 🔎 Rapport de sondage — ${report.baseUrl}`);
  lines.push("");
  lines.push(`> Bot testeur black-box, read-only (GET/HEAD). Lancé le ${report.startedAt}, durée ${(report.durationMs / 1000).toFixed(1)}s.`);
  lines.push("");
  lines.push("## Synthèse");
  lines.push("");
  lines.push(table(
    [
      ["🔴 CRITICAL", String(counts.CRITICAL)],
      ["🟠 HIGH", String(counts.HIGH)],
      ["🟡 MEDIUM", String(counts.MEDIUM)],
      ["🔵 LOW", String(counts.LOW)],
      ["⚪ INFO", String(counts.INFO)],
      ["**Total**", `**${f.length}**`],
    ],
    ["Sévérité", "Nombre"],
  ));
  lines.push("");
  lines.push(`- URLs sondées : **${report.stats.urlsProbed}**`);
  lines.push(`- Requêtes HTTP émises : **${report.stats.requestsSent}**`);
  lines.push(`- Pages crawlées (découvertes) : **${report.stats.pagesCrawled}**`);
  lines.push(`- Pages ouvertes en navigateur réel : **${report.stats.browserPages}**`);
  const authed = (report.config as { authenticated?: boolean }).authenticated;
  lines.push(`- Mode : **${authed ? "authentifié (crawl derrière le login)" : "anonyme (black-box)"}**`);
  lines.push("");

  // Top criticals/highs callout
  const urgent = f.filter((x) => x.severity === "CRITICAL" || x.severity === "HIGH");
  if (urgent.length) {
    lines.push("## ⚠️ À traiter en priorité");
    lines.push("");
    for (const x of urgent) {
      lines.push(`- ${SEV_EMOJI[x.severity]} **[${x.category}]** ${x.title} — \`${x.target}\``);
      lines.push(`  - ${x.detail}`);
      if (x.evidence) lines.push(`  - _evidence_: \`${x.evidence.slice(0, 240)}\``);
      if (x.discoveredFrom) lines.push(`  - _découvert depuis_: ${x.discoveredFrom}`);
    }
    lines.push("");
  }

  lines.push("## Détail par catégorie");
  lines.push("");
  const cats = [...byCat.keys()].sort(
    (a, b) =>
      Math.min(...byCat.get(a)!.map((x) => SEVERITY_ORDER[x.severity])) -
      Math.min(...byCat.get(b)!.map((x) => SEVERITY_ORDER[x.severity])),
  );
  for (const cat of cats) {
    const items = byCat.get(cat)!;
    lines.push(`### ${cat} (${items.length})`);
    lines.push("");
    lines.push(table(
      items.map((x) => [SEV_EMOJI[x.severity] + " " + x.severity, x.target, x.title + (x.detail ? " — " + x.detail : "")]),
      ["Sév.", "Cible", "Détail"],
    ));
    lines.push("");
  }

  // Site map
  lines.push("## 🗺️ Cartographie (URLs vues)");
  lines.push("");
  lines.push(table(
    report.siteMap
      .slice()
      .sort((a, b) => a.url.localeCompare(b.url))
      .map((s) => [String(s.status), s.expectation, s.url]),
    ["Status", "Classe", "URL"],
  ));
  lines.push("");
  lines.push("---");
  lines.push("_Généré par `scripts/site-prober`. Non destructif : aucune écriture, aucun POST, aucun déclenchement de webhook/cron/paiement._");
  return lines.join("\n");
}

export function writeReport(report: ProbeReport): { md: string; json: string } {
  mkdirSync(report.config.outputDir as string, { recursive: true });
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const base = join(report.config.outputDir as string, `site-probe-${stamp}`);
  const md = `${base}.md`;
  const json = `${base}.json`;
  writeFileSync(md, renderMarkdown(report), "utf8");
  writeFileSync(json, JSON.stringify(report, null, 2), "utf8");
  return { md, json };
}

export function printSummary(report: ProbeReport): void {
  const c = report.stats.findingsBySeverity;
  console.log("\n" + "═".repeat(64));
  console.log(`  Sondage terminé — ${report.baseUrl}`);
  console.log("═".repeat(64));
  console.log(`  🔴 ${c.CRITICAL}  🟠 ${c.HIGH}  🟡 ${c.MEDIUM}  🔵 ${c.LOW}  ⚪ ${c.INFO}   (total ${report.findings.length})`);
  console.log(`  ${report.stats.urlsProbed} URLs · ${report.stats.requestsSent} requêtes · ${report.stats.browserPages} pages navigateur · ${(report.durationMs / 1000).toFixed(1)}s`);
  const urgent = report.findings.filter((x) => x.severity === "CRITICAL" || x.severity === "HIGH").slice(0, 12);
  if (urgent.length) {
    console.log("─".repeat(64));
    for (const x of urgent) console.log(`  ${x.severity === "CRITICAL" ? "🔴" : "🟠"} [${x.category}] ${x.title} → ${x.target}`);
  }
  console.log("═".repeat(64));
}
