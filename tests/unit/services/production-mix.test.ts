import { describe, expect, it } from "vitest";
import { mixDecision, readMixDecision, suggestMix } from "@/domain/production-mix";
const expected = "a".repeat(64);
describe("Mix stratégique revu dans la Forge", () => {
  it("propose l’utilité à partir d’un passage d’E sans transformer le calcul en adoption", () => {
    const s = suggestMix([{
      key: "e",
      content: { promesseExperience: "Aider à la décision et guider le choix pour sortir au restaurant." },
    }], null);
    expect(s.primary).toBe("facilitator");
    expect(s.basis).toBe("ADVE");
    expect(s.previous.version).toBe(0);
    expect(s.evidence[0]).toMatchObject({ field: "E.promesseExperience", mode: "facilitator" });
    expect(Object.values(s.percent).reduce((a, b) => a + b)).toBe(100);
  });
  it("conserve des poids hérités à relire et ne départage pas quatre hypothèses identiques", () => {
    const mix = { peddler: 0.1, dealer: 0.1, facilitator: 0.6, entertainer: 0.2 };
    expect(suggestMix([], mix)).toMatchObject({
      basis: "LEGACY",
      primary: "facilitator",
      previous: { primary: null, version: 0 },
    });
    expect(suggestMix([], null)).toMatchObject({
      primary: null,
      basis: "POSTULAT",
      percent: { peddler: 25, dealer: 25, facilitator: 25, entertainer: 25 },
    });
  });
  it("exige un accord, une source de décision et quatre poids cohérents", () => {
    const input = {
      primary: "facilitator",
      percent: { peddler: 10, dealer: 5, facilitator: 65, entertainer: 20 },
      reason: "Utilité pour choisir un restaurant.",
      expected,
      confirm: true,
    };
    expect(mixDecision.safeParse(input).success).toBe(true);
    for (
      const patch of [{ confirm: false }, { primary: "dealer" }, { percent: { ...input.percent, peddler: 2 } }, {
        percent: { ...input.percent, peddler: undefined },
      }, { reason: "" }]
    ) expect(mixDecision.safeParse({ ...input, ...patch }).success).toBe(false);
    expect(readMixDecision({ primary: "inventé" }).primary).toBeNull();
  });
});
