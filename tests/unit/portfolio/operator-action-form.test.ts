import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ campaigns: {} as Record<string, unknown>, read: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  campaign: { list: { useQuery: (input: unknown) => { state.read(input); return state.campaigns; } } },
  useUtils: () => ({ operatorAction: { invalidate: vi.fn() } }),
  operatorAction: { create: { useMutation: () => ({ isPending: false, mutateAsync: vi.fn() }) } },
} }));
import { OperatorActionForm } from "@/components/portfolio/OperatorActionForm";
const render = () => renderToStaticMarkup(createElement(OperatorActionForm, { operatorId: "team-b" }));
beforeEach(() => { state.read.mockClear(); state.campaigns = { data: [{ id: "camp-b", name: "Campagne reçue sans tâche" }], refetch: vi.fn() }; });
describe("actions transverses sans identifiants à recopier", () => {
  it("lit les campagnes de l’équipe et propose le choix par nom", () => {
    const html = render(); expect(state.read).toHaveBeenCalledWith({ operatorId: "team-b" });
    expect(html).toContain("Campagne reçue sans tâche"); expect(html).toContain("Action transverse à l’équipe");
    expect(html).not.toContain("cuid"); expect(html).not.toContain("cmou...");
  });
  it("conserve une erreur de lecture et permet de réessayer", () => {
    state.campaigns = { error: new Error("Lecture campagnes refusée"), refetch: vi.fn() };
    const html = render(); expect(html).toContain('role="alert"'); expect(html).toContain("Lecture campagnes refusée");
    expect(html).toContain("Réessayer la lecture"); expect(html).toContain("Action transverse à l’équipe");
  });
  it("signale le chargement sans annoncer une liste de campagnes vide", () => {
    state.campaigns = { isLoading: true, refetch: vi.fn() };
    const html = render(); expect(html).toContain('role="status"'); expect(html).toContain("Chargement des campagnes");
    expect(html).not.toContain("Aucune campagne");
  });
});
