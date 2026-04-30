/**
 * scripts/dummy-intake-v3.ts
 *
 * Creates one realistic dummy QUICK_INTAKE end-to-end so the V3 result page
 * can be inspected visually in the browser.
 *
 *   1. start (SHORT method) → token
 *   2. processShort with a realistic ADVE-rich text → LLM extracts +
 *      runs full completion. Since ModelPolicy[final-report].pipelineVersion
 *      is now V3, this runs the V3 pipeline:
 *        - narrate-adve (4× Sonnet, DB-verbatim narration)
 *        - index → RTIS draft (RAG) → re-index
 *        - tension synthesis (Sonnet)
 *        - Opus final synthesis (executive + RTIS narrative + recommendation)
 *   3. Prints /intake/<token>/result for the operator to open in the browser.
 *
 * Run: npx tsx scripts/dummy-intake-v3.ts
 */

// Inline .env loader (same trick as compare-narrative.ts) — bypasses Claude
// Code subshell pollution that prevents node --env-file from working.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
for (const file of [".env", ".env.local"]) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

// IMPORTANT: do NOT static-import services that read process.env at module-init
// (db, appRouter, llm-gateway, etc.). ES module imports are hoisted ABOVE the
// env-loader block above, so static imports would lock the LLM gateway with
// `anthropic.available = false`. We dynamic-import below, after env is loaded.

const SUFFIX = Date.now().toString().slice(-5);
const TEST_EMAIL = `dummy-v3-${SUFFIX}@wakanda.test`;
const TEST_COMPANY = `Vibranium Labs ${SUFFIX}`;

const NARRATIVE_TEXT = `Vibranium Labs est une marque tech wakandaise qui aide les agences créatives africaines à passer d'une exécution intuitive à une stratégie pilotée. Notre mission : transformer chaque agence en cult brand structurée. Notre archétype : le Magicien — on révèle aux directeurs créatifs ce qu'ils ne voient pas dans leur propre marque, et ce que leurs clients cachent dans leurs briefs.

Notre promesse maître : "Tu n'as pas un problème de créa, tu as un problème de cadre stratégique." Notre ennemi déclaré : les frameworks marketing américains qui ignorent la grammaire culturelle africaine. Notre ton : direct, sans condescendance, technique sans jargon — la voix d'un senior qui a vu trop de pitches finir en cimetière de slides.

Distinction : on ne vend pas du conseil — on vend l'OS Industry qui transforme l'agence elle-même en machine à produire des cult brands. Chaque module (ADVE, RTIS, NSP) est un outil que les directeurs créatifs récupèrent pour leur propre pipeline. Notre signature : la méthode ADVE-RTIS, cascade A→D→V→E→R→T→I→S. Symboles propriétaires : la fusée (l'OS qui propulse), le triangle Mestor (gouvernance par intent), le mot "superfan" qu'on a redéfini.

Valeur : on facture entre 2500 et 25000 EUR/mois selon le tier — Cockpit (founder), Atelier (agence), Studio (groupe). Le ROI promis : multiplier par 3 le taux de conversion brief → mandat dans les 90 jours. Pricing justification : on remplace 4 outils (analytics, CRM créa, gestion de production, cockpit founder) par un seul OS — donc le tarif vaut le combiné des 4. Coût caché client : 6 semaines d'onboarding sérieux où l'agence doit accepter d'être auditée par sa propre data.

Engagement : communauté Discord privée "Les Pyromanes" — 230 directeurs créatifs africains validés à la main. Rituel hebdomadaire : "Le Pitch du Vendredi" où un membre présente un brief raté et la communauté décortique les erreurs stratégiques. Vocabulaire propriétaire : "spawter" (signaler une faille de cadre), "le goumin du brief" (le regret post-pitch perdu), "calibrer la fusée" (l'audit ADVE complet). Notre KPI engagement : 70% des membres connectés au moins 2x par semaine, 25% qui postent un brief par mois.`;

async function main() {
  console.log("═══ DUMMY INTAKE V3 — END-TO-END ═══\n");

  // Dynamic imports — must happen AFTER the env-loader at the top of the file.
  const { db } = await import("../src/lib/db");
  const { appRouter } = await import("../src/server/trpc/router");

  const caller = appRouter.createCaller({
    session: null,
    db,
    headers: new Headers(),
  });

  console.log("1. quickIntake.start (SHORT)…");
  const started = await caller.quickIntake.start({
    contactName: "Dummy Operator",
    contactEmail: TEST_EMAIL,
    companyName: TEST_COMPANY,
    sector: "TECH",
    country: "WK",
    method: "SHORT",
  });
  const token = started.token;
  console.log(`   token=${token}`);

  console.log("\n2. quickIntake.processShort (V3 pipeline kicks in)…");
  const t0 = Date.now();
  const completed = await caller.quickIntake.processShort({
    token,
    text: NARRATIVE_TEXT,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`   ✓ completed in ${elapsed}s — classification=${completed.classification}`);

  const intake = await db.quickIntake.findUniqueOrThrow({
    where: { shareToken: token },
    select: { id: true, status: true, diagnostic: true, convertedToId: true },
  });

  console.log(`   ✓ intake.status=${intake.status}`);

  const diag = intake.diagnostic as
    | {
        narrativeReport?: {
          executiveSummary?: string;
          centralTension?: string;
          adve?: Array<{ key: string; full?: string }>;
          rtis?: { pillars?: unknown[] };
          recommendation?: { strategicMove?: string; prioritizedActions?: unknown[] };
        };
      }
    | null;

  const nr = diag?.narrativeReport;
  if (!nr) {
    console.warn("   ⚠ narrativeReport missing — V3 may have failed");
  } else {
    console.log(`   ✓ narrativeReport persisted`);
    console.log(`     adve pillars: ${nr.adve?.length ?? 0}`);
    console.log(`     rtis pillars: ${nr.rtis?.pillars?.length ?? 0}`);
    console.log(`     centralTension present: ${!!nr.centralTension}`);
    console.log(`     recommendation block present: ${!!nr.recommendation}`);
    console.log(`     prioritizedActions: ${nr.recommendation?.prioritizedActions?.length ?? 0}`);
  }

  // Verify ADVE is sourced from Pillar.content (V3 invariant) — narrativeFull
  // should be present per pillar, written by narrate-adve upstream.
  if (intake.convertedToId) {
    const pillars = await db.pillar.findMany({
      where: { strategyId: intake.convertedToId, key: { in: ["a", "d", "v", "e"] } },
      select: { key: true, content: true },
    });
    const narratedCount = pillars.filter((p) => {
      const c = (p.content as Record<string, unknown> | null) ?? {};
      return typeof c.narrativeFull === "string" && (c.narrativeFull as string).trim().length > 0;
    }).length;
    console.log(`   ✓ pillars with narrativeFull persisted: ${narratedCount}/4`);
  }

  console.log("\n═══ DUMMY INTAKE READY ═══");
  console.log(`Test company: ${TEST_COMPANY}`);
  console.log(`Test email:   ${TEST_EMAIL}`);
  console.log(`Token:        ${token}`);
  console.log(`Result URL:   http://localhost:3000/intake/${token}/result`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("❌ FAIL:", err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
