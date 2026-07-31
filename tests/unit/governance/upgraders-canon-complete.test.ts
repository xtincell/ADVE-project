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
 */

import { describe, it, expect } from "vitest";
import { UPGRADERS_CANON_PILLARS } from "@/server/services/canon/upgraders-canon";
import { getContract } from "@/server/services/pillar-maturity/contracts-loader";
import { assessPillar, applicableRequirements } from "@/server/services/pillar-maturity/assessor";

describe("Canon UPgraders — 100 % sur les 8 piliers (HARD)", () => {
  for (const pillar of UPGRADERS_CANON_PILLARS) {
    it(`pilier ${pillar.key.toUpperCase()} atteint 100 % de son contrat COMPLETE`, () => {
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
      expect(Math.round(assessment.completionPct)).toBe(100);
    });
  }

  it("les 8 clés de stockage sont présentes, sans doublon", () => {
    const keys = UPGRADERS_CANON_PILLARS.map((p) => p.key).sort();
    expect(keys).toEqual(["a", "d", "e", "i", "r", "s", "t", "v"]);
  });
});
