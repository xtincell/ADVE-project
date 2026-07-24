/**
 * applyResolvedRecoOps — l'applicateur de recos Notoria pré-résolues (branche
 * gateway APPLY_RECOS_RESOLVED) doit écrire À LA FEUILLE pour un chemin imbriqué
 * (`prophecy.pioneers`), pas créer une clé littérale no-op. Sinon la notoria
 * générait des recos profondes qui « s'appliquaient » sans rien changer.
 */
import { describe, it, expect } from "vitest";
import { applyResolvedRecoOps, coerceValue } from "@/server/services/pillar-gateway/apply-resolved-ops";

const op = (
  field: string,
  operation: string,
  proposedValue: unknown,
  extra: { targetMatch?: { key: string; value: string } } = {},
) => ({ field, operation, proposedValue, recoId: `r-${field}`, ...extra });

describe("applyResolvedRecoOps — SET profond (le fix)", () => {
  it("écrit à la feuille imbriquée + PRÉSERVE les sous-champs déjà remplis", () => {
    const base = { prophecy: { worldTransformed: "un monde X" } };
    const { content, appliedCount } = applyResolvedRecoOps(base, [
      op("prophecy.pioneers", "SET", "les early adopters de Douala"),
    ]);
    expect(appliedCount).toBe(1);
    const prophecy = content.prophecy as Record<string, unknown>;
    expect(prophecy.pioneers).toBe("les early adopters de Douala");
    expect(prophecy.worldTransformed).toBe("un monde X"); // préservé
    // PAS de clé littérale parasite « prophecy.pioneers ».
    expect(content["prophecy.pioneers"]).toBeUndefined();
  });

  it("construit l'objet parent absent feuille par feuille", () => {
    const { content } = applyResolvedRecoOps(
      {},
      [op("prophecy.worldTransformed", "SET", "monde Y"), op("prophecy.pioneers", "SET", "P")],
    );
    const prophecy = content.prophecy as Record<string, unknown>;
    expect(prophecy.worldTransformed).toBe("monde Y");
    expect(prophecy.pioneers).toBe("P");
  });

  it("SET sur une cellule de matrice (`arr[i].leaf`)", () => {
    const base = { produitsCatalogue: [{ nom: "Pack A" }, { nom: "Pack B" }] };
    const { content } = applyResolvedRecoOps(base, [
      op("produitsCatalogue[1].gainClientConcret", "SET", "gagne 2h/jour"),
    ]);
    const cat = content.produitsCatalogue as Array<Record<string, unknown>>;
    expect(cat[1]!.gainClientConcret).toBe("gagne 2h/jour");
    expect(cat[1]!.nom).toBe("Pack B"); // préservé
    expect(cat[0]!.nom).toBe("Pack A"); // autre item intact
  });
});

describe("applyResolvedRecoOps — parité top-level (non-régression)", () => {
  it("SET top-level reste une écriture directe", () => {
    const { content, appliedCount } = applyResolvedRecoOps({}, [op("secteur", "SET", "Audiovisuel")]);
    expect(appliedCount).toBe(1);
    expect(content.secteur).toBe("Audiovisuel");
  });

  it("EXTEND fusionne dans l'objet parent (top-level et imbriqué)", () => {
    const base = { prophecy: { worldTransformed: "X" } };
    const { content } = applyResolvedRecoOps(base, [op("prophecy", "EXTEND", { pioneers: "P", urgency: "U" })]);
    const prophecy = content.prophecy as Record<string, unknown>;
    expect(prophecy).toEqual({ worldTransformed: "X", pioneers: "P", urgency: "U" });
  });

  it("ADD append sur un tableau top-level", () => {
    const base = { touchpoints: [{ nom: "Insta" }] };
    const { content } = applyResolvedRecoOps(base, [op("touchpoints", "ADD", { nom: "TikTok" })]);
    expect((content.touchpoints as unknown[]).length).toBe(2);
  });

  it("MODIFY cible un item par targetMatch", () => {
    const base = { personas: [{ nom: "Ali", age: 20 }, { nom: "Ben", age: 30 }] };
    const { content } = applyResolvedRecoOps(base, [
      op("personas", "MODIFY", { nom: "Ben", age: 31 }, { targetMatch: { key: "nom", value: "Ben" } }),
    ]);
    const personas = content.personas as Array<Record<string, unknown>>;
    expect(personas.find((p) => p.nom === "Ben")!.age).toBe(31);
    expect(personas.find((p) => p.nom === "Ali")!.age).toBe(20);
  });
});

describe("applyResolvedRecoOps — corrections audit adversarial 2026-07-23", () => {
  it("EXTEND profond préserve les frères remplis (fin du clobber depth≥3)", () => {
    // La notoria groupe désormais par parent IMMÉDIAT → EXTEND sur `pillarGaps.a`
    // (pas le grand-parent `pillarGaps`) → fusion profonde qui garde `gaps`.
    const base = { pillarGaps: { a: { gaps: ["écrit par l'opérateur"] } } };
    const { content } = applyResolvedRecoOps(base, [op("pillarGaps.a", "EXTEND", { score: 4 })]);
    const a = (content.pillarGaps as { a: Record<string, unknown> }).a;
    expect(a.score).toBe(4);
    expect(a.gaps).toEqual(["écrit par l'opérateur"]); // frère préservé
  });

  it("refuse un champ top-level `__proto__` (garde de prototype UNIFORME) — non appliqué, pas de pollution", () => {
    const { content, appliedCount, warnings } = applyResolvedRecoOps({ promesse: "x" }, [
      op("__proto__", "SET", { polluted: "YES" }),
    ]);
    expect(appliedCount).toBe(0);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(content)).toBe('{"promesse":"x"}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("refuse un champ top-level `constructor` (pas de clé fantôme persistée)", () => {
    const { content, appliedCount } = applyResolvedRecoOps({ promesse: "x" }, [
      op("constructor", "SET", { hacked: 1 }),
    ]);
    expect(appliedCount).toBe(0);
    expect(JSON.stringify(content)).toBe('{"promesse":"x"}');
  });

  it("SURFACE un chevauchement parent/enfant dans le lot (jamais un écrasement silencieux)", () => {
    const { warnings } = applyResolvedRecoOps({ matrice: { lignes: [{ id: "a" }] } }, [
      op("matrice.lignes", "ADD", { id: "NEW" }),
      op("matrice", "SET", { lignes: [{ id: "W" }] }),
    ]);
    expect(warnings.some((w) => w.includes("Chevauchement"))).toBe(true);
  });
});

describe("applyResolvedRecoOps — garde ITEM-FANTÔME (audit adversarial 2026-07-24)", () => {
  it("refuse un SET sur un index de tableau HORS-BORNE (pas d'item fantôme ni de trous null)", () => {
    const base = { produitsCatalogue: [{ nom: "Produit réel" }] };
    const { content, appliedCount, warnings } = applyResolvedRecoOps(base, [
      op("produitsCatalogue[5].gainMarqueConcret", "SET", "gain fabriqué"),
    ]);
    expect(appliedCount).toBe(0);
    expect(warnings.some((w) => w.includes("fantôme") || w.includes("hors-borne"))).toBe(true);
    const cat = content.produitsCatalogue as unknown[];
    expect(cat.length).toBe(1); // pas d'extension du tableau
    expect(cat[0]).toEqual({ nom: "Produit réel" }); // item réel intact
  });

  it("autorise un SET sur une cellule d'item EXISTANT (index en borne)", () => {
    const { content, appliedCount } = applyResolvedRecoOps({ produitsCatalogue: [{ nom: "A" }] }, [
      op("produitsCatalogue[0].gainMarqueConcret", "SET", "gain réel"),
    ]);
    expect(appliedCount).toBe(1);
    expect((content.produitsCatalogue as Array<Record<string, unknown>>)[0]!.gainMarqueConcret).toBe("gain réel");
  });

  it("ADD-puis-SET[nouvelIndex] dans le même lot passe (ADD étend le tableau avant le SET)", () => {
    const { content, appliedCount } = applyResolvedRecoOps({ produitsCatalogue: [{ nom: "A" }] }, [
      op("produitsCatalogue", "ADD", { nom: "B" }),
      op("produitsCatalogue[1].gainMarqueConcret", "SET", "gain B"),
    ]);
    expect(appliedCount).toBe(2);
    const cat = content.produitsCatalogue as Array<Record<string, unknown>>;
    expect(cat.length).toBe(2);
    expect(cat[1]!.gainMarqueConcret).toBe("gain B");
  });
});

describe("applyResolvedRecoOps — sûreté", () => {
  it("ne mute JAMAIS la base (clone profond) — le snapshot précédent reste intact", () => {
    const base = { prophecy: { worldTransformed: "X" }, touchpoints: [{ nom: "Insta" }] };
    applyResolvedRecoOps(base, [
      op("prophecy.pioneers", "SET", "P"),
      op("touchpoints", "ADD", { nom: "TikTok" }),
    ]);
    expect(base.prophecy).toEqual({ worldTransformed: "X" }); // pas de pioneers
    expect(base.touchpoints.length).toBe(1); // pas muté par l'ADD
  });

  it("refuse un segment de proto-pollution PROFOND (skip + warning, ne crash pas le lot)", () => {
    // Le garde uniforme refuse l'op au lieu de laisser setNestedValue throw et casser
    // TOUT le lot — un op malveillant est écarté, les recos légitimes passent.
    const { content, appliedCount, warnings } = applyResolvedRecoOps(
      { ok: "keep" },
      [op("prophecy.__proto__.polluted", "SET", 1), op("secteur", "SET", "Tech")],
    );
    expect(appliedCount).toBe(1); // seul `secteur` passe
    expect(content).toEqual({ ok: "keep", secteur: "Tech" });
    expect(warnings.some((w) => w.includes("__proto__") || w.toLowerCase().includes("interdit"))).toBe(true);
  });

  it("coerceValue : nouvelle feuille vide → valeur proposée telle quelle", () => {
    expect(coerceValue(undefined, "P")).toBe("P");
    expect(coerceValue(undefined, ["a", "b"])).toEqual(["a", "b"]);
  });
});
