// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrmSalesFleet } from "@/components/console/crm-sales-fleet";

const calls = vi.hoisted(() => ({ brands: vi.fn(), profiles: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "owner", role: "ADMIN" } } }) }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ crm: { invalidate: vi.fn() } }),
  strategy: { list: { useQuery: () => ({ data: calls.brands() }) } },
  crm: {
    listDeals: { useQuery: () => ({ data: [] }) },
    listSalesRepresentatives: { useQuery: calls.profiles },
    salesRosterOptions: { useQuery: () => ({ data: { users: [], financeUserIds: [] } }) },
    getSalesRepresentative: { useQuery: () => ({ data: undefined }) },
    saveSalesRepresentative: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    setSalesRepresentativeStatus: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    dispatchSalesRepresentative: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    resolveSalesRun: { useMutation: () => ({ mutateAsync: vi.fn() }) },
  },
} }));
const brands = [{ id: "brand-a", name: "Marque A", pillars: [] }, { id: "brand-b", name: "Marque B", pillars: [] }];
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); window.history.replaceState({}, "", "/"); calls.brands.mockReturnValue(brands); calls.profiles.mockReturnValue({ data: [], isLoading: false }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("the offer page keeps its brand when opening the sales team", () => {
  it("selects the linked accessible brand once and keeps a later manual choice through refreshed data", async () => {
    window.history.replaceState({}, "", "/console/socle/pipeline?strategy=brand-a");
    const view = render(React.createElement(CrmSalesFleet));
    await waitFor(() => expect((screen.getByLabelText("Marque vendeuse") as HTMLSelectElement).value).toBe("brand-a"));
    expect(calls.profiles).toHaveBeenCalledWith({ strategyId: "brand-a" }, expect.anything());
    fireEvent.change(screen.getByLabelText("Marque vendeuse"), { target: { value: "brand-b" } });
    calls.brands.mockReturnValue([...brands]); view.rerender(React.createElement(CrmSalesFleet));
    expect((screen.getByLabelText("Marque vendeuse") as HTMLSelectElement).value).toBe("brand-b");
  });
  it("ignores an unavailable brand instead of selecting a different one", () => {
    window.history.replaceState({}, "", "/console/socle/pipeline?strategy=unknown-brand");
    render(React.createElement(CrmSalesFleet));
    expect((screen.getByLabelText("Marque vendeuse") as HTMLSelectElement).value).toBe("");
    expect(screen.getByText("Choisissez la marque dont vous voulez organiser les ventes.")).toBeTruthy();
  });
});
