import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ nodes: [] as any[], create: vi.fn(), update: vi.fn(), attach: vi.fn(), strategy: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  operator: { findUniqueOrThrow: vi.fn(async () => ({ id: "op", slug: "team" })) },
  user: { findFirst: vi.fn(async () => ({ id: "admin", role: "ADMIN", operatorId: "op" })) },
  brandNode: { findMany: vi.fn(async () => m.nodes), findFirst: vi.fn(async () => null) },
  strategy: { findUniqueOrThrow: m.strategy }, client: { findFirst: m.client },
} }));
vi.mock("@/server/trpc/routers/brand-node", () => ({ brandNodeRouter: { createCaller: () => ({ create: m.create, update: m.update, attachStrategy: m.attach }) } }));
import { planSchema, reconcilePortfolioPlan } from "../../../scripts/onboard-portfolio";

const stamp = new Date("2026-11-06T00:00:00Z");
const ref = { system: "LA_BARRE", kind: "brand", id: "MK-PEAK" };
const root = { key: "root", parentKey: null, name: "Group", slug: "group", nodeKind: "CORPORATE", nodeNature: "PRODUCT", sourceRefs: [], lifecycle: "DRAFT" };
const child = { key: "peak", parentKey: "root", name: "Peak Nigeria", slug: "peak-ng", nodeKind: "MASTER_BRAND", nodeNature: "PRODUCT",
  countryCode: "NG", clusterTag: "NG", clientId: "wamco", strategyId: "strategy-ng", sourceRefs: [ref], lifecycle: "DRAFT" };
const plan = { operatorSlug: "team", source: "documented scope", observedAt: "2026-11-06", nodes: [root, child] };
function row(spec: typeof root | typeof child) { return { ...spec, id: spec.key, operatorId: "op", parentNodeId: spec.parentKey,
  strategyId: null, clientId: "clientId" in spec ? spec.clientId : null, countryCode: "countryCode" in spec ? spec.countryCode : null,
  clusterTag: "clusterTag" in spec ? spec.clusterTag : null, archivedAt: null, updatedAt: stamp }; }
beforeEach(() => {
  vi.clearAllMocks(); m.nodes = [];
  m.strategy.mockResolvedValue({ id: "strategy-ng", operatorId: "op", clientId: "wamco", countryCode: "NG", archivedAt: null });
  m.client.mockResolvedValue({ id: "wamco" });
  m.create.mockImplementation(async (input) => { const node = { ...input, id: input.slug === "group" ? "root" : "peak", lifecycle: input.lifecycle ?? "ACTIVE",
    strategyId: input.attachStrategyId ?? null, countryCode: input.countryCode ?? null, clientId: input.clientId ?? null, clusterTag: input.clusterTag ?? null, updatedAt: stamp, archivedAt: null };
    m.nodes.push(node); return { ok: true, node }; });
  m.update.mockImplementation(async (input) => { const node = m.nodes.find(n => n.id === input.nodeId)!;
    Object.assign(node, input.patches, { updatedAt: new Date(stamp.getTime() + 1) }); return { ok: true, node }; });
  m.attach.mockImplementation(async (input) => { const node = m.nodes.find(n => n.id === input.nodeId)!;
    if (input.expectedUpdatedAt !== node.updatedAt.toISOString() || input.expectedStrategyId !== node.strategyId) throw new Error("stale attachment");
    node.strategyId = input.strategyId; return { ok: true, node }; });
});

describe("governed portfolio import: dry-run and idempotent draft replay", () => {
  it("creates draft scope and references atomically, then replays without a second write", async () => {
    const first = await reconcilePortfolioPlan(plan, true);
    expect(first.counts).toEqual({ CREATED: 2 });
    expect(m.create).toHaveBeenLastCalledWith(expect.objectContaining({ lifecycle: "DRAFT", countryCode: "NG", clientId: "wamco", clusterTag: "NG", sourceRefs: [ref] }));
    expect(m.update).not.toHaveBeenCalled(); expect(m.attach).not.toHaveBeenCalled();
    const second = await reconcilePortfolioPlan(plan, true);
    expect(second.counts).toEqual({ UNCHANGED: 2 }); expect(m.create).toHaveBeenCalledTimes(2);
    expect(m.nodes[1].sourceRefs).toEqual([ref]); expect(m.nodes[1].lifecycle).toBe("DRAFT");
  });
  it("does not activate an existing draft when lifecycle was omitted from the imported plan", async () => {
    m.nodes = [row(root)]; const { lifecycle: _, ...withoutLifecycle } = root;
    expect((await reconcilePortfolioPlan({ ...plan, nodes: [withoutLifecycle] }, true)).counts).toEqual({ UNCHANGED: 1 });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("uses the new version returned by a reference update before attaching a dossier", async () => {
    m.nodes = [row(root), { ...row(child), sourceRefs: [] }];
    await reconcilePortfolioPlan(plan, true);
    expect(m.attach).toHaveBeenCalledWith(expect.objectContaining({ nodeId: "peak", expectedStrategyId: null, expectedUpdatedAt: "2026-11-06T00:00:00.001Z" }));
  });
  it.each(["foreign", "orphan", "archived", "country", "client"])("preflights the whole plan before any write: %s strategy", async failure => {
    m.strategy.mockResolvedValue({ operatorId: failure === "foreign" ? "other" : failure === "orphan" ? null : "op",
      countryCode: failure === "country" ? "CI" : "NG", clientId: failure === "client" ? "wca" : "wamco", archivedAt: failure === "archived" ? stamp : null });
    await expect(reconcilePortfolioPlan(plan, true)).rejects.toThrow(); expect(m.create).not.toHaveBeenCalled();
  });
  it("rejects a foreign or archived client before creating even the preceding root", async () => {
    m.client.mockResolvedValue(null); await expect(reconcilePortfolioPlan(plan, true)).rejects.toThrow(); expect(m.create).not.toHaveBeenCalled();
  });
  it("does not change an existing country or its client through a source import", async () => {
    m.nodes = [row(root), { ...row(child), countryCode: "CI" }];
    await expect(reconcilePortfolioPlan(plan, true)).rejects.toThrow(); expect(m.update).not.toHaveBeenCalled(); expect(m.attach).not.toHaveBeenCalled();
  });
  it("performs no write in the default dry-run", async () => {
    expect((await reconcilePortfolioPlan(plan)).counts).toEqual({ WOULD_CREATE: 2 });
    expect(m.create).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled(); expect(m.attach).not.toHaveBeenCalled();
  });
  it("rejects misspelled scope fields instead of silently dropping them", () => {
    expect(planSchema.safeParse({ ...plan, nodes: [{ ...root, countryCod: "NG" }] }).success).toBe(false);
  });
});

it("rejects null-country nodes taking a national platform before the first write", async () => {
  await expect(reconcilePortfolioPlan({ ...plan, nodes: [root, { ...child, countryCode: null }] }, true)).rejects.toThrow();
  expect(m.create).not.toHaveBeenCalled();
});
it("replays an archived leaf without restoring it or touching dependencies", async () => {
  m.nodes = [row(root), { ...row(child), lifecycle: "ARCHIVED", archivedAt: stamp, strategyId: child.strategyId }];
  m.client.mockResolvedValue(null);
  expect((await reconcilePortfolioPlan({ ...plan, nodes: [root, { ...child, lifecycle: "ARCHIVED" }] }, true)).counts).toEqual({ UNCHANGED: 2 });
  expect(m.update).not.toHaveBeenCalled(); expect(m.attach).not.toHaveBeenCalled();
});
it("preflights a new archived parent before creating any rows", async () => {
  await expect(reconcilePortfolioPlan({ ...plan, nodes: [{ ...root, lifecycle:"ARCHIVED" }, child] }, true)).rejects.toThrow();
  expect(m.create).not.toHaveBeenCalled();
});
it("preflights archival of parents with existing live children outside the plan", async () => {
  m.nodes = [row(root), row(child)];
  await expect(reconcilePortfolioPlan({ ...plan,nodes:[{ ...root,lifecycle:"ARCHIVED" }] },true)).rejects.toThrow();
  expect(m.update).not.toHaveBeenCalled();
});
