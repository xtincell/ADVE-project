// @vitest-environment jsdom
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarProduction } from "@/components/cockpit/calendar-production";
import { ProductionWorkbench } from "@/components/cockpit/production-workbench";
import { isProductionTransportError, shouldPollProductionReceipt } from "@/components/cockpit/use-production-receipt-recovery";

const h = vi.hoisted(() => ({
  calendar: null as any, dispatch: null as any,
  readCalendar: vi.fn(), readDispatch: vi.fn(), produce: vi.fn(), compose: vi.fn(), prepare: vi.fn(),
}));
vi.mock("@/lib/trpc/client", async () => {
  const { useQuery, useMutation } = await import("@tanstack/react-query");
  const staticQuery = (data: unknown) => ({ useQuery: () => ({ data, refetch: vi.fn(), isLoading: false }) });
  const unusedMutation = { useMutation: () => ({ mutate: vi.fn(), isPending: false }) };
  return { trpc: {
    campaign: { list: staticQuery([]) }, creativeProposal: { listByStrategy: staticQuery([]) },
    strategy: { get: staticQuery({ status: "ACTIVE" }), getSynthesisConfidence: staticQuery(null), validateSynthesis: unusedMutation, generateProjectsFromActions: unusedMutation },
    actions: { byStrategy: staticQuery([]) }, campaignManager: { routeToGuilde: unusedMutation },
    ptah: { materializeBrief: unusedMutation },
    useUtils: () => ({ deliverableOrchestrator: { calendarProductionRows: { invalidate: vi.fn() } } }),
    deliverableOrchestrator: {
      calendarProductionRows: { useQuery: (_input: any, options: any) => useQuery({ queryKey: ["calendar"], queryFn: h.readCalendar, ...options }) },
      produceCalendarBrief: { useMutation: (options: any) => useMutation({ mutationFn: h.produce, ...options }) },
      prepareCalendarBriefs: { useMutation: () => useMutation({ mutationFn: h.prepare }) },
      getCalendarBrief: staticQuery(null),
      compose: { useMutation: (options: any) => useMutation({ mutationFn: h.compose, ...options }) },
      listSupportedKinds: staticQuery({ kinds: ["KV_VISUAL"] }),
      resolveRequirements: staticQuery({ ok: true, vaultMatches: [] }),
      getProductionPreview: { useQuery: (_input: any, options: any) => useQuery({ queryKey: ["preview"], queryFn: async () => ({
        previewIntentId: "preview-1", targetKind: "KV_VISUAL", campaignId: null, creativeProposalId: null,
        sourceManifest: { schema: "production-sources/v1", sources: [], creativeProposal: null },
        missingPreconditions: [], dispatchReceipt: h.dispatch,
      }), ...options }) },
      productionProgress: { useQuery: (_input: any, options: any) => useQuery({ queryKey: ["progress"], queryFn: h.readDispatch, ...options }) },
    },
  } };
});
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "synthetic" }));
vi.mock("@/components/cockpit/production-mix-review", () => ({ ProductionMixReview: () => null }));
vi.mock("@/components/cockpit/production-source-picker", () => ({ ProductionSourcePicker: () => null }));
vi.mock("@/components/neteru/ptah-kiln-tracker", () => ({ PtahKilnTracker: () => null }));
vi.mock("@/components/shared/confirm-dialog", () => ({ ConfirmDialog: (props: any) => props.open
  ? React.createElement("button", { onClick: props.onConfirm }, props.confirmLabel) : null }));

let client: QueryClient;
const brief = { assetId: "brief-1", version: 1, variant: 1, name: "Photo pilote" };
const completed = {
  status: "FILE_STORED", dispatchIntentId: "dispatch-1", generativeTaskId: "task-1", materialStatus: "COMPLETED",
  message: "Fichier image conservé, à relire.",
  materialVersions: [{ id: "image-1", url: "/api/production/image/image-1", status: "FILE_STORED", kind: "image" }],
};
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); vi.stubGlobal("React", React);
  window.history.replaceState({}, "", "/?productionPreview=preview-1");
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  h.calendar = { calendarVersion: "calendar-v1", rows: [{ key: "post-1", origin: "STORED", briefs: [{ ...brief }], post: {
    date: "2026-10-20", weekday: "mardi", week: "S1", platform: "Instagram", format: "Post", theme: "Duel", angle: "Choisir",
    hashtags: [], status: "DRAFT", caption: "Copy exacte", illustration: "Photographie",
  } }] };
  h.dispatch = null;
  h.readCalendar.mockImplementation(async () => structuredClone(h.calendar));
  h.readDispatch.mockImplementation(async () => structuredClone(h.dispatch));
  h.produce.mockRejectedValue(new TypeError("fetch failed"));
  h.compose.mockRejectedValue(new TypeError("fetch failed"));
  h.prepare.mockImplementation(async () => structuredClone(h.calendar));
});
afterEach(() => { cleanup(); client.clear(); vi.useRealTimers(); vi.unstubAllGlobals(); });
async function tick(ms = 25) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function show(component: React.ReactElement) {
  return render(React.createElement(QueryClientProvider, { client }, component));
}
function calendar() {
  show(React.createElement(CalendarProduction, { strategyId: "synthetic", startDate: "2026-10-20", weeks: 1, projectDates: true,
    fallback: "Chargement", renderPost: (_post, actions) => React.createElement("li", null, actions) }));
}

describe("Production receipt recovery without redispatch", () => {
  it("receives the completed calendar file after a lost response and stops polling", async () => {
    calendar(); await tick();
    fireEvent.click(screen.getByText("Demander la génération de cette option")); await tick();
    expect(document.body.textContent).toContain("Connexion interrompue");
    expect(document.body.textContent).not.toContain("fetch failed");
    expect(screen.queryByText("Demander la génération de cette option")).toBeNull();
    expect(h.produce).toHaveBeenCalledTimes(1);
    h.calendar.rows[0].briefs[0].generation = completed;
    await tick(3050);
    expect(document.querySelector('img[src="/api/production/image/image-1"]')).toBeTruthy();
    expect(document.body.textContent).not.toContain("Connexion interrompue");
    const reads = h.readCalendar.mock.calls.length;
    await tick(15_000);
    expect(h.readCalendar).toHaveBeenCalledTimes(reads);
    expect(h.produce).toHaveBeenCalledTimes(1);
  });

  it("bounds the search for an absent receipt and lets the user refresh with reads only", async () => {
    calendar(); await tick();
    fireEvent.click(screen.getByText("Demander la génération de cette option")); await tick();
    await tick(120_100);
    expect(document.body.textContent).toContain("Le reçu n’a pas encore pu être confirmé");
    const reads = h.readCalendar.mock.calls.length;
    await tick(9000); expect(h.readCalendar).toHaveBeenCalledTimes(reads);
    h.calendar.rows[0].briefs[0].generation = completed;
    fireEvent.click(screen.getByText("Vérifier le reçu")); await tick();
    expect(document.querySelector("img")).toBeTruthy();
    expect(h.produce).toHaveBeenCalledTimes(1);
  });

  it("keeps a received image visible when a later receipt refresh loses the network", async () => {
    h.calendar.rows[0].briefs[0].generation = completed;
    calendar(); await tick();
    h.readCalendar.mockRejectedValue(new TypeError("fetch failed"));
    await act(async () => { await client.invalidateQueries({ queryKey: ["calendar"] }); }); await tick();
    expect(document.querySelector('img[src="/api/production/image/image-1"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Les derniers reçus restent affichés");
    expect(h.produce).not.toHaveBeenCalled();
  });

  it("receives each option before the next option has finished", async () => {
    h.calendar.rows[0].briefs.push({ ...brief, assetId: "brief-2", variant: 2 });
    let finishSecond!: (value: unknown) => void;
    h.produce.mockImplementationOnce(async () => {
      h.calendar.rows[0].briefs[0].generation = completed;
      return completed;
    }).mockImplementationOnce(() => new Promise(resolve => { finishSecond = resolve; }));
    calendar(); await tick();
    fireEvent.click(screen.getByText("Produire les 2 options")); await tick();
    expect(h.produce).toHaveBeenCalledTimes(2);
    expect(document.querySelector('img[src="/api/production/image/image-1"]')).toBeTruthy();
    expect(document.body.textContent).toContain("Publication 1/1 · option 2");
    await act(async () => { finishSecond(completed); }); await tick();
  });

  it("reconciles a workbench timeout with a durable completed receipt and no second dispatch", async () => {
    show(React.createElement(ProductionWorkbench)); await tick(100);
    fireEvent.click(screen.getByRole("button", { name: "Lancer la cascade de production" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la production" })); await tick();
    expect(document.body.textContent).toContain("Connexion interrompue");
    expect(document.body.textContent).not.toContain("fetch failed");
    h.dispatch = { status: "OK", materialStatus: "COMPLETED", generativeTaskId: "task-1", steps: [] };
    await tick(2050);
    expect(document.body.textContent).toContain("Tentative enregistrée · COMPLETED");
    expect(document.body.textContent).not.toContain("Connexion interrompue");
    expect(document.body.textContent).not.toContain("fetch failed");
    const reads = h.readDispatch.mock.calls.length;
    await tick(10_000); expect(h.readDispatch).toHaveBeenCalledTimes(reads);
    expect(h.compose).toHaveBeenCalledTimes(1);
    expect(h.compose.mock.calls[0]?.[0]).toMatchObject({ previewOnly: false, previewIntentId: "preview-1" });
  });

  it("retains structured server errors instead of treating them as successful transport recovery", async () => {
    h.compose.mockRejectedValue(Object.assign(new Error("Quota refusé"), { data: { code: "FORBIDDEN" } }));
    show(React.createElement(ProductionWorkbench)); await tick(100);
    fireEvent.click(screen.getByRole("button", { name: "Lancer la cascade de production" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la production" })); await tick();
    expect(screen.getByRole("alert").textContent).toContain("Quota refusé");
    expect(document.body.textContent).not.toContain("Connexion interrompue");
    expect(h.compose).toHaveBeenCalledTimes(1);
  });

  it.each(["COMPLETED", "FAILED", "VETOED", "DEFERRED", "EXPIRED"])("stops at material state %s even while the POST is pending", materialStatus => {
    expect(shouldPollProductionReceipt({ status: "OK", materialStatus }, true)).toBe(false);
  });
  it("keeps tracking material work after the dispatch itself succeeds", () => {
    expect(shouldPollProductionReceipt({ status: "OK", materialStatus: "IN_PROGRESS" }, false)).toBe(true);
    expect(isProductionTransportError({ message: "Provider timeout", data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(false);
  });
});
