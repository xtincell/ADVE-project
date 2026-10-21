// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn(), own: vi.fn(), list: vi.fn(), invalidate: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { role: "USER" } } }) }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { list: { useQuery: m.list } },
  operator: { getOwn: { useQuery: m.own } },
  brandClient: { list: { useInfiniteQuery: () => ({ data: { pages: [{ items: [{ id: "regional-client", name: "Bureau régional", status: "ACTIVE" }] }] } }) } },
  useUtils: () => ({ brandNode: { listChildren: { invalidate: m.invalidate }, listRoots: { invalidate: m.invalidate }, get: { invalidate: m.invalidate } } }),
  brandNode: { get: { useQuery: m.get }, create: { useMutation: () => ({ mutateAsync: m.create, isPending: false }) }, update: { useMutation: () => ({ mutateAsync: m.update, isPending: false }) } },
} }));
import { BrandNodeForm } from "@/components/portfolio/BrandNodeForm";
beforeEach(() => { vi.clearAllMocks(); m.get.mockReturnValue({}); m.own.mockReturnValue({ data: null }); m.list.mockReturnValue({ data: [{ id: "existing", name: "Atelier Boréal", brandNode: null }, { id: "already-linked", name: "Déjà reliée", brandNode: { nodeKind: "SERVICE_BRAND" } }] }); m.create.mockResolvedValue({ ok: true, node: { id: "node" } }); });
afterEach(cleanup);
it("attaches the selected existing platform through the original governed create, with explicit nature", async () => {
  render(React.createElement(BrandNodeForm, { operatorId: "team-a", strategyId: "audit:team-a" }));
  expect(m.list).toHaveBeenCalledWith({ operatorId: "team-a" }, { enabled: true });
  expect(screen.queryByRole("option", { name: "Déjà reliée" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Plateforme de marque existante"), { target: { value: "existing" } });
  expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Atelier Boréal");
  fireEvent.change(screen.getByLabelText("Nature de la marque"), { target: { value: "SERVICE" } });
  fireEvent.click(screen.getByRole("button", { name: "Créer" }));
  await waitFor(() => expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ operatorId: "team-a", attachStrategyId: "existing", nodeNature: "SERVICE", name: "Atelier Boréal" })));
});
it("preserves an intentionally entered dossier name and does not infer a platform", () => {
  render(React.createElement(BrandNodeForm, { operatorId: "team-a", strategyId: "audit:team-a" }));
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Dossier régional" } });
  fireEvent.change(screen.getByLabelText("Plateforme de marque existante"), { target: { value: "existing" } });
  expect((screen.getByLabelText("Nom") as HTMLInputElement).value).toBe("Dossier régional");
  expect(m.create).not.toHaveBeenCalled();
});
const existingNode = { id: "node", name: "Marque Cameroun", slug: "marque-cm", nodeKind: "REGIONAL_BRAND",
  nodeNature: "PRODUCT", countryCode: "CM", clusterTag: null, nodeRole: [], strategyId: "existing",
  lifecycle: "ACTIVE", clientId: null, updatedAt: new Date("2026-10-21T00:00:00Z") };
it("lets the responsible team bind a client without changing the local market", async () => {
  m.own.mockReturnValue({ data: { id: "team-a" } });
  m.get.mockReturnValue({ data: existingNode });
  render(React.createElement(BrandNodeForm, { nodeId: "node", operatorId: "team-a", strategyId: "existing" }));
  fireEvent.change(screen.getByLabelText("Client du dossier"), { target: { value: "regional-client" } });
  fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() => expect(m.update).toHaveBeenCalledWith(expect.objectContaining({
    expectedUpdatedAt: "2026-10-21T00:00:00.000Z", patches: expect.objectContaining({ clientId: "regional-client", countryCode: "CM" }),
  })));
});
it("does not offer a client reassignment to the founder", () => {
  m.get.mockReturnValue({ data: existingNode });
  render(React.createElement(BrandNodeForm, { nodeId: "node", operatorId: "team-a", strategyId: "existing" }));
  expect(screen.queryByLabelText("Client du dossier")).toBeNull();
});
