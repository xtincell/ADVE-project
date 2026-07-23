/**
 * Verrous de correction — audit correctness round-9.
 *
 *  - HIGH : l'Oracle re-plafonnait le composite avec un MIROIR d'évidence PÉRIMÉ
 *    (cibles NATION 1000/20 pré-ADR-0126 + `createdAt`) → il affichait un palier
 *    INFÉRIEUR au dashboard (qui lit le composite persisté, déjà evidence-capped
 *    par le scorer scale-aware). Miroir supprimé.
 *  - MED-HIGH : §15 comptait les évangélistes via un littéral `"evangeliste"`
 *    minuscule (valeur réelle `"EVANGELISTE"`) → repli `>= 0.95` perdant [0.85,0.95[ ;
 *    actifs à `>= 0.8` vs canon 0.65. Aligné sur `TIER_MIN_DEPTH`.
 *  - LOW : lock oracle-section défait par un `OR { id: existing.id }` toujours-vrai ;
 *    `nested_complete` vacuously true sur `{}`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("Oracle composite = valeur persistée, pas un re-cap périmé (round-9 HIGH)", () => {
  const src = read("src/server/services/strategy-presentation/index.ts");
  it("le miroir d'évidence périmé est SUPPRIMÉ", () => {
    expect(src).not.toContain("computePresentationEvidence");
    expect(src).not.toMatch(/SUPERFANS_TARGET\s*=\s*1000/);
    expect(src).not.toMatch(/const ceiling\s*=/);
  });
  it("le composite rendu vient du vector persisté (identique au dashboard)", () => {
    expect(src).toMatch(/const vector: AdvertisVector = \{ \.\.\.baseVector \};/);
  });
});

describe("Oracle §15 — compte superfans/évangélistes canonique (round-9)", () => {
  const src = read("src/server/services/strategy-presentation/section-mappers.ts");
  it("segment comparé en MAJUSCULES + seuils TIER_MIN_DEPTH (plus de littéral minuscule ni 0.8/0.95)", () => {
    expect(src).not.toMatch(/segment === "evangeliste"/);
    expect(src).toMatch(/segment === "EVANGELISTE"/);
    expect(src).toMatch(/TIER_MIN_DEPTH\.AMBASSADEUR/);
    expect(src).toMatch(/TIER_MIN_DEPTH\.EVANGELISTE/);
  });
});

describe("oracle-section lock atomique (round-9 LOW)", () => {
  it("le claim ne matche QUE lock null|expiré (OR à 2 clauses, plus de 3ᵉ toujours-vrai)", () => {
    const src = read("src/server/services/oracle-section/index.ts");
    // Forme exacte : OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lte: now } }]
    // (aucune 3ᵉ clause `{ id: … }` qui matcherait toujours la ligne cible).
    expect(src).toMatch(
      /OR:\s*\[\{ lockExpiresAt: null \}, \{ lockExpiresAt: \{ lte: now \} \}\]/,
    );
  });
});

describe("nested_complete rejette l'objet vide (round-9 LOW)", () => {
  it("garde `Object.keys(obj).length === 0 → false`", () => {
    const src = read("src/server/services/pillar-maturity/assessor.ts");
    const block = src.match(/case "nested_complete":[\s\S]*?\n {4}\}/);
    expect(block, "case nested_complete introuvable").toBeTruthy();
    expect(block![0]).toMatch(/Object\.keys\(obj\)\.length === 0/);
  });
});
