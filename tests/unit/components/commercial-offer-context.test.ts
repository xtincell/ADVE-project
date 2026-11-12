// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SkillTreePage from "@/app/(console)/console/artemis/skill-tree/page";
import { getSequence } from "@/server/services/artemis/tools/sequences";

const calls = vi.hoisted(() => ({ brands: vi.fn(), tree: vi.fn(), execute: vi.fn() }));
vi.mock("@/components/shared/page-header", () => ({ PageHeader: () => React.createElement("h1", {}, "Générateurs") }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { list: { useQuery: () => ({ data: calls.brands() }) } },
  sequenceVault: {
    skillTree: { useQuery: calls.tree },
    checkPrereqs: { useQuery: () => ({ refetch: vi.fn(async () => ({ data: { blocked: false } })) }) },
  },
  glory: { executeSequence: { useMutation: () => ({ mutate: calls.execute, isPending: false }) } },
} }));
const brands = [{ id: "brand-a", name: "Marque A", status: "DRAFT" }, { id: "brand-b", name: "Marque B", status: "ACTIVE" }];
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); window.history.replaceState({}, "", "/"); calls.brands.mockReturnValue(brands); calls.tree.mockReturnValue({ data: [] }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("the existing offer generator receives the brand context", () => {
  it("opens the requested offer for the linked brand without starting generation", async () => {
    window.history.replaceState({}, "", "/console/artemis/skill-tree?strategy=brand-a&sequence=OFFRE-V#sequence-OFFRE-V");
    const view = render(React.createElement(SkillTreePage));
    await waitFor(() => expect((screen.getByLabelText("Marque à préparer") as HTMLSelectElement).value).toBe("brand-a"));
    expect(screen.getByRole("button", { name: /OFFRE-V.*L'Offre Commerciale/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Devis")).toBeTruthy();
    expect(calls.tree).toHaveBeenCalledWith({ strategyId: "brand-a" }, expect.anything()); expect(calls.execute).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Marque à préparer"), { target: { value: "brand-b" } });
    calls.brands.mockReturnValue([...brands]); view.rerender(React.createElement(SkillTreePage));
    expect((screen.getByLabelText("Marque à préparer") as HTMLSelectElement).value).toBe("brand-b");
  });

  it("shows the same ordered tools and outputs as the existing OFFRE-V sequence", async () => {
    window.history.replaceState({}, "", "/console/artemis/skill-tree?strategy=brand-a&sequence=OFFRE-V");
    render(React.createElement(SkillTreePage));
    await waitFor(() => expect(screen.getByRole("button", { name: /OFFRE-V.*L'Offre Commerciale/ }).getAttribute("aria-expanded")).toBe("true"));
    const canonical = getSequence("OFFRE-V")!;
    const panel = document.getElementById("sequence-OFFRE-V")!;
    const texts = Array.from(panel.querySelectorAll("span")).map(span => span.textContent);
    const refs = canonical.steps.map(step => step.ref);
    const outputs = [...new Set(canonical.steps.flatMap(step => step.outputKeys))];
    expect(texts.filter(text => refs.includes(text ?? ""))).toEqual(refs);
    expect(texts.filter(text => outputs.includes(text ?? ""))).toEqual(outputs);
  });
});
