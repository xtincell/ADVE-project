/**
 * Anti-drift — garde CI « LA TOTALE » : le seed Wakanda irrigue tous les modèles
 * des flux critiques + tous les batches de complétion sont câblés.
 *
 * Wakanda = snapshot d'un marché vivant censé exercer 100 % des fonctions. Ce
 * test fige le contrat sans DB (statique) :
 *   1. Chaque modèle listé dans `coverage-scan.ts` CRITICAL_FLOWS est référencé
 *      par AU MOINS un fichier seed (`prisma.<delegate>.` ou `tx.<delegate>.`).
 *      → reste en sync avec le scanner automatiquement (parse de son texte).
 *   2. Chaque seeder de complétion (batches 1-7) est importé dans index.ts.
 *   3. Chaque nouveau modèle est purgé (purge.ts).
 *
 * Le comptage chiffré réel (isDummy / count) reste l'affaire de `npm run
 * wakanda:scan` sur la base Wakanda — ici on garde la SURFACE.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SEED_DIR = join(ROOT, "scripts", "seed-wakanda");

/** camelCase delegate Prisma : "McpApiCall" → "mcpApiCall". */
function delegate(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

/** Concatène le contenu de tous les fichiers seed (hors scanner/report). */
function allSeedSource(): string {
  return readdirSync(SEED_DIR)
    .filter((f) => f.endsWith(".ts") && f !== "coverage-scan.ts")
    .map((f) => readFileSync(join(SEED_DIR, f), "utf-8"))
    .join("\n");
}

/** Extrait les modèles des CRITICAL_FLOWS du scanner (parse texte → sync auto). */
function criticalFlowModels(): string[] {
  const scan = readFileSync(join(SEED_DIR, "coverage-scan.ts"), "utf-8");
  const block = scan.slice(
    scan.indexOf("CRITICAL_FLOWS"),
    scan.indexOf("};", scan.indexOf("CRITICAL_FLOWS")),
  );
  const models = new Set<string>();
  // tokens "PascalCase" dans les tableaux de valeurs
  for (const m of block.matchAll(/"([A-Z][A-Za-z0-9]+)"/g)) {
    const name = m[1];
    if (name) models.add(name);
  }
  return [...models];
}

describe("Wakanda seed coverage — garde CI « LA TOTALE »", () => {
  it("référence tous les modèles des flux critiques du scanner", () => {
    const source = allSeedSource();
    const models = criticalFlowModels();
    expect(models.length).toBeGreaterThan(10); // sanity : le parse a marché

    const missing = models.filter((m) => {
      const del = delegate(m);
      const re = new RegExp(`\\b(prisma|tx)\\.${del}\\.`);
      return !re.test(source);
    });
    expect(missing, `modèles de flux critiques non semés : ${missing.join(", ")}`).toEqual([]);
  });

  it("câble les 11 seeders de complétion dans index.ts", () => {
    const index = readFileSync(join(SEED_DIR, "index.ts"), "utf-8");
    const seeders = [
      "seedIntakePaywall",
      "seedFinancialCosting",
      "seedSuperfanTracking",
      "seedOracleSections",
      "seedBrandTree",
      "seedCampaignDeliverables",
      "seedMissionsApplications",
      "seedCommsBroadcast",
      "seedMcpConfig",
      "seedArgosDossiers",
      "seedMarketExtended",
    ];
    const notWired = seeders.filter((s) => !index.includes(s));
    expect(notWired, `seeders non câblés dans index.ts : ${notWired.join(", ")}`).toEqual([]);
  });

  it("purge tous les nouveaux modèles (purge.ts)", () => {
    const purge = readFileSync(join(SEED_DIR, "purge.ts"), "utf-8");
    const newModels = [
      "IntakePayment", "Subscription", "Account", "Session",
      "ActionCostTemplate", "ActionCostComponent", "ActionCostEstimate", "ProviderCostRate", "ZoneIndex", "BrandAction",
      "FollowerSnapshot", "TarsisCaptureSession",
      "OracleSection", "OracleSnapshot",
      "BrandNode", "BrandContextNode", "OperatorAction", "MorningBriefBatch", "IngestedSource", "BriefIngestionDraft",
      "CampaignDeliverable", "CampaignChangeRequest",
      "CommsPlan", "BroadcastJob", "EmailTemplate", "SmsTemplate", "ExternalConnector",
      "McpApiKey", "McpApiCall", "McpUsageStatement", "McpServerConfig", "McpRegistry", "McpToolInvocation",
      "CampaignReferenceDossier", "MissionApplication",
      "MarketBenchmark", "MarketCostSnapshot", "MarketDocument", "MarketContextNode", "NewsletterCampaign",
    ];
    const notPurged = newModels.filter((m) => !purge.includes(`tx.${delegate(m)}.deleteMany`));
    expect(notPurged, `modèles non purgés : ${notPurged.join(", ")}`).toEqual([]);
  });
});
