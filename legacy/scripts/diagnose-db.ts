#!/usr/bin/env tsx
/**
 * Database diagnosis script — La Fusée ops utility (post-Phase 21).
 *
 * Usage : `npm run db:diag`
 *
 * Diagnostique en cascade les causes probables de l'erreur
 * `User was denied access on the database '(not available)'` (cf. logs Next.js
 * post-Phase 21) :
 *
 *   1. DATABASE_URL définie ?
 *   2. URL parse-able ? (host, port, db, user)
 *   3. Connection Postgres ouvre ?
 *   4. User a SELECT sur les tables critiques ?
 *   5. Migrations Prisma applied vs pending ?
 *
 * Output structuré ✅/❌/⚠️ avec aide contextuelle. Le script NE MODIFIE
 * RIEN — c'est un diagnostic pur, safe à exécuter sur n'importe quel env
 * (local, staging, prod). Les credentials ne sont JAMAIS loggués.
 *
 * Cf. ADR-0075 (secrets stay in env vars) — ce script est cohérent : il
 * lit `process.env.DATABASE_URL` et redacts les credentials dans les logs.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// ANSI colors for output legibility
const C = {
  ok: "\x1b[32m✅",
  fail: "\x1b[31m❌",
  warn: "\x1b[33m⚠️ ",
  info: "\x1b[34mℹ️ ",
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

// ──────────────────────────────────────────────────────────────────────
// Env file loader — Next.js charge auto .env.local au boot, mais tsx
// standalone non. On charge `.env.local` (puis `.env` en fallback) au
// démarrage du script pour reproduire le même contexte que `npm run dev`.
// Idempotent : ne touche pas aux env vars déjà définies par le shell.
// ──────────────────────────────────────────────────────────────────────
function loadEnvFile(filePath: string): { loaded: number; path: string } {
  if (!existsSync(filePath)) return { loaded: 0, path: filePath };
  const raw = readFileSync(filePath, "utf8");
  let loaded = 0;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes (single or double).
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
      loaded++;
    }
  }
  return { loaded, path: filePath };
}
// Order matches Next.js : .env.local > .env (later does not override earlier).
const cwd = process.cwd();
const envLocal = loadEnvFile(resolve(cwd, ".env.local"));
const envBase = loadEnvFile(resolve(cwd, ".env"));

// ──────────────────────────────────────────────────────────────────────
// CheckResult model + accumulator + emit helpers (top-level for closure
// access from main()).
// ──────────────────────────────────────────────────────────────────────
interface CheckResult {
  ok: boolean;
  level: "ok" | "fail" | "warn" | "info";
  title: string;
  detail?: string;
  fix?: string;
}

const results: CheckResult[] = [];

function pass(title: string, detail?: string): void {
  results.push({ ok: true, level: "ok", title, detail });
}
function fail(title: string, detail: string, fix: string): void {
  results.push({ ok: false, level: "fail", title, detail, fix });
}
function warn(title: string, detail: string, fix?: string): void {
  results.push({ ok: false, level: "warn", title, detail, fix });
}
function info(title: string, detail: string): void {
  results.push({ ok: true, level: "info", title, detail });
}

async function main(): Promise<void> {
  // Surface lequel des deux fichiers a été chargé en haut du diagnostic.
  if (envLocal.loaded > 0) info("Env loaded — .env.local", `${envLocal.loaded} vars`);
  else if (envBase.loaded > 0) info("Env loaded — .env (fallback)", `${envBase.loaded} vars`);
  else if (!existsSync(envLocal.path) && !existsSync(envBase.path)) {
    warn(
      "Aucun fichier .env / .env.local trouvé",
      `Cherché : ${envLocal.path}, ${envBase.path}`,
      "Crée .env.local depuis .env.example. Si tu utilises un secret manager (Vercel, doppler), tes vars sont injectées au runtime — c'est OK.",
    );
  }

// ──────────────────────────────────────────────────────────────────────
// 1. DATABASE_URL présente
// ──────────────────────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!dbUrl) {
  fail(
    "DATABASE_URL absente",
    "process.env.DATABASE_URL n'est pas défini.",
    "Configure DATABASE_URL dans .env.local (dev) ou Vercel Dashboard (prod). Format :\n" +
      "  DATABASE_URL=\"postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public\"",
  );
} else {
  pass("DATABASE_URL définie", `(${redact(dbUrl)})`);
}

if (!directUrl && dbUrl?.includes("pgbouncer=true")) {
  warn(
    "DIRECT_URL recommandée pour migrations",
    "Tu utilises pgbouncer (connection pooler). Prisma migrate exige une connexion directe.",
    "Ajoute DIRECT_URL avec la même auth mais sans pgbouncer (port 5432 typique).",
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2. Parse de l'URL
// ──────────────────────────────────────────────────────────────────────
let parsed: URL | null = null;
if (dbUrl) {
  try {
    parsed = new URL(dbUrl);
    pass(
      "DATABASE_URL parse",
      `host=${parsed.hostname} port=${parsed.port || "(default)"} db=${parsed.pathname.slice(1).split("?")[0] || "(none)"} user=${parsed.username || "(none)"}`,
    );
    if (!parsed.pathname || parsed.pathname === "/") {
      fail(
        "Nom de DB manquant dans DATABASE_URL",
        "L'URL ne contient pas le nom de la base après le port. C'est probablement la cause du `User was denied access on the database '(not available)'`.",
        "Ajoute /<DB_NAME> avant le ? — ex: postgresql://user:pwd@host:5432/lafusee?schema=public",
      );
    }
  } catch (e) {
    fail(
      "DATABASE_URL invalide",
      `Parse failed: ${e instanceof Error ? e.message : String(e)}`,
      "Vérifie le format. Caractères spéciaux dans le password ? URL-encode-les (% notation).",
    );
  }
}

// ──────────────────────────────────────────────────────────────────────
// 3. Connection Postgres (via pg natif — pas de Prisma adapter overhead).
// ──────────────────────────────────────────────────────────────────────
let canConnect = false;
let pgClient: { query: (sql: string) => Promise<{ rows: unknown[] }>; end: () => Promise<void> } | null = null;
let pgError: string | null = null;
if (dbUrl) {
  try {
    const { Client } = (await import("pg")) as unknown as {
      Client: new (config: { connectionString: string }) => {
        connect: () => Promise<void>;
        query: (sql: string) => Promise<{ rows: unknown[] }>;
        end: () => Promise<void>;
      };
    };
    pgClient = new Client({ connectionString: dbUrl });
    await pgClient.connect();
    await pgClient.query("SELECT NOW()");
    canConnect = true;
    pass("Connexion Postgres ouverte", "SELECT NOW() OK (via pg natif)");
  } catch (e) {
    pgError = e instanceof Error ? e.message : String(e);
    if (pgError.match(/role .* does not exist/i)) {
      const roleMatch = pgError.match(/role "([^"]+)" does not exist/i);
      const role = roleMatch?.[1] ?? "(unknown)";
      fail(
        `Rôle Postgres "${role}" inexistant`,
        `Postgres tourne sur localhost mais le rôle "${role}" n'existe pas dans cette instance. Typique sur Mac/Homebrew (Postgres crée un user au nom de ton compte système au lieu de "postgres").`,
        `3 options pour fixer :\n` +
          `   (a) Créer le rôle "${role}" + DB lafusee :\n` +
          `       createuser -s ${role} && psql -d postgres -c "ALTER USER ${role} WITH PASSWORD 'password';" && createdb -O ${role} lafusee\n` +
          `   (b) Utiliser ton user système dans .env.local (remplace ${role} par ton username):\n` +
          `       DATABASE_URL="postgresql://$(whoami)@localhost:5432/lafusee"\n` +
          `   (c) Lancer Postgres en Docker avec le rôle attendu :\n` +
          `       docker run --name lafusee-pg -e POSTGRES_PASSWORD=password -e POSTGRES_USER=postgres -e POSTGRES_DB=lafusee -p 5432:5432 -d postgres:16`,
      );
    } else if (pgError.includes("denied access") || pgError.includes("authentication failed") || pgError.includes("password authentication failed")) {
      fail(
        "Authentication Postgres rejetée",
        "Le user/password n'a pas accès. C'est exactement le `User was denied access` que tu vois dans les logs runtime.",
        "Vérifie côté Postgres / Supabase / Neon dashboard : (a) le user existe ; (b) le password matche ; (c) le user a CONNECT sur la DB ; (d) le pg_hba.conf accepte ton host.",
      );
    } else if (pgError.includes("ECONNREFUSED")) {
      fail(
        "Postgres injoignable",
        `Connection refused (host:port absent ou Postgres pas démarré). Détail : ${pgError.slice(0, 200)}`,
        "Vérifie que Postgres tourne (ex: `brew services start postgresql` / `docker ps`). Pour Supabase/Vercel/Neon, vérifie l'URL dans le dashboard.",
      );
    } else if (pgError.includes("does not exist") && pgError.includes("database")) {
      fail(
        "Database introuvable",
        pgError.slice(0, 200),
        "La DB nommée dans DATABASE_URL n'existe pas. Crée-la : `createdb <DB_NAME>` (Postgres local) ou via le dashboard du provider.",
      );
    } else {
      fail(
        "Connexion Postgres échouée",
        pgError.slice(0, 300),
        "Investigate le message ci-dessus. Souvent : URL malformée, password URL-encoded incorrect, certificat SSL.",
      );
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// 4. Tables critiques — SELECT smoke test
// ──────────────────────────────────────────────────────────────────────
const CRITICAL_TABLES = [
  "Strategy",
  "Pillar",
  "ErrorEvent", // surfaced dans le log original
  "OracleSection", // Phase 21 F-B
  "Notification",
  "User",
];
if (canConnect && pgClient) {
  const missing: string[] = [];
  const denied: string[] = [];
  for (const tbl of CRITICAL_TABLES) {
    try {
      await pgClient.query(`SELECT 1 FROM "${tbl}" LIMIT 1`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist") || (msg.includes("relation") && msg.includes("not found"))) {
        missing.push(tbl);
      } else if (msg.includes("permission denied") || msg.includes("denied access")) {
        denied.push(tbl);
      } else {
        warn(`Table ${tbl} — probe inattendue`, msg.slice(0, 150));
      }
    }
  }
  if (missing.length > 0) {
    fail(
      `Tables manquantes (${missing.length}/${CRITICAL_TABLES.length})`,
      `Manquantes : ${missing.join(", ")}`,
      "Migrations Prisma pas appliquées sur cet env. Run : `npx prisma migrate deploy` (prod) ou `npx prisma migrate dev` (local).",
    );
  } else if (denied.length > 0) {
    fail(
      `Permissions GRANT manquantes (${denied.length}/${CRITICAL_TABLES.length})`,
      `Refusées : ${denied.join(", ")}`,
      "Le user Postgres n'a pas SELECT/INSERT/UPDATE sur ces tables. Pour Supabase, vérifie le rôle `postgres` ou `service_role`. Pour Postgres self-hosted : `GRANT ALL ON ALL TABLES IN SCHEMA public TO <user>;`.",
    );
  } else {
    pass(`Tables critiques accessibles (${CRITICAL_TABLES.length}/${CRITICAL_TABLES.length})`, CRITICAL_TABLES.join(", "));
  }
}

// ──────────────────────────────────────────────────────────────────────
// 5. Migrations Prisma : applied vs pending
// ──────────────────────────────────────────────────────────────────────
const MIGRATIONS_DIR = resolve(process.cwd(), "prisma/migrations");
if (existsSync(MIGRATIONS_DIR)) {
  const localMigrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "migration_lock.toml")
    .map((d) => d.name)
    .sort();
  if (canConnect && pgClient) {
    try {
      const result = await pgClient.query(
        'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at',
      );
      const applied = result.rows as { migration_name: string }[];
      const appliedSet = new Set(applied.map((r) => r.migration_name));
      const pending = localMigrations.filter((m) => !appliedSet.has(m));
      if (pending.length > 0) {
        fail(
          `Migrations pending (${pending.length})`,
          `Locales mais pas appliquées : ${pending.slice(0, 5).join(", ")}${pending.length > 5 ? "…" : ""}`,
          "Run : `npx prisma migrate deploy` pour les appliquer toutes.",
        );
      } else {
        pass(
          `Migrations à jour (${applied.length} applied, 0 pending)`,
          applied.length > 3 ? `Dernière : ${applied[applied.length - 1]?.migration_name}` : applied.map((r) => r.migration_name).join(", "),
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist")) {
        warn(
          "Table _prisma_migrations introuvable",
          `${localMigrations.length} migrations locales mais la table de tracking Prisma est absente.`,
          "Initialise le tracking : `npx prisma migrate deploy` (créera la table + applique tout).",
        );
      } else {
        warn("Probe migrations échoué", msg.slice(0, 200));
      }
    }
  } else {
    info(
      `${localMigrations.length} migrations locales détectées`,
      "Connexion Postgres KO — impossible de comparer applied vs pending. Fix la connexion d'abord.",
    );
  }
} else {
  warn(
    "prisma/migrations/ absent",
    "Pas de dossier de migrations local — le projet n'utilise pas migrate ou tu es au mauvais cwd.",
  );
}

// Cleanup pg client.
if (pgClient) {
  try { await pgClient.end(); } catch { /* best-effort */ }
}

// ──────────────────────────────────────────────────────────────────────
// Output
// ──────────────────────────────────────────────────────────────────────
console.log(`\n${C.bold}🪶 Diagnostic DB La Fusée${C.reset}\n`);

const fails = results.filter((r) => r.level === "fail");
const warns = results.filter((r) => r.level === "warn");
const oks = results.filter((r) => r.level === "ok");
const infos = results.filter((r) => r.level === "info");

for (const r of results) {
  const icon = C[r.level];
  console.log(`${icon}${C.reset} ${C.bold}${r.title}${C.reset}`);
  if (r.detail) console.log(`   ${C.dim}${r.detail}${C.reset}`);
  if (r.fix) console.log(`   ${C.warn}→ ${r.fix}${C.reset}`);
  console.log();
}

console.log(`${C.bold}Bilan :${C.reset} ${C.ok}${oks.length} OK${C.reset}, ${C.warn}${warns.length} warnings${C.reset}, ${C.fail}${fails.length} fails${C.reset}, ${C.info}${infos.length} info${C.reset}\n`);

if (fails.length > 0) {
  console.log(`${C.fail}❌${C.reset} Au moins un check critique a échoué. Fix les ${C.bold}fails${C.reset} ci-dessus dans l'ordre — ils sont en cascade (1 → 5).`);
  process.exit(1);
}
console.log(`${C.ok}✅${C.reset} Aucun check critique en échec. Si tu vois encore des erreurs runtime, partage le stack précis.`);
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────
function redact(url: string): string {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

// Launch — déclaré APRÈS toutes les const/function pour éviter la TDZ
// (const results = []; pass/fail/warn/info en aval de main()).
main().catch((err) => {
  console.error(`${C.fail}${C.reset} Diagnostic crashed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
});
