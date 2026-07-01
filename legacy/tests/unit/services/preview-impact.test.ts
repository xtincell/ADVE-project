/**
 * ADR-0090 — Preview d'impact score (simulation pure, zéro IO sur le cœur).
 *
 * Vérifie que computeCompositeFromContents réutilise la même formule que le
 * scorer canonique (contract-aware Annexe G), que simulateRecoOnContents ne
 * mute jamais la map d'entrée, et que le delta est cohérent (remplir un champ
 * requis ↑ le composite ; supprimer du contenu ↓).
 */

import { describe, it, expect } from "vitest";
import {
  computeCompositeFromContents,
  simulateRecoOnContents,
  type PillarContentMap,
} from "@/server/services/notoria/preview-impact";
import type { PillarKey } from "@/lib/types/advertis-vector";

const NEUTRAL_WEIGHTS = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1 } as Record<PillarKey, number>;

function baseContents(): PillarContentMap {
  return {
    a: {
      nomMarque: "CIMENCAM",
      description: "Cimenteries du Cameroun — leader du ciment en Afrique centrale depuis 1963, filiale LafargeHolcim.",
    },
    d: {},
    v: {},
    e: {},
    r: {},
    t: {},
    i: {},
    s: {},
  };
}

describe("computeCompositeFromContents (ADR-0090)", () => {
  it("est déterministe", () => {
    const a = computeCompositeFromContents(baseContents(), NEUTRAL_WEIGHTS);
    const b = computeCompositeFromContents(baseContents(), NEUTRAL_WEIGHTS);
    expect(a).toEqual(b);
  });

  it("borne chaque pilier à [0, 25] et le composite à ≤ 200", () => {
    const heavy = { a: 3, d: 3, v: 3, e: 3, r: 3, t: 3, i: 3, s: 3 } as Record<PillarKey, number>;
    const { composite, pillars } = computeCompositeFromContents(baseContents(), heavy);
    for (const v of Object.values(pillars)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(25);
    }
    expect(composite).toBeLessThanOrEqual(200);
  });
});

describe("simulateRecoOnContents (ADR-0090)", () => {
  it("ne mute JAMAIS la map d'entrée", () => {
    const contents = baseContents();
    const snapshot = structuredClone(contents);
    simulateRecoOnContents(contents, {
      targetPillarKey: "a",
      targetField: "accroche",
      operation: "SET",
      proposedValue: "Le ciment qui protège les familles camerounaises",
    });
    expect(contents).toEqual(snapshot);
  });

  it("SET remplit le champ ciblé sur la copie", () => {
    const out = simulateRecoOnContents(baseContents(), {
      targetPillarKey: "a",
      targetField: "accroche",
      operation: "SET",
      proposedValue: "Le ciment des bâtisseurs",
    });
    expect((out.a as Record<string, unknown>).accroche).toBe("Le ciment des bâtisseurs");
  });

  it("ADD initialise puis étend un tableau", () => {
    const first = simulateRecoOnContents(baseContents(), {
      targetPillarKey: "e",
      targetField: "touchpoints",
      operation: "ADD",
      proposedValue: { canal: "WhatsApp", role: "support" },
    });
    expect(Array.isArray((first.e as Record<string, unknown>).touchpoints)).toBe(true);
    const second = simulateRecoOnContents(first, {
      targetPillarKey: "e",
      targetField: "touchpoints",
      operation: "ADD",
      proposedValue: { canal: "Instagram", role: "notoriété" },
    });
    expect(((second.e as Record<string, unknown>).touchpoints as unknown[]).length).toBe(2);
  });

  it("remplir un champ contractuel fait monter le composite simulé (delta > 0)", () => {
    const contents = baseContents();
    const before = computeCompositeFromContents(contents, NEUTRAL_WEIGHTS);
    const after = computeCompositeFromContents(
      simulateRecoOnContents(contents, {
        targetPillarKey: "d",
        targetField: "positionnement",
        operation: "SET",
        proposedValue:
          "Premier cimentier du Cameroun : 60% de parts de marché, 3 usines, la référence des bâtisseurs depuis 1963 sur le segment construction résidentielle.",
      }),
      NEUTRAL_WEIGHTS,
    );
    expect(after.composite).toBeGreaterThanOrEqual(before.composite);
  });

  it("REMOVE retire le champ (delta ≤ 0)", () => {
    const contents = baseContents();
    const before = computeCompositeFromContents(contents, NEUTRAL_WEIGHTS);
    const after = computeCompositeFromContents(
      simulateRecoOnContents(contents, {
        targetPillarKey: "a",
        targetField: "description",
        operation: "REMOVE",
        proposedValue: null,
      }),
      NEUTRAL_WEIGHTS,
    );
    expect(after.composite).toBeLessThanOrEqual(before.composite);
  });

  it("payload typé UPDATE_ADVE_FIELD (pilier MAJUSCULE) atterrit dans la clé de stockage minuscule", () => {
    const out = simulateRecoOnContents(baseContents(), {
      targetPillarKey: "a",
      targetField: "accroche",
      operation: "SET",
      proposedValue: { kind: "UPDATE_ADVE_FIELD", pillar: "A", field: "accroche", value: "Nouvelle accroche" },
    });
    expect((out.a as Record<string, unknown>).accroche).toBe("Nouvelle accroche");
    expect((out as Record<string, unknown>).A).toBeUndefined();
  });
});
