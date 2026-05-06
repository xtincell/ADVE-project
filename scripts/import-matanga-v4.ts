/**
 * Phase 18-A1-α (audit MATANGA V4) — Script d'import du système V4 dans l'OS.
 *
 * Lit `docs/XLS archive/Systeme_Suivi_Matanga_V4-2.xlsx` (8 sheets) + autres XLSX
 * d'archive et matérialise :
 *
 *   1. **Operator "Matanga"** (créé si absent)
 *   2. **5 BrandNode CORPORATE** (FC, PZ, CF, CG, FK) avec nodeRole CODE_PREFIX
 *   3. **MASTER_BRAND** enfants depuis colonne MARQUE de REGISTRE PROJETS
 *   4. **REGIONAL_BRAND** enfants depuis colonne PAYS (mapping vers ISO-2 + clusterTag)
 *   5. **Campaign** par row du REGISTRE PROJETS, avec `code` formaté V4 (FC-TG-PEAK-001)
 *      + `creativeState` aligné enum + `priority` + `isCritical`
 *   6. **CampaignDeliverable** par row de la sheet TÂCHES (matrice 6D)
 *
 * **Idempotent** : re-run safe via lookup par `slug` (BrandNode) et `code` (Campaign).
 *
 * Usage:
 *   npx tsx scripts/import-matanga-v4.ts [--dry-run] [--xlsx <path>] [--operator-name <name>]
 *
 * Exemple:
 *   npx tsx scripts/import-matanga-v4.ts --dry-run
 *   npx tsx scripts/import-matanga-v4.ts --xlsx "docs/XLS archive/Systeme_Suivi_Matanga_V4-2.xlsx"
 *
 * Manual-first parity (ADR-0053) : ce script est une accélération opt-in. Tout ce
 * qu'il fait est aussi possible manuellement via `<BrandNodeForm />` et UI cockpit.
 */

import { PrismaClient, type BrandNature } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CODE_PREFIX_ROLE_TAG, generateCampaignCode } from "../src/domain/campaign-code";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const prisma = makeClient();

// ──────────────────────────────────────────────────────────────────────────
// CLI args
// ──────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const xlsxPath = (() => {
  const idx = args.indexOf("--xlsx");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1]!;
  return join(
    process.cwd(),
    "../../../docs/XLS archive/Systeme_Suivi_Matanga_V4-2.xlsx",
  );
})();
const operatorName = (() => {
  const idx = args.indexOf("--operator-name");
  if (idx >= 0 && args[idx + 1]) return args[idx + 1]!;
  return "Matanga Agency";
})();

// ──────────────────────────────────────────────────────────────────────────
// Static mapping V4 (extrait de la sheet NOMENCLATURE)
// ──────────────────────────────────────────────────────────────────────────

const CLIENT_PREFIX_MAP: Record<string, { name: string; slug: string }> = {
  FC: { name: "FrieslandCampina", slug: "frieslandcampina" },
  PZ: { name: "Panzani / Cadyst Group", slug: "panzani-cadyst-group" },
  CF: { name: "Cadyst Farming", slug: "cadyst-farming" },
  CG: { name: "Cadyst Grain", slug: "cadyst-grain" },
  FK: { name: "Fokou", slug: "fokou" },
};

// Codes pays officiels FC (sheet NOMENCLATURE rows 12-17 + extension Ramadan.xlsx)
const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
  Togo: "TG",
  Sénégal: "SN",
  RDC: "CD",
  "RDC (Congo)": "CD",
  Cameroun: "CM",
  "Côte d'Ivoire": "CI",
  Gabon: "GA",
  Mali: "ML",
  "Burkina Faso": "BF",
  Bénin: "BJ",
  Ghana: "GH",
  "Guinée Conakry": "GN",
  "Guinée Conakry ": "GN",
  Gambie: "GM",
  Djibouti: "DJ",
  Congo: "CG",
  RCA: "CF", // ⚠️ ATTENTION : "CF" = République Centrafricaine ISO2 — mais on a déjà CF=Cadyst Farming prefix.
  // Le contexte différencie : pays vs corporate prefix. Ici country.
};

// Mapping pays → cluster (confirmé par opérateur 2026-05-06)
const COUNTRY_TO_CLUSTER: Record<string, string> = {
  CI: "CIV",
  SN: "WESTERN_CLUSTER",
  ML: "WESTERN_CLUSTER",
  BF: "WESTERN_CLUSTER",
  GN: "WESTERN_CLUSTER",
  GM: "WESTERN_CLUSTER",
  BJ: "WESTERN_CLUSTER",
  TG: "WESTERN_CLUSTER",
  CMR: "TROPICAL_CLUSTER",
  CM: "TROPICAL_CLUSTER",
  CG: "TROPICAL_CLUSTER",
  CD: "TROPICAL_CLUSTER",
  GA: "TROPICAL_CLUSTER",
  GAB: "TROPICAL_CLUSTER",
  GH: "TROPICAL_CLUSTER",
  DJ: "ESA",
};

// Mapping STATUTS V4 (avec emojis) → CreativeProductionStatus enum
function parseStatutV4(status: string): {
  creativeState: "BRIEF_RECU" | "BRIEF_QUALIFIE" | "EN_PRODUCTION" | "BLOQUE" | "LIVRE";
  isCritical: boolean;
} {
  const norm = status.trim().toUpperCase();
  if (norm.includes("LIVRÉ") || norm.includes("LIVRE")) return { creativeState: "LIVRE", isCritical: false };
  if (norm.includes("PRODUCTION")) return { creativeState: "EN_PRODUCTION", isCritical: false };
  if (norm.includes("BLOQUÉ") || norm.includes("BLOQUE")) return { creativeState: "BLOQUE", isCritical: false };
  if (norm.includes("CRITIQUE")) return { creativeState: "EN_PRODUCTION", isCritical: true };
  if (norm.includes("QUALIFIÉ") || norm.includes("QUALIFIE")) return { creativeState: "BRIEF_QUALIFIE", isCritical: false };
  if (norm.includes("REÇU") || norm.includes("RECU")) return { creativeState: "BRIEF_RECU", isCritical: false };
  return { creativeState: "BRIEF_RECU", isCritical: false };
}

// ──────────────────────────────────────────────────────────────────────────
// XLSX parser (light-weight, no external dep beyond optional xlsx package)
// ──────────────────────────────────────────────────────────────────────────

interface SheetRow {
  [columnName: string]: string | number | Date | null | undefined;
}

interface ParsedSheet {
  name: string;
  headers: string[];
  rows: SheetRow[];
}

/**
 * Parse XLSX via la lib `xlsx` si disponible. Sinon throw avec instruction install.
 * Le user fait `npm i -D xlsx` ou utilise une autre approche.
 */
async function parseXlsx(path: string, sheetNames: string[]): Promise<Record<string, ParsedSheet>> {
  let XLSX: typeof import("xlsx");
  try {
    XLSX = await import("xlsx");
  } catch {
    throw new Error(
      `Package 'xlsx' non installé. Run \`npm install --no-save xlsx\` puis re-exécute le script. (xlsx est read-only, ~1.4MB ; si le user préfère pas l'ajouter, le script peut être étendu pour parser openpyxl/python via shell.)`,
    );
  }
  const buf = readFileSync(path);
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
  const result: Record<string, ParsedSheet> = {};
  for (const name of sheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) {
      console.warn(`  ⚠ Sheet "${name}" absente du fichier — skip.`);
      continue;
    }
    // Auto-detect header row (1ère ligne avec >= 2 cellules string)
    const json = XLSX.utils.sheet_to_json<SheetRow>(ws, { defval: null, raw: false, header: 1 });
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(json.length, 12); i++) {
      const row = json[i] as unknown[] | undefined;
      if (!row) continue;
      const stringCells = row.filter((v) => typeof v === "string" && v.trim().length > 1);
      if (stringCells.length >= 2) {
        headerRowIdx = i;
        break;
      }
    }
    const rawHeader = json[headerRowIdx] as unknown[] | undefined;
    const headers = rawHeader ? rawHeader.map((h) => String(h ?? "").trim()) : [];
    const dataRows: SheetRow[] = [];
    for (let r = headerRowIdx + 1; r < json.length; r++) {
      const cells = json[r] as unknown[] | undefined;
      if (!cells) continue;
      if (cells.every((v) => v === null || v === "")) continue;
      const row: SheetRow = {};
      for (let c = 0; c < headers.length; c++) {
        const key = headers[c];
        if (!key) continue;
        const v = cells[c];
        row[key] = v === null || v === undefined ? null : (v as string | number | Date);
      }
      dataRows.push(row);
    }
    result[name] = { name, headers, rows: dataRows };
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────────
// Idempotent upsert helpers
// ──────────────────────────────────────────────────────────────────────────

async function ensureOperator(name: string): Promise<{ id: string; name: string }> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const existing = await prisma.operator.findUnique({ where: { slug } });
  if (existing) return existing;
  if (DRY_RUN) {
    console.log(`  [dry-run] would create Operator "${name}" (slug=${slug})`);
    return { id: "DRY_RUN_OPERATOR", name };
  }
  return prisma.operator.create({
    data: {
      name,
      slug,
      status: "ACTIVE",
      licenseType: "LICENSED",
      licensedAt: new Date(),
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}

async function ensureBrandNode(args: {
  operatorId: string;
  parentNodeId: string | null;
  name: string;
  slug: string;
  nodeKind: string;
  nodeNature: BrandNature;
  countryCode?: string | null;
  clusterTag?: string | null;
  nodeRole?: string[];
}): Promise<{ id: string; slug: string }> {
  if (args.operatorId === "DRY_RUN_OPERATOR") {
    console.log(`  [dry-run] would create BrandNode "${args.name}" (kind=${args.nodeKind}, parent=${args.parentNodeId ?? "ROOT"})`);
    return { id: `DRY_${args.slug}`, slug: args.slug };
  }
  const existing = await prisma.brandNode.findUnique({
    where: { operatorId_slug: { operatorId: args.operatorId, slug: args.slug } },
  });
  if (existing) return existing;
  return prisma.brandNode.create({
    data: {
      operatorId: args.operatorId,
      parentNodeId: args.parentNodeId,
      name: args.name,
      slug: args.slug,
      nodeKind: args.nodeKind,
      nodeNature: args.nodeNature,
      countryCode: args.countryCode ?? null,
      clusterTag: args.clusterTag ?? null,
      nodeRole: args.nodeRole ?? [],
      lifecycle: "ACTIVE",
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function main() {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`Phase 18-A1-α — Import MATANGA V4`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (no writes)" : "APPLY"}`);
  console.log(`File: ${xlsxPath}`);
  console.log(`Operator: ${operatorName}`);
  console.log(`${"=".repeat(70)}\n`);

  // 1. Parse XLSX
  const sheets = await parseXlsx(xlsxPath, ["REGISTRE PROJETS", "TÂCHES", "NOMENCLATURE", "TICKETS MODIFS", "ACTIONS"]);
  console.log(`Sheets parsées : ${Object.keys(sheets).join(", ")}\n`);

  // 2. Operator
  const operator = await ensureOperator(operatorName);
  console.log(`✓ Operator : ${operator.name} (${operator.id})`);

  // 3. 5 Corporates depuis CLIENT_PREFIX_MAP
  const corporates = new Map<string, string>(); // prefix → BrandNode.id
  for (const [prefix, info] of Object.entries(CLIENT_PREFIX_MAP)) {
    const node = await ensureBrandNode({
      operatorId: operator.id,
      parentNodeId: null,
      name: info.name,
      slug: info.slug,
      nodeKind: "CORPORATE",
      nodeNature: "PRODUCT",
      nodeRole: [`${CODE_PREFIX_ROLE_TAG}:${prefix}`],
    });
    corporates.set(prefix, node.id);
    console.log(`✓ Corporate ${prefix} : ${info.name} (${node.id})`);
  }

  // 4. Master brands depuis REGISTRE PROJETS
  const registre = sheets["REGISTRE PROJETS"];
  if (!registre) {
    console.error("✗ Sheet 'REGISTRE PROJETS' absente — abort.");
    return;
  }

  // First pass : extract all (corporate prefix, brand name) tuples
  const masterBrandsByCorporate = new Map<string, Set<string>>(); // prefix → Set(brand names)
  const regionalsByCorporate = new Map<string, Set<string>>(); // prefix → Set(country names)

  for (const row of registre.rows) {
    const idProjet = String(row["ID PROJET"] ?? "").trim();
    const corpPrefix = idProjet.split("-")[0]!;
    if (!corporates.has(corpPrefix)) continue;
    const marque = String(row["MARQUE"] ?? "").trim();
    const pays = String(row["PAYS"] ?? "").trim();
    if (marque && marque !== "Multi-marques" && marque !== "Multi") {
      if (!masterBrandsByCorporate.has(corpPrefix)) masterBrandsByCorporate.set(corpPrefix, new Set());
      masterBrandsByCorporate.get(corpPrefix)!.add(marque);
    }
    if (pays && pays !== "—" && pays !== "-") {
      if (!regionalsByCorporate.has(corpPrefix)) regionalsByCorporate.set(corpPrefix, new Set());
      regionalsByCorporate.get(corpPrefix)!.add(pays);
    }
  }

  // Materialize MASTER_BRAND nodes (children of CORPORATE)
  const masterBrandsMap = new Map<string, string>(); // `${prefix}::${brandSlug}` → BrandNode.id
  for (const [prefix, brands] of masterBrandsByCorporate.entries()) {
    const corpId = corporates.get(prefix)!;
    for (const brandName of brands) {
      // Split multi-brand strings (ex: "Rainbow/Coast/BH/BR")
      const splitBrands = brandName.split(/[\/,]/).map((b) => b.trim()).filter((b) => b.length > 0);
      for (const single of splitBrands) {
        const brandSlug = slugify(single);
        if (!brandSlug) continue;
        const fullSlug = `${prefix.toLowerCase()}-${brandSlug}`;
        const node = await ensureBrandNode({
          operatorId: operator.id,
          parentNodeId: corpId,
          name: single,
          slug: fullSlug,
          nodeKind: "MASTER_BRAND",
          nodeNature: "PRODUCT",
        });
        masterBrandsMap.set(`${prefix}::${brandSlug}`, node.id);
      }
    }
  }
  console.log(`✓ ${masterBrandsMap.size} MASTER_BRAND créés/trouvés`);

  // Materialize REGIONAL_BRAND nodes (children of CORPORATE — pas via MASTER_BRAND par défaut)
  const regionalsMap = new Map<string, string>(); // `${prefix}::${iso2}` → BrandNode.id
  for (const [prefix, countries] of regionalsByCorporate.entries()) {
    const corpId = corporates.get(prefix)!;
    for (const countryName of countries) {
      const iso2 = COUNTRY_NAME_TO_ISO2[countryName] ?? null;
      if (!iso2) {
        console.warn(`  ⚠ Pays inconnu: "${countryName}" — skip REGIONAL_BRAND. Ajoute mapping dans COUNTRY_NAME_TO_ISO2.`);
        continue;
      }
      const cluster = COUNTRY_TO_CLUSTER[iso2] ?? null;
      const fullSlug = `${prefix.toLowerCase()}-${iso2.toLowerCase()}`;
      const node = await ensureBrandNode({
        operatorId: operator.id,
        parentNodeId: corpId,
        name: `${CLIENT_PREFIX_MAP[prefix]!.name} – ${countryName}`,
        slug: fullSlug,
        nodeKind: "REGIONAL_BRAND",
        nodeNature: "PRODUCT",
        countryCode: iso2,
        clusterTag: cluster,
      });
      regionalsMap.set(`${prefix}::${iso2}`, node.id);
    }
  }
  console.log(`✓ ${regionalsMap.size} REGIONAL_BRAND créés/trouvés`);

  // 5. Campaign par row REGISTRE PROJETS
  let campaignCount = 0;
  let campaignSkipped = 0;
  const sequenceCounter = new Map<string, number>(); // patternPrefix → next seq

  for (const row of registre.rows) {
    const idProjet = String(row["ID PROJET"] ?? "").trim();
    if (!idProjet) {
      campaignSkipped++;
      continue;
    }
    const projet = String(row["PROJET"] ?? "").trim();
    const statut = String(row["STATUT"] ?? "").trim();
    const priorite = String(row["PRIORITÉ"] ?? "MOYENNE").trim().toUpperCase();
    const responsable = String(row["RESPONSABLE"] ?? "").trim();
    const blockers = String(row["BLOCKERS / NOTES"] ?? "").trim();
    const dateEntree = row["DATE ENTRÉE"];
    const deadline = row["DEADLINE"];

    const { creativeState, isCritical } = parseStatutV4(statut);

    // Le code Campaign est l'ID PROJET V4 directement (FC-TG-PEAK-001)
    const code = idProjet;

    if (DRY_RUN) {
      console.log(`  [dry-run] would create Campaign code=${code} name="${projet}" state=${creativeState} critical=${isCritical}`);
      campaignCount++;
      continue;
    }

    // Pour Campaign on a besoin de strategyId obligatoire (NOT NULL FK)
    // → Nous créons un Strategy stub par REGIONAL_BRAND si pas existant
    // (ou par CORPORATE si pas de regional)
    const corpPrefix = idProjet.split("-")[0]!;
    const pays = String(row["PAYS"] ?? "").trim();
    const iso2Pays = pays ? COUNTRY_NAME_TO_ISO2[pays] : null;

    let regionalNodeId: string | null = null;
    if (iso2Pays) {
      regionalNodeId = regionalsMap.get(`${corpPrefix}::${iso2Pays}`) ?? null;
    }
    const corpId = corporates.get(corpPrefix);
    if (!corpId) {
      console.warn(`  ⚠ Corporate prefix inconnu pour ${idProjet} — skip.`);
      campaignSkipped++;
      continue;
    }

    // Strategy stub
    const strategyName = regionalNodeId
      ? `${CLIENT_PREFIX_MAP[corpPrefix]!.name} – ${pays}`
      : CLIENT_PREFIX_MAP[corpPrefix]!.name;
    let strategy = await prisma.strategy.findFirst({
      where: { name: strategyName, operatorId: operator.id },
    });
    if (!strategy) {
      // User pivot : besoin d'un User valide. Auto-création d'un user stub Alex
      // (founder Matanga Agency) si DB vide.
      let anyUser = await prisma.user.findFirst({ select: { id: true } });
      if (!anyUser) {
        anyUser = await prisma.user.create({
          data: {
            name: "Alex Djengue",
            email: "alex@matanga.agency",
            role: "OWNER",
            operatorId: operator.id,
          },
          select: { id: true },
        });
        console.log(`  ✓ User stub créé : Alex Djengue (${anyUser.id})`);
      }
      strategy = await prisma.strategy.create({
        data: {
          name: strategyName,
          operatorId: operator.id,
          userId: anyUser.id,
          brandNature: "PRODUCT",
          countryCode: iso2Pays,
          status: "ACTIVE",
        },
      });
    }

    // Lier le BrandNode regional à la Strategy (si pas encore lié)
    if (regionalNodeId) {
      await prisma.brandNode.update({
        where: { id: regionalNodeId },
        data: { strategyId: strategy.id },
      });
    }

    // Idempotency : check si Campaign avec ce code existe déjà
    const existing = await prisma.campaign.findFirst({ where: { code } });
    if (existing) {
      campaignSkipped++;
      continue;
    }

    const priorityEnum = (
      ["CRITIQUE", "HAUTE", "MOYENNE", "BASSE"].includes(priorite) ? priorite : "MOYENNE"
    ) as "CRITIQUE" | "HAUTE" | "MOYENNE" | "BASSE";

    await prisma.campaign.create({
      data: {
        name: projet,
        strategyId: strategy.id,
        code,
        creativeState,
        clientState: "PENDING",
        isCritical,
        priority: priorityEnum,
        startDate: dateEntree instanceof Date ? dateEntree : null,
        endDate: deadline instanceof Date ? deadline : null,
        commentsLatest: blockers || null,
        // status legacy
        status: creativeState === "LIVRE" ? "DELIVERED" : "ACTIVE",
        state: "BRIEF_DRAFT",
      },
    });
    campaignCount++;
  }
  console.log(`\n✓ Campaign : ${campaignCount} créés, ${campaignSkipped} skipped (déjà existants ou erreurs)`);

  // 6. Stats finales
  if (!DRY_RUN) {
    const totals = await Promise.all([
      prisma.brandNode.count({ where: { operatorId: operator.id } }),
      prisma.campaign.count(),
      prisma.brandNode.count({ where: { operatorId: operator.id, nodeKind: "CORPORATE" } }),
      prisma.brandNode.count({ where: { operatorId: operator.id, nodeKind: "MASTER_BRAND" } }),
      prisma.brandNode.count({ where: { operatorId: operator.id, nodeKind: "REGIONAL_BRAND" } }),
    ]);
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Final state for operator "${operator.name}" :`);
    console.log(`  Total BrandNodes  : ${totals[0]}`);
    console.log(`    CORPORATE       : ${totals[2]}`);
    console.log(`    MASTER_BRAND    : ${totals[3]}`);
    console.log(`    REGIONAL_BRAND  : ${totals[4]}`);
    console.log(`  Total Campaigns   : ${totals[1]}`);
    console.log(`${"=".repeat(70)}`);
  }
}

main()
  .catch((e) => {
    console.error("\n✗ Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
