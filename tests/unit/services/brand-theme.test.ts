/**
 * brand-theme — résolveur de thème de rendu PAR MARQUE (ADR-0169).
 *
 * Prouve : dérivation depuis les 2 formes réelles de coffre (SPAWT {accent,
 * primary,full} + Motion19 {primary,accent,anthracite,roles}), fallback
 * UPgraders quand pas de palette, et — le cœur — la LISIBILITÉ garantie du
 * texte sur chaque fond (le bug « blanc sur or illisible » est fermé).
 */
import { describe, it, expect } from "vitest";
import {
  buildBrandTheme,
  collectHexes,
  hexToRgb,
  contrastRatio,
  readableTextOn,
  UPGRADERS_THEME,
  type RGB,
} from "@/server/services/brand-theme";

// Formes RÉELLES en base.
const SPAWT_CHROMATIC = {
  accent: "#C8A44E", // or
  primary: "#0A0A0A", // noir
  full: [{ hex: "#0A0A0A" }, { hex: "#C8A44E" }, { hex: "#2D6B4F" }, { hex: "#EFE8DC" }],
  note: "or & noir",
};
const MOTION19_CHROMATIC = {
  primary: "#4867B0",
  accent: "#3384FF",
  anthracite: "#1D1D1D",
  grey: "#B5B5B5",
  roles: {
    "#4867B0": "Bleu signature",
    "#3384FF": "Bleu digital — accent",
    "#1D1D1D": "Anthracite",
  },
};

describe("brand-theme — résolution & lisibilité", () => {
  it("collectHexes récolte les hex des 2 formes (valeurs ET clés roles)", () => {
    const s = collectHexes(SPAWT_CHROMATIC);
    expect(s.accent).toBe("#C8A44E");
    expect(s.all).toContain("#2D6B4F"); // depuis full[]
    const m = collectHexes(MOTION19_CHROMATIC);
    expect(m.accent).toBe("#3384FF");
    expect(m.all).toContain("#1D1D1D"); // depuis roles[hex] (clé) + champ anthracite
  });

  it("SPAWT (or/noir) : accent = or, texte sur bandeau = SOMBRE (pas blanc)", () => {
    const t = buildBrandTheme({ chromatic: SPAWT_CHROMATIC, brandName: "SPAWT" });
    expect(t.isFallback).toBe(false);
    expect(t.band).toEqual(hexToRgb("#C8A44E"));
    // Le cœur du fix : texte sur l'or DOIT être lisible → sombre, contraste ≥ 4.5.
    expect(contrastRatio(t.bandText, t.band)).toBeGreaterThanOrEqual(4.5);
    expect(t.bandText[0]).toBeLessThan(128); // sombre
    // Fond de couverture sombre (noir profond de la marque).
    expect(t.coverBg).toEqual(hexToRgb("#0A0A0A"));
    expect(contrastRatio(t.coverText, t.coverBg)).toBeGreaterThanOrEqual(4.5);
  });

  it("Motion19 (bleus) : accent = bleu digital, texte sur bandeau = BLANC", () => {
    const t = buildBrandTheme({ chromatic: MOTION19_CHROMATIC, brandName: "Motion19" });
    expect(t.isFallback).toBe(false);
    expect(t.band).toEqual(hexToRgb("#3384FF"));
    // Blanc sur bleu (norme design), lisible AA grand-texte (≥ 3).
    expect(contrastRatio(t.bandText, t.band)).toBeGreaterThanOrEqual(3);
    expect(t.bandText[0]).toBeGreaterThan(200); // blanc
  });

  it("accentOnLight lisible sur le fond clair (accent clair → retombe sur encre)", () => {
    const spawt = buildBrandTheme({ chromatic: SPAWT_CHROMATIC, brandName: "SPAWT" });
    // or sur crème = illisible → accentOnLight doit contraster ≥ 3.
    expect(contrastRatio(spawt.accentOnLight, spawt.sectionBg)).toBeGreaterThanOrEqual(3);
  });

  it("pas de palette → fallback UPgraders IDENTIQUE (isFallback, logo/fontes gardés)", () => {
    const t = buildBrandTheme({
      chromatic: { note: "aucune couleur" },
      typography: { primary: { family: "Klinsman" } },
      logoUrl: "data:image/png;base64,AAA",
      brandName: "X",
    });
    expect(t.isFallback).toBe(true);
    expect(t.band).toEqual(UPGRADERS_THEME.band); // corail canon
    expect(t.coverBg).toEqual(UPGRADERS_THEME.coverBg); // panda canon
    expect(t.logoUrl).toBe("data:image/png;base64,AAA"); // logo préservé
    expect(t.displayFontFamily).toBe("Klinsman"); // fonte préservée
  });

  it("extractFontFamilies tolère display/text (Motion19) et primary/secondary (SPAWT)", () => {
    const s = buildBrandTheme({
      chromatic: SPAWT_CHROMATIC,
      typography: { primary: { family: "Klinsman" }, secondary: { family: "Gotham" } },
      brandName: "SPAWT",
    });
    expect(s.displayFontFamily).toBe("Klinsman");
    expect(s.bodyFontFamily).toBe("Gotham");
    const m = buildBrandTheme({
      chromatic: MOTION19_CHROMATIC,
      typography: { display: { family: "Exo 2" }, text: { family: "Roboto" } },
      brandName: "Motion19",
    });
    expect(m.displayFontFamily).toBe("Exo 2");
    expect(m.bodyFontFamily).toBe("Roboto");
  });

  it("hexToRgb valide strictement #RRGGBB", () => {
    expect(hexToRgb("#4867B0")).toEqual([72, 103, 176]);
    expect(hexToRgb("bleu")).toBeNull();
    expect(hexToRgb("#abc")).toBeNull();
  });

  it("readableTextOn : blanc sur sombre, sombre sur clair", () => {
    expect(readableTextOn([10, 10, 10] as RGB)[0]).toBeGreaterThan(200);
    expect(readableTextOn([240, 240, 240] as RGB)[0]).toBeLessThan(128);
  });
});
