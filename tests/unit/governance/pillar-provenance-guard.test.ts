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


describe("initiative choice provenance follows stable identity", () => {
  const id = "63d161c4-937d-4df4-a9d3-332f279b80cc";
  const otherId = "a11a7e91-7993-4ddc-897e-25578d34d866";
  const path = `initiatives.${id}.status`;
  const chosen = { id, action: "Chosen", status: "SELECTED_FOR_ROADMAP" };
  it("keeps the choice through reordering without mutating the supplied candidate", () => {
    const next = { catalogueParCanal: { DIGITAL: [{ id: otherId, action: "Added", status: "RECOMMENDED" },
      { ...chosen, action: "Updated", status: "RECOMMENDED" }] } };
    const before = structuredClone(next);
    const result = applyProvenanceGuard({ previousContent: { catalogueParCanal: { DIGITAL: [chosen] } }, newContent: next,
      existingProvenance: { [path]: "HUMAN" }, incomingFor: () => "INFERRED" });
    expect(result.content).toMatchObject({ catalogueParCanal: { DIGITAL: [{ id: otherId, status: "RECOMMENDED" },
      { id, action: "Updated", status: "SELECTED_FOR_ROADMAP" }] } });
    expect(next).toEqual(before); expect(result.provenance[path]).toBe("HUMAN");
    expect(result.denied).toEqual([path]);
  });
  it("preserves a chosen source removed by a generator, while admitting its new proposals", () => {
    const result = applyProvenanceGuard({ previousContent: { catalogueParCanal: { DIGITAL: [chosen] } },
      newContent: { catalogueParCanal: { DIGITAL: [{ id: otherId, action: "Added", status: "RECOMMENDED" }] } },
      existingProvenance: { [path]: "HUMAN" }, incomingFor: () => "INFERRED" });
    expect(result.content).toMatchObject({ catalogueParCanal: { DIGITAL: [{ id: otherId }, chosen] } });
    expect(result.denied).toEqual([path]);
  });
  it("retains a human withdrawal across aliases in all existing collections", () => {
    const withdrawn = { ...chosen, status: "RECOMMENDED" };
    const result = applyProvenanceGuard({ previousContent: { catalogueParCanal: { DIGITAL: [withdrawn] } },
      newContent: { actionsByDevotionLevel: { PARTICIPANT: [chosen] }, actionsByOvertonPhase: [{ phase: "Phase 1", actions: [chosen] }] },
      existingProvenance: { [path]: "HUMAN" }, incomingFor: () => "INFERRED" });
    expect(result.content).toMatchObject({ actionsByDevotionLevel: { PARTICIPANT: [withdrawn] }, actionsByOvertonPhase: [{ actions: [withdrawn] }] });
  });
  it("confirms only the explicit choice and leaves the catalogue available for generation", () => {
    const content = { catalogueParCanal: { DIGITAL: [chosen] } };
    const result = applyProvenanceGuard({ previousContent: content, newContent: content, existingProvenance: {}, incomingFor: () => "INFERRED",
      declaredFor: key => key === path ? "HUMAN" : undefined, declaredPaths: [path] });
    expect(result.provenance[path]).toBe("HUMAN"); expect(result.provenance.catalogueParCanal).toBeUndefined();
  });
  it("does not refuse an unchanged human choice when only its definition changes", () => {
    const result = applyProvenanceGuard({ previousContent: { catalogueParCanal: { DIGITAL: [chosen] } },
      newContent: { catalogueParCanal: { DIGITAL: [{ ...chosen, action: "Updated definition" }] } },
      existingProvenance: { [path]: "HUMAN" }, incomingFor: () => "INFERRED" });
    expect(result.denied).toEqual([]); expect(result.challenged).toEqual([]);
    expect(result.content).toMatchObject({ catalogueParCanal: { DIGITAL: [{ ...chosen, action: "Updated definition" }] } });
  });
  it("refuses a contradicted secondary representation even when the canonical choice is unchanged", () => {
    const result = applyProvenanceGuard({ previousContent: { catalogueParCanal: { DIGITAL: [chosen] } },
      newContent: { catalogueParCanal: { DIGITAL: [chosen] }, actionsByDevotionLevel: { ENGAGE: [{ ...chosen, status: "REJECTED" }] } },
      existingProvenance: { [path]: "HUMAN" }, incomingFor: () => "SOURCE" });
    expect(result.challenged).toEqual([path]);
    expect(result.content).toMatchObject({ actionsByDevotionLevel: { ENGAGE: [chosen] } });
  });
});
