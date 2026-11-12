// @vitest-environment jsdom
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ pending: false, log: [] as Array<{ at: number; level: "ok"; text: string }> }));
vi.mock("@/components/cockpit/use-can-operate", () => ({ useCanOperate: () => true }));
vi.mock("@/hooks/use-oracle-stream", () => ({ useOracleStream: () => ({ log: f.log, isStreaming: true, assemblerState: { phase: "idle" }, sectionsState: new Map() }) }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { oracle: {
  listSections: { useQuery: () => ({ data: { sections: [{ sectionId: 1, status: "STALE", payloadSize: 500 }] } }) },
  generateSection: { useMutation: () => ({ isPending: f.pending }) },
  retrySection: { useMutation: () => ({ isPending: false }) },
  assembleOracle: { useMutation: () => ({ isPending: false }) },
  getSection: { useQuery: () => ({}) },
} } }));
vi.mock("@/components/cockpit/oracle/section-card", () => ({ OracleSectionCard: () => null }));
vi.mock("@/components/cockpit/oracle/section-reader", () => ({ OracleSectionReader: () => null }));
vi.mock("@/components/cockpit/oracle/section-failure-modal", () => ({ OracleSectionFailureModal: () => null }));
import { OracleProgressivePanel } from "@/components/cockpit/oracle/progressive-panel";
import { OracleLiveConsole } from "@/components/cockpit/oracle/live-console";
beforeEach(() => { vi.stubGlobal("React", React); f.pending = false; f.log = []; });
afterEach(() => vi.unstubAllGlobals());
function panel(props = {}) { const el = document.createElement("div"); el.innerHTML = renderToStaticMarkup(React.createElement(OracleProgressivePanel, { strategyId: "synthetic", ...props })); return el; }
describe("Oracle session activity is not document history", () => {
  it("does not show a waiting-for-first-generation message or journal on an idle written document", () => {
    const el = panel();
    expect(el.textContent).not.toContain("première génération");
    expect(el.textContent).not.toContain("Journal de cette session");
    expect(el.querySelector("details")?.open).toBe(false);
  });
  it("shows a pending-operation hint only while an operation really runs", () => {
    const el = panel({ assemblyPending: true });
    expect(el.textContent).toContain("Actualisation demandée");
    expect(Array.from(el.querySelectorAll("button")).every(b => b.disabled)).toBe(true);
  });
  it("collapses received session events after the operation", () => {
    f.log = [{ at: Date.now(), level: "ok", text: "35 sections reçues" }];
    const el = panel(); const journal = Array.from(el.querySelectorAll("details")).find(d => d.textContent?.includes("Journal de cette session"));
    expect(journal?.open).toBe(false); expect(journal?.textContent).toContain("35 sections reçues");
  });
  it("does not equate an open event stream with generation", () => {
    const html = renderToStaticMarkup(React.createElement(OracleLiveConsole, { log: [], isStreaming: true }));
    expect(html).toContain("Aucune opération lancée dans cet onglet."); expect(html).not.toContain("première génération");
  });
});
