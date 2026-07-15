/**
 * ADR-0151 — Base de marques de Seshat : verrous HARD.
 *  1. Single-writer : `BrandFootprintSnapshot` ne s'écrit QUE dans le service
 *     `seshat/brand-registry/` (le répertoire d'empreintes publiques).
 *  2. Éphéméralité par-client préservée : le funnel ne réintroduit pas
 *     d'écriture `followerSnapshot` avec `strategyId` null (garde au writer).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const SERVICE_DIR = "src/server/services/seshat/brand-registry/";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

describe("ADR-0151 — single-writer base de marques Seshat", () => {
  it("aucune écriture BrandFootprintSnapshot hors du service brand-registry", () => {
    const re = /\bbrandFootprintSnapshot\s*\.\s*(create|createMany|upsert|update|updateMany)\s*\(/;
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (rel.startsWith(SERVICE_DIR)) continue;
      if (re.test(readFileSync(file, "utf8"))) violations.push(rel);
    }
    expect(violations, `écritures hors single-writer :\n${violations.join("\n")}`).toEqual([]);
  });

  it("persistSnapshot garde l'éphéméralité par-client (skip si strategyId null)", () => {
    const src = readFileSync(join(SRC, "server", "services", "anubis", "social-audit.ts"), "utf8");
    // La garde doit précéder l'écriture followerSnapshot.create.
    const guardIdx = src.search(/if\s*\(\s*!\s*strategyId\s*\)\s*return/);
    const writeIdx = src.search(/followerSnapshot\s*\.\s*create/);
    expect(guardIdx, "garde `if (!strategyId) return` absente").toBeGreaterThanOrEqual(0);
    expect(writeIdx).toBeGreaterThanOrEqual(0);
    expect(guardIdx, "la garde doit précéder l'écriture").toBeLessThan(writeIdx);
  });
});
