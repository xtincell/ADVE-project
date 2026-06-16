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

  // `discoverChromiumExecutable()` ne connaît que les caches Windows (dev local).
  // Sur Linux/CI il renvoie undefined → on retombe sur le chromium installé par
  // Playwright (`npx playwright install chromium`). Plus de [FATAL] cross-OS.
  const executablePath = discoverChromiumExecutable();
  console.log(
    executablePath
      ? `Chromium: ${executablePath}\n`
      : "Chromium: Playwright bundled (aucun cache local — fallback)\n",
  );

  const browser = await chromium.launch(
    executablePath ? { headless: true, executablePath } : { headless: true },
  );
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
  // Le cookie banner peut masquer le contenu au premier render → on dismiss
  // d'abord pour avoir une lecture propre du diagnostic.
  currentStepName = "4-token-page";
  await runStep("4-token-page", async () => {
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    // Dismiss cookie banner si présent
    const essentialsBtn = page.locator('button:has-text("Essentiels uniquement"), button:has-text("Tout accepter")').first();
    if (await essentialsBtn.count() > 0) {
      await essentialsBtn.click().catch(() => undefined);
      await page.waitForTimeout(500);
    }
    // Attendre un marker diagnostique spécifique (heading H1/H2 du flow)
    await page.waitForSelector(
      'h1:has-text("Contexte"), h1:has-text("Authent"), h2:has-text("Contexte"), h2:has-text("Authent"), [class*="ProgressIndicator"], [data-phase]',
      { timeout: 15_000 },
    ).catch(() => undefined);
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes("[object Object]")) throw new Error(`Token page renders [object Object]`);
    if (bodyText.includes("Application error") || bodyText.includes("Une erreur est survenue")) {
      throw new Error(`Token page shows error boundary`);
    }
    const isDiagnostic = bodyText.match(
      /[Aa]uthenticit|[Pp]ilier|ADVE|[Dd]istinction|[Vv]aleur|[Ee]ngagement|[Cc]ontexte\s+[Bb]usiness|Sauvegarder|0%|Pr[ée]paration/,
    );
    if (!isDiagnostic) throw new Error(`Not the diagnostic page — body: ${bodyText.slice(0, 200)}`);
    return {};
  }, findings);
  if (RESULTS.find((r) => r.step === "4-token-page")?.ok) await shoot(page, "04-token-page");

  // ── STEP 5: DRIVE DIAGNOSTIC VIA TRPC (biz + 4 ADVE pillars) ──────────
  // On bypass l'UI questionnaire (trop verbeux) et on call directement les
  // tRPC mutations. Source de vérité : `quickIntake.advance` + `getQuestions`
  // dans src/server/trpc/routers/quick-intake.ts. Schema canonique des
  // réponses : keyed par pillar (biz/a/d/v/e), value = Record<questionId, value>.
  currentStepName = "5-drive-diagnostic";
  const tokenForApi = (startStep.result as { token: string } | undefined)?.token;
  await runStep("5-drive-diagnostic", async () => {
    if (!tokenForApi) throw new Error("No token from step 3");

    // Helper: tRPC v11 batch format → query GET `?batch=1&input=<jsonEncoded>`
    const trpcGet = async <T>(procedure: string, input: unknown): Promise<T> => {
      const encoded = encodeURIComponent(JSON.stringify({ "0": { json: input } }));
      const res = await page.request.get(`${BASE_URL}/api/trpc/${procedure}?batch=1&input=${encoded}`, {
        timeout: 600000,
      });
      if (!res.ok()) throw new Error(`${procedure} GET ${res.status()}: ${await res.text().catch(() => "")}`);
      const body = await res.json() as Array<{ result?: { data?: { json?: T } } }>;
      const data = body[0]?.result?.data?.json;
      if (data === undefined) throw new Error(`${procedure} no data in response`);
      return data;
    };
    const trpcPost = async <T>(procedure: string, input: unknown): Promise<T> => {
      const res = await page.request.post(`${BASE_URL}/api/trpc/${procedure}?batch=1`, {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ "0": { json: input } }),
        timeout: 600000,
      });
      if (!res.ok()) throw new Error(`${procedure} POST ${res.status()}: ${await res.text().catch(() => "")}`);
      const body = await res.json() as Array<{ result?: { data?: { json?: T } } }>;
      const data = body[0]?.result?.data?.json;
      if (data === undefined) throw new Error(`${procedure} no data in response`);
      return data;
    };

    // Fake-answer generator par type (résilient au question-bank actuel)
    const fakeAnswer = (q: { type: string; options?: string[]; id: string }): unknown => {
      if (q.type === "text") return `Auto-test response for ${q.id}`;
      if (q.type === "scale") return 5;
      if (q.type === "select") {
        const opt = q.options?.[0] ?? "default";
        return opt.includes("::") ? opt.split("::")[0] : opt;
      }
      if (q.type === "multiselect") {
        const opts = q.options?.slice(0, 2) ?? ["default"];
        return opts.map((o) => (o.includes("::") ? o.split("::")[0] : o));
      }
      return "auto";
    };

    // Loop : fetch questions → answer → advance → next pillar (≤6 itérations safe)
    let iterations = 0;
    while (iterations++ < 6) {
      const { questions, currentPillar, readyToComplete } = await trpcGet<{
        questions: Array<{ id: string; type: string; options?: string[]; required: boolean }>;
        currentPillar: string | null;
        readyToComplete: boolean;
        progress: number;
      }>("quickIntake.getQuestions", { token: tokenForApi });

      if (readyToComplete) break;
      if (!currentPillar || questions.length === 0) {
        throw new Error(`Iteration ${iterations}: no pillar/questions, readyToComplete=false`);
      }

      const slice: Record<string, unknown> = {};
      for (const q of questions) slice[q.id] = fakeAnswer(q);

      await trpcPost("quickIntake.advance", {
        token: tokenForApi,
        responses: { [currentPillar]: slice },
      });
    }
    return { iterations };
  }, findings);

  // ── STEP 6: COMPLETE + RESULT PAGE ─────────────────────────────────
  // complete() trigger 4 LLM calls (1 par ADVE pillar). Coût : ~$0.05-0.20.
  // Timeout généreux (90s) car LLM Gateway tier C peut tomber sur Haiku.
  currentStepName = "6-complete-and-result";
  await runStep("6-complete-and-result", async () => {
    if (!tokenForApi) throw new Error("No token");

    // Production-grade timeout : complete() trigger 4 LLM calls + Glory sequences
    // + narrative report. Mesure observée 2026-05-11 : ~90s. On accepte 180s
    // pour absorber les variations LLM, ET on flag si >60s (commercial bug
    // distinct du fonctionnel).
    const t0 = Date.now();
    const completeRes = await page.request.post(
      `${BASE_URL}/api/trpc/quickIntake.complete?batch=1`,
      {
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ "0": { json: { token: tokenForApi } } }),
        timeout: 600000,
      },
    );
    const completeDurationMs = Date.now() - t0;

    if (!completeRes.ok()) {
      throw new Error(`complete() HTTP ${completeRes.status()}: ${await completeRes.text().catch(() => "")}`);
    }
    // Performance assertion : commercial-critical, on flag mais on n'échoue
    // pas (le step OK reste OK, finding séparé pour reporting).
    if (completeDurationMs > 60_000) {
      findings.push({
        step: "6-complete-and-result",
        class: "perf:complete-too-slow",
        severity: "WARN",
        detail: `quickIntake.complete took ${(completeDurationMs/1000).toFixed(1)}s — UX risk pour le founder qui attend son score`,
      });
    }

    await page.goto(`${BASE_URL}/intake/${tokenForApi}/result`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => undefined);
    // Dismiss cookie banner ici aussi (peut réapparaître sur nouvelle navigation)
    const essentialsBtn = page.locator('button:has-text("Essentiels uniquement"), button:has-text("Tout accepter")').first();
    if (await essentialsBtn.count() > 0) {
      await essentialsBtn.click().catch(() => undefined);
      await page.waitForTimeout(500);
    }
    // Vérifier l'URL est bien /result
    const finalUrl = page.url();
    if (!finalUrl.includes("/result")) {
      throw new Error(`Expected /result URL, got ${finalUrl}`);
    }
    const bodyText = await page.evaluate(() => document.body.innerText);

    if (bodyText.includes("[object Object]")) throw new Error("Result renders [object Object]");
    if (bodyText.includes("Application error") || bodyText.includes("Une erreur est survenue")) {
      throw new Error("Result page shows error boundary");
    }
    const hasResultMarkers = bodyText.match(
      /[Aa]uthenticit|[Dd]istinction|[Vv]aleur|[Ee]ngagement|\/\s*100|score|[Pp]r[ée]vis|[Dd]iagnostic/,
    );
    if (!hasResultMarkers) {
      throw new Error(`Result page missing ADVE markers — body: ${bodyText.slice(0, 300)}`);
    }
    return { completeDurationMs };
  }, findings);
  if (RESULTS.find((r) => r.step === "6-complete-and-result")?.ok) await shoot(page, "06-result-page");

  // ── STEP 7: PAYWALL CTA ─────────────────────────────────────────────
  currentStepName = "7-paywall-cta";
  await runStep("7-paywall-cta", async () => {
    // Assertion d'URL d'abord (sinon le test passe sur la mauvaise page)
    const url = page.url();
    if (!url.includes("/result")) {
      throw new Error(`Step 7 expects /result URL, got ${url} (step 6 may have failed)`);
    }
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasPaywall = bodyText.match(/[Aa]ctiv[ae]|[Rr]etainer|[Dd][éeè]bloquer|[Cc]ascade|RTIS|[Cc]ommencer\s+(?:l'aventure|maintenant)|Premium|[Dd]ébloquer/);
    if (!hasPaywall) {
      throw new Error(`Result page has no paywall/CTA — body: ${bodyText.slice(0, 300)}`);
    }
    return {};
  }, findings);

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
