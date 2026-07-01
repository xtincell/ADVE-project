#!/usr/bin/env node
/**
 * Audit + (optionnel) normalize les roles `User.role`.
 *
 * Usage :
 *   node scripts/audit-user-roles.mjs              # audit only (lecture)
 *   node scripts/audit-user-roles.mjs --apply      # normalise les outliers vers 'USER'
 *
 * Stratégie identique à la migration `20260503020000_normalize_user_roles` :
 * tout role hors set canonique (ou NULL) devient 'USER' ("open by default").
 *
 * Cf. CLAUDE.md / src/proxy.ts COCKPIT_ROLES + CREATOR_ROLES.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const CANONICAL_ROLES = new Set([
  "ADMIN",
  "OPERATOR",
  "USER",
  "FOUNDER",
  "BRAND",
  "CLIENT_RETAINER",
  "CLIENT_STATIC",
  "CREATOR",
  "FREELANCE",
  "AGENCY",
]);

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL absent (.env / .env.local). Abort.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const grouped = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
  });

  console.log("\n=== Audit User.role ===\n");
  let outlierCount = 0;
  for (const row of grouped) {
    const role = row.role ?? "<null>";
    const count = row._count._all;
    const status = row.role && CANONICAL_ROLES.has(row.role) ? "OK    " : "REMAP→USER";
    if (status !== "OK    ") outlierCount += count;
    console.log(`  ${status}  ${role.padEnd(20)} (${count})`);
  }

  if (outlierCount === 0) {
    console.log("\n✓ Aucun role outlier — la base est déjà normalisée.\n");
    return;
  }

  console.log(`\n→ ${outlierCount} user(s) avec un role hors set canonique.`);

  if (!APPLY) {
    console.log("  Lance avec --apply pour normaliser vers 'USER'.\n");
    return;
  }

  const result = await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET role = 'USER'
    WHERE role IS NULL
       OR role NOT IN ('ADMIN','OPERATOR','USER','FOUNDER','BRAND','CLIENT_RETAINER','CLIENT_STATIC','CREATOR','FREELANCE','AGENCY')
  `);
  console.log(`\n✓ ${result} user(s) normalisé(s) vers 'USER'.\n`);
}

main()
  .catch((err) => {
    console.error("Erreur audit-user-roles:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
