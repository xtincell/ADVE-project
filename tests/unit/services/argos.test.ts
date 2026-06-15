import { describe, it, expect } from "vitest";
import { dossierRef, brandUid } from "@/server/services/seshat/argos/uid";
import { computeSafetyVerdict } from "@/server/services/seshat/argos/safety";
import { INTENT_KINDS, intentKindExists } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";

describe("Argos by LaFusée (ADR-0100)", () => {
  it("UID hiérarchique déterministe, sans accents", () => {
    expect(dossierRef("Nike", "Just Do It")).toBe("nike--just-do-it");
    expect(dossierRef("Crème de Café")).toBe("creme-de-cafe");
    expect(brandUid("L'Oréal")).toBe("l-oreal");
  });

  it("verdict sûreté PASS quand le DNA est complet et propre", () => {
    const v = computeSafetyVerdict({
      dna: { voice: "Audacieuse", keyPhrases: ["Just Do It", "Find your greatness"], palette: ["noir"] },
    });
    expect(v.verdict).toBe("PASS");
  });

  it("QUARANTINE quand le DNA est incomplet (<2 key phrases)", () => {
    const v = computeSafetyVerdict({ dna: { voice: "X", keyPhrases: ["seule"], palette: ["noir"] } });
    expect(v.verdict).toBe("QUARANTINE");
    expect(v.reasons.length).toBeGreaterThan(0);
  });

  it("REJECT quand un terme signalé est présent", () => {
    const v = computeSafetyVerdict({
      dna: { voice: "hate speech ici", keyPhrases: ["a", "b"], palette: ["x"] },
    });
    expect(v.verdict).toBe("REJECT");
  });

  it("les 2 Intent kinds Argos sont enregistrés (SESHAT) + ont un SLO", () => {
    for (const k of ["SESHAT_HARVEST_REFERENCE", "OPERATOR_CREATE_REFERENCE_DOSSIER"]) {
      expect(intentKindExists(k)).toBe(true);
      expect(INTENT_KINDS.find((x) => x.kind === k)?.governor).toBe("SESHAT");
      expect(INTENT_SLOS.some((s) => s.kind === k)).toBe(true);
    }
  });
});
