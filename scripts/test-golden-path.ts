/**
 * test-golden-path.ts — E2E test du parcours commercial-critique.
 *
 * Mission : "vendable sans peur" → un client peut traverser le golden path
 * du landing au cockpit founder sans rencontrer un bug bloquant.
 *
 * Le parcours testé est documenté dans MONEY-FLOW.md + memory `feedback_adve_rtis_split.md`:
 *
 *   1. LANDING        — /intake (Quick Intake Portal)
 *   2. CONTACT FORM   — fill name/email/company (3 required fields)
 *   3. METHOD STEP    — GUIDED selected by default (recommandé)
 *   4. START          — trpc.quickIntake.start → redirect /intake/[token]
 *   5. DIAGNOSTIC     — questionnaire GUIDED (4 piliers ADVE)
 *   6. RESULT         — /intake/[token]/result : fiche ADVE pré-remplie
 *   7. PAYWALL / CTA  — bouton vers cockpit + cascade RTIS payante
 *
 * Au minimum (étape 1 du chantier) on teste les phases 1-4 (commercial gate).
 * Les phases 5-7 (LLM calls + DB writes) viendront après car coûtent en token.
 *
 * Findings groupés par étape pour fix-by-class NEFER.
 *
 * Usage :
 *   npm run test:golden-path
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

// Import discovery helper (réuse du harvester)
import { readdirSync } from "node:fs";
import { homedir } from "node:os";

const ROOT = join(__dirname, "..");
const BASE_URL = process.env.HARVEST_BASE_URL ?? "http://localhost:3000";

interface Finding {
  step: string;
  class: string;
  severity: "ERROR" | "WARN";
  detail: string;
}

interface StepResult {
  step: string;
  ok: boolean;
  durationMs: number;
  details?: string;
  screenshot?: string;
  findings: Finding[];
}

function discoverChromiumExecutable(): string | undefined {
  const candidates: string[] = [];
  const home = homedir();
  const puRoot = join(home, ".cache", "puppeteer", "chrome-headless-shell");
  try {
    const versions = readdirSync(puRoot).sort().reverse();
    for (const v of versions) {
      candidates.push(join(puRoot, v, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
    }
  } catch {/* */}
  const pwRoot = join(home, "AppData", "Local", "ms-playwright");
  try {
    for (const dir of readdirSync(pwRoot)) {
      if (dir.startsWith("chromium_headless_shell-")) {
        candidates.push(join(pwRoot, dir, "chrome-headless-shell-win64", "chrome-headless-shell.exe"));
      }
    }
  } catch {/* */}
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined;
}

const RESULTS: StepResult[] = [];
const SCREENSHOT_DIR = join(ROOT, "logs", "screenshots", "golden-path");

function attachListeners(page: Page, currentStep: () => string, findings: Finding[]) {
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("[next-auth]")) return;
    if (text.includes("favicon")) return;
    if (text.includes("Failed to load resource") && text.includes("404")) {
      const src = msg.location().url;
      if (src === page.url() || src === page.url() + "/") return;
    }
    findings.push({
      step: currentStep(),
      class: text.includes("Cannot read prop") ? "js:null-access"
        : text.includes("Hydration") ? "react:hydration-mismatch"
        : text.includes("TRPCClientError") ? "trpc:client-error"
        : "console:generic-error",
      severity: "ERROR",
      detail: text.slice(0, 200),
    });
  });
  page.on("pageerror", (err) => {
    findings.push({
      step: currentStep(),
      class: "js:uncaught-exception",
      severity: "ERROR",
      detail: err.message.slice(0, 200),
    });
  });
  page.on("response", (resp) => {
    if (resp.status() >= 500) {
      findings.push({
        step: currentStep(),
        class: "network:5xx",
        severity: "ERROR",
        detail: `${resp.status()} ${new URL(resp.url()).pathname}`,
      });
    }
  });
}

async function shoot(page: Page, name: string): Promise<string> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false }).catch(() => undefined);
  return `screenshots/golden-path/${name}.png`;
}

async function runStep<T>(
  step: string,
  fn: () => Promise<T>,
  findings: Finding[],
): Promise<{ ok: boolean; result?: T; details?: string }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    const stepFindings = findings.filter((f) => f.step === step);
    const failed = stepFindings.some((f) => f.severity === "ERROR");
    RESULTS.push({
      step,
      ok: !failed,
      durationMs: Date.now() - t0,
      findings: stepFindings,
    });
    return { ok: !failed, result };
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    findings.push({ step, class: "step:exception", severity: "ERROR", detail: details.slice(0, 200) });
    RESULTS.push({
      step,
      ok: false,
      durationMs: Date.now() - t0,
      details,
      findings: findings.filter((f) => f.step === step),
    });
    return { ok: false, details };
  }
}

async function main() {
  console.log(`\n=== GOLDEN PATH TEST — Intake → Score ===`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const executablePath = discoverChromiumExecutable();
  if (!executablePath) {
    console.error("[FATAL] No chromium binary found in caches.");
    process.exit(2);
  }
  console.log(`Chromium: ${executablePath}\n`);

  const browser = await chromium.launch({ headless: true, executablePath });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  let currentStepName = "init";
  const findings: Finding[] = [];
  attachListeners(page, () => currentStepName, findings);

  // ── STEP 1: LANDING ──────────────────────────────────────────
  currentStepName = "1-landing";
  const landing = await runStep("1-landing", async () => {
    const resp = await page.goto(`${BASE_URL}/intake`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    if (!resp || resp.status() !== 200) throw new Error(`Landing HTTP ${resp?.status() ?? "?"}`);
    // Verify form fields exist
    const hasName = await page.locator("#contactName").count();
    const hasEmail = await page.locator("#contactEmail").count();
    const hasCompany = await page.locator("#companyName").count();
    if (!hasName || !hasEmail || !hasCompany) {
      throw new Error(`Missing form fields — name:${hasName} email:${hasEmail} company:${hasCompany}`);
    }
    return { status: resp.status() };
  }, findings);
  if (landing.ok) await shoot(page, "01-landing");

  // ── STEP 2: CONTACT FORM ─────────────────────────────────────
  currentStepName = "2-contact-form";
  const contact = await runStep("2-contact-form", async () => {
    await page.fill("#contactName", "Test Founder");
    await page.fill("#contactEmail", `test+${Date.now()}@golden-path.test`);
    await page.fill("#companyName", `GoldenPath Brand ${new Date().toISOString().slice(0,10)}`);
    // Step indicator should still show step 1
    // Click Continuer (submit form → setStep("method"))
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    // Wait for step 2 indicator to be active (button "Commencer le diagnostic" visible)
    await page.waitForSelector('button:has-text("Commencer le diagnostic")', { timeout: 10_000 });
    return { reached: "method" };
  }, findings);
  if (contact.ok) await shoot(page, "02-method-step");

  // ── STEP 3: METHOD + START ───────────────────────────────────
  currentStepName = "3-method-start";
  const startStep = await runStep("3-method-start", async () => {
    // GUIDED should be default-selected
    const guidedSelected = await page.locator('button:has-text("Questionnaire")').count();
    if (!guidedSelected) throw new Error(`GUIDED method tile not found`);
    // Click "Commencer le diagnostic"
    const cta = page.locator('button:has-text("Commencer le diagnostic")');
    const [_resp] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/trpc/quickIntake.start"), { timeout: 30_000 }).catch(() => undefined),
      cta.click(),
    ]);
    // Wait for navigation to /intake/[token]
    await page.waitForURL((url) => /\/intake\/[^/]+/.test(url.pathname) && !url.pathname.endsWith("/intake"), { timeout: 30_000 });
    const url = page.url();
    const m = url.match(/\/intake\/([^/?]+)/);
    if (!m) throw new Error(`Did not redirect to /intake/[token] — got ${url}`);
    return { token: m[1] };
  }, findings);
  if (startStep.ok) await shoot(page, "03-intake-token");

  // ── STEP 4: TOKEN PAGE LOADS ─────────────────────────────────
  currentStepName = "4-token-page";
  await runStep("4-token-page", async () => {
    // We're on /intake/[token] — verify content loads
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("[object Object]")) {
      throw new Error(`Token page renders [object Object]`);
    }
    if (bodyText.includes("Application error") || bodyText.includes("Une erreur est survenue")) {
      throw new Error(`Token page shows error boundary`);
    }
    // Should be the diagnostic flow (step 0 = Contexte Business, ou un des
    // 4 piliers ADVE selon avancement). On accepte tout marqueur d'un flow
    // diagnostique actif (progress indicator, sauvegarde, AI badge, ADVE pillar).
    const isDiagnostic = bodyText.match(
      /[Aa]uthenticit|[Pp]ilier|ADVE|[Dd]istinction|[Vv]aleur|[Ee]ngagement|[Cc]ontexte\s+[Bb]usiness|Sauvegarder|0%|Pr[ée]paration/,
    );
    if (!isDiagnostic) {
      throw new Error(`Token page doesn't seem to be the diagnostic — body: ${bodyText.slice(0, 200)}`);
    }
    return {};
  }, findings);
  if (RESULTS.find((r) => r.step === "4-token-page")?.ok) await shoot(page, "04-token-page");

  await browser.close();

  // ── REPORT ────────────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  mkdirSync(join(ROOT, "logs"), { recursive: true });
  const okCount = RESULTS.filter((r) => r.ok).length;
  const totalFindings = RESULTS.reduce((s, r) => s + r.findings.length, 0);

  const json = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    stepsAttempted: RESULTS.length,
    stepsOk: okCount,
    totalFindings,
    results: RESULTS,
  };
  writeFileSync(join(ROOT, "logs", `golden-path-${ts}.json`), JSON.stringify(json, null, 2));

  let md = `# Golden Path Test — ${new Date().toISOString()}\n\n`;
  md += `**${okCount}/${RESULTS.length} steps OK** — ${totalFindings} findings.\n\n`;
  md += `Base URL: ${BASE_URL}\n\n---\n\n`;
  for (const r of RESULTS) {
    md += `## ${r.ok ? "✓" : "✗"} ${r.step} (${r.durationMs}ms)\n\n`;
    if (r.details) md += `**Détails** : ${r.details}\n\n`;
    if (r.findings.length > 0) {
      md += `**Findings** :\n`;
      for (const f of r.findings) {
        md += `- \`${f.class}\` ${f.severity} : ${f.detail}\n`;
      }
      md += `\n`;
    }
  }
  writeFileSync(join(ROOT, "logs", `golden-path-${ts}.md`), md);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Steps OK : ${okCount}/${RESULTS.length}`);
  console.log(`Findings : ${totalFindings}`);
  console.log(`\nReport: logs/golden-path-${ts}.{json,md}`);
  RESULTS.forEach((r) => {
    console.log(`  ${r.ok ? "✓" : "✗"} ${r.step}  ${r.durationMs}ms  ${r.findings.length} findings`);
  });

  process.exit(okCount === RESULTS.length ? 0 : 1);
}

main().catch((err) => {
  console.error("GOLDEN PATH FATAL:", err);
  process.exit(2);
});
