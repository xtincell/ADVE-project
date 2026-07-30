/**
 * SIGNAL GATEWAY — le point d'admission unique des signaux d'empreinte.
 *
 * Chaque cas ci-dessous a été MESURÉ en production le 2026-07-30, pas
 * imaginé : c'est l'inventaire des façons dont l'entreprise d'un autre est
 * entrée dans le rapport d'un prospect.
 */

import { describe, it, expect } from "vitest";
import { admitSignal, admissionReasonLabel } from "@/server/services/seshat/signal-gateway";
import { createEntityGate } from "@/server/services/seshat/entity-gate";

const gateFor = (name: string, ctx: { sector?: string; country?: string } = {}) =>
  createEntityGate(name, { sector: ctx.sector ?? null, country: ctx.country ?? null });

describe("admitSignal — chemin de confiance", () => {
  it("un signal DÉCLARÉ par la marque n'est jamais jugé", () => {
    // Contredire le prospect sur sa propre marque n'aurait aucun sens.
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Irawo"),
      source: "DECLARED",
      candidateName: "unrelatedhandle",
    });
    expect(v.admitted).toBe(true);
    expect(v.provenance).toBe("HUMAN");
  });

  it("un lien lu sur le site du client fait autorité (provenance SOURCE)", () => {
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Irawo"),
      source: "OWN_SITE",
      candidateName: "irawostudio",
    });
    expect(v.admitted).toBe(true);
    expect(v.provenance).toBe("SOURCE");
  });
});

describe("admitSignal — extension de nom (le vecteur d'homonymie n°1)", () => {
  it("fiche Google « Irawo Studio » (mode, Lagos) refusée pour « Irawo » (formation)", () => {
    // Le cas fondateur : ce signal était affiché avec ses avis clients dans
    // le rapport d'une plateforme de formation.
    const v = admitSignal({
      kind: "maps",
      gate: gateFor("Irawo", { sector: "formation en ligne" }),
      source: "DIRECT_LOOKUP",
      candidateName: "Irawo Studio",
      evidence: "Irawo Studio, Osborne Rd, Ikoyi, Lagos, Nigeria",
    });
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe("REJECTED_EXTENSION_UNDISCRIMINATED");
  });

  it("…mais admise si le marché/secteur est confirmé par l'évidence", () => {
    const v = admitSignal({
      kind: "maps",
      gate: gateFor("Burger King", { country: "Côte d'Ivoire" }),
      source: "DIRECT_LOOKUP",
      candidateName: "Burger King Abidjan",
      evidence: "Burger King Abidjan, Cocody, Côte d'Ivoire",
    });
    expect(v.admitted).toBe(true);
    expect(v.reason).toBe("ADMITTED_DISCRIMINATED");
    expect(v.matchedDiscriminants.length).toBeGreaterThan(0);
  });

  it("handle @dovvmusic refusé pour « Dovv » quand un contexte existe", () => {
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Dovv", { sector: "distribution alimentaire" }),
      source: "SEARCH",
      candidateName: "dovvmusic",
      evidence: "Dovv sur Instagram",
      url: "https://instagram.com/dovvmusic",
    });
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe("REJECTED_EXTENSION_UNDISCRIMINATED");
  });

  it("une raison sociale (« Chococam SA ») reste la marque", () => {
    const v = admitSignal({
      kind: "maps",
      gate: gateFor("Chococam", { country: "Cameroun" }),
      source: "DIRECT_LOOKUP",
      candidateName: "Chococam SA",
      evidence: "Chococam SA, Douala, Cameroun",
    });
    expect(v.admitted).toBe(true);
    expect(v.reason).toBe("ADMITTED_LEGAL_FORM");
  });

  it("sans AUCUN discriminant disponible, on n'exclut pas à l'aveugle", () => {
    // `@chococamfmcg` est authentique — refuser toute extension quand rien ne
    // permet de trancher appauvrirait le rapport sans rien prouver.
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Chococam"),
      source: "SEARCH",
      candidateName: "chococamfmcg",
      evidence: "Chococam FMCG",
    });
    expect(v.admitted).toBe(true);
  });
});

describe("admitSignal — vraisemblance", () => {
  it("31,7 M d'abonnés pour un marché de 28 M d'habitants → refusé", () => {
    // Mesuré : « Orange Cameroun » remontait l'audience du groupe.
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Orange Cameroun", { country: "Cameroun" }),
      source: "SEARCH",
      candidateName: "orangecameroun",
      evidence: "Orange Cameroun",
      claimedMagnitude: 31_737_324,
      marketPopulation: 28_000_000,
    });
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe("REJECTED_IMPLAUSIBLE");
  });

  it("une audience remarquable mais possible reste admise", () => {
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Orange Cameroun", { country: "Cameroun" }),
      source: "SEARCH",
      candidateName: "orangecameroun",
      evidence: "Orange Cameroun",
      claimedMagnitude: 3_000_000,
      marketPopulation: 28_000_000,
    });
    expect(v.admitted).toBe(true);
  });

  it("sans population de marché connue, la vraisemblance ne tranche pas", () => {
    const v = admitSignal({
      kind: "social",
      gate: gateFor("Orange Cameroun"),
      source: "SEARCH",
      candidateName: "orangecameroun",
      evidence: "Orange Cameroun",
      claimedMagnitude: 31_737_324,
    });
    expect(v.admitted).toBe(true);
  });
});

describe("admitSignal — appartenance de base", () => {
  it("un candidat qui ne mentionne pas la marque est refusé", () => {
    const v = admitSignal({
      kind: "citation",
      gate: gateFor("Irawo"),
      source: "SEARCH",
      evidence: "Boutique de mode à Lagos, livraison rapide",
    });
    expect(v.admitted).toBe(false);
    expect(v.reason).toBe("REJECTED_NO_MENTION");
  });

  it("les canaux jusqu'ici NON gardés (wikipedia, ads) passent la même porte", () => {
    const wiki = admitSignal({
      kind: "wikipedia",
      gate: gateFor("Irawo", { sector: "formation" }),
      source: "DIRECT_LOOKUP",
      candidateName: "Irawo (constellation)",
      evidence: "Irawo est un terme yoruba désignant une étoile",
    });
    expect(wiki.admitted).toBe(false);
  });
});

describe("admissionReasonLabel", () => {
  it("chaque raison a un libellé opérateur (jamais un code nu à l'écran)", () => {
    expect(admissionReasonLabel("REJECTED_EXTENSION_UNDISCRIMINATED")).toContain("homonyme");
    expect(admissionReasonLabel("ADMITTED_DISCRIMINATED")).toContain("marché");
  });
});
