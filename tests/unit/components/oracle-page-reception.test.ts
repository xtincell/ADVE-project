// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const f = vi.hoisted(() => ({
  stale: true, canCascade: true, canOperate: true, loading: false,
  sections: [] as Array<{ sectionId: number; status: string; payloadSize: number }>,
  mutate: vi.fn(), refetch: vi.fn(), toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
  callbacks: {} as Record<string, (...args: any[]) => any>,
}));
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "synthetic" }));
vi.mock("@/components/cockpit/use-can-operate", () => ({ useCanOperate: () => f.canOperate }));
vi.mock("@/components/shared/notification-toast", () => ({ useToast: () => f.toast }));
vi.mock("@/components/cockpit/artemis-launch-modal", () => ({ ArtemisLaunchModal: () => null }));
vi.mock("@/components/cockpit/rtis-cascade-modal", () => ({ RtisCascadeModal: () => null }));
vi.mock("@/components/cockpit/oracle/progressive-panel", () => ({ OracleProgressivePanel: () => null }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  pillar: {
    maturityReport: { useQuery: () => ({ refetch: f.refetch, data: { pillars: Object.fromEntries("advertis".split("").map(k => [k, { currentStage: "COMPLETE" }])) } }) },
    readiness: { useQuery: () => ({ refetch: f.refetch, data: { gates: { RTIS_CASCADE: { ok: f.canCascade } }, byPillar: Object.fromEntries("ADVERTIS".split("").map(k => [k, { pillarKey: k, stale: f.stale }])) } }) },
  },
  oracle: { listSections: { useQuery: () => ({ refetch: f.refetch, isLoading: f.loading, data: { sections: f.sections } }) }, assembleOracle: { useMutation: (callbacks: typeof f.callbacks) => { f.callbacks = callbacks; return { mutate: f.mutate }; } } },
  strategyPresentation: {
    completeness: { useQuery: () => ({ refetch: f.refetch, data: Object.fromEntries(Array.from({ length: 35 }, (_, i) => [String(i), i < 27 ? "complete" : "partial"])) }) },
    shareLink: { useMutation: () => ({}) },
  },
} }));
import Page from "@/app/(cockpit)/cockpit/brand/proposition/page";
let mounted: ReturnType<typeof createRoot> | undefined;
beforeEach(() => {
  vi.stubGlobal("React", React); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  f.stale = true; f.canCascade = true; f.canOperate = true; f.loading = false; f.sections = [];
  vi.clearAllMocks(); f.refetch.mockImplementation(async () => ({ data: { sections: f.sections } }));
});
afterEach(async () => { if (mounted) await act(async () => mounted?.unmount()); mounted = undefined; vi.unstubAllGlobals(); });
function markup() { const el = document.createElement("div"); el.innerHTML = renderToStaticMarkup(React.createElement(Page)); return el; }
async function mount() { const el = document.createElement("div"); mounted = createRoot(el); await act(async () => mounted?.render(React.createElement(Page))); return el; }
function button(el: HTMLElement, label: string) { return Array.from(el.querySelectorAll("button")).find(b => b.textContent === label); }
function rows(status: string) { return Array.from({ length: 35 }, (_, i) => ({ sectionId: i + 1, status, payloadSize: status === "PENDING" ? 0 : 420 })); }
describe("Oracle reception distinguishes its sources from written output", () => {
  it("never presents populated inputs as written sections", () => {
    const text = markup().textContent;
    expect(text).toContain("0 de vos 35 sections sont rédigées.");
    expect(text).not.toContain("sections sont complètes");
    expect(text).toContain("Préparer la stratégie");
    expect(text).toContain("Analyses à réactualiser : A, D, V, E, R, T, I, S");
  });
  it("requires foundation preparation when the canonical gate is closed", () => {
    f.canCascade = false; const text = markup().textContent;
    expect(text).toContain("Préparer la fondation"); expect(text).not.toContain("Préparer la stratégie");
  });
  it("refreshes all 35 written stale sections in one click through the canonical assembler", async () => {
    f.stale = false; f.sections = rows("STALE"); const el = await mount();
    expect(el.textContent).toContain("35 sections rédigées, 0 à jour");
    expect(el.textContent).not.toContain("Sa rédaction et sa relecture restent à recevoir");
    await act(async () => button(el, "Réactualiser l’Oracle")!.click());
    expect(f.mutate).toHaveBeenCalledExactlyOnceWith({ strategyId: "synthetic", scope: Array.from({ length: 35 }, (_, i) => i + 1) });
  });
  it("includes missing and failed sections but preserves current sections", async () => {
    f.stale = false; f.sections = ["COMPLETE", "STALE", "PENDING", "FAILED"].map((status, i) => ({ sectionId: i + 1, status, payloadSize: i === 2 ? 0 : 420 }));
    const el = await mount(); await act(async () => button(el, "Réactualiser l’Oracle")!.click());
    expect(f.mutate).toHaveBeenCalledWith({ strategyId: "synthetic", scope: [2, 3, 4] });
  });
  it("offers first writing only when there is no written document", async () => {
    f.stale = false; f.sections = rows("PENDING"); const el = await mount();
    await act(async () => button(el, "Rédiger l’Oracle")!.click()); expect(f.mutate).toHaveBeenCalledOnce();
  });
  it("disables the main action once every section is current", () => {
    f.stale = false; f.sections = rows("COMPLETE"); const el = markup();
    expect(button(el, "Oracle à jour")?.disabled).toBe(true); expect(el.textContent).toContain("35 sections rédigées, 35 à jour");
  });
  it("blocks another assembly while a section is generating or the list is loading", () => {
    f.stale = false; f.sections = rows("STALE"); f.sections[0]!.status = "GENERATING";
    expect(button(markup(), "Actualisation en cours…")?.disabled).toBe(true);
    f.sections[0]!.status = "STALE"; f.loading = true;
    expect(button(markup(), "Réactualiser l’Oracle")?.disabled).toBe(true);
  });
  it("keeps founders read-only", () => {
    f.stale = false; f.sections = rows("STALE"); f.canOperate = false;
    expect(button(markup(), "Réactualiser l’Oracle")).toBeUndefined();
  });
  it("reads failure counters from the intent envelope and never claims stale sections are current", async () => {
    f.stale = false; f.sections = rows("STALE"); await mount();
    await act(async () => { await f.callbacks.onSuccess!({ status: "OK", output: { succeeded: 34, failed: 1 } }); });
    expect(f.toast.error).toHaveBeenCalledOnce(); expect(f.toast.success).not.toHaveBeenCalled();
    f.toast.error.mockClear();
    await act(async () => { await f.callbacks.onSuccess!({ status: "OK", output: { succeeded: 0, failed: 0 } }); });
    expect(f.toast.info).toHaveBeenCalledOnce(); expect(f.toast.success).not.toHaveBeenCalled();
    f.sections = rows("COMPLETE");
    await act(async () => { await f.callbacks.onSuccess!({ status: "OK", output: { succeeded: 35, failed: 0 } }); });
    expect(f.toast.success).toHaveBeenCalledOnce();
  });
});
