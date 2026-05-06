/**
 * Anti-drift CI test — Campaign Tracker (Phase 19, ADR-0052).
 *
 * Vérifie :
 *   1. Cluster coverage — au moins un sous-cluster par lettre A→H activée Vague 1+
 *   2. Capability flags 4-états (READY|PARTIAL|STUB|DISABLED) cohérents
 *   3. Lifecycle (STUB|MVP|PRODUCTION) cohérent avec les states
 *   4. Pas de nouveau Neter (BRAINS reste à 7 + INFRASTRUCTURE = 8 entrées)
 *   5. Tous les Intent kinds Vague 1 sont déclarés dans le manifest
 *   6. Helpers purs (tokenize / jaccardSimilarity) — propriétés mathématiques
 */

import { describe, it, expect } from "vitest";
import { BRAINS } from "@/server/governance/manifest";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import {
  CLUSTER_CAPABILITIES,
  getClusterCapability,
  isReady,
  isAvailable,
  manifest,
  tokenize,
  jaccardSimilarity,
  intersectionSize,
  manifestoBeliefsHit,
} from "@/server/services/campaign-tracker";

// ─────────────────────────────────────────────────────────────────────────
// 1. Cluster coverage Vague 1 (A + B obligatoires)
// ─────────────────────────────────────────────────────────────────────────

describe("campaign-tracker — cluster coverage Vague 1 + Vague 2", () => {
  it("Cluster A (Trajectoire) has at least 2 sub-clusters", () => {
    const aClusters = CLUSTER_CAPABILITIES.filter((c) => c.cluster === "A");
    expect(aClusters.length).toBeGreaterThanOrEqual(2);
  });

  it("Cluster B (Cohérence narrative) has at least 3 sub-clusters", () => {
    const bClusters = CLUSTER_CAPABILITIES.filter((c) => c.cluster === "B");
    expect(bClusters.length).toBeGreaterThanOrEqual(3);
  });

  it("Cluster C (Superfan economy, Vague 2) has at least 3 sub-clusters", () => {
    const cClusters = CLUSTER_CAPABILITIES.filter((c) => c.cluster === "C");
    expect(cClusters.length).toBeGreaterThanOrEqual(3);
  });

  it("Cluster D (Signaux faibles & culture, Vague 2) has at least 4 sub-clusters", () => {
    const dClusters = CLUSTER_CAPABILITIES.filter((c) => c.cluster === "D");
    expect(dClusters.length).toBeGreaterThanOrEqual(4);
  });

  it("Cluster A includes trajectory.snapshot + trajectory.fuelBurnRate", () => {
    expect(getClusterCapability("trajectory.snapshot")).toBeDefined();
    expect(getClusterCapability("trajectory.fuelBurnRate")).toBeDefined();
  });

  it("Cluster B includes coherence.bigIdeaCoherence + coherence.culturalDebt + coherence.mythArc", () => {
    expect(getClusterCapability("coherence.bigIdeaCoherence")).toBeDefined();
    expect(getClusterCapability("coherence.culturalDebt")).toBeDefined();
    expect(getClusterCapability("coherence.mythArc")).toBeDefined();
  });

  it("All cluster slugs are unique", () => {
    const slugs = CLUSTER_CAPABILITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("All cluster letters are in A-H", () => {
    for (const cap of CLUSTER_CAPABILITIES) {
      expect("ABCDEFGH").toContain(cap.cluster);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2. Capability flags + Lifecycle cohérence (ADR-0052 §2.5 primitives 1+2)
// ─────────────────────────────────────────────────────────────────────────

describe("campaign-tracker — capability state coherence", () => {
  it("each cluster has a valid 4-state state field", () => {
    const validStates = ["READY", "PARTIAL", "STUB", "DISABLED"] as const;
    for (const cap of CLUSTER_CAPABILITIES) {
      expect(validStates).toContain(cap.state);
    }
  });

  it("each cluster has a valid lifecycle field", () => {
    const validLifecycles = ["STUB", "MVP", "PRODUCTION"] as const;
    for (const cap of CLUSTER_CAPABILITIES) {
      expect(validLifecycles).toContain(cap.lifecycle);
    }
  });

  it("STUB lifecycle implies STUB or DISABLED state", () => {
    for (const cap of CLUSTER_CAPABILITIES) {
      if (cap.lifecycle === "STUB") {
        expect(["STUB", "DISABLED"]).toContain(cap.state);
      }
    }
  });

  it("isReady() returns true only for READY state", () => {
    for (const cap of CLUSTER_CAPABILITIES) {
      const ready = isReady(cap.slug);
      expect(ready).toBe(cap.state === "READY");
    }
  });

  it("isAvailable() returns true for READY or PARTIAL", () => {
    for (const cap of CLUSTER_CAPABILITIES) {
      const avail = isAvailable(cap.slug);
      expect(avail).toBe(cap.state === "READY" || cap.state === "PARTIAL");
    }
  });

  it("each cluster has at least one degradation code", () => {
    for (const cap of CLUSTER_CAPABILITIES) {
      expect(cap.degradationCodes.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. Pas de nouveau Neter — Cap APOGEE 7/7 préservé
// ─────────────────────────────────────────────────────────────────────────

describe("campaign-tracker — no new Neter (Cap APOGEE 7/7 preserved)", () => {
  it("BRAINS const reste à 8 entrées (7 Neteru actifs + INFRASTRUCTURE)", () => {
    expect(BRAINS.length).toBe(8);
  });

  it("manifest.governor is one of the 7 active Neteru", () => {
    const activeNeteru = ["MESTOR", "ARTEMIS", "SESHAT", "THOT", "PTAH", "IMHOTEP", "ANUBIS"];
    expect(activeNeteru).toContain(manifest.governor);
  });

  it("manifest.governor is MESTOR (orchestrateur cross-Neteru)", () => {
    // ADR-0052 §2.4 : campaign-tracker est sous Mestor (pattern dispatcher).
    expect(manifest.governor).toBe("MESTOR");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. Intent kinds Vague 1 alignment
// ─────────────────────────────────────────────────────────────────────────

describe("campaign-tracker — Intent kinds Vague 1 + Vague 2 declared", () => {
  const VAGUE_1_KINDS = [
    "SNAPSHOT_CAMPAIGN_TRAJECTORY_PRE_LIVE",
    "CHECK_CAMPAIGN_FUEL_BURN_RATE",
    "THOT_PAUSE_CAMPAIGN_FLAME_OUT",
    "CHECK_BIG_IDEA_COHERENCE",
    "EVALUATE_MYTH_ARC_COHESION",
    "RECOMPUTE_CULTURAL_DEBT",
  ];

  const VAGUE_2_KINDS = [
    "RECOMPUTE_SUPERFAN_ATTRIBUTION",
    "MEASURE_DEVOTION_STICKINESS_COHORT",
    "CRM_SEGMENT_CAPTURE_SUPERFANS_FROM_CAMPAIGN",
    "INGEST_MCP_CONTEXT_TO_CAMPAIGN",
    "MEASURE_OVERTON_SHIFT",
    "EVALUATE_OVERTON_READINESS",
  ];

  it("all 6 Vague 1 Intent kinds exist in INTENT_KINDS catalog", () => {
    const kinds = new Set(INTENT_KINDS.map((k) => k.kind));
    for (const expected of VAGUE_1_KINDS) {
      expect(kinds.has(expected)).toBe(true);
    }
  });

  it("all 6 Vague 1 Intent kinds have SLO entries", () => {
    const sloKinds = new Set(INTENT_SLOS.map((s) => s.kind));
    for (const expected of VAGUE_1_KINDS) {
      expect(sloKinds.has(expected)).toBe(true);
    }
  });

  it("manifest.acceptsIntents contains all 6 Vague 1 kinds", () => {
    const accepts = new Set(manifest.acceptsIntents ?? []);
    for (const expected of VAGUE_1_KINDS) {
      expect(accepts.has(expected)).toBe(true);
    }
  });

  it("each Vague 1 Intent kind handler points to campaign-tracker", () => {
    for (const expected of VAGUE_1_KINDS) {
      const meta = INTENT_KINDS.find((k) => k.kind === expected);
      expect(meta?.handler).toBe("campaign-tracker");
    }
  });

  it("each Vague 1 Intent kind has a governor in {MESTOR, ARTEMIS, THOT}", () => {
    const allowedGovernors = new Set(["MESTOR", "ARTEMIS", "THOT"]);
    for (const expected of VAGUE_1_KINDS) {
      const meta = INTENT_KINDS.find((k) => k.kind === expected);
      expect(allowedGovernors.has(meta?.governor as string)).toBe(true);
    }
  });

  it("all 6 Vague 2 Intent kinds exist in INTENT_KINDS catalog", () => {
    const kinds = new Set(INTENT_KINDS.map((k) => k.kind));
    for (const expected of VAGUE_2_KINDS) {
      expect(kinds.has(expected)).toBe(true);
    }
  });

  it("all 6 Vague 2 Intent kinds have SLO entries", () => {
    const sloKinds = new Set(INTENT_SLOS.map((s) => s.kind));
    for (const expected of VAGUE_2_KINDS) {
      expect(sloKinds.has(expected)).toBe(true);
    }
  });

  it("manifest.acceptsIntents contains all 6 Vague 2 kinds", () => {
    const accepts = new Set(manifest.acceptsIntents ?? []);
    for (const expected of VAGUE_2_KINDS) {
      expect(accepts.has(expected)).toBe(true);
    }
  });

  it("each Vague 2 Intent kind handler points to campaign-tracker", () => {
    for (const expected of VAGUE_2_KINDS) {
      const meta = INTENT_KINDS.find((k) => k.kind === expected);
      expect(meta?.handler).toBe("campaign-tracker");
    }
  });

  it("each Vague 2 Intent kind has a governor in {ARTEMIS, SESHAT, ANUBIS}", () => {
    const allowedGovernors = new Set(["ARTEMIS", "SESHAT", "ANUBIS"]);
    for (const expected of VAGUE_2_KINDS) {
      const meta = INTENT_KINDS.find((k) => k.kind === expected);
      expect(allowedGovernors.has(meta?.governor as string)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Pure helpers — propriétés mathématiques (testables sans DB)
// ─────────────────────────────────────────────────────────────────────────

describe("campaign-tracker — coherence pure helpers", () => {
  describe("tokenize", () => {
    it("returns empty array for empty input", () => {
      expect(tokenize("")).toEqual([]);
    });

    it("filters stopwords FR", () => {
      const tokens = tokenize("le chat et la souris");
      expect(tokens).toEqual(["chat", "souris"]);
    });

    it("filters tokens shorter than 2 chars", () => {
      const tokens = tokenize("a bb ccc");
      expect(tokens).toEqual(["bb", "ccc"]);
    });

    it("normalizes accents (NFD)", () => {
      const tokens = tokenize("héros é à l'épreuve");
      expect(tokens).toContain("heros");
      expect(tokens).toContain("epreuve");
    });

    it("lowercases all tokens", () => {
      const tokens = tokenize("Apple iPhone PRODUCT");
      expect(tokens).toEqual(["apple", "iphone", "product"]);
    });
  });

  describe("jaccardSimilarity", () => {
    it("returns 0 for empty inputs", () => {
      expect(jaccardSimilarity([], [])).toBe(0);
      expect(jaccardSimilarity(["a"], [])).toBe(0);
      expect(jaccardSimilarity([], ["a"])).toBe(0);
    });

    it("returns 1 for identical sets", () => {
      expect(jaccardSimilarity(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
    });

    it("returns 0 for disjoint sets", () => {
      expect(jaccardSimilarity(["a", "b"], ["c", "d"])).toBe(0);
    });

    it("returns 0..1 for partial overlap", () => {
      // {a,b,c} ∩ {b,c,d} = {b,c} ; ∪ = {a,b,c,d} ; sim = 2/4 = 0.5
      expect(jaccardSimilarity(["a", "b", "c"], ["b", "c", "d"])).toBe(0.5);
    });

    it("dedupe input sets", () => {
      // {a,b} ∩ {b} = {b} ; ∪ = {a,b} ; sim = 1/2 = 0.5
      expect(jaccardSimilarity(["a", "a", "b"], ["b", "b"])).toBe(0.5);
    });

    it("is symmetric", () => {
      const a = ["x", "y", "z"];
      const b = ["y", "z", "w"];
      expect(jaccardSimilarity(a, b)).toBe(jaccardSimilarity(b, a));
    });
  });

  describe("intersectionSize", () => {
    it("returns 0 for disjoint sets", () => {
      expect(intersectionSize(["a"], ["b"])).toBe(0);
    });

    it("returns size of intersection", () => {
      expect(intersectionSize(["a", "b", "c"], ["b", "c", "d"])).toBe(2);
    });
  });

  describe("manifestoBeliefsHit", () => {
    it("counts beliefs touched by action tokens", () => {
      const beliefs = ["la marque crée du désir", "la marque sert sa communauté"];
      const actionTokens = tokenize("nous créons du désir authentique");
      const hits = manifestoBeliefsHit(beliefs, actionTokens);
      // belief 1 contient "désir" → hit. belief 2 ne match aucun token "fort" → 0.
      expect(hits).toBeGreaterThanOrEqual(1);
    });

    it("returns 0 when no overlap", () => {
      const beliefs = ["foo bar baz"];
      const actionTokens = tokenize("autre chose totalement");
      expect(manifestoBeliefsHit(beliefs, actionTokens)).toBe(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. Manifest mission contribution + sideEffects
// ─────────────────────────────────────────────────────────────────────────

describe("campaign-tracker — manifest mission contribution audit", () => {
  it("service-level missionContribution is CHAIN_VIA:multi", () => {
    expect(manifest.missionContribution).toBe("CHAIN_VIA:multi");
  });

  it("each capability declares a missionContribution", () => {
    for (const cap of manifest.capabilities) {
      expect(cap.missionContribution).toBeDefined();
    }
  });

  it("dispatch capability pauseFlameOut emits THOT_PAUSE_CAMPAIGN_FLAME_OUT", () => {
    expect(manifest.emits).toContain("THOT_PAUSE_CAMPAIGN_FLAME_OUT");
  });

  it("snapshotTrajectoryPreLive is idempotent", () => {
    const cap = manifest.capabilities.find((c) => c.name === "snapshotTrajectoryPreLive");
    expect(cap?.idempotent).toBe(true);
  });

  it("pauseFlameOut is idempotent", () => {
    const cap = manifest.capabilities.find((c) => c.name === "pauseFlameOut");
    expect(cap?.idempotent).toBe(true);
  });
});
