import { describe, it, expect } from "vitest";
import {
  resolveRequirements,
  extractUpstreamKinds,
  describeDag,
} from "@/server/services/deliverable-orchestrator/resolver";
import {
  ResolverCycleDetectedError,
  TargetNotForgeableError,
} from "@/server/services/deliverable-orchestrator/types";
import {
  TARGET_KIND_TO_PRODUCER_SLUG,
  SUPPORTED_TARGET_KINDS,
} from "@/server/services/deliverable-orchestrator/target-mapping";

/**
 * Phase 17 commit 3 — DAG resolver tests.
 *
 * Resolver est pure (lit registry statique, pas de DB) — pas de mocks requis.
 */

describe("deliverable-orchestrator/resolver", () => {
  describe("resolveRequirements", () => {
    it("resolves a simple target with one upstream kind (KV_VISUAL)", () => {
      const { targetSlug, briefDag } = resolveRequirements("KV_VISUAL");

      expect(targetSlug).toBe("kv-banana-prompt-generator");
      // Target = depth 0
      expect(briefDag[0]!.kind).toBe("KV_VISUAL");
      expect(briefDag[0]!.depth).toBe(0);
      expect(briefDag[0]!.producerSlug).toBe("kv-banana-prompt-generator");

      // kv-banana-prompt-generator.requires = [KV_ART_DIRECTION_BRIEF, BIG_IDEA, CHROMATIC_STRATEGY]
      const upstreamKinds = briefDag.filter((n) => n.depth > 0).map((n) => n.kind);
      expect(upstreamKinds).toContain("KV_ART_DIRECTION_BRIEF");
      expect(upstreamKinds).toContain("BIG_IDEA");
      expect(upstreamKinds).toContain("CHROMATIC_STRATEGY");
    });

    it("respects topological order (target before upstream)", () => {
      const { briefDag } = resolveRequirements("KV_VISUAL");
      const target = briefDag.find((n) => n.kind === "KV_VISUAL")!;
      const upstreams = briefDag.filter((n) => n.depth > 0);

      for (const u of upstreams) {
        expect(u.depth).toBeGreaterThan(target.depth);
      }
    });

    it("treats kinds without producer mapping as vault-only leaves", () => {
      // BIG_IDEA, CHROMATIC_STRATEGY ne sont PAS dans TARGET_KIND_TO_PRODUCER_SLUG.
      // Ils doivent apparaître comme leaf (producerSlug=null).
      const { briefDag } = resolveRequirements("KV_VISUAL");
      const bigIdea = briefDag.find((n) => n.kind === "BIG_IDEA");
      const chromatic = briefDag.find((n) => n.kind === "CHROMATIC_STRATEGY");

      expect(bigIdea?.producerSlug).toBeNull();
      expect(chromatic?.producerSlug).toBeNull();
    });

    it("throws TargetNotForgeableError for an unmapped target kind", () => {
      // GENERIC n'est pas dans TARGET_KIND_TO_PRODUCER_SLUG
      expect(() => resolveRequirements("GENERIC")).toThrow(TargetNotForgeableError);
    });

    it("does NOT detect a cycle in the canonical Phase 17 mapping", () => {
      // Sanity check : aucun des kinds supportés ne crée de cycle.
      for (const targetKind of SUPPORTED_TARGET_KINDS) {
        expect(() => resolveRequirements(targetKind)).not.toThrow();
      }
    });

    it("dedupes a kind reached by multiple paths (same depth max)", () => {
      // KV_VISUAL → kv-banana-prompt-generator.requires = [KV_ART_DIRECTION_BRIEF, BIG_IDEA, CHROMATIC_STRATEGY]
      // KV_ART_DIRECTION_BRIEF n'est pas dans target-mapping, donc leaf.
      // Pas de path multiple ici → on teste la garantie : chaque kind n'apparaît qu'une fois.
      const { briefDag } = resolveRequirements("KV_VISUAL");
      const kindSet = new Set(briefDag.map((n) => n.kind));
      expect(kindSet.size).toBe(briefDag.length);
    });
  });

  describe("extractUpstreamKinds", () => {
    it("excludes the target (depth 0) from the upstream list", () => {
      const { briefDag } = resolveRequirements("KV_VISUAL");
      const upstream = extractUpstreamKinds(briefDag);

      expect(upstream).not.toContain("KV_VISUAL");
      expect(upstream.length).toBe(briefDag.length - 1);
    });
  });

  describe("describeDag", () => {
    it("produces a non-empty human-readable string", () => {
      const { briefDag } = resolveRequirements("PRINT_AD_SPEC");
      const desc = describeDag(briefDag);

      expect(desc.length).toBeGreaterThan(0);
      expect(desc).toContain("PRINT_AD_SPEC");
      expect(desc).toContain("print-ad-architect");
    });
  });

  describe("target-mapping coverage", () => {
    it("every supported target kind has a real Glory tool slug", () => {
      // Sanity : les slugs déclarés dans la map existent dans le registry.
      // (cette assertion casse si on rename un slug sans mettre à jour la map).
      const { _internals } = require("@/server/services/deliverable-orchestrator/resolver");
      const known = new Set(_internals.EXTENDED_GLORY_TOOLS.map((t: { slug: string }) => t.slug));
      for (const slug of Object.values(TARGET_KIND_TO_PRODUCER_SLUG)) {
        expect(known.has(slug)).toBe(true);
      }
    });
  });
});
