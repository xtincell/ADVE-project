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

  it("refuse un segment de proto-pollution via setNestedValue", () => {
    expect(() => applyResolvedRecoOps({}, [op("prophecy.__proto__.polluted", "SET", 1)])).toThrow();
  });

  it("coerceValue : nouvelle feuille vide → valeur proposée telle quelle", () => {
    expect(coerceValue(undefined, "P")).toBe("P");
    expect(coerceValue(undefined, ["a", "b"])).toEqual(["a", "b"]);
  });
});
