/**
 * ADR-0147 — Identity Graph : cœur déterministe (tests purs, zéro-IO).
 */
import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  normalizePhone,
  normalizeHandle,
  normalizeIdentifierValue,
  matchKey,
  mergeVerdictForSharedIdentifier,
  isStrongConflict,
  mergePreservesMonotonicity,
  isStrongKind,
  strongerConfidence,
} from "@/domain/identity-graph";

describe("normalisation email", () => {
  it("gmail : points + plus-addressing neutralisés", () => {
    expect(normalizeEmail("Steph.B+promo@Gmail.com")).toBe("stephb@gmail.com");
    expect(normalizeEmail("s.t.e.p.h@googlemail.com")).toBe("steph@googlemail.com");
  });
  it("non-gmail : points conservés, plus retiré", () => {
    expect(normalizeEmail("john.doe+x@outlook.com")).toBe("john.doe@outlook.com");
  });
  it("invalide → null", () => {
    expect(normalizeEmail("pasunemail")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });
  it("déterministe (même entrée = même sortie)", () => {
    expect(normalizeEmail("A@B.com")).toBe(normalizeEmail("a@b.com"));
  });
});

describe("normalisation téléphone", () => {
  it("E.164 best-effort", () => {
    expect(normalizePhone("+225 07 08 09 10 11")).toBe("+2250708091011");
    expect(normalizePhone("00225 0700111")).toBe("+2250700111");
    expect(normalizePhone("07-00-00-00")).toBe("07000000");
  });
  it("bruit < 6 chiffres → null", () => {
    expect(normalizePhone("12")).toBeNull();
  });
});

describe("normalisation handle", () => {
  it("minuscule, @ retiré", () => {
    expect(normalizeHandle("@Steph.CI")).toBe("steph.ci");
  });
});

describe("matchKey + kinds forts", () => {
  it("handle scopé plateforme, email non", () => {
    expect(matchKey("HANDLE", "steph", "instagram")).toBe("HANDLE:instagram:steph");
    expect(matchKey("EMAIL", "a@b.com")).toBe("EMAIL::a@b.com");
  });
  it("EMAIL/PHONE/EXTERNAL_ID sont forts, HANDLE faible", () => {
    expect(isStrongKind("EMAIL")).toBe(true);
    expect(isStrongKind("PHONE")).toBe(true);
    expect(isStrongKind("HANDLE")).toBe(false);
  });
});

describe("verdict de fusion (D12)", () => {
  it("fort + vérifié partagé → AUTO_MERGE", () => {
    expect(mergeVerdictForSharedIdentifier({ kind: "EMAIL", shared: true, confidence: "VERIFIED" })).toBe("AUTO_MERGE");
    expect(mergeVerdictForSharedIdentifier({ kind: "PHONE", shared: true, confidence: "DECLARED" })).toBe("AUTO_MERGE");
  });
  it("faible partagé (handle/nom) → CANDIDATE, jamais AUTO", () => {
    expect(mergeVerdictForSharedIdentifier({ kind: "HANDLE", shared: true, confidence: "VERIFIED" })).toBe("CANDIDATE");
  });
  it("fort mais INFERRED → CANDIDATE", () => {
    expect(mergeVerdictForSharedIdentifier({ kind: "EMAIL", shared: true, confidence: "INFERRED" })).toBe("CANDIDATE");
  });
  it("non partagé → NONE", () => {
    expect(mergeVerdictForSharedIdentifier({ kind: "EMAIL", shared: false, confidence: "VERIFIED" })).toBe("NONE");
  });
});

describe("conflit fort (deux emails vérifiés distincts)", () => {
  it("détecté → refus de fusion", () => {
    expect(isStrongConflict("EMAIL", "hashA", "VERIFIED", "hashB", "VERIFIED")).toBe(true);
  });
  it("même hash → pas de conflit", () => {
    expect(isStrongConflict("EMAIL", "hashA", "VERIFIED", "hashA", "VERIFIED")).toBe(false);
  });
  it("un INFERRED → pas un conflit fort", () => {
    expect(isStrongConflict("EMAIL", "hashA", "INFERRED", "hashB", "VERIFIED")).toBe(false);
  });
});

describe("anti-inflation (ADR-0126)", () => {
  it("fusion ne peut que baisser/maintenir le compte", () => {
    expect(mergePreservesMonotonicity(5, 4)).toBe(true);
    expect(mergePreservesMonotonicity(5, 5)).toBe(true);
    expect(mergePreservesMonotonicity(5, 6)).toBe(false);
  });
});

describe("précédence de confiance", () => {
  it("DECLARED > VERIFIED > INFERRED", () => {
    expect(strongerConfidence("INFERRED", "VERIFIED")).toBe("VERIFIED");
    expect(strongerConfidence("DECLARED", "VERIFIED")).toBe("DECLARED");
  });
});

describe("normalizeIdentifierValue dispatch", () => {
  it("route par kind", () => {
    expect(normalizeIdentifierValue("EMAIL", "A@B.com")).toBe("a@b.com");
    expect(normalizeIdentifierValue("EXTERNAL_ID", "  XYZ ")).toBe("xyz");
  });
});
