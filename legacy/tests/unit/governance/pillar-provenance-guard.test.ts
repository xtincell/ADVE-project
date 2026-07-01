/**
 * Provenance guard (pillar-gateway) — règle HUMAIN > SOURCE > INFÉRÉ au champ.
 *
 * Verrouille : inféré n'écrase jamais humain/source (DENY+revert) ; source vs
 * humain → CHALLENGE+revert ; garde inerte tant qu'aucune provenance tracée.
 */

import { describe, expect, it } from "vitest";
import {
  applyProvenanceGuard,
  provenanceFromAuthorSystem,
} from "@/server/services/pillar-gateway/provenance-guard";

describe("applyProvenanceGuard", () => {
  it("inerte quand aucune provenance n'est tracée (tout UNKNOWN → ALLOW)", () => {
    const r = applyProvenanceGuard({
      previousContent: { nomMarque: "La Fusée" },
      newContent: { nomMarque: "UPgraders" },
      existingProvenance: {},
      incomingFor: () => "INFERRED",
    });
    expect(r.content.nomMarque).toBe("UPgraders"); // pas de garde → écrit
    expect(r.provenance.nomMarque).toBe("INFERRED");
    expect(r.denied).toHaveLength(0);
    expect(r.challenged).toHaveLength(0);
  });

  it("INFERRED ne peut pas écraser un champ HUMAN (DENY + revert)", () => {
    const r = applyProvenanceGuard({
      previousContent: { nomMarque: "UPgraders" },
      newContent: { nomMarque: "La Fusée" },
      existingProvenance: { nomMarque: "HUMAN" },
      incomingFor: () => "INFERRED",
    });
    expect(r.content.nomMarque).toBe("UPgraders"); // reverté
    expect(r.denied).toContain("nomMarque");
    expect(r.provenance.nomMarque).toBe("HUMAN"); // inchangé
    expect(r.warnings.join(" ")).toMatch(/ne peut écraser/);
  });

  it("SOURCE contredisant un HUMAN → CHALLENGE + revert (arbitrage)", () => {
    const r = applyProvenanceGuard({
      previousContent: { nomMarque: "UPgraders" },
      newContent: { nomMarque: "La Fusée" },
      existingProvenance: { nomMarque: "HUMAN" },
      incomingFor: () => "SOURCE",
    });
    expect(r.content.nomMarque).toBe("UPgraders"); // reverté, pas d'écrasement silencieux
    expect(r.challenged).toContain("nomMarque");
    expect(r.warnings.join(" ")).toMatch(/arbitrage|CHALLENGE/);
  });

  it("HUMAN écrase tout + tague le champ HUMAN", () => {
    const r = applyProvenanceGuard({
      previousContent: { nomMarque: "La Fusée" },
      newContent: { nomMarque: "UPgraders" },
      existingProvenance: { nomMarque: "INFERRED" },
      incomingFor: () => "HUMAN",
    });
    expect(r.content.nomMarque).toBe("UPgraders");
    expect(r.provenance.nomMarque).toBe("HUMAN");
    expect(r.denied).toHaveLength(0);
  });

  it("SOURCE corrige un INFERRED (ALLOW + retag SOURCE)", () => {
    const r = applyProvenanceGuard({
      previousContent: { secteur: "OS" },
      newContent: { secteur: "Industry OS" },
      existingProvenance: { secteur: "INFERRED" },
      incomingFor: () => "SOURCE",
    });
    expect(r.content.secteur).toBe("Industry OS");
    expect(r.provenance.secteur).toBe("SOURCE");
  });

  it("ne touche pas les champs inchangés (conserve leur provenance)", () => {
    const r = applyProvenanceGuard({
      previousContent: { a: "x", b: "y" },
      newContent: { a: "x", b: "z" },
      existingProvenance: { a: "HUMAN", b: "INFERRED" },
      incomingFor: () => "INFERRED",
    });
    expect(r.content.a).toBe("x");
    expect(r.content.b).toBe("z"); // INFERRED→INFERRED autorisé
    expect(r.provenance.a).toBe("HUMAN"); // préservé
  });
});

describe("provenanceFromAuthorSystem", () => {
  it("OPERATOR → HUMAN, INGESTION/BRIEF_INGEST → SOURCE, reste → INFERRED", () => {
    expect(provenanceFromAuthorSystem("OPERATOR")).toBe("HUMAN");
    expect(provenanceFromAuthorSystem("INGESTION")).toBe("SOURCE");
    expect(provenanceFromAuthorSystem("BRIEF_INGEST")).toBe("SOURCE");
    expect(provenanceFromAuthorSystem("ARTEMIS")).toBe("INFERRED");
    expect(provenanceFromAuthorSystem("PROTOCOLE_R")).toBe("INFERRED");
    expect(provenanceFromAuthorSystem("AUTO_FILLER")).toBe("INFERRED");
  });
});
