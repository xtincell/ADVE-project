/**
 * Phase 13 R2 — Test capture intentId pour streaming/replay NSP (closure résidu B7).
 *
 * Verrouille (assertions structurelles) :
 * 1. Les routes tRPC enrichOracle + enrichOracleNeteru exposent `intentId` dans le résultat
 * 2. La page proposition cockpit capture cet intentId via `setLastIntentId`
 * 3. Le tracker NSP est appelé avec `intentId={lastIntentId}` (au lieu de null)
 * 4. Le commentaire documente le scope R2 (post-completion replay) vs limitation
 *    (pre-completion live streaming nécessite refactor background queue)
 *
 * Si ce test échoue → drift Phase 13 R2. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const ROUTER_PATH = join(
  process.cwd(),
  "src/server/trpc/routers/strategy-presentation.ts",
);
const PROPOSITION_PATH = join(
  process.cwd(),
  "src/app/(cockpit)/cockpit/brand/proposition/page.tsx",
);

describe("Phase 13 R2 — capture intentId pour NSP replay", () => {
  let routerSource = "";
  let propositionSource = "";

  it("loads sources", async () => {
    routerSource = await fs.readFile(ROUTER_PATH, "utf8");
    propositionSource = await fs.readFile(PROPOSITION_PATH, "utf8");
    expect(routerSource.length).toBeGreaterThan(0);
    expect(propositionSource.length).toBeGreaterThan(0);
  });

  describe("tRPC routes exposent intentId dans le result", () => {
    it("enrichOracle handler retourne intentId depuis ctx", () => {
      const match = routerSource.match(/enrichOracle:[\s\S]*?\.mutation\(async \(\{[^)]*ctx[^)]*\}\)[\s\S]*?return[\s\S]*?intentId/);
      expect(match).toBeTruthy();
      // Vérification précise : ctx.intentId destructuré ou accédé
      expect(routerSource).toMatch(/intentId:\s*\(ctx as[^)]*\)\.intentId/);
    });

    it("enrichOracleNeteru handler retourne aussi intentId", () => {
      const match = routerSource.match(/enrichOracleNeteru:[\s\S]*?\.mutation\(async \(\{[^)]*ctx[^)]*\}\)[\s\S]*?return[\s\S]*?intentId/);
      expect(match).toBeTruthy();
    });

    it("commentaire documente Phase 13 R2", () => {
      expect(routerSource).toMatch(/Phase 13 R2.*intentId/);
    });
  });

  describe("Page proposition cockpit capture intentId", () => {
    it("déclare state lastIntentId", () => {
      expect(propositionSource).toContain("setLastIntentId");
      expect(propositionSource).toMatch(/lastIntentId,\s*setLastIntentId/);
    });

    it("setLastIntentId appelé dans onSuccess de enrichMutation", () => {
      const onSuccessMatch = propositionSource.match(/onSuccess:\s*\(data\)\s*=>\s*\{[\s\S]*?\}/);
      expect(onSuccessMatch).toBeTruthy();
      expect(onSuccessMatch![0]).toContain("setLastIntentId");
      expect(onSuccessMatch![0]).toContain("data.intentId");
    });

    it("Tracker NSP appelé avec intentId={lastIntentId} (au lieu de null)", () => {
      expect(propositionSource).toMatch(/<OracleEnrichmentTracker[\s\S]*?intentId=\{lastIntentId\}/);
    });

    it("commentaire documente scope R2 + limitation pre-completion streaming", () => {
      expect(propositionSource).toMatch(/Phase 13.*B7.*R2/);
      // Documentation explicite du scope/limitation pour future reference
      expect(propositionSource).toMatch(/refactor background queue|hors scope/);
    });

    it("enrichLog inclut l'intentId dans le log info post-completion", () => {
      expect(propositionSource).toMatch(/IntentEmission:.*data\.intentId/);
    });
  });

  describe("Type result étendu avec intentId optional", () => {
    it("enrichResult state type inclut intentId?: string | null", () => {
      expect(propositionSource).toMatch(/intentId\?:\s*string\s*\|\s*null/);
    });
  });
});
