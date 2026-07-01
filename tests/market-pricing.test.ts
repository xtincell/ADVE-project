import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FALLBACK_ZONE,
  isPlaceholderSource,
  PLAN_KEYS,
  PLAN_LABELS,
  PLAN_PRICING_KEYS,
  PRICING_FAMILY,
} from "@/server/market";

/**
 * Partie PURE de market.ts (WP-007) — le lookup DB est vérifié en smoke
 * Postgres ; ici on verrouille les invariants sans IO :
 *   - détection placeholder (badge « à confirmer ») ;
 *   - cohérence clés de plan ↔ seed (le code et prisma/seed.mjs doivent
 *     parler des MÊMES clés, sinon le pricing devient introuvable en silence).
 */

describe("isPlaceholderSource — badge « à confirmer »", () => {
  it("détecte 'placeholder' où qu'il soit dans la source, sans casse", () => {
    expect(isPlaceholderSource("placeholder-operator-to-confirm (3 × RETAINER_BASE…)")).toBe(true);
    expect(isPlaceholderSource("Grille 2027 — PLACEHOLDER en attente devis")).toBe(true);
  });

  it("ne badge pas une source réelle", () => {
    expect(
      isPlaceholderSource("legacy compute-price v6.27 (SPU × facteur 0.30 × fx EUR→FCFA 652.17)"),
    ).toBe(false);
  });
});

describe("cohérence code ↔ seed des référentiels pricing", () => {
  const seed = readFileSync(new URL("../prisma/seed.mjs", import.meta.url), "utf8");

  it("chaque clé de plan du code existe dans prisma/seed.mjs", () => {
    for (const plan of PLAN_KEYS) {
      expect(seed).toContain(`"${PLAN_PRICING_KEYS[plan]}"`);
    }
  });

  it("la zone de repli et la famille pricing sont celles du seed", () => {
    expect(seed).toContain(`"${FALLBACK_ZONE}"`);
    expect(seed).toContain(`seedZoneIndices("${PRICING_FAMILY}"`);
  });

  it("les 2 plans du catalogue ont clé + label", () => {
    expect(PLAN_KEYS).toEqual(["cockpit", "retainer"]);
    expect(PLAN_LABELS.cockpit).toBe("Cockpit");
    expect(PLAN_LABELS.retainer).toBe("Retainer");
  });

  it("aucun montant en dur dans market.ts ni finance.ts (doctrine ADR-0087 reconduite)", () => {
    for (const file of ["../src/server/market.ts", "../src/server/finance.ts"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      // Les seuls littéraux numériques admis : durées (30/92 j), conversions
      // temps, tailles de référence — jamais un prix (8000, 177000, 59000…).
      expect(source).not.toMatch(/8[\s_]?000|177[\s_]?000|59[\s_]?000/);
    }
  });
});
