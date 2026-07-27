/**
 * Provenance guard (pillar-gateway) — règle HUMAIN > SOURCE > INFÉRÉ au champ.
 *
 * Verrouille : inféré n'écrase jamais humain/source (DENY+revert) ; source vs
 * humain → CHALLENGE+revert ; garde inerte tant qu'aucune provenance tracée.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
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

describe("suppression par OMISSION — arbitrée comme une écriture", () => {
  it("un écrivain dérivé ne peut pas effacer un champ HUMAN en l'omettant", () => {
    const r = applyProvenanceGuard({
      previousContent: { nomMarque: "SPAWT", citation: "Phrase saisie par l'humain" },
      newContent: { nomMarque: "SPAWT" }, // `citation` OMISE
      existingProvenance: { citation: "HUMAN" },
      incomingFor: () => "INFERRED",
    });
    expect(r.content.citation).toBe("Phrase saisie par l'humain");
    expect(r.denied).toContain("citation");
    expect(r.warnings.join(" ")).toMatch(/suppression par omission/i);
  });

  it("un OPERATEUR peut supprimer, et la provenance orpheline est purgée", () => {
    const r = applyProvenanceGuard({
      previousContent: { nomMarque: "SPAWT", citation: "à supprimer" },
      newContent: { nomMarque: "SPAWT" },
      existingProvenance: { citation: "HUMAN" },
      incomingFor: () => "HUMAN",
    });
    expect("citation" in r.content).toBe(false);
    // Sans la purge, `_fieldProvenance` NOMMERAIT un champ disparu dans ce
    // qu'on présente comme la liste de travail de l'opérateur.
    expect("citation" in r.provenance).toBe(false);
    expect(r.denied).not.toContain("citation");
  });

  it("le contenu arbitré est bien celui que le gateway doit persister", () => {
    // Régression du défaut le plus coûteux de cette classe : le gateway
    // recopiait le résultat en itérant sur les clés du CANDIDAT, qui ne peut
    // par définition pas contenir la clé omise — la restauration ci-dessus
    // était produite puis jetée, et l'avertissement mentait.
    const gateway = readFileSync(
      join(__dirname, "..", "..", "..", "src", "server", "services", "pillar-gateway", "index.ts"),
      "utf8",
    );
    expect(gateway).toMatch(/for \(const \[key, value\] of Object\.entries\(guard\.content\)\)/);
  });
});

describe("confirmation d'un champ INCHANGÉ (declaredFor)", () => {
  it("monte l'autorité d'un champ inféré que l'opérateur valide", () => {
    // Confirmer = la valeur ne bouge pas, son AUTORITÉ change. Le garde
    // court-circuitait les champs inchangés : la confirmation ne posait donc
    // rien, la passe suivante obtenait ALLOW et écrasait — pendant que la
    // procédure répondait `provenanceLocked`.
    const r = applyProvenanceGuard({
      previousContent: { identite: { archetype: "Le Sage" } },
      newContent: { identite: { archetype: "Le Sage" } },
      existingProvenance: { identite: "INFERRED" },
      incomingFor: () => "HUMAN",
      declaredFor: (k) => (k === "identite" ? "HUMAN" : undefined),
    });
    expect(r.provenance.identite).toBe("HUMAN");
  });

  it("ne DÉGRADE jamais une provenance déjà tracée", () => {
    const r = applyProvenanceGuard({
      previousContent: { identite: { archetype: "Le Sage" } },
      newContent: { identite: { archetype: "Le Sage" } },
      existingProvenance: { identite: "HUMAN" },
      incomingFor: () => "INFERRED",
      declaredFor: () => "INFERRED",
    });
    expect(r.provenance.identite).toBe("HUMAN");
  });

  it("sans déclaration explicite, un champ inchangé garde sa provenance", () => {
    const r = applyProvenanceGuard({
      previousContent: { identite: { archetype: "Le Sage" } },
      newContent: { identite: { archetype: "Le Sage" } },
      existingProvenance: { identite: "INFERRED" },
      incomingFor: () => "HUMAN",
    });
    expect(r.provenance.identite).toBe("INFERRED");
  });
});
