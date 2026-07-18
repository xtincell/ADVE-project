/**
 * Portes Michelin franchies par PREUVE PUBLIQUE RÉVÉLÉE (ADR-0149/0150).
 *
 * Invariant : une marque nationale ancienne à empreinte publique (Chococam,
 * 1967) ne doit PAS être LATENT par artefact — elle franchit ORDINAIRE sur
 * preuve datée (RDAP) + presse/audience, JAMAIS sur du déclaré. FORTE+ reste
 * gagné au registre (`actif-distinctif` absent des portes révélées).
 *
 * Escalade stricte (`itemsTier`) : une porte non franchie stoppe la montée.
 * Pur — zéro DB, zéro LLM.
 */

import { describe, it, expect } from "vitest";
import {
  resolveRevealedGates,
  itemsTier,
  type RevealedSignals,
} from "@/domain/scoreur";

const CHOCOCAM: RevealedSignals = {
  domainAgeYears: 25, // domaine ancien = fondation datée prouvée (RDAP)
  pressCount: 5, // 5 mentions presse récentes
  hasReviews: true,
  siteReachable: true,
  publicSocialCount: 3,
  audienceMeetsFloor: true,
};

const NEANT: RevealedSignals = {
  domainAgeYears: null,
  pressCount: 0,
  hasReviews: false,
  siteReachable: false,
  publicSocialCount: 0,
  audienceMeetsFloor: false,
};

describe("resolveRevealedGates — preuve publique → portes de bas de palier", () => {
  it("Chococam (empreinte riche) franchit les 3 portes révélées", () => {
    const gates = resolveRevealedGates(CHOCOCAM);
    expect(gates.has("dirigeant-identifiable")).toBe(true);
    expect(gates.has("mythe-fondateur")).toBe(true);
    expect(gates.has("market-fit")).toBe(true);
    // JAMAIS d'actif-distinctif par preuve publique (reste gagné au registre).
    expect(gates.has("actif-distinctif" as never)).toBe(false);
  });

  it("Chococam atteint ORDINAIRE par les items (fin du LATENT-par-artefact)", () => {
    const tier = itemsTier(resolveRevealedGates(CHOCOCAM));
    expect(tier).toBe("ORDINAIRE");
  });

  it("néant public → aucune porte → LATENT (absence honnête, jamais fabriqué)", () => {
    expect(resolveRevealedGates(NEANT).size).toBe(0);
    expect(itemsTier(resolveRevealedGates(NEANT))).toBe("LATENT");
  });

  it("escalade stricte : market-fit seul (sans identité publique) reste LATENT", () => {
    // Presse seule → market-fit, mais PAS dirigeant-identifiable (FRAGILE) → la
    // porte FRAGILE manquante stoppe la montée à LATENT.
    const pressOnly: RevealedSignals = { ...NEANT, pressCount: 5 };
    const gates = resolveRevealedGates(pressOnly);
    expect(gates.has("market-fit")).toBe(true);
    expect(gates.has("dirigeant-identifiable")).toBe(false);
    expect(itemsTier(gates)).toBe("LATENT");
  });

  it("mythe-fondateur exige une fondation DATÉE (âge de domaine ≥ seuil)", () => {
    const social = { ...NEANT, publicSocialCount: 2 };
    // Présence sociale → dirigeant-identifiable (FRAGILE), mais sans domaine daté
    // → pas de mythe-fondateur → plafonné FRAGILE (ORDINAIRE incomplet).
    expect(itemsTier(resolveRevealedGates(social))).toBe("FRAGILE");
    // Ajoute un domaine ancien → mythe-fondateur ; + presse → market-fit → ORDINAIRE.
    const dated: RevealedSignals = { ...social, domainAgeYears: 10, pressCount: 4 };
    expect(itemsTier(resolveRevealedGates(dated))).toBe("ORDINAIRE");
  });

  it("domaine trop récent ne prouve pas un mythe fondateur daté", () => {
    const young: RevealedSignals = { ...NEANT, siteReachable: true, domainAgeYears: 1, pressCount: 4 };
    const gates = resolveRevealedGates(young);
    expect(gates.has("mythe-fondateur")).toBe(false); // 1 an < seuil 3
    expect(itemsTier(gates)).toBe("FRAGILE"); // dirigeant + market-fit, mais pas mythe
  });

  it("déterministe (variance = 0)", () => {
    expect(resolveRevealedGates(CHOCOCAM)).toEqual(resolveRevealedGates(CHOCOCAM));
  });

  it("les seuils sont paramétrables (canon éditable ADR-0150)", () => {
    const s: RevealedSignals = { ...NEANT, siteReachable: true, domainAgeYears: 5, pressCount: 2 };
    // Défaut (3 ans / 3 presse) : domaine 5≥3 → mythe ; presse 2<3 → pas market-fit.
    expect(resolveRevealedGates(s).has("mythe-fondateur")).toBe(true);
    expect(resolveRevealedGates(s).has("market-fit")).toBe(false);
    // Seuils relevés (domaine ≥10 / presse ≥2) : 5<10 → pas mythe ; 2≥2 → market-fit.
    const strict = resolveRevealedGates(s, { mytheMinDomainAgeYears: 10, marketFitMinPress: 2 });
    expect(strict.has("mythe-fondateur")).toBe(false);
    expect(strict.has("market-fit")).toBe(true);
  });
});
