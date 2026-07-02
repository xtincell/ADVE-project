import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  assetKindSchema,
  assetNameSchema,
  buildAssetValue,
  colorValueSchema,
  linkValueSchema,
  normalizeHex,
  typoValueSchema,
} from "@/server/vault";

/**
 * WP-019 — coffre de marque, la partie PURE (zéro DB) : normalisation hex,
 * schémas de valeur par kind, construction du `value` Json canonique.
 */

describe("normalizeHex — canonisation #RRGGBB", () => {
  it("canonise les formes valides vers #RRGGBB majuscule", () => {
    expect(normalizeHex("#e56458")).toBe("#E56458");
    expect(normalizeHex("facc15")).toBe("#FACC15");
    expect(normalizeHex("  #FACC15  ")).toBe("#FACC15");
    expect(normalizeHex("#fff")).toBe("#FFFFFF");
    expect(normalizeHex("0a3")).toBe("#00AA33");
  });

  it("rejette l'illisible (null — jamais de valeur inventée)", () => {
    expect(normalizeHex("")).toBeNull();
    expect(normalizeHex("corail")).toBeNull();
    expect(normalizeHex("#e5645")).toBeNull(); // 5 digits
    expect(normalizeHex("#e5645800")).toBeNull(); // 8 digits (alpha non supporté)
    expect(normalizeHex("rgb(229,100,88)")).toBeNull();
  });
});

describe("schémas de valeur par kind", () => {
  it("COULEUR : hex obligatoire canonisé, rôle optionnel trimé", () => {
    const parsed = colorValueSchema.parse({ hex: "e56458", role: "  Primaire — CTA  " });
    expect(parsed).toEqual({ hex: "#E56458", role: "Primaire — CTA" });
  });

  it("COULEUR : hex invalide → erreur FR sur le champ hex", () => {
    const result = colorValueSchema.safeParse({ hex: "corail", role: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = z.flattenError(result.error);
      expect(flat.fieldErrors.hex?.[0]).toMatch(/hex/i);
    }
  });

  it("TYPO : usage et lien optionnels, lien http(s) uniquement", () => {
    expect(typoValueSchema.parse({ usage: "Titres", url: "" })).toEqual({
      usage: "Titres",
      url: "",
    });
    expect(typoValueSchema.safeParse({ usage: "", url: "ftp://x" }).success).toBe(false);
    expect(typoValueSchema.safeParse({ usage: "", url: "pas-une-url" }).success).toBe(false);
  });

  it("LIEN (logo/document/image) : url http(s) ou vide, note bornée", () => {
    expect(linkValueSchema.parse({ url: "https://exemple.test/logo.svg", note: "" })).toEqual({
      url: "https://exemple.test/logo.svg",
      note: "",
    });
    expect(linkValueSchema.safeParse({ url: "javascript:alert(1)", note: "" }).success).toBe(
      false,
    );
    expect(linkValueSchema.safeParse({ url: "", note: "x".repeat(301) }).success).toBe(false);
  });
});

describe("buildAssetValue — value Json canonique (champs vides OMIS)", () => {
  it("COULEUR : role vide omis, hex toujours présent", () => {
    expect(buildAssetValue("COULEUR", { hex: "#e56458", role: "" })).toEqual({ hex: "#E56458" });
    expect(buildAssetValue("COULEUR", { hex: "#e56458", role: "Primaire" })).toEqual({
      hex: "#E56458",
      role: "Primaire",
    });
  });

  it("TYPO : structure {usage?, url?} — vide = objet vide, jamais de clé résiduelle", () => {
    expect(buildAssetValue("TYPO", { usage: "", url: "" })).toEqual({});
    expect(
      buildAssetValue("TYPO", { usage: "Titres", url: "https://fontshare.com/x" }),
    ).toEqual({ usage: "Titres", url: "https://fontshare.com/x" });
  });

  it("LOGO/DOCUMENT/IMAGE : structure {url?, note?}", () => {
    expect(buildAssetValue("LOGO", { url: "", note: "" })).toEqual({});
    expect(buildAssetValue("DOCUMENT", { url: "https://x.test/charte.pdf", note: "v2" })).toEqual(
      { url: "https://x.test/charte.pdf", note: "v2" },
    );
    expect(buildAssetValue("IMAGE", { url: "", note: "Référence gamme" })).toEqual({
      note: "Référence gamme",
    });
  });

  it("les champs étrangers au kind sont ignorés (pas de Json libre)", () => {
    expect(
      buildAssetValue("COULEUR", { hex: "#facc15", role: "", note: "intrus", url: "https://x.t" }),
    ).toEqual({ hex: "#FACC15" });
  });

  it("kind/nom : frontières Zod (enum strict, nom 1..120)", () => {
    expect(assetKindSchema.safeParse("COULEUR").success).toBe(true);
    expect(assetKindSchema.safeParse("VIDEO").success).toBe(false);
    expect(assetNameSchema.safeParse("Corail").success).toBe(true);
    expect(assetNameSchema.safeParse("   ").success).toBe(false);
    expect(assetNameSchema.safeParse("x".repeat(121)).success).toBe(false);
  });
});
