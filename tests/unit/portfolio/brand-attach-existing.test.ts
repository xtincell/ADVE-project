// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  strategy: { list: { useQuery: m.list } },
  useUtils: () => ({ brandNode: { listChildren: { invalidate: m.invalidate }, listRoots: { invalidate: m.invalidate }, get: { invalidate: m.invalidate } } }),
  brandNode: { get: { useQuery: () => ({}) }, create: { useMutation: () => ({ mutateAsync: m.create, isPending: false }) }, update: { useMutation: () => ({}) } },
} }));
import { BrandNodeForm } from "@/components/portfolio/BrandNodeForm";
beforeEach(() => { vi.clearAllMocks(); m.list.mockReturnValue({ data: [{ id: "existing", name: "Atelier Boréal", brandNode: null }, { id: "already-linked", name: "Déjà reliée", brandNode: { nodeKind: "SERVICE_BRAND" } }] }); m.create.mockResolvedValue({ ok: true, node: { id: "node" } }); });
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
