import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real router validation and source-reception handler; no real intake, network
// fetch or model call is made by this regression test.
const h = vi.hoisted(() => ({
  infer: vi.fn(), write: vi.fn(), retain: vi.fn(), start: vi.fn(),
  db: {
    quickIntake: { findUnique: vi.fn(), update: vi.fn() },
    intakePayment: { findFirst: vi.fn() },
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
vi.mock("@/server/services/quick-intake", () => ({ start: h.start }));
vi.mock("@/server/services/quick-intake/document-input", () => ({ retainIntakeDocuments: h.retain, listIntakeDocuments: vi.fn(), readRetainedIntakeDocuments: vi.fn() }));
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


import { INTAKE_URL_MESSAGE, IntakeWebUrlSchema, OptionalIntakeWebUrlSchema, intakeErrorMessage } from "@/lib/intake-input";

const caller = () => quickIntakeRouter.createCaller({ db: h.db, session: null } as never);
const fixture = { id: "intake-url-fixture", status: "IN_PROGRESS", websiteUrl: "www.matangaagency.com", rawText: "Agency fixture", socialLinksRaw: null };
beforeEach(() => {
  vi.clearAllMocks();
  h.db.quickIntake.findUnique.mockResolvedValue(fixture);
  h.retain.mockResolvedValue([]);
  h.start.mockResolvedValue({ token: "fixture-token" });
});
afterEach(() => vi.restoreAllMocks());

describe("intake website addresses", () => {
  it.each([
    ["www.matangaagency.com", "https://www.matangaagency.com/"],
    ["matangaagency.com", "https://matangaagency.com/"],
    ["  https://www.matangaagency.com/about?q=team#history  ", "https://www.matangaagency.com/about?q=team#history"],
    ["http://example.com/about", "http://example.com/about"],
    ["//example.com/about", "https://example.com/about"],
    ["café.fr", "https://xn--caf-dma.fr/"],
  ])("accepts %s without losing its path, query or protocol", (input, expected) => {
    expect(IntakeWebUrlSchema.parse(input)).toBe(expected);
  });
  it.each([undefined, "", "  "])("keeps the website optional: %s", value => {
    expect(OptionalIntakeWebUrlSchema.parse(value)).toBeUndefined();
  });
  it.each(["javascript:alert(1)", "data:text/html,test", "file:///etc/passwd", "ftp://example.com", "https:/example.com", "not a domain", "https://", "https://user:secret@example.com", "example.com\\evil", "https://exa_mple.com"])("rejects invalid or non-web address %s", value => {
    expect(IntakeWebUrlSchema.safeParse(value).success).toBe(false);
  });

  it("normalizes the entry contract before creating the intake", async () => {
    await caller().start({ contactName: "Fixture", contactEmail: "fixture@example.com", companyName: "Fixture", websiteUrl: "www.matangaagency.com" });
    expect(h.start).toHaveBeenCalledWith(expect.objectContaining({ websiteUrl: "https://www.matangaagency.com/" }));
  });
  it.each(["processIngest", "processIngestPlus"] as const)("%s accepts bare domains and stores the normalized source without launching analysis", async method => {
    const input = { token: "fixture-token", prepareOnly: true, websiteUrl: "www.matangaagency.com", files: [] };
    await expect(caller()[method](input)).resolves.toMatchObject({ status: "SAVED" });
    expect(h.retain).toHaveBeenCalledWith("fixture-token", [], expect.objectContaining({ websiteUrl: "https://www.matangaagency.com/" }), h.db);
  });
  it.each(["processIngest", "processIngestPlus"] as const)("%s also repairs a legacy bare-domain source when a retry omits websiteUrl", async method => {
    await caller()[method]({ token: "fixture-token", prepareOnly: true, files: [] });
    expect(h.retain).toHaveBeenCalledWith("fixture-token", [], expect.objectContaining({ websiteUrl: "https://www.matangaagency.com/" }), h.db);
  });
  it("normalizes social links through the same web-only contract", async () => {
    await caller().processIngestPlus({ token: "fixture-token", prepareOnly: true, urls: ["instagram.com/fixture"] });
    expect(h.retain).toHaveBeenCalledWith("fixture-token", [], expect.objectContaining({ socialLinksRaw: "https://instagram.com/fixture" }), h.db);
  });
  it("rejects an invalid URL before writes, with readable feedback instead of raw issues", async () => {
    const error = await caller().processIngest({ token: "fixture-token", prepareOnly: true, websiteUrl: "javascript:alert(1)" }).catch(error => error);
    expect(error.code).toBe("BAD_REQUEST");
    expect(h.retain).not.toHaveBeenCalled();
    const message = intakeErrorMessage(error);
    expect(message).toContain("Site web");
    expect(message).toContain(INTAKE_URL_MESSAGE);
    expect(message).not.toContain('"code"');
    expect(message).not.toContain('"path"');
  });
  it("makes the former deployed Zod error readable too", () => {
    const message = intakeErrorMessage(new Error('[{"code":"invalid_format","format":"url","path":["websiteUrl"],"message":"Invalid URL"}]'));
    expect(message).toContain("Site web : format invalide");
    expect(message).not.toContain("Invalid URL");
    expect(message).not.toContain("[");
  });
  it("renders structured API field errors through the existing interpreter", () => {
    expect(intakeErrorMessage({ data: { zodError: { fieldErrors: { websiteUrl: [INTAKE_URL_MESSAGE] } } } })).toContain(`Site web : ${INTAKE_URL_MESSAGE}`);
  });
});
