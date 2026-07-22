/**
 * Tolérance de forme des piliers — forme compacte (canon/humain) vs forme riche
 * (sortie Glory). Ferme le bug d'affichage du pilier Distinction : la direction
 * artistique et les preuves de Motion19 étaient stockées en base sous une forme
 * compacte (`directionArtistique = {univers, principes}`, `proofPoints = string[]`)
 * que le schéma canonique — et donc le renderer bespoke qui le suit — ne savait
 * pas lire, affichant « à saisir » sur des champs pourtant renseignés.
 *
 * Les deux formes sont désormais des citoyennes de première classe :
 *   - compacte : la matière réelle d'un Brand Book, saisie à la main / au canon ;
 *   - riche : la sortie structurée des Glory créatifs.
 * Aucune donnée n'est inventée ; le renderer affiche celle qui est présente.
 */
import { describe, it, expect } from "vitest";
import { validatePillarPartial } from "@/lib/types/pillar-schemas";
import { str, isEmpty } from "@/components/cockpit/pillars/pillar-kit";

describe("Tolérance de forme piliers — compacte vs riche", () => {
  // ── Schéma : les deux formes valident ────────────────────────────────
  it("D · directionArtistique compacte {univers, principes} valide (forme Motion19)", () => {
    const r = validatePillarPartial("D", {
      directionArtistique: {
        univers:
          "Palette signature (Brand Book §06) : Bleu profond #4867B0 · Bleu digital #3384FF · Anthracite #1D1D1D · Gris #B5B5B5. Exo 2 + Roboto. Motif : trame isométrique de matériel.",
        principes: [
          "Deux bleus, deux rôles : #4867B0 structure, #3384FF accentue à l'écran",
          "Style d'image : sympathique, inspirant, professionnel",
          "Monogramme M19 en réserve blanche sur les supports",
        ],
      },
    });
    expect(r.success).toBe(true);
  });

  it("D · directionArtistique riche {moodboard, chromaticStrategy} valide (sortie Glory)", () => {
    const r = validatePillarPartial("D", {
      directionArtistique: {
        moodboard: { theme: "audiovisuel pro", colorPalette: [{ hex: "#4867B0", name: "Bleu profond", usage: "aplats print" }] },
        chromaticStrategy: { primaryColors: [{ hex: "#3384FF", name: "Bleu digital", emotion: "énergie", usage: "accent écran" }] },
      },
    });
    expect(r.success).toBe(true);
  });

  it("D · proofPoints en chaînes nues valide (forme compacte Motion19)", () => {
    const r = validatePillarPartial("D", {
      proofPoints: [
        "373 produits / 157 collections publiés (catalogue Shopify, 12/07/2026).",
        "5 ans d'activité continue (domaine et premiers produits mars 2021).",
      ],
    });
    expect(r.success).toBe(true);
  });

  it("D · proofPoints structurés {type, claim, evidence} valide", () => {
    const r = validatePillarPartial("D", {
      proofPoints: [{ type: "traction", claim: "373 produits / 157 collections", evidence: "Catalogue Shopify" }],
    });
    expect(r.success).toBe(true);
  });

  it("A · preuvesAuthenticite en chaînes nues valide (même motif)", () => {
    const r = validatePillarPartial("A", {
      preuvesAuthenticite: ["Catalogue réel et daté (373 produits).", "Boutique physique vérifiable à Akwa Douala."],
    });
    expect(r.success).toBe(true);
  });

  // ── Renderer : les helpers ne perdent plus les objets imbriqués ───────
  it("str() est non-lossy sur un objet imbriqué et saute la plomberie interne", () => {
    const out = str({ gloryOutputId: "uuid-interne-xyz", theme: "audiovisuel", keywords: ["pro", "net"] });
    expect(out).toContain("audiovisuel");
    expect(out).toContain("pro");
    expect(out).not.toContain("uuid-interne-xyz"); // gloryOutputId jamais affiché
  });

  it("str() rend TOUTES les valeurs (l'ancienne version ne gardait que la 1re chaîne)", () => {
    const out = str({ a: "premier", b: "second" });
    expect(out).toContain("premier");
    expect(out).toContain("second");
  });

  it("isEmpty : un objet renseigné n'est pas vide (ObjCard tente donc de le rendre)", () => {
    expect(isEmpty({ univers: "x" })).toBe(false);
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty("")).toBe(true);
    expect(isEmpty([])).toBe(true);
  });
});
