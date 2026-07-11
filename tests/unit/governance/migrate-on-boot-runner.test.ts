/**
 * Migrate-on-boot — le CLI Prisma est INUTILISABLE dans l'image standalone
 * (trace élaguée : WASM absent + deps `@prisma/config`/`effect` manquants).
 * Deux incidents prod en sont partis (2026-07-10 money-path 503, 2026-07-11
 * dashboard cockpit vide sur `Strategy.marketScale` non migrée). Le boot
 * applique donc les migrations via un runner maison zéro-dep (`pg` seul).
 *
 * Ces verrous empêchent un retour au CLI cassé dans l'entrypoint / le Dockerfile.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const entrypoint = readFileSync("scripts/docker-entrypoint.sh", "utf8");
const runner = readFileSync("scripts/apply-migrations.mjs", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");

describe("entrypoint — n'utilise plus le CLI Prisma (cassé en standalone)", () => {
  it("le boot invoque le runner maison, pas `prisma migrate deploy`", () => {
    expect(entrypoint).toContain("scripts/apply-migrations.mjs");
    expect(entrypoint).not.toMatch(/npx\s+prisma\s+migrate/);
    expect(entrypoint).not.toMatch(/prisma\/build\/index\.js\s+migrate/);
  });

  it("reste best-effort — un échec ne tue JAMAIS le boot", () => {
    expect(entrypoint).toContain("DÉMARRAGE QUAND MÊME");
    expect(entrypoint).toContain("SKIP_MIGRATE_ON_BOOT");
    // le serveur démarre toujours en fin de script
    expect(entrypoint).toMatch(/exec node server\.js\s*$/);
  });
});

describe("runner — zéro dépendance CLI, juste pg", () => {
  it("n'importe QUE `pg` (pas le CLI Prisma ni @prisma/config) — statements, pas commentaires", () => {
    expect(runner).toMatch(/require\(["']pg["']\)/);
    // aucun import/require RÉEL du CLI ou de @prisma/* (les mentions en
    // commentaire — pour documenter le bug — sont autorisées).
    expect(runner).not.toMatch(/require\(["']@prisma\//);
    expect(runner).not.toMatch(/from\s+["']@prisma\//);
    expect(runner).not.toMatch(/require\(["']prisma\/build/);
    expect(runner).not.toMatch(/from\s+["']prisma\/build/);
  });

  it("suit `_prisma_migrations` avec un checksum sha256 (compat CLI Prisma)", () => {
    expect(runner).toContain('"_prisma_migrations"');
    expect(runner).toContain('createHash("sha256")');
    // applique en ordre lexical (= chronologique via préfixe timestamp)
    expect(runner).toContain(".sort()");
    // saute les migrations déjà finies
    expect(runner).toContain("finished_at IS NOT NULL");
  });

  it("échoue proprement (exit 1) sans DATABASE_URL — pas de crash silencieux", () => {
    expect(runner).toContain("DATABASE_URL absent");
    expect(runner).toContain("process.exit(1)");
  });
});

describe("Dockerfile — image standalone sans le CLI Prisma cassé", () => {
  it("copie le runner + les fichiers de migration au runner stage", () => {
    expect(dockerfile).toContain("scripts/apply-migrations.mjs");
    expect(dockerfile).toMatch(/COPY[^\n]+\/app\/prisma \.\/prisma/);
  });

  it("ne recopie plus le shim `.bin/prisma` déréférencé (source du bug WASM)", () => {
    expect(dockerfile).not.toContain("node_modules/.bin/prisma");
  });
});
