import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const m = vi.hoisted(() => ({ create: vi.fn(), attach: vi.fn(), node: vi.fn(), actor: vi.fn(),
  ids: vi.fn(), readGuard: vi.fn(), canAccess: vi.fn() }));
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context<any>().create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure };
});
// The actual router input and ownership guards run; central Mestor dispatch is
// covered by governance tests and the handler/service tests in this suite.
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: any) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/lib/db", () => ({ db: { brandNode: { findUnique: m.node } } }));
vi.mock("@/server/services/brand-node", () => ({ createBrandNode: m.create, attachStrategyToNode: m.attach,
  BrandNodeUpdateConflictError: class extends Error {} }));
vi.mock("@/server/services/brand-node/workspace", () => ({}));
vi.mock("@/server/services/brand-node/barre-connection", () => ({}));
vi.mock("@/server/services/brand-node/inheritance", () => ({}));
vi.mock("@/server/services/brand-node/context-tree", () => ({}));
vi.mock("@/server/services/brand-node/glory-tools-filter", () => ({}));
vi.mock("@/server/services/brand-node/bible-classifier", () => ({}));
vi.mock("@/server/services/mestor/gates/narrative-coherence", () => ({}));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: m.actor, canAccessStrategy: m.canAccess }));
vi.mock("@/server/trpc/middleware/strategy-scope", () => ({ accessibleStrategyIds: m.ids }));
vi.mock("@/server/trpc/routers/_strategy-read-guard", () => ({ assertStrategyRead: m.readGuard }));
import { brandNodeRouter } from "@/server/trpc/routers/brand-node";
import { manifest } from "@/server/services/brand-node/manifest";

const caller = () => brandNodeRouter.createCaller({ session: { user: { id: "user" } } } as any);
const draft = { strategyId: "audit:op", operatorId: "op", name: "Peak Nigeria", slug: "peak-ng",
  nodeKind: "REGIONAL_BRAND", nodeNature: "PRODUCT" as const, nodeRole: [], countryCode: "NG", lifecycle: "DRAFT" as const };
const attachment = { operatorId: "op", nodeId: "peak-ng", strategyId: "peak-ng-adve", expectedStrategyId: null,
  expectedUpdatedAt: "2026-11-06T00:00:00.000Z" };
beforeEach(() => {
  vi.clearAllMocks();
  m.actor.mockResolvedValue({ role: "USER", operatorId: "op" });
  m.node.mockResolvedValue({ id: "peak-ng", operatorId: "op", strategyId: null });
  m.ids.mockResolvedValue([]); m.canAccess.mockResolvedValue(false); m.readGuard.mockResolvedValue(undefined);
  m.create.mockResolvedValue({ id: "peak-ng", lifecycle: "DRAFT" });
  m.attach.mockResolvedValue({ id: "peak-ng", strategyId: attachment.strategyId });
});
describe("DRAFT route and manifest parity", () => {
  it("preserves explicit draft and country through the native API", async () => {
    expect((await caller().create(draft)).node.lifecycle).toBe("DRAFT");
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ lifecycle: "DRAFT", countryCode: "NG" }));
    const schema = manifest.capabilities.find(c => c.name === "createBrandNodeHandler")!.inputSchema;
    expect(schema.parse({ ...draft, kind: "OPERATOR_CREATE_BRAND_NODE" })).toMatchObject({ lifecycle: "DRAFT" });
    expect(schema.safeParse({ ...draft, kind: "OPERATOR_CREATE_BRAND_NODE", lifecycle: "MADE_UP" }).success).toBe(false);
  });
  it("rejects a new dossier in another team's portfolio", async () => {
    await expect(caller().create({ ...draft, operatorId: "other" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(m.create).not.toHaveBeenCalled();
  });
  it("checks read access to a platform before creating its attachment", async () => {
    m.readGuard.mockRejectedValue(new TRPCError({ code: "FORBIDDEN" }));
    await expect(caller().create({ ...draft, attachStrategyId: "foreign" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(m.create).not.toHaveBeenCalled();
  });
  it("passes both attachment preconditions after the three ownership checks", async () => {
    await caller().attachStrategy(attachment);
    expect(m.readGuard).toHaveBeenCalledWith("user", "peak-ng-adve");
    expect(m.attach).toHaveBeenCalledWith("peak-ng", "peak-ng-adve", attachment);
    expect(manifest.capabilities.find(c => c.name === "attachStrategyToNodeHandler")!.inputSchema
      .safeParse({ ...attachment, kind: "OPERATOR_ATTACH_STRATEGY_TO_NODE" }).success).toBe(true);
  });
  it("refuses an attachment without its observed version in the API and manifest", async () => {
    const { expectedUpdatedAt: _, ...unversioned } = attachment;
    await expect(caller().attachStrategy(unversioned as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(m.attach).not.toHaveBeenCalled();
    expect(manifest.capabilities.find(c => c.name === "attachStrategyToNodeHandler")!.inputSchema
      .safeParse({ ...unversioned, kind: "OPERATOR_ATTACH_STRATEGY_TO_NODE" }).success).toBe(false);
  });
  it.each(["operator", "node", "strategy"])("refuses foreign %s before attaching", async kind => {
    if (kind === "operator") m.actor.mockResolvedValue({ role: "USER", operatorId: "other" });
    if (kind === "node") m.node.mockResolvedValue({ id: "peak-ng", operatorId: "other", strategyId: null });
    if (kind === "strategy") m.readGuard.mockRejectedValue(new TRPCError({ code: "FORBIDDEN" }));
    await expect(caller().attachStrategy(attachment)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(m.attach).not.toHaveBeenCalled();
  });
  it("cannot borrow an accessible foreign dossier to attach under the caller's operator", async () => {
    m.node.mockResolvedValue({ id: "peak-ng", operatorId: "other", strategyId: "readable" });
    m.canAccess.mockResolvedValue(true);
    await expect(caller().attachStrategy(attachment)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(m.attach).not.toHaveBeenCalled();
  });
});
