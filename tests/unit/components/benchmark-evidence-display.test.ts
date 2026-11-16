// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  own: { composite: 120 as number | null, advertis_vector: {} as Record<string, unknown> },
  benchmark: { avgComposite: 80 as number | null, count: 4, coverage: { observedCount: 3, missingCount: 1, totalCount: 4 }, benchmarks: [] as Record<string, unknown>[] },
  ranking: [] as { strategyId: string; name: string; composite: number | null }[],
  benchmarkError: null as Error | null, rankingError: null as Error | null,
  benchmarkLoading: false, rankingLoading: false, internal: true, radar: vi.fn(),
}));
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "my-brand" }));
vi.mock("@/components/shared/advertis-radar", () => ({ AdvertisRadar: (props: unknown) => { state.radar(props); return null; } }));
vi.mock("@/components/shared/brand-comparables-panel", () => ({ BrandComparablesPanel: () => null }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  auth: { me: { useQuery: () => ({ data: { canOperate: state.internal }, isLoading: false }) } },
  strategy: {
    getWithScore: { useQuery: () => ({ data: state.own, isLoading: false, error: null }) },
    list: { useQuery: () => ({ data: [] }) },
  },
  marketStudy: {
    list: { useQuery: () => ({ data: ["A", "A", "B"].map((sector, index) => ({
      id: `study-${index}`, entryType: "SECTOR_BENCHMARK", sector, market: null,
      data: { studyTitle: `Study ${index}` }, sourceHash: null, createdAt: "2026-11-16T12:00:00Z",
    })), isLoading: false }) },
    create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
  },
  useUtils: () => ({ marketStudy: { list: { invalidate: vi.fn() } } }),
  knowledgeGraph: {
    getBenchmarks: { useQuery: () => ({ data: state.benchmark, isLoading: state.benchmarkLoading, error: state.benchmarkError }) },
    getFrameworkRanking: { useQuery: () => ({ data: state.ranking, isLoading: state.rankingLoading, error: state.rankingError }) },
    getBriefPatterns: { useQuery: () => ({ data: [], isLoading: false }) },
    query: { useQuery: () => ({ data: [], isLoading: false }) },
  },
} }));
import BenchmarksPage from "@/app/(cockpit)/cockpit/insights/benchmarks/page";
import AgencyKnowledgePage from "@/app/(agency)/agency/knowledge/page";
import ConsoleKnowledgePage from "@/app/(console)/console/seshat/knowledge/page";
import ConsoleMarketPage from "@/app/(console)/console/seshat/market/page";

beforeEach(() => {
  vi.clearAllMocks();
  state.own = { composite: 120, advertis_vector: { a: 22, d: 4, v: 21, e: 6, r: 24, t: 3, i: 10, s: 9 } };
  state.benchmark = { avgComposite: 80, count: 4, coverage: { observedCount: 3, missingCount: 1, totalCount: 4 },
    benchmarks: [{ sector: "A", avgComposite: 40 }, { sector: "B", avgComposite: 80 }, { sector: "C", avgComposite: 120 }] };
  state.ranking = [
    { strategyId: "top", name: "Top", composite: 180 },
    { strategyId: "peer", name: "Peer", composite: 120 },
    { strategyId: "my-brand", name: "Mine", composite: 120 },
    { strategyId: "zero", name: "Zero", composite: 0 },
    { strategyId: "unmeasured", name: "Unmeasured", composite: null },
  ];
  state.benchmarkError = null; state.rankingError = null;
  state.benchmarkLoading = false; state.rankingLoading = false; state.internal = true;
});
afterEach(cleanup);
const countFor = (label: string) => within(screen.getByRole("region", { name: "Répartition des marques classées" }))
  .getByText(label).closest("li")!.textContent;

describe("benchmark displays only received measurements", () => {
  it("keeps one actual brand radar and a qualified global composite comparison", () => {
    render(createElement(BenchmarksPage));
    expect(state.radar).toHaveBeenCalledOnce();
    expect(state.radar.mock.calls[0]![0].scores).toEqual(state.own.advertis_vector);
    expect(state.radar.mock.calls[0]![0].comparisonScores).toBeUndefined();
    expect(screen.getByText("Moyenne des marques observées")).toBeDefined();
    expect(screen.getByText("3/4 marques avec un score")).toBeDefined();
    expect(screen.getByText(/Écart de votre score composite à la moyenne reçue : \+40.0 points/)).toBeDefined();
    expect(screen.getByText(/Comparaison par pilier indisponible/)).toBeDefined();
    expect(screen.queryByText("Moyenne secteur")).toBeNull();
    expect(screen.queryByText("Top performer")).toBeNull();
    expect(screen.queryByText("Forces differenciatrices")).toBeNull();
    expect(screen.queryByText(/Investissez dans/)).toBeNull();
    expect(screen.queryByText(/simulees|simulées|vs période préc/)).toBeNull();
  });
  it("shares rank between equal scores and counts the real classification population", () => {
    render(createElement(BenchmarksPage));
    expect(screen.getByText("#2")).toBeDefined();
    expect(screen.getByText("sur 4 marques classées · ex æquo")).toBeDefined();
    expect(countFor("Latent")).toBe("Latent1");
    expect(countFor("Ordinaire")).toBe("Ordinaire2");
    expect(countFor("Culte")).toBe("Culte1");
    expect(countFor("Forte")).toBe("Forte0");
    expect(countFor("Fragile")).toBe("Fragile0");
    expect(countFor("Icône")).toBe("Icône0");
  });
  it("keeps missing axes missing and an explicitly received zero as zero", () => {
    state.own = { composite: null, advertis_vector: { a: 0, d: null, v: "7", e: -1, r: Number.NaN } };
    state.benchmark.avgComposite = null;
    state.ranking = [{ strategyId: "my-brand", name: "Mine", composite: null }];
    render(createElement(BenchmarksPage));
    expect(state.radar).not.toHaveBeenCalled();
    expect(screen.getByText("Pas encore évaluée")).toBeDefined();
    const table = within(screen.getByRole("table"));
    expect(within(table.getByRole("row", { name: /^A —/ })).getByText("0.0")).toBeDefined();
    expect(table.getAllByText("Non renseigné")).toHaveLength(7);
    expect(screen.getByText("Votre marque n’est pas classée")).toBeDefined();
    expect(screen.getByText("Répartition indisponible : aucun score composite reçu.")).toBeDefined();
    expect(screen.queryByText(/Écart de votre score composite/)).toBeNull();
  });
  it("accepts real zero composites and a fully measured zero vector", () => {
    state.own = { composite: 0, advertis_vector: { a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0 } };
    state.benchmark.avgComposite = 0;
    state.ranking = [{ strategyId: "my-brand", name: "Mine", composite: 0 }];
    render(createElement(BenchmarksPage));
    expect(screen.getAllByText("0/200")).toHaveLength(2);
    expect(screen.getByText("#1")).toBeDefined();
    expect(state.radar).toHaveBeenCalledOnce();
    expect(state.radar.mock.calls[0]![0].scores).toEqual(state.own.advertis_vector);
    expect(countFor("Latent")).toBe("Latent1");
  });
  it("does not reuse stale comparisons after query failures", () => {
    state.benchmarkError = new Error("fixture"); state.rankingError = new Error("fixture");
    render(createElement(BenchmarksPage));
    expect(screen.getByText("La moyenne des marques observées est indisponible.")).toBeDefined();
    expect(screen.getByText("Le classement des marques observées est indisponible.")).toBeDefined();
    expect(screen.getByText("Classement indisponible")).toBeDefined();
    expect(screen.queryByText("Votre marque n’est pas classée")).toBeNull();
    expect(screen.queryByText("80/200")).toBeNull(); expect(screen.queryByText("#2")).toBeNull();
    expect(screen.queryByText(/Écart de votre score composite/)).toBeNull();
    expect(screen.getByText("120/200")).toBeDefined();
  });
  it("preserves the internal-preview gate for client accounts", () => {
    state.internal = false; render(createElement(BenchmarksPage));
    expect(screen.getByText("Le benchmark sectoriel — en construction")).toBeDefined();
    expect(screen.queryByText("Votre score")).toBeNull();
    expect(state.radar).not.toHaveBeenCalled();
  });
  it("labels the agency count as brands rather than the number of sector benchmarks", () => {
    render(createElement(AgencyKnowledgePage));
    const stat = screen.getByText("Marques observées").parentElement!;
    expect(within(stat).getByText("4")).toBeDefined();
    expect(screen.queryByText("Benchmarks")).toBeNull();
    expect(screen.getByText("Benchmarks sectoriels")).toBeDefined();
  });
  it.each([
    ["knowledge", ConsoleKnowledgePage, "Entrees totales"],
    ["market", ConsoleMarketPage, "Etudes de marche"],
  ] as const)("shows present coverage without a time comparison on console %s", (_name, Page, totalLabel) => {
    render(createElement(Page));
    expect(screen.queryByText(/vs période préc/)).toBeNull();
    expect(screen.getByText(/3\/4 scores renseignés/)).toBeDefined();
    const stat = screen.getByText(totalLabel).parentElement!;
    expect(within(stat).getByText("3")).toBeDefined();
  });
});
