import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  const state = { sources: [] as any[], nodes: [] as any[], failWrite: false, nextId: 0 };
  function matches(row: any, where: any = {}): boolean {
    return Object.entries(where).every(([key, value]: [string, any]) =>
      value && typeof value === "object" && "in" in value
        ? value.in.includes(row[key]) : row[key] === value);
  }
  const db: any = {
    brandDataSource: {
      findUnique: vi.fn(async ({ where }) => structuredClone(state.sources.find((s) => matches(s, where)) ?? null)),
      findMany: vi.fn(async ({ where }) => structuredClone(state.sources.filter((s) => matches(s, where)))),
    },
    brandContextNode: {
      findFirst: vi.fn(async ({ where }) => state.nodes.find((n) => matches(n, where)) ?? null),
      count: vi.fn(async ({ where }) => state.nodes.filter((n) => matches(n, where)).length),
      findMany: vi.fn(async ({ where }) => structuredClone(state.nodes.filter((n) => matches(n, where)))),
      deleteMany: vi.fn(async ({ where }) => {
        const count = state.nodes.length;
        state.nodes = state.nodes.filter((n) => !matches(n, where));
        return { count: count - state.nodes.length };
      }),
      create: vi.fn(async ({ data }) => {
        if (state.failWrite) throw new Error("simulated persistence failure");
        const node = { id: `node-${++state.nextId}`, embedding: [], ...structuredClone(data) };
        state.nodes.push(node);
        return node;
      }),
      createMany: vi.fn(async ({ data }) => {
        if (state.failWrite) throw new Error("simulated persistence failure");
        for (const row of data) state.nodes.push({ id: `node-${++state.nextId}`, embedding: [], ...structuredClone(row) });
        return { count: data.length };
      }),
    },
    pillar: { findMany: vi.fn(async () => []) },
    quickIntake: { findFirst: vi.fn(async () => null) },
    recommendation: { findMany: vi.fn(async () => []) },
    brandAsset: { findMany: vi.fn(async () => []) },
    strategy: { findUnique: vi.fn(async () => ({ businessContext: {}, financialCapacity: null })) },
    $queryRaw: vi.fn(async () => [{ id: "source-a" }]),
  };
  db.$transaction = vi.fn(async (work: any) => {
    const snapshot = structuredClone(state.nodes);
    try { return await work(db); }
    catch (error) { state.nodes = snapshot; throw error; }
  });
  return { state, db, embed: vi.fn(async () => ({})) };
});

vi.mock("@/lib/db", () => ({ db: harness.db }));
vi.mock("@/server/services/seshat/context-store/embedder", () => ({ embedBrandContext: harness.embed }));

import { indexBrandContext, indexBrandSource } from "@/server/services/seshat/context-store/indexer";

const head = "Identité stable de la marque. ".repeat(70);
const tail = "Ce budget est une hypothèse. ".repeat(75);
const source = () => harness.state.sources[0]!;
const ownNodes = () => harness.state.nodes.filter((n) => n.sourceId === "source-a");

beforeEach(() => {
  vi.clearAllMocks();
  harness.state.nextId = 0;
  harness.state.failWrite = false;
  harness.state.nodes = [];
  harness.state.sources = [{
    id: "source-a", strategyId: "brand-a", sourceType: "FILE", fileName: "brief.txt",
    fileType: "TXT", rawContent: `${head}\n\n${tail}`, pillarMapping: {}, processingStatus: "EXTRACTED",
  }];
});

describe("one complete, current document index", () => {
  it("detects a correction after an unchanged first chunk, with the same chunk count", async () => {
    await indexBrandSource("source-a");
    const before = structuredClone(ownNodes());
    expect(before.length).toBeGreaterThan(1);
    source().rawContent = `${head}\n\n${tail.replaceAll("hypothèse", "inconnue.")}`;
    const result = await indexBrandSource("source-a");
    expect(ownNodes()).toHaveLength(before.length);
    expect(ownNodes()[0].contentHash).toBe(before[0].contentHash);
    expect(ownNodes().map((n) => n.payload.text).join(" ")).toContain("inconnue.");
    expect(ownNodes().map((n) => n.payload.text).join(" ")).not.toContain("hypothèse");
    expect(result.alreadyFresh).not.toBe(true);
  });

  it("preserves ids and vectors for unchanged text while retrying missing embeddings", async () => {
    await indexBrandSource("source-a");
    ownNodes()[0].embedding = [0.2, 0.8];
    const before = structuredClone(ownNodes());
    harness.embed.mockClear();
    const result = await indexBrandSource("source-a");
    expect(result.alreadyFresh).toBe(true);
    expect(ownNodes()).toEqual(before);
    expect(harness.embed).toHaveBeenCalledTimes(1);
    expect(harness.embed).toHaveBeenCalledWith("brand-a");
  });

  it("rolls back the replacement and reports failure instead of a partial success", async () => {
    await indexBrandSource("source-a");
    const before = structuredClone(ownNodes());
    source().rawContent = "Correction qui doit remplacer toute la source.";
    harness.state.failWrite = true;
    harness.embed.mockClear();
    await expect(indexBrandSource("source-a")).rejects.toThrow("simulated persistence failure");
    expect(ownNodes()).toEqual(before);
    expect(harness.embed).not.toHaveBeenCalled();
  });

  it("retires legacy chunks without changing a different source or kind", async () => {
    harness.state.nodes.push(
      { id: "legacy", strategyId: "brand-a", sourceId: "source-a", kind: "SOURCE_CHUNK", payload: { text: "obsolete" } },
      { id: "foreign", strategyId: "brand-b", sourceId: "source-b", kind: "BRAND_SOURCE", payload: { text: "preserve" } },
      { id: "other-kind", strategyId: "brand-a", sourceId: "source-a", kind: "SEQUENCE_OUTPUT", payload: {} },
    );
    const other = structuredClone(harness.state.nodes.slice(1));
    await indexBrandSource("source-a");
    expect(harness.state.nodes.find((n) => n.id === "legacy")).toBeUndefined();
    expect(harness.state.nodes.filter((n) => ["foreign", "other-kind"].includes(n.id))).toEqual(other);
  });

  it.each(["empty", "failed"])("removes obsolete retrieval text when the source is %s", async (mode) => {
    await indexBrandSource("source-a");
    if (mode === "empty") source().rawContent = "  ";
    else source().processingStatus = "FAILED";
    expect((await indexBrandSource("source-a")).chunks).toBe(0);
    expect(ownNodes()).toEqual([]);
  });

  it("full preparation and single-source preparation share the same current chunks", async () => {
    await indexBrandSource("source-a");
    const before = structuredClone(ownNodes());
    await indexBrandContext("brand-a", "FULL");
    await indexBrandContext("brand-a", "INTAKE_ONLY");
    expect(ownNodes()).toEqual(before);
    source().rawContent = "Une seule nouvelle référence à relire.";
    await indexBrandContext("brand-a", "FULL");
    expect(ownNodes()).toHaveLength(1);
    expect(ownNodes()[0].payload.text).toBe(source().rawContent);
  });
});
