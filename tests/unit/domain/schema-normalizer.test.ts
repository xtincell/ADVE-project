/**
 * schema-normalizer — coercions déterministes vers le schéma strict (ADR-0172).
 * Prouve : enums tolérants (accents/casse/séparateurs), UUID stable et
 * reproductible depuis un id lisible (cohérence des refs préservée), coercion
 * numérique conservatrice.
 */
import { describe, it, expect } from "vitest";
import {
  coerceEnum,
  stableUuid,
  isUuid,
  normalizeId,
  coerceNumber,
  foldAscii,
} from "@/domain/schema-normalizer";

const DEVOTION = ["SPECTATEUR", "INTERESSE", "ENGAGE", "PARTICIPANT", "AMBASSADEUR", "EVANGELISTE"] as const;
const AARRR = ["ACQUISITION", "ACTIVATION", "RETENTION", "REVENUE", "REFERRAL"] as const;

describe("schema-normalizer — enums", () => {
  it("coerce accents + casse vers le membre canonique", () => {
    expect(coerceEnum("Engagé", DEVOTION)).toBe("ENGAGE");
    expect(coerceEnum("Intéressé", DEVOTION)).toBe("INTERESSE");
    expect(coerceEnum("Activation", AARRR)).toBe("ACTIVATION");
    expect(coerceEnum("SPECTATEUR", DEVOTION)).toBe("SPECTATEUR"); // déjà canonique
  });
  it("coerce les séparateurs (espace/tiret/slash)", () => {
    expect(coerceEnum("in-store", ["IN_STORE", "ONLINE"])).toBe("IN_STORE");
    expect(coerceEnum("Supply chain", ["SUPPLY_CHAIN", "PRICING"])).toBe("SUPPLY_CHAIN");
  });
  it("préfixe non-ambigu → match ; sinon null", () => {
    expect(coerceEnum("Engagé (fort)", DEVOTION)).toBe("ENGAGE");
    expect(coerceEnum("Autre chose", DEVOTION)).toBeNull();
    expect(coerceEnum(42, DEVOTION)).toBeNull();
  });
  it("foldAscii retire les accents", () => {
    expect(foldAscii("Évangéliste")).toBe("Evangeliste");
  });
});

describe("schema-normalizer — UUID stable", () => {
  it("déterministe : même graine → même UUID (refs cohérentes après remap)", () => {
    expect(stableUuid("risk-m19-001")).toBe(stableUuid("risk-m19-001"));
    expect(stableUuid("risk-m19-001")).not.toBe(stableUuid("risk-m19-002"));
  });
  it("produit un UUID valide (satisfait z.string().uuid())", () => {
    const u = stableUuid("M1");
    expect(isUuid(u)).toBe(true);
  });
  it("normalizeId : passe-plat sur un UUID, dérive sur un id lisible", () => {
    const real = stableUuid("x");
    expect(normalizeId(real)).toBe(real); // idempotent
    expect(normalizeId("hyp-m19-001")).toBe(stableUuid("hyp-m19-001"));
    expect(isUuid(normalizeId("hyp-m19-001"))).toBe(true);
  });
});

describe("schema-normalizer — nombres", () => {
  it("extrait un nombre d'une chaîne monétaire", () => {
    expect(coerceNumber("≈150 000 FCFA")).toBe(150000);
    expect(coerceNumber("6")).toBe(6);
    expect(coerceNumber("7,5")).toBe(7.5);
    expect(coerceNumber(1200)).toBe(1200);
    expect(coerceNumber("à calibrer")).toBeNull();
  });
});
