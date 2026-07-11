#!/usr/bin/env node
/**
 * Applicateur de migrations Prisma — ZÉRO dépendance CLI.
 *
 * POURQUOI : l'image standalone Next élague `node_modules` (trace). Le CLI
 * Prisma n'y est pas fonctionnel — il lui manque le WASM (`.bin/prisma` est un
 * symlink déréférencé par Docker COPY → cherche le WASM au mauvais endroit) ET
 * les deps de `@prisma/config` (`effect` 34 Mo, `c12`, …) que `prisma.config.ts`
 * charge. Deux incidents prod (2026-07-10 money-path 503, 2026-07-11 dashboard
 * cockpit vide) sont partis de là. Recopier tout l'arbre CLI dans le runner est
 * fragile et lourd — à contre-emploi du standalone.
 *
 * CE runner n'utilise QUE `pg` (déjà tracé dans l'image, l'app en dépend via
 * `@prisma/adapter-pg`) et reproduit le cœur de `prisma migrate deploy` :
 *   - lit le `migration.sql` de chaque dossier `prisma/migrations/<timestamp>_...`
 *     en ordre lexical (= chronologique, le préfixe timestamp le garantit),
 *   - saute celles déjà dans `_prisma_migrations` (finished_at non nul),
 *   - applique chaque pending dans UNE transaction,
 *   - l'enregistre avec le checksum sha256 du fichier (algo Prisma : sha256 hex
 *     du contenu) → un futur `migrate deploy` réel les voit appliquées.
 *
 * Best-effort côté entrypoint : un échec sort en code ≠ 0, l'entrypoint logue
 * et démarre quand même le serveur (une panne totale est pire).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { createRequire } from "node:module";

const MIGRATIONS_DIR = "prisma/migrations";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL absent — migrations non appliquées.");
  process.exit(1);
}
if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`[migrate] ${MIGRATIONS_DIR} introuvable — rien à appliquer.`);
  process.exit(1);
}

// `pg` est tracé dans le standalone (l'app l'utilise) — require CJS depuis ESM.
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const client = new Client({ connectionString: url });
await client.connect();

try {
  // Table de suivi (schéma identique à celui que crée le CLI Prisma).
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);

  const appliedRows = await client.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
  );
  const applied = new Set(appliedRows.rows.map((r) => r.migration_name));

  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort(); // préfixe timestamp → ordre lexical == chronologique

  let count = 0;
  for (const name of dirs) {
    if (applied.has(name)) continue;
    const file = join(MIGRATIONS_DIR, name, "migration.sql");
    if (!existsSync(file)) continue;

    const content = readFileSync(file, "utf8");
    const checksum = createHash("sha256").update(content).digest("hex");

    console.log(`[migrate] apply ${name}…`);
    try {
      await client.query("BEGIN");
      // `pg` protocole simple (query sans params) → multi-statements + DO $$
      // dollar-quoted OK, comme un fichier migration.sql tel quel.
      await client.query(content);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), now(), 1)`,
        [randomUUID(), checksum, name],
      );
      await client.query("COMMIT");
      count++;
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`migration ${name} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`[migrate] ${count} migration(s) appliquée(s) sur ${dirs.length} (le reste déjà en base).`);
} finally {
  await client.end();
}
