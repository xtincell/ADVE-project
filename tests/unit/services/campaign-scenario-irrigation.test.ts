import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ pillars: vi.fn(), templates: vi.fn(), create: vi.fn(), update: vi.fn(), existing: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {
  pillar: { findMany: mocks.pillars }, strategy: { findUniqueOrThrow: vi.fn(async () => ({ currencyCode: "XOF" })) },
  campaignCanonTemplate: { findMany: mocks.templates }, campaign: { findFirst: mocks.existing, create: mocks.create, update: mocks.update },
} }));
import { generateCanonicalCampaigns } from "@/server/services/campaign-canon";

function source(staleAt: Date | null = null, overrides: Record<string, unknown> = {}) {
  return [
    { key: "i", content: { catalogueParCanal: { DIRECT: [
      { id: "launch", action: "Lancement", budget: 200, timeframe: "SPRINT_90" },
      { id: "not-in-route", action: "Autre", budget: 900, timeframe: "SPRINT_90", preference: "FAVORITE" },
    ] } } },
    { key: "s", staleAt, content: { computed: { selectedRouteKey: "CONSERVATIVE", roadmapRoutes: [
      { key: "CONSERVATIVE", selectionBasis: "CATALOGUE_COVERAGE_RULES_V1", initiativeIds: ["launch"], ...overrides },
    ] } } },
  ];
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.pillars.mockResolvedValue(source());
  mocks.templates.mockResolvedValue(["GTM_90", "ANNUAL", "ALWAYS_ON"].map(canonType => ({ canonType, label: canonType,
    aarrrPrimary: "ACQUISITION", aarrrSecondary: "ACTIVATION", durationDays: 90, isAlwaysOn: canonType === "ALWAYS_ON", budgetShare: 0.4 })));
  mocks.existing.mockResolvedValue(null); mocks.create.mockImplementation(async ({ data }) => ({ ...data, id: data.canonType }));
});
describe("campaign frames consume the saved S scenario", () => {
  it("uses current scenario membership even when no production action is selected, without adopting a budget or creating actions", async () => {
    const result = await generateCanonicalCampaigns({ strategyId: "brand", startDate: new Date("2026-11-01") });
    expect(result.status).toBe("OK"); expect(result.routeKey).toBe("CONSERVATIVE");
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ canonType: "GTM_90", recommendedBudget: 200, budget: null }) }));
    expect(result.campaigns.find(c => c.canonType === "GTM_90")?.recommendedBudget).toBe(200);
    expect(result.campaigns.find(c => c.canonType === "ANNUAL")?.recommendedBudget).toBeNull();
  });
  it.each(["stale", "missing-route", "foreign-ids"])("defers %s before template seeding or any business write", async (kind) => {
    mocks.pillars.mockResolvedValue(source(kind === "stale" ? new Date() : null,
      kind === "missing-route" ? { selectionBasis: "legacy" } : kind === "foreign-ids" ? { initiativeIds: ["foreign"] } : {}));
    const result = await generateCanonicalCampaigns({ strategyId: "brand" });
    expect(result.status).toBe("DEFERRED"); expect(mocks.templates).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("does not infer an annual campaign from a missing horizon", async () => {
    const rows = source(); delete (rows[0]!.content.catalogueParCanal!.DIRECT[0] as { timeframe?: string }).timeframe;
    mocks.pillars.mockResolvedValue(rows);
    const result = await generateCanonicalCampaigns({ strategyId: "brand" });
    expect(result.status).toBe("DEFERRED"); expect(result.unassignedInitiativeIds).toEqual(["launch"]);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("preserves live campaigns and never replaces their adopted budgets or dates", async () => {
    mocks.existing.mockResolvedValue({ id: "live-frame", state: "LIVE", recommendedBudget: 400 });
    const result = await generateCanonicalCampaigns({ strategyId: "brand", startDate: new Date("2026-11-01") });
    expect(result.campaigns.every(c => c.recommendedBudget === 400)).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("refreshes draft recommendations without replacing adopted budgets or an existing date when none was chosen", async () => {
    mocks.existing.mockResolvedValue({ id: "draft", state: "BRIEF_DRAFT", recommendedBudget: 400 });
    mocks.update.mockImplementation(async ({ data }) => ({ ...data, id: "draft" }));
    await generateCanonicalCampaigns({ strategyId: "brand" });
    for (const [request] of mocks.update.mock.calls) {
      expect(request.data).not.toHaveProperty("budget"); expect(request.data).not.toHaveProperty("startDate"); expect(request.data).not.toHaveProperty("endDate");
    }
  });
});
