/**
 * Phase 20 — Décomposition recherche marché.
 *
 * Vérifie que la décomposition est complète et cohérente :
 *   - 3 Glory tools atomiques DELEGATE registered
 *   - GlorySequence MARKET-RESEARCH registered avec 3 steps GLORY
 *   - 3 delegate handlers registered dans delegate-registry
 *   - Chaînage step.outputKeys ↔ next step inputs cohérent
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getGloryTool, EXTENDED_GLORY_TOOLS } from "@/server/services/artemis/tools/registry";
import { ALL_SEQUENCES, getSequence } from "@/server/services/artemis/tools/sequences";
import {
  getDelegateHandler,
  listRegisteredHandlerKeys,
  bootstrapDelegates,
} from "@/server/services/artemis/tools/delegate-registry";

beforeAll(async () => {
  // Ensure delegate handlers are registered before any test runs.
  await bootstrapDelegates();
});

describe("Phase 20 — Glory tools market-research décomposition", () => {
  it("registers 3 atomic DELEGATE tools in EXTENDED registry", () => {
    const slugs = ["market-source-fetcher", "market-research-llm-extractor", "market-study-persister"];
    for (const slug of slugs) {
      const tool = getGloryTool(slug);
      expect(tool, `Glory tool ${slug} not found`).toBeDefined();
      expect(tool!.executionType).toBe("DELEGATE");
      expect(tool!.delegateDescriptor).toBeDefined();
      expect(tool!.delegateDescriptor!.handlerKey).toMatch(/^market-research:/);
      expect(tool!.layer).toBe("HYBRID");
      expect(tool!.pillarKeys).toContain("T");
      expect(tool!.status).toBe("ACTIVE");
    }
  });

  it("market-research-llm-extractor is the only paid-tier tool of the 3", () => {
    expect(getGloryTool("market-source-fetcher")!.requiresPaidTier).toBeFalsy();
    expect(getGloryTool("market-research-llm-extractor")!.requiresPaidTier).toBe(true);
    expect(getGloryTool("market-study-persister")!.requiresPaidTier).toBeFalsy();
  });

  it("declares dependency chain : extractor depends on fetcher, persister depends on extractor", () => {
    expect(getGloryTool("market-source-fetcher")!.dependencies).toEqual([]);
    expect(getGloryTool("market-research-llm-extractor")!.dependencies).toEqual([
      "market-source-fetcher",
    ]);
    expect(getGloryTool("market-study-persister")!.dependencies).toEqual([
      "market-research-llm-extractor",
    ]);
  });

  it("preserves CORE cardinality (additions go to EXTENDED only)", () => {
    // Cardinality 56 du CORE is enforced ailleurs ; ici on vérifie juste que
    // les 3 nouveaux tools sont bien dans EXTENDED.
    const slugs = ["market-source-fetcher", "market-research-llm-extractor", "market-study-persister"];
    const inExtended = slugs.every((s) => EXTENDED_GLORY_TOOLS.some((t) => t.slug === s));
    expect(inExtended).toBe(true);
  });
});

describe("Phase 20 — GlorySequence MARKET-RESEARCH", () => {
  it("is registered in ALL_SEQUENCES", () => {
    const seq = getSequence("MARKET-RESEARCH");
    expect(seq).toBeDefined();
  });

  it("chains exactly 3 GLORY steps in correct order", () => {
    const seq = getSequence("MARKET-RESEARCH")!;
    expect(seq.steps).toHaveLength(3);
    expect(seq.steps.every((s) => s.type === "GLORY")).toBe(true);
    expect(seq.steps[0]!.ref).toBe("market-source-fetcher");
    expect(seq.steps[1]!.ref).toBe("market-research-llm-extractor");
    expect(seq.steps[2]!.ref).toBe("market-study-persister");
  });

  it("declares output keys that downstream steps can consume", () => {
    const seq = getSequence("MARKET-RESEARCH")!;
    // fetcher produit fetched_sources, extractor consomme dans inputFields
    expect(seq.steps[0]!.outputKeys).toContain("fetched_sources");
    const extractor = getGloryTool("market-research-llm-extractor")!;
    expect(extractor.inputFields).toContain("fetched_sources");

    // extractor produit markdown, persister consomme
    expect(seq.steps[1]!.outputKeys).toContain("markdown");
    const persister = getGloryTool("market-study-persister")!;
    expect(persister.inputFields).toContain("markdown");

    // persister produit raw_entry_id (final output utilisé par caller)
    expect(seq.steps[2]!.outputKeys).toContain("raw_entry_id");
  });

  it("is family OPERATIONAL and lifecycle DRAFT (Phase 17 pattern : DRAFT 1 mois puis promotion STABLE)", () => {
    const seq = getSequence("MARKET-RESEARCH")!;
    expect(seq.family).toBe("OPERATIONAL");
    expect(seq.lifecycle).toBe("DRAFT");
    expect(seq.aiPowered).toBe(true);
    expect(seq.tier).toBe(5);
  });

  it("appears in ALL_SEQUENCES export", () => {
    const found = ALL_SEQUENCES.find((s) => s.key === "MARKET-RESEARCH");
    expect(found).toBeDefined();
  });
});

describe("Phase 20 — Delegate handlers registration", () => {
  it("registers 3 market-research handlers", () => {
    expect(getDelegateHandler("market-research:fetch-sources")).toBeDefined();
    expect(getDelegateHandler("market-research:llm-extract")).toBeDefined();
    expect(getDelegateHandler("market-research:persist")).toBeDefined();
  });

  it("listRegisteredHandlerKeys includes the 3 keys", () => {
    const keys = listRegisteredHandlerKeys();
    expect(keys).toContain("market-research:fetch-sources");
    expect(keys).toContain("market-research:llm-extract");
    expect(keys).toContain("market-research:persist");
  });

  it("returns undefined for unregistered handler keys", () => {
    expect(getDelegateHandler("market-research:nonexistent")).toBeUndefined();
    expect(getDelegateHandler("foo")).toBeUndefined();
  });

  it("each Glory tool's delegateDescriptor.handlerKey resolves to a registered handler", () => {
    const slugs = ["market-source-fetcher", "market-research-llm-extractor", "market-study-persister"];
    for (const slug of slugs) {
      const tool = getGloryTool(slug)!;
      const handler = getDelegateHandler(tool.delegateDescriptor!.handlerKey);
      expect(handler, `handler ${tool.delegateDescriptor!.handlerKey} not registered`).toBeDefined();
    }
  });
});

describe("Phase 20 — fetch-sources handler (no-LLM, no-network in test)", () => {
  it("returns memory_only=true when no URLs provided", async () => {
    const handler = getDelegateHandler("market-research:fetch-sources")!;
    const out = await handler({ source_urls: "[]" }, { strategyId: "(global)" });
    expect(out.memory_only).toBe(true);
    expect(out.ok_count).toBe(0);
    expect(out.failed_count).toBe(0);
    expect(out.fetched_sources).toBe("[]");
  });

  it("returns memory_only=true when source_urls is undefined", async () => {
    const handler = getDelegateHandler("market-research:fetch-sources")!;
    const out = await handler({}, { strategyId: "(global)" });
    expect(out.memory_only).toBe(true);
  });

  it("rejects loopback URLs (anti-SSRF) without making real network call", async () => {
    const handler = getDelegateHandler("market-research:fetch-sources")!;
    const out = await handler(
      { source_urls: JSON.stringify(["http://127.0.0.1/secret", "http://192.168.1.1/admin"]) },
      { strategyId: "(global)" },
    );
    expect(out.memory_only).toBe(false);
    expect(out.ok_count).toBe(0);
    expect(out.failed_count).toBe(2);
    const parsed = JSON.parse(out.fetched_sources as string);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].ok).toBe(false);
    expect(parsed[0].error).toContain("not allowed");
    expect(parsed[1].ok).toBe(false);
  });
});
