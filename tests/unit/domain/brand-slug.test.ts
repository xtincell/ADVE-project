/**
 * Format canon des publicSlug de marque — `LFA-<brandshortname>`.
 */
import { describe, it, expect } from "vitest";
import { brandPublicSlug, isBrandPublicSlug, brandShortName, BRAND_SLUG_PREFIX } from "@/domain/brand-slug";

describe("brandPublicSlug", () => {
  it("préfixe et slugifie", () => {
    expect(brandPublicSlug("spawt")).toBe("LFA-spawt");
    expect(brandPublicSlug("Motion19")).toBe("LFA-motion19");
    expect(brandPublicSlug("Buffalo Grill")).toBe("LFA-buffalo-grill");
  });

  it("retire les diacritiques", () => {
    expect(brandPublicSlug("Crèperie Été")).toBe("LFA-creperie-ete");
  });

  it("idempotent sur une entrée déjà préfixée", () => {
    expect(brandPublicSlug("LFA-spawt")).toBe("LFA-spawt");
    expect(brandPublicSlug(brandPublicSlug("spawt"))).toBe("LFA-spawt");
  });

  it("lève sur un nom non-sluggable", () => {
    expect(() => brandPublicSlug("   ")).toThrow();
    expect(() => brandPublicSlug("LFA-")).toThrow();
  });

  it("utilise le préfixe canonique", () => {
    expect(brandPublicSlug("x").startsWith(BRAND_SLUG_PREFIX)).toBe(true);
  });
});

describe("isBrandPublicSlug", () => {
  it("accepte le format canonique", () => {
    expect(isBrandPublicSlug("LFA-spawt")).toBe(true);
    expect(isBrandPublicSlug("LFA-motion19")).toBe(true);
    expect(isBrandPublicSlug("LFA-buffalo-grill")).toBe(true);
  });

  it("refuse tout le reste", () => {
    expect(isBrandPublicSlug("spawt")).toBe(false); // legacy sans préfixe
    expect(isBrandPublicSlug("lfa-spawt")).toBe(false); // minuscule
    expect(isBrandPublicSlug("LFA-")).toBe(false);
    expect(isBrandPublicSlug("LFA-Spawt")).toBe(false); // maj dans le segment
    expect(isBrandPublicSlug("LFA--spawt")).toBe(false); // double tiret
  });
});

describe("brandShortName", () => {
  it("produit un segment kebab minuscule", () => {
    expect(brandShortName("Buffalo Grill!")).toBe("buffalo-grill");
    expect(brandShortName("  SPAWT  ")).toBe("spawt");
  });
});
