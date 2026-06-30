/**
 * HARD — Les 7 sequences ORACLE_DERIVED (DERIVED-EXEC-SUMMARY … DERIVED-CONDITIONS)
 * rechargent la strategy via le calc `executeSectionDraftCalc`, qui DOIT
 * réutiliser l'include canonique `PRESENTATION_INCLUDE` (assembleur Oracle).
 *
 * Pourquoi : les `section-mappers` sont co-conçus avec PRESENTATION_INCLUDE et
 * accèdent SANS garde à des relations (`strategy.user.name`,
 * `strategy.client`, `m.deliverables.map`, `m.driver`, `strategy.gloryOutputs`,
 * `c.milestones.map`, `c.teamMembers`). Un include hand-rollé qui en omet une
 * laisse la relation `undefined` → `.map`/`.name` throw → la sequence DERIVED
 * concernée part en PARTIAL/FAILED au scan fonctionnel.
 *
 * Régression réelle (healer pass 2026-06-30) : l'ancien include minimal du calc
 * chargeait `missions: true` (sans deliverables/driver) et omettait
 * user/client/gloryOutputs → DERIVED-PROD-LIV (mapProductionLivrables) et
 * DERIVED-CONDITIONS (mapConditionsEtapes) throwaient. Fix : réutiliser
 * PRESENTATION_INCLUDE (superset prouvé par la voie enrich prod, qui exécute
 * TOUS les mappers). Ce test verrouille les deux faces : l'include canonique
 * couvre les relations critiques, ET le calc le réutilise (pas de retour à un
 * include divergent).
 */

import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { PRESENTATION_INCLUDE } from "@/server/services/strategy-presentation";

describe("ORACLE_DERIVED — include canonique couvre les relations des mappers (HARD)", () => {
  it("PRESENTATION_INCLUDE inclut user + client (mapConditionsEtapes)", () => {
    expect(PRESENTATION_INCLUDE.user).toBeTruthy();
    expect(PRESENTATION_INCLUDE.client).toBeTruthy();
  });

  it("PRESENTATION_INCLUDE inclut missions.deliverables + missions.driver (mapProductionLivrables)", () => {
    const missions = PRESENTATION_INCLUDE.missions as { include?: Record<string, unknown> };
    expect(missions.include?.deliverables, "missions.deliverables manquant").toBeTruthy();
    expect(missions.include?.driver, "missions.driver manquant").toBeTruthy();
  });

  it("PRESENTATION_INCLUDE inclut gloryOutputs (mapProductionLivrables)", () => {
    expect(PRESENTATION_INCLUDE.gloryOutputs, "gloryOutputs manquant").toBeTruthy();
  });

  it("PRESENTATION_INCLUDE inclut campaigns.milestones + teamMembers (mapTimelineGouvernance)", () => {
    const campaigns = PRESENTATION_INCLUDE.campaigns as { include?: Record<string, unknown> };
    expect(campaigns.include?.milestones, "campaigns.milestones manquant").toBeTruthy();
    expect(campaigns.include?.teamMembers, "campaigns.teamMembers manquant").toBeTruthy();
  });
});

describe("ORACLE_DERIVED — la voie calc réutilise l'include canonique (HARD)", () => {
  const EXECUTOR = path.resolve(
    __dirname,
    "../../../src/server/services/artemis/tools/sequence-executor.ts",
  );
  const src = fs.readFileSync(EXECUTOR, "utf8");

  it("executeSectionDraftCalc recharge via include: PRESENTATION_INCLUDE", () => {
    expect(
      src.includes("include: PRESENTATION_INCLUDE"),
      "sequence-executor.ts doit recharger la strategy du calc DERIVED avec PRESENTATION_INCLUDE (pas un include minimal divergent)",
    ).toBe(true);
  });
});
