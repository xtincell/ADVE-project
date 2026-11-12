import { describe, expect, it } from "vitest";
import { compareObjective, type ObjectiveComparisonInput } from "@/domain/recommendation-comparison";
import { fieldComparator } from "@/server/services/notoria/compare-proposal";
import { simulateRecoOnContents } from "@/server/services/notoria/preview-impact";

const criterion: ObjectiveComparisonInput = {
  objective: "Coût pour acquérir un restaurateur", criterion: "CAC du canal", unit: "FCFA/client",
  direction: "lower", candidate: 8_000, incumbent: { id: "canal-1", value: 10_000, label: "Canal retenu" },
  evidence: ["plan:cohorte-1"], basis: "projection",
};
const weights = { a: 1, d: 1, v: 1, e: 1, r: 1, t: 1, i: 1, s: 1 };

describe("présélection sur un objectif comparable", () => {
  it("respecte le sens de l’objectif, un plafond absolu et la décision présente", () => {
    expect(compareObjective(criterion)).toMatchObject({ verdict: "BETTER", delta: -2_000, shortlisted: true });
    expect(compareObjective({ ...criterion, threshold: 7_000 })).toMatchObject({ verdict: "BELOW", shortlisted: false });
    expect(compareObjective({ ...criterion, candidate: 10_000 }).verdict).toBe("EQUAL");
    expect(compareObjective({ ...criterion, duplicate: true }).shortlisted).toBe(false);
    expect(compareObjective({ ...criterion, incumbent: undefined, threshold: 8_000 }).verdict).toBe("THRESHOLD_MET");
    expect(compareObjective({ ...criterion, incumbent: { ...criterion.incumbent!, value: null }, threshold: 9_000 }).verdict).toBe("UNASSESSED");
    expect(compareObjective({ ...criterion, evidence: [] }).shortlisted).toBe(false);
  });

  it("compare la cellule du produit en place et conserve les autres valeurs du catalogue", () => {
    const v = { produitsCatalogue: [{ nom: "Gold", gainClientConcret: "Mesurer les visites attribuées dans le lieu." }] };
    const row = { targetPillarKey: "v", targetField: "produitsCatalogue[0].gainClientConcret",
      proposedValue: v.produitsCatalogue[0]!.gainClientConcret, operation: "SET", confidence: 1 };
    const compare = fieldComparator({ v }, weights);
    expect(compare(row).verdict).toBe("DUPLICATE");
    expect(compare({ ...row, targetField: "produitsCatalogue[4].gainClientConcret" }).verdict).toBe("UNASSESSED");
    const next = simulateRecoOnContents({ v }, { ...row, proposedValue: "Recevoir un relevé des visites attribuées." });
    expect(next.v?.produitsCatalogue).toEqual([{ nom: "Gold", gainClientConcret: "Recevoir un relevé des visites attribuées." }]);
    expect(next.v).not.toHaveProperty("produitsCatalogue[0].gainClientConcret", row.proposedValue);
    expect(v.produitsCatalogue[0]!.gainClientConcret).toBe(row.proposedValue);
  });

  it("simule un changement ciblé par identifiant et un retrait introuvable sans créer de champ fictif", () => {
    const contents = { v: { produitsCatalogue: [{ id: "a", nom: "Gold" }, { id: "b", nom: "Découverte" }] } };
    const request = { targetPillarKey: "v", targetField: "produitsCatalogue", proposedValue: { id: "b", nom: "Essai" }, targetMatch: { key: "id", value: "b" }, operation: "MODIFY" };
    expect(simulateRecoOnContents(contents, request).v?.produitsCatalogue).toEqual([contents.v.produitsCatalogue[0], request.proposedValue]);
    expect(simulateRecoOnContents(contents, { ...request, operation: "REMOVE", targetMatch: { key: "id", value: "absent" } }).v).toEqual(contents.v);
  });
});
