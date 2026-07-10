/**
 * scripts/heal/index.ts — "Le fantôme de NEFER", l'inspecteur qualité ultime.
 *
 * Robot healer : se propage dans toute La Fusée, diagnostique TOUTES les
 * couches (env, types, lint, gouvernance, design-system, tests, runtime),
 * AUTO-RÉPARE ce qui est réparable sans risque, et agrège le reste en un seul
 * rapport fix-by-class avec verdict GO/NO-GO.
 *
 * Il ne REMPLACE pas l'arsenal existant — il l'ORCHESTRE (anti-doublon NEFER) :
 *   - static  : `npm run typecheck`, `npm run lint`, `prisma validate`
 *   - gouv.   : `audit:governance`, `audit:design`, `manifests:audit`, `audit:cycles`
 *   - tests   : `vitest run`
 *   - runtime : `harvest:dynamic` (crawler Playwright dual-portal) — flag --runtime
 *
 * Ce que `preflight.sh` ne fait pas et que le healer fait :
 *   1. SELF-HEAL : régénère le client Prisma périmé + applique les migrations
 *      en attente (les deux pannes dev-env les plus fréquentes) — flag --fix.
 *   2. Agrège la couche GOUVERNANCE (governance/design/manifests/cycles).
 *   3. Produit un ledger fix-by-class unique (logs/heal/HEAL-REPORT-<ts>.md).
 *
 * Usage :
 *   npm run heal              # diagnostic complet (static + gouv + tests), read-only
 *   npm run heal:fix          # idem + AUTO-RÉPARE (prisma generate / migrate deploy)
 *   npm run heal:full         # idem fix + crawl runtime (exige `npm run dev` up)
 *   tsx scripts/heal/index.ts --quick     # static seulement (rapide)
 *   tsx scripts/heal/index.ts --runtime   # inclut le crawl Playwright
 *
 * Exit : 0 si aucun bloquant, 1 si au moins un check ERROR non réparé.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── CLI ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const FIX = argv.includes("--fix");
const RUNTIME = argv.includes("--runtime") || argv.includes("--full");
const QUICK = argv.includes("--quick");

// ── Types ────────────────────────────────────────────────────────────
type Status = "PASS" | "WARN" | "ERROR" | "HEALED" | "SKIP";

interface CheckResult {
  id: string;
  label: string;
  status: Status;
  detail: string;
  durationMs: number;
  evidence?: string[]; // top lines of output for the report
}

const results: CheckResult[] = [];

// ── Shell helper ─────────────────────────────────────────────────────
interface RunOut {
  code: number;
  out: string;
}

function run(cmd: string, timeoutMs = 600_000): RunOut {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
    });
    return { code: 0, out };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string; message?: string };
    return {
      code: typeof e.status === "number" ? e.status : 1,
      out: `${e.stdout ?? ""}${e.stderr ?? ""}` || e.message || "",
    };
  }
}

function tail(out: string, n = 12): string[] {
  return out.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(-n);
}

function record(r: Omit<CheckResult, "durationMs">, start: number) {
  const res: CheckResult = { ...r, durationMs: Date.now() - start };
  results.push(res);
  const icon =
    res.status === "PASS" ? "✅" :
    res.status === "HEALED" ? "🩹" :
    res.status === "WARN" ? "⚠️ " :
    res.status === "SKIP" ? "⏭️ " : "❌";
  const secs = (res.durationMs / 1000).toFixed(1);
  console.log(`  ${icon} ${res.label.padEnd(34)} ${res.detail}  ${`(${secs}s)`}`);
}

// ── Phase 0 — SELF-HEAL (the part that makes it a healer, not an auditor) ──

/** Stale Prisma client → the #1 dev-env footgun (tsc explodes with
 *  "Property X does not exist on type 'PrismaClient'"). Detect + auto-regen. */
function healPrismaClient(): boolean {
  const start = Date.now();
  const schema = path.join(ROOT, "prisma", "schema.prisma");
  const clientCandidates = [
    path.join(ROOT, "node_modules", ".prisma", "client", "index.js"),
    path.join(ROOT, "node_modules", "@prisma", "client", "index.js"),
    path.join(ROOT, "node_modules", "@prisma", "client", "default.js"),
  ];
  const client = clientCandidates.find(existsSync);
  if (!existsSync(schema)) {
    record({ id: "prisma-client", label: "Prisma client sync", status: "SKIP", detail: "schema.prisma introuvable" }, start);
    return false;
  }
  const schemaM = statSync(schema).mtimeMs;
  const clientM = client ? statSync(client).mtimeMs : 0;
  const stale = !client || schemaM > clientM;
  if (!stale) {
    record({ id: "prisma-client", label: "Prisma client sync", status: "PASS", detail: "client à jour" }, start);
    return false;
  }
  if (!FIX) {
    record({ id: "prisma-client", label: "Prisma client sync", status: "WARN",
      detail: "client PÉRIMÉ — relance avec --fix (prisma generate)" }, start);
    return false;
  }
  const r = run("npx prisma generate");
  record({ id: "prisma-client", label: "Prisma client sync", status: r.code === 0 ? "HEALED" : "ERROR",
    detail: r.code === 0 ? "client régénéré (prisma generate)" : "échec prisma generate",
    evidence: r.code === 0 ? undefined : tail(r.out) }, start);
  return r.code === 0;
}

/** Pending migrations → app 500 sur toute table neuve. Détecte + applique (--fix). */
function healMigrations() {
  const start = Date.now();
  const status = run("npx prisma migrate status");
  const upToDate = /up to date|à jour/i.test(status.out);
  if (upToDate) {
    record({ id: "migrations", label: "Migrations DB", status: "PASS", detail: "schéma à jour" }, start);
    return;
  }
  const pending = (status.out.match(/have not yet been applied|not yet been applied/i));
  if (!pending) {
    // DB injoignable ou autre — surface l'info sans bloquer le diagnostic statique.
    record({ id: "migrations", label: "Migrations DB", status: "WARN",
      detail: "statut indéterminé (DB injoignable ?)", evidence: tail(status.out, 6) }, start);
    return;
  }
  if (!FIX) {
    record({ id: "migrations", label: "Migrations DB", status: "WARN",
      detail: "migrations EN ATTENTE — relance avec --fix (migrate deploy)" }, start);
    return;
  }
  const r = run("npx prisma migrate deploy");
  record({ id: "migrations", label: "Migrations DB", status: r.code === 0 ? "HEALED" : "ERROR",
    detail: r.code === 0 ? "migrations appliquées (migrate deploy)" : "échec migrate deploy",
    evidence: r.code === 0 ? undefined : tail(r.out) }, start);
}

// ── Phase 1 — STATIC ──────────────────────────────────────────────────

function checkTypecheck() {
  const start = Date.now();
  let r = run("npm run typecheck");
  let errs = (r.out.match(/error TS/g) || []).length;
  // SELF-HEAL : si l'échec ressemble à un client Prisma périmé, régénère + retry.
  const prismaShaped = /does not exist on type 'PrismaClient|does not exist in type '\w*Where/i.test(r.out);
  if (r.code !== 0 && errs > 0 && prismaShaped) {
    console.log("     ↳ erreurs Prisma-shaped détectées → prisma generate + retry…");
    run("npx prisma generate");
    r = run("npm run typecheck");
    errs = (r.out.match(/error TS/g) || []).length;
    if (errs === 0) {
      record({ id: "typecheck", label: "TypeScript (tsc)", status: "HEALED",
        detail: "0 erreurs après régénération du client Prisma" }, start);
      return;
    }
  }
  record({ id: "typecheck", label: "TypeScript (tsc)", status: errs === 0 ? "PASS" : "ERROR",
    detail: errs === 0 ? "0 erreur" : `${errs} erreur(s) de type`,
    evidence: errs === 0 ? undefined : (r.out.match(/.*error TS.*/g) || []).slice(0, 15) }, start);
}

function checkLint() {
  const start = Date.now();
  const r = run("npm run lint");
  const m = r.out.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/i);
  const errors = m ? Number(m[2]) : (r.code === 0 ? 0 : NaN);
  const warnings = m ? Number(m[3]) : 0;
  const status: Status = errors > 0 || Number.isNaN(errors) ? "ERROR" : warnings > 0 ? "WARN" : "PASS";
  record({ id: "lint", label: "ESLint (+ gouvernance)", status,
    detail: status === "PASS" ? "clean" : `${errors || 0} erreur(s), ${warnings} warning(s)`,
    evidence: status === "ERROR" ? tail(r.out, 15) : undefined }, start);
}

function checkPrismaValidate() {
  const start = Date.now();
  const r = run("npx prisma validate");
  const ok = /is valid|valide/i.test(r.out);
  record({ id: "prisma-validate", label: "Prisma schema validate", status: ok ? "PASS" : "ERROR",
    detail: ok ? "schéma valide" : "schéma invalide", evidence: ok ? undefined : tail(r.out, 8) }, start);
}

// ── Phase 2 — GOVERNANCE ──────────────────────────────────────────────

function checkExit(id: string, label: string, cmd: string, passRe?: RegExp) {
  const start = Date.now();
  const r = run(cmd);
  const ok = r.code === 0 && (!passRe || passRe.test(r.out));
  record({ id, label, status: ok ? "PASS" : "ERROR",
    detail: ok ? "OK" : `exit ${r.code}`, evidence: ok ? undefined : tail(r.out, 12) }, start);
}

// ── Phase 3 — TESTS ───────────────────────────────────────────────────

function checkVitest() {
  const start = Date.now();
  const r = run("npx vitest run");
  const failed = r.out.match(/(\d+)\s+failed/i);
  const passed = r.out.match(/Tests\s+(\d+)\s+passed/i) || r.out.match(/(\d+)\s+passed/i);
  const nFailed = failed ? Number(failed[1]) : (r.code === 0 ? 0 : NaN);
  const ok = nFailed === 0 && r.code === 0;
  record({ id: "vitest", label: "Tests unitaires (vitest)", status: ok ? "PASS" : "ERROR",
    detail: ok ? `${passed ? passed[1] : "?"} passés` : `${Number.isNaN(nFailed) ? "?" : nFailed} échec(s)`,
    evidence: ok ? undefined : tail(r.out, 18) }, start);
}

// ── Phase 4 — RUNTIME ─────────────────────────────────────────────────

async function checkRuntime() {
  const start = Date.now();
  // Préflight : le crawler exige `npm run dev` déjà lancé.
  let reachable = false;
  try {
    const res = await fetch("http://localhost:3000", { signal: AbortSignal.timeout(4000) });
    reachable = res.status < 600;
  } catch { reachable = false; }
  if (!reachable) {
    record({ id: "runtime", label: "Crawl runtime (harvest)", status: "SKIP",
      detail: "localhost:3000 injoignable — lance `npm run dev` puis --runtime" }, start);
    return;
  }
  const r = run("npm run harvest:dynamic", 1_200_000);
  const errLine = r.out.match(/Errors:\s*(\d+)/i);
  const nErr = errLine ? Number(errLine[1]) : (r.code === 0 ? 0 : NaN);
  record({ id: "runtime", label: "Crawl runtime (harvest)", status: nErr === 0 && r.code === 0 ? "PASS" : nErr > 0 ? "ERROR" : "WARN",
    detail: nErr > 0 ? `${nErr} erreur(s) runtime — voir logs/harvest-dynamic-*.md` : "aucune erreur runtime",
    evidence: tail(r.out, 14) }, start);
}

// ── Report ────────────────────────────────────────────────────────────

function writeReport(): number {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(ROOT, "logs", "heal");
  mkdirSync(dir, { recursive: true });

  const errors = results.filter((r) => r.status === "ERROR");
  const warns = results.filter((r) => r.status === "WARN");
  const healed = results.filter((r) => r.status === "HEALED");
  const verdict = errors.length > 0 ? "NO-GO 🛑" : warns.length > 0 ? "GO AVEC RÉSERVES ⚡" : "GO FOR LAUNCH 🚀";

  let md = `# HEAL REPORT — Le fantôme de NEFER\n\n`;
  md += `**${new Date().toISOString()}** · mode: ${FIX ? "fix" : "diagnose"}${RUNTIME ? " +runtime" : ""}${QUICK ? " +quick" : ""}\n\n`;
  md += `**Verdict : ${verdict}** — ${errors.length} bloquant(s), ${warns.length} réserve(s), ${healed.length} auto-réparé(s).\n\n`;
  md += `| Check | Statut | Détail | Durée |\n|---|---|---|---|\n`;
  for (const r of results) {
    md += `| ${r.label} | ${r.status} | ${r.detail.replace(/\|/g, "\\|")} | ${(r.durationMs / 1000).toFixed(1)}s |\n`;
  }
  if (healed.length) {
    md += `\n## 🩹 Auto-réparé\n\n`;
    for (const r of healed) md += `- **${r.label}** — ${r.detail}\n`;
  }
  if (errors.length) {
    md += `\n## ❌ Bloquants (fix-by-class)\n\n`;
    for (const r of errors) {
      md += `### ${r.label} — ${r.detail}\n\n`;
      if (r.evidence?.length) md += "```\n" + r.evidence.join("\n") + "\n```\n\n";
    }
  }
  if (warns.length) {
    md += `\n## ⚠️ Réserves\n\n`;
    for (const r of warns) md += `- **${r.label}** — ${r.detail}\n`;
  }
  const file = path.join(dir, `HEAL-REPORT-${ts}.md`);
  writeFileSync(file, md);
  console.log(`\n  Rapport : logs/heal/HEAL-REPORT-${ts}.md`);
  console.log(`  Verdict : ${verdict}\n`);
  return errors.length > 0 ? 1 : 0;
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n👻 LE FANTÔME DE NEFER — inspecteur qualité ultime`);
  console.log(`   mode: ${FIX ? "fix (auto-réparation ON)" : "diagnose (read-only)"}${RUNTIME ? " + runtime" : ""}${QUICK ? " + quick" : ""}\n`);

  console.log(`▸ Phase 0 — Self-heal préconditions`);
  healPrismaClient();
  healMigrations();

  console.log(`\n▸ Phase 1 — Analyse statique`);
  checkTypecheck();
  checkLint();
  checkPrismaValidate();

  if (!QUICK) {
    console.log(`\n▸ Phase 2 — Gouvernance`);
    checkExit("audit-governance", "Audit gouvernance", "npm run audit:governance");
    checkExit("audit-design", "Audit design-system", "npm run audit:design");
    checkExit("manifests-audit", "Audit manifests Neteru", "npm run manifests:audit");
    checkExit("audit-cycles", "Cycles d'import (madge)", "npm run audit:cycles", /No circular/i);

    console.log(`\n▸ Phase 3 — Tests`);
    checkVitest();
  }

  if (RUNTIME) {
    console.log(`\n▸ Phase 4 — Runtime (crawl Playwright)`);
    await checkRuntime();
  }

  process.exit(writeReport());
}

main().catch((err) => {
  console.error("HEAL FATAL:", err);
  process.exit(2);
});
