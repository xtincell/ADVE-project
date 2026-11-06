import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ findNode: vi.fn(), currentNode: vi.fn(), shared: vi.fn(), create: vi.fn(), update: vi.fn(),
  strategy: vi.fn(), client: vi.fn(), transaction: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { brandNode: { findUnique: m.findNode, findFirst: m.shared,
  create: m.create, update: m.update }, strategy: { findUnique: m.strategy }, client: { findFirst: m.client }, $transaction: m.transaction } }));
vi.mock("@/server/services/brand-node/inheritance", () => ({ invalidateNodeAndDescendants: m.invalidate }));
import { createBrandNode, createBrandNodeHandler, updateBrandNode, attachStrategyToNode, BrandNodeUpdateConflictError } from "@/server/services/brand-node";

const stamp = "2026-11-06T00:00:00.000Z";
const node = { id: "peak-ng", operatorId: "op", clientId: "wamco", countryCode: "NG", nodeKind: "REGIONAL_BRAND",
  strategyId: null as string | null, archivedAt: null, updatedAt: new Date(stamp) };
const args = { operatorId: "op", clientId: "wamco", parentNodeId: "parent", name: "Peak Nigeria", slug: "peak-ng",
  nodeKind: "REGIONAL_BRAND", nodeNature: "PRODUCT" as const, nodeRole: [], countryCode: "NG", clusterTag: "WCA",
  attachStrategyId: "strategy-ng", lifecycle: "DRAFT" as const, sourceRefs: [] };
const precondition = { expectedStrategyId: null, expectedUpdatedAt: stamp };
beforeEach(() => {
  vi.clearAllMocks();
  m.findNode.mockImplementation(async ({ where }) => where.id === "parent"
    ? { id: "parent", nodeKind: "REGIONAL_CLUSTER", nodeNature: "PRODUCT", operatorId: "op", archivedAt: null }
    : where.id === node.id ? { ...node } : null);
  m.strategy.mockResolvedValue({ id: "strategy-ng", operatorId: "op", clientId: "wamco", countryCode: "NG", archivedAt: null });
  m.client.mockResolvedValue({ id: "wamco" }); m.shared.mockResolvedValue(null);
  m.create.mockImplementation(async ({ data }) => ({ ...data, id: node.id, updatedAt: new Date(stamp) }));
  m.update.mockImplementation(async ({ data }) => ({ ...node, ...data }));
  m.currentNode.mockResolvedValue({ ...node, strategyId: "strategy-ng" });
  m.transaction.mockImplementation(async callback => callback({ brandNode: { findUnique: m.findNode,
    findUniqueOrThrow: m.currentNode, findFirst: m.shared, create: m.create, update: m.update }, strategy: { findUnique: m.strategy }, client: { findFirst: m.client } }));
});

describe("native draft dossiers and protected attachments", () => {
  it("creates DRAFT in one serializable insertion, including its original links and country", async () => {
    const result = await createBrandNode(args);
    expect(result.lifecycle).toBe("DRAFT"); expect(m.create).toHaveBeenCalledOnce(); expect(m.update).not.toHaveBeenCalled();
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ lifecycle: "DRAFT", countryCode: "NG", clientId: "wamco", strategyId: "strategy-ng" }) });
    expect(m.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("preserves DRAFT through the governed intent handler", async () => {
    expect((await createBrandNodeHandler({ ...args, kind: "OPERATOR_CREATE_BRAND_NODE", strategyId: "audit:op" })).status).toBe("OK");
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ lifecycle: "DRAFT" }) });
  });
  it("retains the old default for callers omitting lifecycle", async () => {
    expect((await createBrandNode({ ...args, lifecycle: undefined })).lifecycle).toBe("ACTIVE");
  });
  it.each(["archived-parent", "foreign-parent", "foreign-client", "foreign-strategy", "orphan-strategy", "archived-strategy", "different-client", "different-country"])("refuses %s before insertion", async failure => {
    if (failure.endsWith("parent")) m.findNode.mockResolvedValue({ nodeKind: "REGIONAL_CLUSTER", nodeNature: "PRODUCT",
      operatorId: failure === "foreign-parent" ? "other" : "op", archivedAt: failure === "archived-parent" ? new Date() : null });
    if (failure === "foreign-client") m.client.mockResolvedValue(null);
    if (failure.includes("strategy") || failure.startsWith("different")) m.strategy.mockResolvedValue({ id: "strategy-ng",
      operatorId: failure === "foreign-strategy" ? "other" : failure === "orphan-strategy" ? null : "op",
      clientId: failure === "different-client" ? "wca" : "wamco", countryCode: failure === "different-country" ? "CI" : "NG",
      archivedAt: failure === "archived-strategy" ? new Date() : null });
    await expect(createBrandNode(args)).rejects.toThrow(); expect(m.create).not.toHaveBeenCalled();
  });
  it("attaches the explicit NG dossier using both observed version and previous link", async () => {
    await attachStrategyToNode(node.id, "strategy-ng", precondition);
    expect(m.update).toHaveBeenCalledWith({ where: expect.objectContaining({ id: node.id, strategyId: null, updatedAt: new Date(stamp), archivedAt: null }),
      data: expect.objectContaining({ strategyId: "strategy-ng" }) });
    expect(m.invalidate).toHaveBeenCalledWith(node.id);
  });
  it("replaying the same successful attachment does not write but repairs a missed cache invalidation", async () => {
    m.findNode.mockResolvedValue({ ...node, strategyId: "strategy-ng", updatedAt: new Date("2026-11-06T00:01:00Z") });
    expect((await attachStrategyToNode(node.id, "strategy-ng", precondition)).strategyId).toBe("strategy-ng");
    expect(m.update).not.toHaveBeenCalled(); expect(m.invalidate).toHaveBeenCalledWith(node.id);
  });
  it("does not overwrite a concurrent attachment", async () => {
    m.findNode.mockResolvedValue({ ...node, strategyId: "concurrent" });
    await expect(attachStrategyToNode(node.id, "strategy-ng", precondition)).rejects.toBeInstanceOf(BrandNodeUpdateConflictError);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("reports database compare-and-swap conflicts rather than invalidating the winner", async () => {
    m.update.mockRejectedValue(Object.assign(new Error("not found"), { code: "P2025" }));
    await expect(attachStrategyToNode(node.id, "strategy-ng", precondition)).rejects.toBeInstanceOf(BrandNodeUpdateConflictError);
    expect(m.invalidate).not.toHaveBeenCalled();
  });
  it.each(["different-country", "unqualified-country", "foreign-client", "foreign-strategy", "archived-strategy", "shared-country"])("refuses attachment with %s", async failure => {
    if (failure === "foreign-client") m.client.mockResolvedValue(null);
    if (failure === "shared-country") m.shared.mockResolvedValue({ id: "another-country" });
    m.strategy.mockResolvedValue({ id: "strategy-ng", operatorId: failure === "foreign-strategy" ? "other" : "op", clientId: "wamco",
      countryCode: failure === "different-country" ? "CI" : failure === "unqualified-country" ? null : "NG",
      archivedAt: failure === "archived-strategy" ? new Date() : null });
    await expect(attachStrategyToNode(node.id, "strategy-ng", precondition)).rejects.toThrow(); expect(m.update).not.toHaveBeenCalled();
  });
  it("requires the observed version before editing the country", async () => {
    await expect(updateBrandNode(node.id, { countryCode: "CI" })).rejects.toBeInstanceOf(BrandNodeUpdateConflictError);
    expect(m.update).not.toHaveBeenCalled();
  });
  it("refuses a country edit that would disguise a Nigerian platform as Ivorian", async () => {
    await expect(updateBrandNode(node.id, { countryCode: "CI" }, stamp)).rejects.toThrow("pays explicite");
    expect(m.update).not.toHaveBeenCalled();
  });
  it("preserves the country when its edit form resubmits the unchanged value", async () => {
    await updateBrandNode(node.id, { name: "Peak Nigeria", countryCode: "NG" }, stamp);
    expect(m.update).toHaveBeenCalledWith({ where: expect.objectContaining({ id: node.id, updatedAt: new Date(stamp) }),
      data: expect.objectContaining({ name: "Peak Nigeria", countryCode: "NG" }) });
    expect(m.strategy).not.toHaveBeenCalled();
  });
  it("allows explicit country qualification on an unattached draft without changing any strategy", async () => {
    m.currentNode.mockResolvedValue({ ...node, strategyId: null, countryCode: null });
    await updateBrandNode(node.id, { countryCode: "NG" }, stamp);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ countryCode: "NG" }) }));
    expect(m.strategy).not.toHaveBeenCalled();
  });
});

it("never attaches a country-specific platform to a dossier with no country", async () => {
  await expect(createBrandNode({ ...args, countryCode: null })).rejects.toThrow("pays explicite");
  m.findNode.mockResolvedValue({ ...node, countryCode: null });
  await expect(attachStrategyToNode(node.id, "strategy-ng", precondition)).rejects.toThrow("pays explicite");
  await expect(updateBrandNode(node.id, { countryCode: null }, stamp)).rejects.toThrow("pays explicite");
  expect(m.create).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
});
