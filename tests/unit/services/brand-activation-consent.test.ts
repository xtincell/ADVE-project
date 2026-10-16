import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Exercise the real input schema and activation handler. Persistence and the
// background inference are recorded; auth/spine require the runtime receipt.
const h = vi.hoisted(() => ({
  infer: vi.fn(), write: vi.fn(),
  db: {
    quickIntake: { findUnique: vi.fn(), update: vi.fn() },
    operator: { upsert: vi.fn() }, user: { upsert: vi.fn() },
    client: { findFirst: vi.fn(), create: vi.fn() },
    strategy: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    brandDataSource: { findFirst: vi.fn(), create: vi.fn() },
    brandAsset: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.create();
  return { createTRPCRouter: t.router, publicProcedure: t.procedure,
    protectedProcedure: t.procedure, adminProcedure: t.procedure };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { publicProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: unknown }) => publicProcedure.input(inputSchema as never) };
});
vi.mock("@/server/services/quick-intake", () => ({}));
vi.mock("@/server/services/quick-intake/question-bank", () => ({
  getAdaptiveQuestions: vi.fn(), getBusinessContextQuestions: vi.fn(), getAllQuestions: vi.fn(),
}));
vi.mock("@/server/services/quick-intake/infer-needs-human-fields", () => ({ inferNeedsHumanFields: h.infer }));
vi.mock("@/server/services/country-registry", () => ({
  lookupCountry: async (country: string) => (({ CI: { code: "CI", currencyCode: "XOF" }, FR: { code: "FR", currencyCode: "EUR" } } as Record<string, { code: string; currencyCode: string }>)[country] ?? null),
}));
vi.mock("@/server/services/mestor", () => ({}));
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: vi.fn() }));
vi.mock("@/server/services/pillar-gateway", () => ({ writePillar: h.write }));
vi.mock("@/server/services/operator-isolation", () => ({ getOperatorContext: vi.fn() }));
vi.mock("@/server/trpc/routers/_strategy-read-guard", () => ({ assertStrategyRead: vi.fn() }));
vi.mock("@/server/services/llm-gateway", () => ({
  callLLM: () => { throw new Error("Unexpected model call in activation test"); },
  extractJSON: vi.fn(), isTextLLMAvailable: () => false,
}));

import { quickIntakeRouter } from "@/server/trpc/routers/quick-intake";

const intake = { id: "intake-fixture", status: "COMPLETED", convertedToId: "brand-fixture",
  companyName: "Atelier fixture", contactName: "Recette", contactEmail: "fixture@example.invalid",
  responses: { a: { nomMarque: "Atelier fixture" } }, advertis_vector: null, webFootprint: null };
const caller = () => quickIntakeRouter.createCaller({ db: h.db, session: null } as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  h.db.quickIntake.findUnique.mockResolvedValue(intake);
  h.db.quickIntake.update.mockResolvedValue(intake);
  h.db.operator.upsert.mockResolvedValue({ id: "operator-fixture" });
  h.db.user.upsert.mockResolvedValue({ id: "user-fixture", email: intake.contactEmail, hashedPassword: "fixture" });
  h.db.client.findFirst.mockResolvedValue({ id: "client-fixture", name: intake.companyName });
  h.db.strategy.findUnique.mockResolvedValue({ id: "brand-fixture" });
  h.db.strategy.update.mockResolvedValue({ id: "brand-fixture", name: intake.companyName, status: "ACTIVE" });
  h.db.brandDataSource.findFirst.mockResolvedValue({ id: "source-fixture" });
  h.db.brandAsset.findFirst.mockResolvedValue({ id: "asset-fixture" });
  h.infer.mockReset().mockResolvedValue({ ok: true, fieldsInferred: 1 });
});
afterEach(() => vi.restoreAllMocks());

describe("brand activation keeps assistance optional", () => {
  it("initializes the declared market on first activation through the existing registry", async () => {
    h.db.quickIntake.findUnique.mockResolvedValue({ ...intake, country: "CI", sector: "CONSEIL" });
    h.db.strategy.findUnique.mockResolvedValue({ id: "brand-fixture", status: "QUICK_INTAKE", countryCode: null, currencyCode: null, businessContext: {} });
    await caller().activateBrand({ token: "fixture-token" });
    expect(h.db.strategy.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      countryCode: "CI", currencyCode: "XOF", businessContext: { sector: "CONSEIL" },
    }) }));
    expect(h.infer).not.toHaveBeenCalled();
  });

  it("preserves later manual market choices, including explicit empty values, on replay", async () => {
    h.db.quickIntake.findUnique.mockResolvedValue({ ...intake, country: "CI", sector: "CONSEIL" });
    h.db.strategy.findUnique.mockResolvedValue({ id: "brand-fixture", status: "ACTIVE", countryCode: null, currencyCode: null, businessContext: { sector: null } });
    await caller().activateBrand({ token: "fixture-token" });
    const data = h.db.strategy.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("countryCode"); expect(data).not.toHaveProperty("currencyCode");
    expect(data).not.toHaveProperty("businessContext"); expect(h.infer).not.toHaveBeenCalled();
  });

  it("does not replace an existing country or declared sector during first promotion", async () => {
    h.db.quickIntake.findUnique.mockResolvedValue({ ...intake, country: "CI", sector: "CONSEIL" });
    h.db.strategy.findUnique.mockResolvedValue({ id: "brand-fixture", status: "QUICK_INTAKE", countryCode: "FR", currencyCode: null, businessContext: { sector: "TOURISME" } });
    await caller().activateBrand({ token: "fixture-token" });
    const data = h.db.strategy.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("countryCode"); expect(data.currencyCode).toBe("EUR");
    expect(data).not.toHaveProperty("businessContext");
  });
  it.each([undefined, false])("activates without background inference when opt-in is %s", async inferMissingFields => {
    const result = await caller().activateBrand({ token: "fixture-token", ...(inferMissingFields === undefined ? {} : { inferMissingFields }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(result).toMatchObject({ strategyId: "brand-fixture", clientName: intake.companyName });
    expect(h.db.quickIntake.update).toHaveBeenCalled();
    expect(h.infer).not.toHaveBeenCalled();
    expect(h.db.brandDataSource.create).not.toHaveBeenCalled();
    expect(h.db.brandAsset.create).not.toHaveBeenCalled();
  });

  it("dispatches the existing inference only for an explicit opt-in", async () => {
    await caller().activateBrand({ token: "fixture-token", inferMissingFields: true });
    await vi.waitFor(() => expect(h.infer).toHaveBeenCalledOnce());
    expect(h.infer).toHaveBeenCalledWith(intake.id);
  });

  it("rebuilds a purged temporary dossier through the existing writer without model assistance", async () => {
    h.db.strategy.findUnique.mockResolvedValue(null);
    h.db.strategy.create.mockResolvedValue({ id: "brand-rebuilt", name: intake.companyName, status: "ACTIVE" });
    h.write.mockResolvedValue({ success: true });
    const result = await caller().activateBrand({ token: "fixture-token" });
    expect(result.strategyId).toBe("brand-rebuilt");
    expect(h.write).toHaveBeenCalledTimes(8);
    expect(h.write).toHaveBeenCalledWith(expect.objectContaining({
      strategyId: "brand-rebuilt", pillarKey: "a",
      operation: { type: "REPLACE_FULL", content: intake.responses.a },
    }));
    expect(h.infer).not.toHaveBeenCalled();
  });

  it("retains successful activation when opted-in assistance refuses", async () => {
    h.infer.mockRejectedValue(new Error("Fixture assistance refused"));
    await expect(caller().activateBrand({ token: "fixture-token", inferMissingFields: true }))
      .resolves.toMatchObject({ strategyId: "brand-fixture" });
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(h.infer).toHaveBeenCalledOnce();
  });

  it("refuses a non-boolean choice before changing the dossier", async () => {
    await expect(caller().activateBrand({ token: "fixture-token", inferMissingFields: "false" } as never))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(h.db.strategy.update).not.toHaveBeenCalled();
    expect(h.infer).not.toHaveBeenCalled();
  });

  it.each([null, { ...intake, status: "IN_PROGRESS" }])("keeps the existing intake prerequisite: %j", async row => {
    h.db.quickIntake.findUnique.mockResolvedValue(row);
    await expect(caller().activateBrand({ token: "fixture-token", inferMissingFields: true })).rejects.toBeDefined();
    expect(h.db.strategy.update).not.toHaveBeenCalled(); expect(h.infer).not.toHaveBeenCalled();
  });
});
