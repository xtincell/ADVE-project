/**
 * schema-normalizer — coercions déterministes vers le schéma strict (ADR-0172).
 * Prouve : enums tolérants (accents/casse/séparateurs), UUID stable et
 * reproductible depuis un id lisible (cohérence des refs préservée), coercion
 * numérique conservatrice.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  coerceEnum,
  stableUuid,
  isUuid,
  normalizeId,
  coerceNumber,
  foldAscii,
  normalizeToSchema,
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

describe("schema-normalizer — applicateur schéma-guidé", () => {
  // Schéma proche d'un pilier réel : id uuid + FK uuid + enum + number + nested.
  const RiskSchema = z.object({
    id: z.string().uuid(),
    severity: z.number().min(0).max(100),
    status: z.enum(["UNMITIGATED", "MITIGATED", "ACCEPTED"]),
    category: z.enum(["COHERENCE", "OVERTON", "DEVOTION", "MARKET"]),
  });
  const PillarLike = z.object({
    matrix: z.array(RiskSchema),
    validation: z.array(z.object({ riskId: z.string().uuid(), note: z.string().optional() })),
    budget: z.number().optional(),
  });

  it("coerce ids lisibles → UUID, enums accentués/casse, numériques string", () => {
    const raw = {
      matrix: [{ id: "risk-m19-001", severity: "80", status: "MITIGATING", category: "MARQUE" }],
      validation: [{ riskId: "risk-m19-001" }],
      budget: "≈1 800 000 FCFA",
    };
    const out = normalizeToSchema(raw, PillarLike) as any;
    // id → UUID valide.
    expect(isUuid(out.matrix[0].id)).toBe(true);
    // FK → MÊME UUID (cohérence des arêtes sans remap coordonné).
    expect(out.validation[0].riskId).toBe(out.matrix[0].id);
    // number string → number.
    expect(out.matrix[0].severity).toBe(80);
    expect(out.budget).toBe(1800000);
    // enums : "MARQUE"→null (pas dans l'enum, laissé intact) ; "MITIGATING"→null (idem).
    // (coercion ne fabrique pas — les valeurs hors-enum restent pour signalement)
    expect(out.matrix[0].category).toBe("MARQUE"); // pas de match → intact
  });

  it("coerce les enums quand la valeur EST dans l'enum (accents/casse)", () => {
    const S = z.object({ stage: z.enum(["ACTIVATION", "RETENTION"]), lvl: z.enum(["ENGAGE", "AMBASSADEUR"]) });
    const out = normalizeToSchema({ stage: "Activation", lvl: "Engagé" }, S) as any;
    expect(out.stage).toBe("ACTIVATION");
    expect(out.lvl).toBe("ENGAGE");
  });

  it("ne touche PAS les formes déjà valides ni les unions (idempotent)", () => {
    const already = { matrix: [{ id: stableUuid("x"), severity: 50, status: "MITIGATED", category: "MARKET" }], validation: [] };
    const out = normalizeToSchema(already, PillarLike);
    expect(out).toEqual(already);
  });

  it("normalise en profondeur les tableaux d'objets", () => {
    const S = z.object({ items: z.array(z.object({ id: z.string().uuid(), n: z.number() })) });
    const out = normalizeToSchema({ items: [{ id: "a-1", n: "10" }, { id: "a-2", n: "20" }] }, S) as any;
    expect(isUuid(out.items[0].id)).toBe(true);
    expect(out.items[1].n).toBe(20);
  });
});
