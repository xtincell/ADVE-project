/**
 * WAKANDA COVERAGE SCANNER — « le bot qui scanne partout avant d'irriguer les voies ».
 *
 * Wakanda n'est pas un seed bénin : c'est le snapshot d'un marché entier, vivant,
 * censé exercer 100 % des fonctions de La Fusée (« LA TOTALE »). Ce scanner mesure
 * l'écart entre ce que le schéma EXPOSE et ce que le seed IRRIGUE réellement.
 *
 * Ce qu'il fait (non destructif) :
 *   1. Énumère TOUS les modèles Prisma en parsant `prisma/schema.prisma`
 *      (aucun client requis — marche même sans `prisma generate`).
 *   2. Si une base est joignable (DATABASE_URL + client généré), compte les
 *      lignes `isDummy=true` par modèle (fallback `count()` total si le modèle
 *      n'a pas de champ isDummy) → couverture réelle du seed.
 *   3. Vérifie que chaque FLUX CRITIQUE (intake→oracle, costing prestataires,
 *      suivi superfans, jehuty, argos, mcp-billing, comms, brand-tree, …) a au
 *      moins un modèle irrigué — sinon la voie n'est pas alimentée.
 *   4. Écrit `scripts/seed-wakanda/coverage-report.json`.
 *
 * Usage :  npx tsx scripts/seed-wakanda/coverage-scan.ts
 *          npm run wakanda:scan         (charge .env.local → DATABASE_URL)
 *
 * Sans DB/clé : rapporte l'inventaire + la présence-au-schéma des flux (utile
 * pour planifier). Avec DB : rapporte la couverture chiffrée + flux vides.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCHEMA_PATH = join(ROOT, "prisma/schema.prisma");
const REPORT_PATH = join(ROOT, "scripts/seed-wakanda/coverage-report.json");

/** Tous les `model X {` déclarés dans le schéma Prisma. Source de vérité. */
function listModels(): string[] {
  const src = readFileSync(SCHEMA_PATH, "utf-8");
  const re = /^\s*model\s+(\w+)\s*\{/gm;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) names.push(m[1]);
  return names.sort((a, b) => a.localeCompare(b));
}

/**
 * Flux critiques (audit couverture 2026-06-23) → modèles qui DOIVENT être
 * irrigués pour que la voie soit alimentée de bout en bout. C'est l'assertion
 * « LA TOTALE » réduite à ses points de passage obligés.
 */
const CRITICAL_FLOWS: Record<string, string[]> = {
  "intake→adve→oracle→paywall": ["QuickIntake", "IntakePayment", "Subscription"],
  "factures prestataires / costing": [
    "ActionCostTemplate",
    "ActionCostComponent",
    "ActionCostEstimate",
    "ProviderCostRate",
    "ZoneIndex",
  ],
  "suivi superfans (série temporelle)": [
    "FollowerSnapshot",
    "SuperfanProfile",
    "DevotionSnapshot",
    "AttributionEvent",
  ],
  "jehuty-feed (signaux + actualité)": ["Signal", "JehutyCuration"],
  "argos dossiers de référence": ["CampaignReferenceDossier"],
  "billing MCP": ["McpUsageStatement", "McpApiCall"],
  "comms / broadcast (anubis)": ["CommsPlan", "BroadcastJob", "ExternalConnector"],
  "brand-tree hiérarchique": ["BrandNode"],
  "deliverables campagne (6D)": ["CampaignDeliverable"],
  "oracle 35 sections": ["OracleSection"],
  "candidatures missions (guilde)": ["MissionApplication"],
};

type Counts = Record<string, number | null>; // null = non comptable (pas de DB / pas de champ)

async function countRows(models: string[]): Promise<{ db: boolean; counts: Counts; note: string }> {
  const counts: Counts = {};
  if (!process.env.DATABASE_URL) {
    for (const m of models) counts[m] = null;
    return { db: false, counts, note: "DATABASE_URL absent — inventaire seul (aucun comptage)." };
  }
  let prisma: { [k: string]: { count?: (args?: unknown) => Promise<number> } } & {
    $disconnect?: () => Promise<void>;
  };
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    }) as never;
  } catch (e) {
    for (const m of models) counts[m] = null;
    return {
      db: false,
      counts,
      note: `Client Prisma indisponible (${(e as Error).message}). Lancez \`prisma generate\`.`,
    };
  }
  for (const model of models) {
    const delegate = prisma[model[0].toLowerCase() + model.slice(1)];
    if (!delegate?.count) {
      counts[model] = null;
      continue;
    }
    try {
      counts[model] = await delegate.count({ where: { isDummy: true } });
    } catch {
      try {
        counts[model] = await delegate.count();
      } catch {
        counts[model] = null;
      }
    }
  }
  await prisma.$disconnect?.();
  return { db: true, counts, note: "Comptage isDummy=true (fallback total si pas de champ isDummy)." };
}

async function main(): Promise<void> {
  const models = listModels();
  const { db, counts, note } = await countRows(models);

  const seeded = models.filter((m) => (counts[m] ?? 0) > 0);
  const empty = models.filter((m) => counts[m] === 0);

  console.log("════════════════════════════════════════════════════════");
  console.log("  WAKANDA COVERAGE SCAN");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  Modèles Prisma (schéma)   : ${models.length}`);
  console.log(`  Base de données           : ${db ? "connectée" : "non connectée"}`);
  console.log(`  ${note}`);
  if (db) {
    const pct = ((seeded.length / models.length) * 100).toFixed(1);
    console.log(`  Modèles irrigués (>0)     : ${seeded.length}/${models.length} (${pct}%)`);
    console.log(`  Modèles vides (0)         : ${empty.length}`);
  }

  console.log("\n  ── Flux critiques ───────────────────────────────────");
  const flows: Record<string, { ok: boolean; missing: string[] }> = {};
  for (const [flow, required] of Object.entries(CRITICAL_FLOWS)) {
    const absentFromSchema = required.filter((m) => !models.includes(m));
    const emptied = db ? required.filter((m) => models.includes(m) && (counts[m] ?? 0) === 0) : [];
    const missing = [...absentFromSchema.map((m) => `${m} (absent du schéma)`), ...emptied];
    const ok = db ? missing.length === 0 : absentFromSchema.length === 0;
    flows[flow] = { ok, missing };
    const mark = !db ? "•" : ok ? "✅" : "❌";
    console.log(`  ${mark} ${flow}${missing.length ? ` — manque : ${missing.join(", ")}` : ""}`);
  }

  const report = {
    scannedAt: new Date().toISOString(),
    dbConnected: db,
    note,
    totalModels: models.length,
    seededModels: db ? seeded.length : null,
    emptyModels: db ? empty : null,
    counts: db ? counts : null,
    criticalFlows: flows,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\n  Rapport écrit : ${REPORT_PATH}`);

  if (db) {
    const brokenFlows = Object.values(flows).filter((f) => !f.ok).length;
    if (brokenFlows > 0) {
      console.log(`\n  ⚠️  ${brokenFlows} flux critique(s) non irrigué(s) — voir le plan de complétion.`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
