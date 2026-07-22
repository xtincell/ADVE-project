/**
 * product-system — le système produit dans le pilier V (ADR-0170).
 *
 * Prouve : le schéma générique accueille un VRAI système produit (le « Système
 * Palais » de SPAWT, données réelles du brand book v1.0) ; les helpers de
 * profondeur/vacuité sont corrects ; une marque sans mécanique reste vide
 * (pas de fabrication) ; le pilier V accepte le champ.
 */
import { describe, it, expect } from "vitest";
import {
  ProductSystemSchema,
  productSystemDepth,
  isProductSystemEmpty,
  PRODUCT_SYSTEM_DIMENSIONS,
} from "@/domain/product-system";
import { validatePillarPartial } from "@/lib/types/pillar-schemas";

// Données RÉELLES du brand book SPAWT v1.0 (pas de fabrication).
const SPAWT_PALAIS = {
  coreConcept: "Un profil gustatif multidimensionnel qui définit qui est le spawter — pas ce qu'il a fait.",
  axes: [
    { label: "Registre", poleLow: "Maquis", poleHigh: "Table", description: "Du vrai de la rue au raffiné" },
    { label: "Mobilité", poleLow: "Racines", poleHigh: "Nomade" },
    { label: "Visibilité", poleLow: "Foule", poleHigh: "Secret" },
  ],
  archetypes: [
    { name: "Pisteur", axesSignature: "Nomade + Maquis", essence: "Le nez au vent, les pieds dans la poussière.", progressionNames: ["Petit Pisteur", "Pisteur", "Pisteur de Brousse", "Pisteur Noir", "La Piste"] },
    { name: "Fantôme", axesSignature: "Nomade + Secret", essence: "Tu ne le trouves pas. C'est lui qui te trouve." },
    { name: "Murmure", axesSignature: "Secret + Maquis", essence: "Les meilleurs spots ne sont pas sur Google." },
    { name: "Lame", axesSignature: "Table + Exigeant", essence: "Le détail sépare le bon du mémorable." },
  ],
  progressionStages: [
    { name: "Touriste", threshold: "0-10 spots", signals: ["Renifle tout. Apprend.", "Son Palais bouge beaucoup."] },
    { name: "Explorateur", threshold: "11-20 spots", signals: ["Territoire qui se dessine.", "Axes se stabilisent."] },
  ],
  modes: [
    { name: "Où manger maintenant ?", trigger: "Midi (11h-14h)", format: "Swipe cards", description: "Décision en 3 taps" },
    { name: "On sort où ce soir ?", trigger: "Vendredi soir, samedi soir" },
    { name: "Explore", description: "Le compagnon, pas le catalogue" },
  ],
  artifacts: [
    { name: "Fiche Profil Spawter", kind: "carte", description: "RECTO avatar/nom/titre/rang/stats, VERSO le Palais (5 axes radar)", socialSignal: "Identité partageable, fierté, social proof" },
    { name: "Fiche Spawt", kind: "carte", description: "La carte d'un lieu découvert" },
  ],
  mechanics: [
    { name: "Instinct, pas formulaire", rule: "Le Palais se calibre automatiquement à partir des comportements réels." },
    { name: "Gamification discrète", rule: "Pas de scores visibles. Badge, titre et progression dans le profil." },
    { name: "Le nom est calculé, jamais choisi", rule: "Le spawter découvre son titre quand le chat l'annonce." },
  ],
};

describe("product-system — schéma & helpers", () => {
  it("le schéma accueille le Système Palais réel de SPAWT", () => {
    const r = ProductSystemSchema.safeParse(SPAWT_PALAIS);
    expect(r.success).toBe(true);
  });

  it("PillarV accepte v.productSystem (forme SPAWT)", () => {
    const r = validatePillarPartial("V", { productSystem: SPAWT_PALAIS });
    expect(r.success).toBe(true);
  });

  it("productSystemDepth compte les dimensions renseignées (6 pour SPAWT)", () => {
    expect(productSystemDepth(SPAWT_PALAIS)).toBe(6);
    expect(productSystemDepth({ coreConcept: "x" })).toBe(0); // concept ≠ dimension
    expect(productSystemDepth({ mechanics: [{ name: "a", rule: "b" }] })).toBe(1);
  });

  it("un produit sans mécanique reste VIDE (pas de fabrication)", () => {
    expect(isProductSystemEmpty(null)).toBe(true);
    expect(isProductSystemEmpty({})).toBe(true);
    expect(isProductSystemEmpty({ coreConcept: "x" })).toBe(false); // un concept suffit à ne plus être vide
    expect(isProductSystemEmpty(SPAWT_PALAIS)).toBe(false);
  });

  it("les 6 dimensions canoniques sont figées", () => {
    expect(PRODUCT_SYSTEM_DIMENSIONS).toEqual([
      "axes", "archetypes", "progressionStages", "modes", "artifacts", "mechanics",
    ]);
  });

  it("toutes les dimensions optionnelles — un système partiel valide (produit physique simple)", () => {
    const r = ProductSystemSchema.safeParse({
      mechanics: [{ name: "Le Setup", rule: "On n'achète pas une référence, on monte SON setup." }],
    });
    expect(r.success).toBe(true);
  });
});
