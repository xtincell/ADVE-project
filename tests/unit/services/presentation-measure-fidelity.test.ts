import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({
  strategy: vi.fn(), verdict: vi.fn(), assets: vi.fn(), context: vi.fn(), compose: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUniqueOrThrow: f.strategy }, scoreVerdict: { findFirst: f.verdict },
  brandAsset: { findMany: f.assets },
} }));
vi.mock("@/server/services/strategy-presentation/error-capture", () => ({ captureOracleErrorPublic: vi.fn() }));
vi.mock("@/server/services/strategy-presentation/deterministic-composers", async (original) => ({
  ...await original<typeof import("@/server/services/strategy-presentation/deterministic-composers")>(),
  loadComposerContext: f.context, composeSectionContent: f.compose,
}));
import { assemblePresentation } from "@/server/services/strategy-presentation";

beforeEach(() => {
  vi.clearAllMocks();
  f.strategy.mockResolvedValue({ id: "fixture", name: "Recette", user: {}, businessContext: {},
    pillars: [], drivers: [], campaigns: [], missions: [], signals: [], gloryOutputs: [],
    devotionSnapshots: [], cultIndexSnapshots: [], superfanProfiles: [], communitySnapshots: [],
    scoreSnapshots: [], contracts: [], brandVariables: [], frameworkResults: [],
  });
  f.verdict.mockResolvedValue({ force: 39.5, tier: "LATENT", coveragePct: 40, epreuveCount: 2,
    computedAt: new Date("2026-10-21T10:00:00.000Z") });
  f.assets.mockResolvedValue([{ kind: "BAIN_NPS", state: "DRAFT", metadata: { sectionId: "bain-nps" },
    content: { bainNps: { score: -86, methode: "Proxy Devotion Ladder" } } }]);
  f.context.mockResolvedValue({});
  f.compose.mockResolvedValue({ content: {} });
});

describe("presentation preserves the origin and meaning of measures", () => {
  it("reads the latest persisted market verdict separately from documentary completion", async () => {
    const doc = await assemblePresentation("fixture");
    expect(f.verdict).toHaveBeenCalledWith(expect.objectContaining({
      where: { subjectStrategyId: "fixture" }, orderBy: [{ computedAt: "desc" }, { id: "desc" }],
    }));
    expect(doc.meta.revealedScore).toMatchObject({ force: 39.5, coveragePct: 40, epreuveCount: 2 });
    expect(doc.sections.executiveSummary.revealedScore).toEqual(doc.meta.revealedScore);
    expect(doc.meta.vector.composite).toBe(0);
  });
  it("does not turn a missing market verdict into a zero score", async () => {
    f.verdict.mockResolvedValue(null);
    expect((await assemblePresentation("fixture")).meta.revealedScore).toBeNull();
  });
  it("never revives a false historical NPS when loading the context fails", async () => {
    f.context.mockRejectedValue(new Error("Context unavailable"));
    const doc = await assemblePresentation("fixture");
    expect((doc.sections as Record<string, unknown>)["bain-nps"]).toEqual({});
  });
  it("never revives a false historical NPS when recomposition fails", async () => {
    f.compose.mockRejectedValue(new Error("Composition unavailable"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try { expect(((await assemblePresentation("fixture")).sections as Record<string, unknown>)["bain-nps"]).toEqual({}); }
    finally { warn.mockRestore(); }
  });
  it("preserves an authored customer survey even when other composers fail", async () => {
    const survey = { bainNps: { score: 32, methode: "NPS client déclaré : enquête 80 réponses" } };
    f.assets.mockResolvedValue([{ kind: "BAIN_NPS", state: "ACTIVE", metadata: { sectionId: "bain-nps" }, content: survey }]);
    f.context.mockRejectedValue(new Error("Context unavailable"));
    expect(((await assemblePresentation("fixture")).sections as Record<string, unknown>)["bain-nps"]).toEqual(survey);
  });
});
