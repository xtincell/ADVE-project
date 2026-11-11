/**
 * HARD — Le canon UPgraders est à 100 % sur les 8 piliers (Vague 10).
 *
 * Constat opérateur 2026-06-12 : « l'ADVERTIS d'UPgraders n'est pas complet
 * à 100 % : A, D, V, E pas complets → Notoria pas OK → R/T pas OK → I, S
 * non plus. » Ce test rend la régression impossible : chaque pilier du
 * canon est évalué contre son contrat de maturité (les mêmes validators
 * expectedKeys que la prod) et DOIT atteindre 100 %.
 *
 * Si un contrat évolue (nouveau champ requis), ce test casse — c'est voulu :
 * le canon se complète, il ne se dégrade pas (Loi 1 transposée au contenu).
 * Exception documentée : S, dont la maturité est bornée par son schéma strict
 * depuis 6.27.564 — voir le cliquet ci-dessous.
 */

import { describe, it, expect } from "vitest";
import { UPGRADERS_CANON_PILLARS } from "@/server/services/canon/upgraders-canon";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { assessPillar, applicableRequirements } from "@/server/services/pillar-maturity/assessor";

/**
 * S canon = forme historique, refusée par le schéma strict de S sur ces chemins.
 * Depuis le contrat S unique (ADR-0214, amendement 6.27.564), la maturité de S est
 * bornée par son schéma : l'ancien « 100 % » de S n'était qu'une présence de champs,
 * et ce S n'est pas approuvable en l'état. Le compléter exigerait d'inventer (un
 * cinquième indicateur, des identifiants, un montant chiffré) : refusé (interdit n°3).
 * CLIQUET : la liste ne peut que décroître (RESIDUAL-DEBT 564 (b)) ; toute nouvelle
 * entrée est une régression, toute correction réelle du canon la raccourcit.
 */
const S_CANON_STRICT_REFUSALS_564 = [
  ...[0, 1, 2, 3, 4].map((i) => `sprint90Days.${i}.sourceInitiativeId`),
  "globalBudget",
  ...[0, 1, 2, 3].map((i) => `kpiDashboard.${i}.frequency`), "kpiDashboard",
  ...[0, 1, 2, 3].map((i) => `selectedFromI.${i}.sourceInitiativeId`),
  "rejectedFromI.0.sourceInitiativeId",
  "northStarKPI.target", "northStarKPI.frequency", "northStarKPI.currentValue",
  ...[0, 1, 2].map((i) => `computed.mitigatedRiskIds.${i}`), "computed.roadmapRoutes",
  ...[0, 1, 2].map((i) => `recommandationsPrioritaires.${i}.source`),
];

describe("Canon UPgraders — 100 % sur sept piliers, S borné par son schéma strict (HARD)", () => {
  for (const pillar of UPGRADERS_CANON_PILLARS) {
    it(pillar.key === "s"
      ? "pilier S : présence complète, refus du schéma strict bornés par cliquet"
      : `pilier ${pillar.key.toUpperCase()} atteint 100 % de son contrat COMPLETE`, () => {
      const contract = getContract(pillar.key);
      expect(contract, `contrat absent pour ${pillar.key}`).toBeTruthy();
      const assessment = assessPillar(
        pillar.key,
        pillar.content as Record<string, unknown>,
        contract!,
      );
      // Les exigences CONDITIONNELLES non applicables sortent du compte, comme
      // pour l'assesseur et le scoreur. Le canon est un contenu de référence
      // rédigé, jamais passé au scan d'empreinte : lui réclamer `webPresence.*`
      // reviendrait à exiger une MESURE qui n'a pas eu lieu (ADR-0046). Le test
      // doit lire la règle avec le même filtre qu'elle, sinon il compare le
      // canon à un contrat qui ne s'applique pas à lui.
      const failed = applicableRequirements(
        contract!.stages.COMPLETE,
        pillar.content as Record<string, unknown>,
      )
        .filter((req) => !assessment.satisfied.includes(req.path))
        .map((req) => `${req.path}:${req.validator}`);
      expect(failed, `exigences non satisfaites: ${failed.join(" | ")}`).toEqual([]);
      if (pillar.key === "s") {
        // Présence complète, mais refus du schéma strict nommés et bornés (cliquet).
        expect(assessment.invalid).toEqual(S_CANON_STRICT_REFUSALS_564);
        expect(assessment.currentStage).toBe("INTAKE");
        expect(assessment.completionPct).toBeLessThan(100);
        return;
      }
      expect(assessment.invalid).toEqual([]);
      expect(Math.round(assessment.completionPct)).toBe(100);
    });
  }

  it("les 8 clés de stockage sont présentes, sans doublon", () => {
    const keys = UPGRADERS_CANON_PILLARS.map((p) => p.key).sort();
    expect(keys).toEqual(["a", "d", "e", "i", "r", "s", "t", "v"]);
  });
});
