/**
 * Phase 13 — NSP streaming Oracle screens (B7, ADR-0014).
 *
 * Verrouille (assertions structurelles) :
 * 1. OracleEnrichmentTracker étendu de 21 → 35 sections
 * 2. Tier groups (CORE / BIG4_BASELINE / DISTINCTIVE / DORMANT) affichés
 * 3. Consume useNeteruIntent (NSP SSE) pour le streaming live
 * 4. Fallback completenessReport prop pour caller polling-based existant
 * 5. Page proposition cockpit câble le tracker
 *
 * Si ce test échoue → drift Phase 13 NSP UI. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const TRACKER_PATH = join(
  process.cwd(),
  "src/components/neteru/oracle-enrichment-tracker.tsx",
);
const PROPOSITION_PATH = join(
  process.cwd(),
  "src/app/(cockpit)/cockpit/brand/proposition/page.tsx",
);

describe("Phase 13 NSP streaming Oracle screens (B7)", () => {
  let trackerSource = "";
  let propositionSource = "";

  it("loads sources", async () => {
    trackerSource = await fs.readFile(TRACKER_PATH, "utf8");
    propositionSource = await fs.readFile(PROPOSITION_PATH, "utf8");
    expect(trackerSource.length).toBeGreaterThan(0);
    expect(propositionSource.length).toBeGreaterThan(0);
  });

  describe("OracleEnrichmentTracker — 35 sections + tier groups", () => {
    it("imports SECTION_REGISTRY (35 sections Phase 13)", () => {
      expect(trackerSource).toContain('import { SECTION_REGISTRY');
      expect(trackerSource).toContain('from "@/server/services/strategy-presentation/types"');
    });

    it("imports SectionTier type", () => {
      expect(trackerSource).toContain("SectionTier");
    });

    it("uses useNeteruIntent (NSP SSE hook)", () => {
      expect(trackerSource).toContain('import { useNeteruIntent } from "@/hooks/use-neteru"');
      expect(trackerSource).toContain("useNeteruIntent(intentId)");
    });

    it("declares TIER_LABEL with 4 tiers (CORE / BIG4_BASELINE / DISTINCTIVE / DORMANT)", () => {
      expect(trackerSource).toContain("TIER_LABEL");
      expect(trackerSource).toContain('CORE: "Core (21)"');
      expect(trackerSource).toContain('BIG4_BASELINE: "Big4 baseline (7)"');
      expect(trackerSource).toContain('DISTINCTIVE: "Distinctifs (5)"');
      expect(trackerSource).toContain('DORMANT: "Dormants (2)"');
    });

    it("groups sections by tier in render", () => {
      expect(trackerSource).toContain("byTier");
      expect(trackerSource).toMatch(/byTier\[meta\.tier/);
    });

    it("exposes completenessReport prop for polling-based fallback callers", () => {
      expect(trackerSource).toContain("completenessReport?:");
      expect(trackerSource).toMatch(/Record<string,\s*"complete"\s*\|\s*"partial"\s*\|\s*"empty">/);
    });

    it("computes status from completenessReport (complete→done, partial→in-progress, empty→queued)", () => {
      expect(trackerSource).toMatch(/status === "complete"\s*\?\s*"done"/);
      expect(trackerSource).toMatch(/"partial"\s*\?\s*"in-progress"/);
    });

    it("NSP events take priority over completenessReport (real-time)", () => {
      // Le pattern ordering : completenessReport d'abord, puis NSP events override
      const reportIdx = trackerSource.indexOf("completenessReport)");
      const nspIdx = trackerSource.indexOf("for (const e of history)");
      expect(reportIdx).toBeGreaterThan(0);
      expect(nspIdx).toBeGreaterThan(reportIdx);
    });
  });

  describe("Page proposition cockpit câble le tracker (B7)", () => {
    it("imports OracleEnrichmentTracker", () => {
      expect(propositionSource).toContain(
        'import { OracleEnrichmentTracker } from "@/components/neteru/oracle-enrichment-tracker"',
      );
    });

    it("renders <OracleEnrichmentTracker> with completenessReport prop (fallback)", () => {
      expect(propositionSource).toContain("<OracleEnrichmentTracker");
      expect(propositionSource).toContain("completenessReport={completeness.data");
    });

    it("documents Phase 13 (B7+R2) wiring with intentId capture (R2 closure)", () => {
      expect(propositionSource).toMatch(/Phase 13.*B7.*R2.*NSP/);
      // R2 référence : background queue / pre-completion streaming explicite
      expect(propositionSource).toMatch(/intentId capt(ur|é)/);
    });
  });
});
