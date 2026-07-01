/**
 * prisma/seed.mjs — WP-009 : seeds des référentiels (rebuild v7).
 *
 * Seed idempotent des tables de référence marché (docs/REBUILD-PLAN.md §5 WP-009) :
 *   1. Country            — pays d'Afrique francophone cibles + marchés de référence
 *                           (porté de legacy/prisma/seed-countries.ts — liste + devises réelles).
 *   2. ZoneIndex "pricing" — grille par zone monétaire (UEMOA / CEMAC), montants FCFA
 *                           calculés par la formule déterministe legacy
 *                           (legacy/src/server/services/monetization/compute-price.ts).
 *   3. ZoneIndex "cost-of-living" — indices coût de la vie par pays (CM = 100), portés de
 *                           legacy/src/server/services/financial-brain/action-costing/seed-data.ts.
 *
 * Doctrine (ADR-0087 legacy, reconduite v7) : jamais de barème en dur dans le code —
 * tout montant vit ici, en données, avec source + validFrom.
 *
 * Exécution : DATABASE_URL=... node prisma/seed.mjs
 * Idempotent : Country en upsert par code ; ZoneIndex en findFirst+create/update par clé
 * naturelle (family, countryCode, key, validFrom) — la table n'a pas d'unique composite.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Même signature d'instanciation que l'app (cf. legacy/src/lib/db.ts) :
// Prisma 7 driver adapter — la connexion passe par le constructeur, jamais par le schema.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — le driver adapter Prisma l'exige à la construction.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Date de validité fixe pour l'idempotence des ZoneIndex (clé naturelle stable). */
const VALID_FROM = new Date("2026-07-01");

// ————————————————————————————————————————————————————————————————————————
// 1. Country — porté de legacy/prisma/seed-countries.ts (COUNTRIES const).
//    Périmètre : Afrique francophone cible (UEMOA + CEMAC) + CD/MA/DZ/TN + FR
//    (marché de référence pricing). GW (Guinée-Bissau, UEMOA) était ABSENT du
//    legacy — non seedé ici pour ne pas inventer de donnée.
//    NB : DZ était mappé "USD" en legacy avec le commentaire explicite
//    « uses DZD locally; we map to USD for cross-currency math placeholder » —
//    le hack n'a plus lieu d'être en v7 (pas de table Currency/usdRate) : DZD.
// ————————————————————————————————————————————————————————————————————————

const COUNTRIES = [
  // CEMAC (XAF)
  { code: "CM", name: "Cameroun", currency: "XAF", zone: "CEMAC" },
  { code: "GA", name: "Gabon", currency: "XAF", zone: "CEMAC" },
  { code: "CG", name: "Congo", currency: "XAF", zone: "CEMAC" },
  { code: "TD", name: "Tchad", currency: "XAF", zone: "CEMAC" },
  { code: "CF", name: "Centrafrique", currency: "XAF", zone: "CEMAC" },
  { code: "GQ", name: "Guinée Équatoriale", currency: "XAF", zone: "CEMAC" },
  // UEMOA (XOF)
  { code: "SN", name: "Sénégal", currency: "XOF", zone: "UEMOA" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", zone: "UEMOA" },
  { code: "BJ", name: "Bénin", currency: "XOF", zone: "UEMOA" },
  { code: "BF", name: "Burkina Faso", currency: "XOF", zone: "UEMOA" },
  { code: "ML", name: "Mali", currency: "XOF", zone: "UEMOA" },
  { code: "NE", name: "Niger", currency: "XOF", zone: "UEMOA" },
  { code: "TG", name: "Togo", currency: "XOF", zone: "UEMOA" },
  // Afrique francophone hors zones CFA
  { code: "CD", name: "RDC", currency: "CDF", zone: null },
  { code: "MA", name: "Maroc", currency: "MAD", zone: null },
  { code: "DZ", name: "Algérie", currency: "DZD", zone: null },
  { code: "TN", name: "Tunisie", currency: "TND", zone: null },
  // Marché de référence pricing (standard market legacy, diaspora)
  { code: "FR", name: "France", currency: "EUR", zone: null },
];

// ————————————————————————————————————————————————————————————————————————
// 2. ZoneIndex famille "pricing" — granularité ZONE MONÉTAIRE : countryCode
//    porte le code de zone (UEMOA / CEMAC), joignable via Country.zone.
//
//    Montants FCFA/mois RÉELS du legacy, reproduits depuis la formule
//    déterministe compute-price.ts (v6.27) — pas de grille statique en legacy
//    (doctrine ADR-0087), la grille EST la formule :
//      prix = amountSpu × facteur_marché × fx(EUR→FCFA), arrondi au 1000.
//      · facteur = clamp((PPI_pays / PPI_FR=800)^0.6, 0.30, 1.50)
//        → tous les marchés ancres UEMOA/CEMAC (CM 100, CI 105, SN 95, BJ 80…)
//          clampent au plancher 0.30 → grille uniforme par zone.
//      · fx = usdRate_FCFA(600) / usdRate_EUR(0.92) = 652.17 (XOF ≡ XAF, parité).
//      · COCKPIT_MONTHLY 39 SPU → 39 × 0.30 × 652.17 = 7 630 → 8 000 FCFA/mois.
//      · RETAINER_BASE  299 SPU → 299 × 0.30 × 652.17 = 58 500 → 59 000 FCFA/mois.
//
//    ⚠ Aucun plan TRIMESTRIEL n'existait en legacy (billing ONE_TIME | MONTHLY
//    uniquement) : plan.retainer.quarterly = 3 × RETAINER_BASE mensuel legacy,
//    marqué placeholder-operator-to-confirm.
// ————————————————————————————————————————————————————————————————————————

const PRICING_SOURCE =
  "legacy compute-price v6.27 (SPU × facteur 0.30 × fx EUR→FCFA 652.17, arrondi au 1000)";
const PRICING_QUARTERLY_SOURCE =
  "placeholder-operator-to-confirm (3 × RETAINER_BASE legacy 59 000 FCFA/mois — aucun plan trimestriel en legacy)";

const PRICING_INDICES = [
  { countryCode: "UEMOA", key: "plan.cockpit.monthly", value: 8000, source: PRICING_SOURCE },
  { countryCode: "UEMOA", key: "plan.retainer.quarterly", value: 177000, source: PRICING_QUARTERLY_SOURCE },
  { countryCode: "CEMAC", key: "plan.cockpit.monthly", value: 8000, source: PRICING_SOURCE },
  { countryCode: "CEMAC", key: "plan.retainer.quarterly", value: 177000, source: PRICING_QUARTERLY_SOURCE },
];

// ————————————————————————————————————————————————————————————————————————
// 3. ZoneIndex famille "cost-of-living" — indices coût de la vie (CM = 100),
//    sous-ensemble représentatif porté tel quel de ZONE_INDEX_SEED
//    (legacy action-costing/seed-data.ts, famille COST_OF_LIVING).
// ————————————————————————————————————————————————————————————————————————

const COL_SOURCE = "legacy seed-data.ts — Numbeo / Banque Mondiale (indicatif 2026)";

const COST_OF_LIVING_INDICES = [
  { countryCode: "CM", value: 100 },
  { countryCode: "CI", value: 105 },
  { countryCode: "SN", value: 110 },
  { countryCode: "GA", value: 130 },
  { countryCode: "BF", value: 90 },
  { countryCode: "TG", value: 95 },
  { countryCode: "BJ", value: 95 },
  { countryCode: "ML", value: 92 },
  { countryCode: "CG", value: 120 },
  { countryCode: "FR", value: 320 },
].map((r) => ({ ...r, key: "general", source: COL_SOURCE }));

// ————————————————————————————————————————————————————————————————————————
// Mécanique de seed
// ————————————————————————————————————————————————————————————————————————

async function seedCountries() {
  let n = 0;
  for (const c of COUNTRIES) {
    await db.country.upsert({
      where: { code: c.code },
      create: { code: c.code, name: c.name, currency: c.currency, zone: c.zone },
      update: { name: c.name, currency: c.currency, zone: c.zone },
    });
    n++;
  }
  return n;
}

/**
 * ZoneIndex n'a pas d'unique composite : idempotence par findFirst sur la clé
 * naturelle (family, countryCode, key, validFrom), create si absent, update si
 * la valeur/source a divergé (le re-run converge toujours vers le canon).
 */
async function ensureZoneIndex({ family, countryCode, key, value, source }) {
  const existing = await db.zoneIndex.findFirst({
    where: { family, countryCode, key, validFrom: VALID_FROM },
  });
  if (!existing) {
    await db.zoneIndex.create({
      data: { family, countryCode, key, value, source, validFrom: VALID_FROM },
    });
    return "created";
  }
  if (existing.value !== value || existing.source !== source) {
    await db.zoneIndex.update({ where: { id: existing.id }, data: { value, source } });
    return "updated";
  }
  return "unchanged";
}

async function seedZoneIndices(family, rows) {
  const counts = { created: 0, updated: 0, unchanged: 0 };
  for (const row of rows) {
    counts[await ensureZoneIndex({ family, ...row })]++;
  }
  return counts;
}

async function main() {
  const countries = await seedCountries();
  const pricing = await seedZoneIndices("pricing", PRICING_INDICES);
  const col = await seedZoneIndices("cost-of-living", COST_OF_LIVING_INDICES);

  const fmt = (c) => `${c.created} créés · ${c.updated} mis à jour · ${c.unchanged} inchangés`;
  console.log("[seed] Récapitulatif WP-009 (référentiels) :");
  console.log(`[seed]   Country                    : ${countries} upserts (${COUNTRIES.length} pays)`);
  console.log(`[seed]   ZoneIndex pricing          : ${PRICING_INDICES.length} lignes — ${fmt(pricing)}`);
  console.log(`[seed]   ZoneIndex cost-of-living   : ${COST_OF_LIVING_INDICES.length} lignes — ${fmt(col)}`);
  console.log(
    `[seed]   Totaux en base             : ${await db.country.count()} Country · ${await db.zoneIndex.count()} ZoneIndex`,
  );
}

try {
  await main();
} catch (err) {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
