// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const f = vi.hoisted(() => ({ stale: true, sections: [] as Array<{ status: string }> }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useCurrentStrategyId: () => "synthetic" }));
vi.mock("@/components/cockpit/use-can-operate", () => ({ useCanOperate: () => true }));
vi.mock("@/components/shared/notification-toast", () => ({ useToast: () => ({}) }));
vi.mock("@/components/cockpit/artemis-launch-modal", () => ({ ArtemisLaunchModal: () => null }));
vi.mock("@/components/cockpit/rtis-cascade-modal", () => ({ RtisCascadeModal: () => null }));
vi.mock("@/components/cockpit/oracle/progressive-panel", () => ({ OracleProgressivePanel: () => null }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  pillar: {
    maturityReport: { useQuery: () => ({ data: { pillars: Object.fromEntries("advertis".split("").map(k => [k, { currentStage: "COMPLETE" }])) } }) },
    readiness: { useQuery: () => ({ data: { byPillar: Object.fromEntries("ADVERTIS".split("").map(k => [k, { stale: f.stale }])) } }) },
  },
  oracle: { listSections: { useQuery: () => ({ data: { sections: f.sections } }) }, assembleOracle: { useMutation: () => ({}) } },
  strategyPresentation: {
    completeness: { useQuery: () => ({ data: Object.fromEntries(Array.from({ length: 35 }, (_, i) => [String(i), i < 27 ? "complete" : "partial"])) }) },
    shareLink: { useMutation: () => ({}) },
  },
} }));
import Page from "@/app/(cockpit)/cockpit/brand/proposition/page";
beforeEach(() => { vi.stubGlobal("React", React); f.stale = true; f.sections = []; });
afterEach(() => vi.unstubAllGlobals());
describe("Oracle reception distinguishes its sources from written output", () => {
  it("never presents 27 populated inputs as 27 written sections or a share-ready document", () => {
    const html = renderToStaticMarkup(React.createElement(Page));
    const text = document.createElement("div"); text.innerHTML = html;
    expect(text.textContent).toContain("0 de vos 35 sections sont rédigées et à jour");
    expect(text.textContent).not.toContain("sections sont complètes");
    expect(text.textContent).not.toContain("le document est prêt à être ouvert et partagé");
    expect(text.textContent).toContain("Préparer la fondation");
  });
  it("counts fresh written output separately from stale previous payloads", () => {
    f.stale = false; f.sections = [{ status: "COMPLETE" }, { status: "STALE" }];
    const text = document.createElement("div"); text.innerHTML = renderToStaticMarkup(React.createElement(Page));
    expect(text.textContent).toContain("1 de vos 35 sections sont rédigées et à jour");
    expect(text.textContent).toContain("1 section à réactualiser");
    expect(text.textContent).toContain("Sa rédaction et sa relecture restent à recevoir");
  });
});
