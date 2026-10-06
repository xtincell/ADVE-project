import { describe, expect, it, vi } from "vitest";

// Exercise the real create handler with a recording persistence boundary.
// Authorization/spine behavior has its own integration and governance tests.
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context<any>().create();
  return {
    createTRPCRouter: t.router,
    protectedProcedure: t.procedure,
    adminProcedure: t.procedure,
    operatorProcedure: t.procedure,
  };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: any) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/server/trpc/resolve-session-user", () => ({ resolveSessionUserId: async () => "operator-user" }));
vi.mock("@/server/services/audit-trail", () => ({ log: vi.fn(async () => undefined) }));

import { buildInitialIntakeResponses, formatIntakeRawContent, strategyRouter } from "@/server/trpc/routers/strategy";

function persistence() {
  const create = () => vi.fn(async ({ data }: any) => ({ id: "new-record", ...data }));
  return {
    strategy: { create: create() }, pillar: { create: create() },
    quickIntake: { create: create() }, brandDataSource: { create: create() },
    knowledgeEntry: { create: create() }, variableStoreConfig: { create: create() },
    brandOSConfig: { create: create() }, deal: { create: create() },
  };
}

describe("creation source does not fabricate diagnostic evidence", () => {
  it("opening a brand dossier does not invent a commercial opportunity or win", async () => {
    const db = persistence();
    const caller = strategyRouter.createCaller({
      db,
      session: { user: { id: "operator-user", name: "Operator", email: "operator@example.test" } },
    } as any);
    await caller.create({ name: "Existing client brand", operatorId: "agency", clientId: "client" });
    expect(db.deal.create).not.toHaveBeenCalled();
    expect(db.strategy.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: "Existing client brand", operatorId: "agency", clientId: "client" }),
    }));
  });

  it("creating a name-only platform persists no diagnostic answers or invented language", async () => {
    const db = persistence();
    const caller = strategyRouter.createCaller({
      db,
      session: { user: { id: "operator-user", name: "Operator", email: "operator@example.test" } },
    } as any);
    await caller.create({ name: "A brand with unknown foundations" });
    const responses = db.quickIntake.create.mock.calls[0]![0].data.responses;
    expect(Object.values(responses).flatMap((group: any) => Object.values(group))).toEqual([]);
    const source = db.brandDataSource.create.mock.calls[0]![0].data;
    expect(source.rawContent).toBe("=== Fiche d'Intake : A brand with unknown foundations ===");
    expect(source.pillarMapping).toEqual({ a: true });
    expect(db.pillar.create).toHaveBeenCalledTimes(8);
    const seeds = db.pillar.create.mock.calls.map(([args]) => args.data);
    expect(seeds.find((p) => p.key === "a").content).not.toHaveProperty("langue");
    expect(seeds.find((p) => p.key === "v")).toMatchObject({ content: {}, confidence: 0 });
  });

  it("preserves explicit business facts, including an explicitly declared absence of free products", async () => {
    const db = persistence();
    const caller = strategyRouter.createCaller({
      db,
      session: { user: { id: "operator-user", name: "Operator", email: "operator@example.test" } },
    } as any);
    await caller.create({
      name: "Documented brand", description: "Dairy products", sector: "FMCG", country: "CI",
      businessContext: { businessModel: "B2C", language: "en", economicModels: ["VENTE_DIRECTE"],
        brandNature: "PRODUCT", freeLayer: { whatIsFree: "NONE" }, premiumScope: "NONE" },
    });
    const source = db.brandDataSource.create.mock.calls[0]![0].data;
    expect(source.rawContent).toContain("Description: Dairy products");
    expect(source.rawContent).toContain("Pays: CI");
    expect(source.rawContent).toContain("Langue: en");
    expect(source.rawContent).toContain("Partie gratuite: NONE");
    expect(source.rawContent).not.toMatch(/Fidélité|Expérience client|Noyau identitaire|Budget marketing/);
    expect(source.pillarMapping).toEqual({ a: true, v: true });
    expect(source.rawData.biz.biz_revenue).toEqual(["VENTE_DIRECTE"]);
    expect(source.rawData.a).toEqual({});
  });

  it("unknown free-layer and empty revenue values do not become negative statements", () => {
    const response = buildInitialIntakeResponses({ freeLayer: {}, economicModels: [], premiumScope: null });
    expect(response.biz).toEqual({});
    expect(formatIntakeRawContent("Unknown", response)).toBe("=== Fiche d'Intake : Unknown ===");
  });
});
