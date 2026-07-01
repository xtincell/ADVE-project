/**
 * harvest-static.ts — agrège tous les audits statiques en UN rapport NEFER-consumable.
 *
 * Différence avec stress-test.ts : zéro dépendance runtime (pas de dev server, pas de DB),
 * lance tous les audits statiques en série + lit leurs outputs JSON quand disponibles, et
 * produit un tableau de classes pour fix-by-class.
 *
 * Sortie :
 *   logs/harvest-static-YYYY-MM-DD-HHmmss.json
 *   logs/harvest-static-YYYY-MM-DD-HHmmss.md     ← consumable par NEFER
 *
 * Usage :
 *   npx tsx scripts/harvest-static.ts
 *   npx tsx scripts/harvest-static.ts --fast    # skip madge (long sur 1100+ fichiers)
 */

import { execSync, type ExecSyncOptions } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

interface Finding {
  source: string;            // "typecheck" | "lint" | "audit:governance" | "audit:cycles" | ...
  class: string;             // bug class (groupe pour fix-by-class)
  severity: "ERROR" | "WARN";
  target: string;            // file:line ou identifier
  message: string;
}

interface Classification {
  class: string;
  severity: "ERROR" | "WARN";
  count: number;
  sources: string[];
  sampleTargets: string[];   // 5 premiers pour orientation
  rootCauseHypothesis?: string;
  fixStrategy?: string;
}

const findings: Finding[] = [];
const FAST = process.argv.includes("--fast");

function run(cmd: string, opts: ExecSyncOptions = {}): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(cmd, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 50 * 1024 * 1024,
      ...opts,
    }) as string;
    return { stdout, exitCode: 0 };
  } catch (e) {
    const err = e as { stdout?: string | Buffer; stderr?: string | Buffer; status?: number };
    return {
      stdout: String(err.stdout ?? "") + String(err.stderr ?? ""),
      exitCode: err.status ?? 1,
    };
  }
}

// ── COLLECTORS ──────────────────────────────────────────────────────

function collectTypecheck() {
  console.log("→ typecheck");
  const { stdout, exitCode } = run("npx tsc --noEmit");
  if (exitCode === 0) {
    console.log("   ✓ 0 errors");
    return;
  }
  // Format: file.ts(line,col): error TSXXXX: message
  const re = /^(.+?\.tsx?)\((\d+),\d+\): error (TS\d+): (.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stdout)) !== null) {
    findings.push({
      source: "typecheck",
      class: `ts-${m[3]}`,
      severity: "ERROR",
      target: `${m[1]}:${m[2]}`,
      message: m[4]!,
    });
  }
  console.log(`   ✗ ${findings.filter((f) => f.source === "typecheck").length} errors`);
}

function collectLint() {
  console.log("→ lint:governance");
  // Bypass npm run (le glob single-quoted ne s'expand pas hors husky/bash POSIX).
  // On invoque eslint directement avec un glob qu'il parse lui-même.
  const { stdout } = run("npx eslint --config eslint.config.mjs src");
  // Format ESLint stylish: "  line:col  warning|error  message  rule-id"
  // En-tête fichier sur sa propre ligne (chemin absolu).
  let currentFile = "";
  const lines = stdout.split("\n");
  for (const line of lines) {
    const fileMatch = line.match(/^([A-Z]:\\.+\.tsx?)$/);
    if (fileMatch) {
      currentFile = fileMatch[1]!.replace(/^.*ADVE-project[\\/]/, "").replace(/\\/g, "/");
      continue;
    }
    const issueMatch = line.match(/^\s+(\d+):(\d+)\s+(warning|error)\s+(.+?)\s+([a-z][\w/-]+)$/);
    if (issueMatch && currentFile) {
      findings.push({
        source: "lint",
        class: `lint:${issueMatch[5]}`,
        severity: issueMatch[3] === "error" ? "ERROR" : "WARN",
        target: `${currentFile}:${issueMatch[1]}`,
        message: issueMatch[4]!.trim(),
      });
    }
  }
  const lintFindings = findings.filter((f) => f.source === "lint");
  const errs = lintFindings.filter((f) => f.severity === "ERROR").length;
  const warns = lintFindings.filter((f) => f.severity === "WARN").length;
  console.log(`   ${errs} errors, ${warns} warnings`);
}

function collectGovernance() {
  console.log("→ audit:governance");
  const { stdout } = run("npm run audit:governance --silent");
  // Format : "  src/...:LINE — message (whitelist: ...)"
  const re = /^\s+(.+\.tsx?):(\d+)\s+—\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stdout)) !== null) {
    const target = `${m[1]!.replace(/\\/g, "/")}:${m[2]}`;
    const msg = m[3]!.trim();
    let cls = "governance:other";
    if (msg.includes("router imports service")) cls = "governance:router-direct-service";
    else if (msg.includes("bypass")) cls = "governance:bypass-mestor";
    findings.push({
      source: "audit:governance",
      class: cls,
      severity: "WARN",
      target,
      message: msg.slice(0, 200),
    });
  }
  const c = findings.filter((f) => f.source === "audit:governance").length;
  console.log(`   ${c} warnings`);
}

function collectCycles() {
  if (FAST) {
    console.log("→ audit:cycles (SKIPPED --fast)");
    return;
  }
  console.log("→ audit:cycles (madge — long, ~15s)");
  const { stdout } = run("npm run audit:cycles --silent");
  const re = /^\d+\)\s+(.+?)\s+>\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stdout)) !== null) {
    findings.push({
      source: "audit:cycles",
      class: "cycle:import",
      severity: "ERROR",
      target: m[1]!.replace(/\\/g, "/"),
      message: `circular with ${m[2]!.replace(/\\/g, "/")}`,
    });
  }
  const c = findings.filter((f) => f.source === "audit:cycles").length;
  console.log(`   ${c} circular dependencies`);
}

function collectResidus() {
  console.log("→ audit:residus");
  const { stdout } = run("npx tsx scripts/audit-residus.ts");
  // Format Markdown : "### `pattern-name` — N occurrences" puis table avec "| File | Line |"
  // ATTENTION : le script résidus tronque sa table à 50 lignes par classe avec une
  // ligne "… and N more" — il faut additionner ces N pour le compte exact.
  const sectionRe = /###\s+`([^`]+)`\s+—\s+(\d+)\s+occurrences/g;
  let m: RegExpExecArray | null;
  const sections: { name: string; declaredCount: number; afterIdx: number }[] = [];
  while ((m = sectionRe.exec(stdout)) !== null) {
    sections.push({ name: m[1]!, declaredCount: Number(m[2]!), afterIdx: m.index + m[0].length });
  }
  for (let i = 0; i < sections.length; i++) {
    const start = sections[i]!.afterIdx;
    const end = i + 1 < sections.length ? sections[i + 1]!.afterIdx : stdout.length;
    const block = stdout.slice(start, end);
    const rowRe = /\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/g;
    let r: RegExpExecArray | null;
    let visibleRows = 0;
    while ((r = rowRe.exec(block)) !== null) {
      findings.push({
        source: "audit:residus",
        class: `residus:${sections[i]!.name}`,
        severity: sections[i]!.name === "writePillar-bare" || sections[i]!.name === "as-never-cast" ? "ERROR" : "WARN",
        target: `${r[1]!.replace(/\\/g, "/")}:${r[2]}`,
        message: sections[i]!.name,
      });
      visibleRows++;
    }
    // Si déclaré > visible, on ajoute un finding synthétique pour combler le delta
    // (on garde les target précis pour les 50 visibles, et un placeholder pour le reste).
    const hidden = sections[i]!.declaredCount - visibleRows;
    if (hidden > 0) {
      for (let k = 0; k < hidden; k++) {
        findings.push({
          source: "audit:residus",
          class: `residus:${sections[i]!.name}`,
          severity: sections[i]!.name === "writePillar-bare" || sections[i]!.name === "as-never-cast" ? "ERROR" : "WARN",
          target: `<truncated-${k + 1}>`,
          message: sections[i]!.name,
        });
      }
    }
  }
  const c = findings.filter((f) => f.source === "audit:residus").length;
  console.log(`   ${c} residual debt findings`);
}

// ── CLASSIFICATION ──────────────────────────────────────────────────

const ROOT_CAUSE_HYPOTHESES: Record<string, { rootCause: string; fix: string }> = {
  "ts-TS2307": {
    rootCause: "Module/types absent du node_modules (install stale ou dep manquante).",
    fix: "npm install + vérifier package.json. Si tiers, ajouter @types/...",
  },
  "ts-TS2820": {
    rootCause: "String literal qui ne match pas l'union type (souvent typo casse).",
    fix: "Corriger le literal (uppercase pour PillarKey, etc.).",
  },
  "lint:lafusee/no-adhoc-completion-math": {
    rootCause: "Calcul filled/total*100 ou comparaison raw 'VALIDATED'/'LOCKED' hors du module readiness.",
    fix: "Consommer pillar.readiness.byPillar.<key>.{completionPct,gates.<gate>} (centralisé).",
  },
  "lint:lafusee/no-hardcoded-pillar-enum": {
    rootCause: "Pillar enum literal hardcodé dans le code.",
    fix: "Import PILLAR_KEYS / ADVE_KEYS / RTIS_KEYS depuis @/domain.",
  },
  "governance:router-direct-service": {
    rootCause: "Phase 0 router migration incomplète — routers importent des services hors whitelist (Mestor/pillar-gateway/audit-trail/operator-isolation/neteru-shared).",
    fix: "Migrer mutation via mestor.emitIntent() + Intent kind dédié (cf. ADR-0004 / ADR-0052 Sprint 7).",
  },
  "cycle:import": {
    rootCause: "Import circulaire entre fichiers Artemis tools — registry.ts ↔ <vertical>-tools.ts (re-export bidirectionnel).",
    fix: "Découper en interface-only types + implémentation séparée OU index barrel pur (pas de re-export).",
  },
  "residus:writePillar-bare": {
    rootCause: "writePillar utilisé sans cache reconciliation (cf. v6.1.18).",
    fix: "Remplacer par writePillarAndScore (réconcilie cache + completionLevel).",
  },
  "residus:as-never": {
    rootCause: "Cast 'as never' qui cache une rupture de typage cross-module.",
    fix: "Typer correctement OU justifier avec un commentaire eslint-disable précis.",
  },
};

function classify(): Classification[] {
  const byClass = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byClass.has(f.class)) byClass.set(f.class, []);
    byClass.get(f.class)!.push(f);
  }
  const classes: Classification[] = [];
  for (const [cls, items] of byClass) {
    const sev = items.some((i) => i.severity === "ERROR") ? "ERROR" : "WARN";
    classes.push({
      class: cls,
      severity: sev,
      count: items.length,
      sources: Array.from(new Set(items.map((i) => i.source))),
      sampleTargets: Array.from(new Set(items.map((i) => i.target))).slice(0, 5),
      rootCauseHypothesis: ROOT_CAUSE_HYPOTHESES[cls]?.rootCause,
      fixStrategy: ROOT_CAUSE_HYPOTHESES[cls]?.fix,
    });
  }
  // Sort : ERRORS first, then by count desc
  classes.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "ERROR" ? -1 : 1;
    return b.count - a.count;
  });
  return classes;
}

// ── REPORT ──────────────────────────────────────────────────────────

function writeReport(classes: Classification[]) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  mkdirSync("logs", { recursive: true });

  const json = {
    timestamp: new Date().toISOString(),
    totalFindings: findings.length,
    totalClasses: classes.length,
    bySeverity: {
      ERROR: findings.filter((f) => f.severity === "ERROR").length,
      WARN: findings.filter((f) => f.severity === "WARN").length,
    },
    bySource: Object.fromEntries(
      [...new Set(findings.map((f) => f.source))].map((s) => [s, findings.filter((f) => f.source === s).length]),
    ),
    classes,
  };
  writeFileSync(`logs/harvest-static-${ts}.json`, JSON.stringify(json, null, 2));

  let md = `# Harvest Static — ${new Date().toISOString()}\n\n`;
  md += `**${findings.length} findings** dans **${classes.length} classes** (${json.bySeverity.ERROR} ERROR, ${json.bySeverity.WARN} WARN).\n\n`;
  md += `Par source :\n`;
  for (const [src, n] of Object.entries(json.bySource)) {
    md += `- \`${src}\` : ${n}\n`;
  }
  md += `\n---\n\n## Classes (fix-by-class)\n\n`;
  md += `| # | Class | Sev | Count | Root cause | Fix strategy |\n`;
  md += `|---|---|---|---|---|---|\n`;
  classes.forEach((c, i) => {
    const root = c.rootCauseHypothesis ?? "*(à analyser)*";
    const fix = c.fixStrategy ?? "*(à définir)*";
    md += `| ${i + 1} | \`${c.class}\` | ${c.severity} | ${c.count} | ${root} | ${fix} |\n`;
  });
  md += `\n---\n\n## Détails par classe\n\n`;
  for (const c of classes) {
    md += `### \`${c.class}\` — ${c.severity} × ${c.count}\n\n`;
    if (c.rootCauseHypothesis) md += `**Root cause** : ${c.rootCauseHypothesis}\n\n`;
    if (c.fixStrategy) md += `**Fix strategy** : ${c.fixStrategy}\n\n`;
    md += `**Sample targets** :\n`;
    for (const t of c.sampleTargets) md += `- \`${t}\`\n`;
    if (c.count > c.sampleTargets.length) md += `- *(... et ${c.count - c.sampleTargets.length} autres)*\n`;
    md += `\n`;
  }
  writeFileSync(`logs/harvest-static-${ts}.md`, md);
  console.log(`\n✓ Reports : logs/harvest-static-${ts}.{json,md}`);
}

// ── MAIN ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== HARVEST STATIC La Fusée ===`);
  console.log(`Mode : ${FAST ? "FAST (skip cycles)" : "FULL"}\n`);

  collectTypecheck();
  collectLint();
  collectGovernance();
  collectCycles();
  collectResidus();

  console.log(`\n→ classification`);
  const classes = classify();
  console.log(`   ${classes.length} classes identifiées`);

  console.log(`\n→ report`);
  writeReport(classes);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Findings : ${findings.length}`);
  console.log(`Classes  : ${classes.length}`);
  console.log(`ERRORS   : ${findings.filter((f) => f.severity === "ERROR").length}`);
  console.log(`WARNS    : ${findings.filter((f) => f.severity === "WARN").length}`);

  const topErrors = classes.filter((c) => c.severity === "ERROR").slice(0, 5);
  if (topErrors.length > 0) {
    console.log(`\nTop ERROR classes :`);
    topErrors.forEach((c) => console.log(`  - ${c.class} × ${c.count}`));
  }
}

main().catch((err) => {
  console.error("HARVEST FATAL:", err);
  process.exit(2);
});
