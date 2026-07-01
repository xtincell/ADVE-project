/**
 * P5 — anti-drift : la surface de suivi communauté du cockpit est câblée
 * bout-en-bout (route + nav + procédure paid-tier-gated + composant).
 *
 * Garde contre la régression de surface : la donnée communauté existait en
 * silos sans surface unifiée ; ce test fige l'existence du portail.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

describe("P5 — cockpit community surface wiring", () => {
  it("route page exists at the canonical path", () => {
    expect(
      existsSync(join(ROOT, "src/app/(cockpit)/cockpit/intelligence/community/page.tsx")),
    ).toBe(true);
  });

  it("panel component exists", () => {
    expect(
      existsSync(join(ROOT, "src/components/cockpit/intelligence/community-panel.tsx")),
    ).toBe(true);
  });

  it("nav exposes the Communauté entry under Intelligence", () => {
    const nav = readFileSync(join(ROOT, "src/components/navigation/portal-configs.ts"), "utf-8");
    expect(nav).toContain("/cockpit/intelligence/community");
  });

  it("getCommunityDashboard is a paid-tier-gated read-only query", () => {
    const router = readFileSync(join(ROOT, "src/server/trpc/routers/cockpit-router.ts"), "utf-8");
    expect(router).toContain("getCommunityDashboard");
    expect(router).toContain("checkPaidTier");
    expect(router).toContain("TIER_GATE_DENIED");
    // read-only — the cockpit router never mutates (governed-active marker).
    expect(router).not.toContain(".mutation(");
  });
});
