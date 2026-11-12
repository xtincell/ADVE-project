// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ create: vi.fn(), boot: vi.fn(), activate: vi.fn(),
  select: vi.fn(), push: vi.fn(), steps: [] as string[], intake: undefined as any }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.push }) }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { email: "fixture@example.invalid" } } }) }));
vi.mock("@/components/cockpit/strategy-context", () => ({ useStrategy: () => ({ setStrategyId: h.select }) }));
vi.mock("@/components/shared/page-header", () => ({ PageHeader: ({ title }: { title: string }) => React.createElement("h1", null, title) }));
vi.mock("@/lib/i18n/use-t", async () => {
  const { intakeResultFr } = await import("@/lib/i18n/pages/intake-result");
  return { useT: () => ({ t: (key: string) => (intakeResultFr as Record<string, string>)[key] ?? key }) };
});
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { create: { useMutation: () => ({ mutateAsync: h.create }) } },
  bootSequence: { start: { useMutation: () => ({ mutateAsync: h.boot }) } },
  quickIntake: {
    getByToken: { useQuery: () => ({ data: h.intake }) },
    activateBrand: { useMutation: (options: any) => ({ isPending: false, mutate: (input: unknown) => {
      h.activate(input); options.onSuccess({ strategyId: "activated-brand" });
    } }) },
  },
} }));

import NewBrandPage from "@/app/(cockpit)/cockpit/new/page";

beforeEach(() => {
  vi.clearAllMocks(); h.steps.length = 0; h.intake = undefined;
  h.create.mockResolvedValue({ id: "created-brand" }); h.boot.mockResolvedValue({});
  h.select.mockImplementation(id => h.steps.push(`select:${id}`));
  h.push.mockImplementation(url => h.steps.push(`navigate:${url}`));
  window.history.replaceState({}, "", "/cockpit/new");
});
afterEach(cleanup);

function prepareManualCreation() {
  render(React.createElement(NewBrandPage));
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  fireEvent.change(screen.getAllByRole("textbox")[0]!, { target: { value: "Fixture brand" } });
  fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
  fireEvent.click(screen.getByRole("button", { name: "Conseil & services pro" }));
  fireEvent.click(screen.getByRole("button", { name: "Côte d'Ivoire" }));
  fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
  fireEvent.click(screen.getByRole("button", { name: /^Services Vend du conseil/ }));
  fireEvent.click(screen.getByRole("button", { name: "Mainstream" }));
  fireEvent.click(screen.getByRole("button", { name: /^Vente directe/ }));
  fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
}

describe("creation and activation open the dossier just created", () => {
  it("creates manually, selects the new brand and enters its foundation without boot assistance", async () => {
    prepareManualCreation();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Créer la marque" })); });
    expect(h.create).toHaveBeenCalledOnce(); expect(h.boot).not.toHaveBeenCalled();
    expect(h.steps).toEqual(["select:created-brand", "navigate:/cockpit/brand/fondation?strategy=created-brand"]);
  });

  it("opens the existing dossier after assistance refuses instead of creating another one", async () => {
    prepareManualCreation(); h.boot.mockRejectedValue(new Error("Fixture assistance refused"));
    fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Créer la marque" })); });
    expect(h.boot).toHaveBeenCalledOnce(); expect(screen.getByText("Fixture assistance refused")).toBeDefined();
    const primary = screen.getAllByRole("button").find(b => /^(Créer la marque|Ouvrir la marque)$/.test(b.textContent?.trim() ?? ""));
    expect(primary).toBeDefined();
    await act(async () => { fireEvent.click(primary!); });
    expect(h.create).toHaveBeenCalledOnce();
    expect(h.push).toHaveBeenLastCalledWith("/cockpit/brand/fondation?strategy=created-brand");
  });

  it.each([false, true])("keeps activation scoped to its returned brand with assistance=%s", async checked => {
    h.intake = { companyName: "Fixture intake", contactEmail: "fixture@example.invalid" };
    window.history.replaceState({}, "", "/cockpit/new?intake=fixture-token");
    render(React.createElement(NewBrandPage));
    if (checked) fireEvent.click(screen.getByRole("checkbox"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Activer ma marque diagnostiquée" })); });
    expect(h.activate).toHaveBeenCalledWith({ token: "fixture-token", inferMissingFields: checked });
    expect(h.steps).toEqual(["select:activated-brand", "navigate:/cockpit/brand/fondation?strategy=activated-brand"]);
  });
});
