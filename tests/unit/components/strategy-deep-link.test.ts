// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrategyProvider, useStrategy } from "@/components/cockpit/strategy-context";

const h = vi.hoisted(() => ({ replace: vi.fn(), strategies: [
  { id: "first-brand", name: "Première marque", status: "DRAFT" },
  { id: "requested-brand", name: "Marque demandée", status: "DRAFT" },
] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace }) }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { list: { useQuery: () => ({ data: h.strategies, isLoading: false, isError: false, refetch: vi.fn() }) } },
} }));
function Probe() {
  const state = useStrategy();
  return React.createElement("div", {},
    React.createElement("output", { "aria-label": "Marque active" }, state.isError ? "Erreur de sélection" : state.strategyId ?? "Aucune"),
    React.createElement("button", { onClick: () => state.setStrategyId("first-brand") }, "Changer de marque"));
}
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); history.replaceState({}, "", "/"); });
const mount = () => render(React.createElement(StrategyProvider, { children: React.createElement(Probe) }));

describe("explicit brand deep links do not silently target a fallback", () => {
  it.each(["strategy", "strategyId"])("selects the accessible %s target before editing", (alias) => {
    history.replaceState({}, "", `/?${alias}=requested-brand`);
    mount();
    expect(screen.getByLabelText("Marque active").textContent).toBe("requested-brand");
  });
  it.each(["strategy", "strategyId"])("refuses an inaccessible %s target instead of selecting the first brand", (alias) => {
    history.replaceState({}, "", `/?${alias}=foreign-brand`);
    mount();
    expect(screen.getByLabelText("Marque active").textContent).toBe("Erreur de sélection");
  });
  it("keeps the canonical target when both aliases are present", () => {
    history.replaceState({}, "", "/?strategy=requested-brand&strategyId=first-brand");
    mount();
    expect(screen.getByLabelText("Marque active").textContent).toBe("requested-brand");
  });
  it("updates an old alias on a deliberate brand switch without losing the focus", () => {
    history.replaceState({}, "", "/?strategyId=requested-brand&focus=a.nomMarque");
    mount(); fireEvent.click(screen.getByRole("button", { name: "Changer de marque" }));
    expect(h.replace).toHaveBeenCalledWith("/?focus=a.nomMarque&strategy=first-brand", { scroll: false });
    expect(screen.getByLabelText("Marque active").textContent).toBe("first-brand");
  });
  it("still falls back from a stale stored preference with no explicit URL target", () => {
    localStorage.setItem("lf-active-strategy", "deleted-brand");
    mount();
    expect(screen.getByLabelText("Marque active").textContent).toBe("first-brand");
  });
});
