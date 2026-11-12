import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  own: {} as Record<string, unknown>, available: {} as Record<string, unknown>,
  campaigns: {} as Record<string, unknown>, read: {} as Record<string, unknown>, role: "ADMIN", requested: "team-b", tab: "KPIS",
}));
vi.mock("react", async (importOriginal) => {
  const original = await importOriginal<typeof import("react")>();
  return { ...original, useState: (initial: unknown) => initial === "KPIS" ? [state.tab, vi.fn()] : original.useState(initial) };
});
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "task-fixture" }), useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/console/operate/africa-portfolio",
  useSearchParams: () => new URLSearchParams(state.requested ? { operator: state.requested } : {}),
}));
vi.mock("@/lib/trpc/client", () => {
  const mutation = () => ({ isPending: false, error: null, mutate: vi.fn() });
  return { trpc: {
    auth: { me: { useQuery: () => ({ data: { role: state.role }, refetch: vi.fn() }) } },
    useUtils: () => ({ campaignDeliverable: { invalidate: vi.fn() }, campaignChangeRequest: { invalidate: vi.fn() }, operatorAction: { invalidate: vi.fn() } }),
    operator: { getOwn: { useQuery: () => state.own }, list: { useQuery: () => state.available } },
    campaign: { list: { useQuery: () => state.campaigns } },
    campaignDeliverable: { statsForOperator: { useQuery: () => state.read }, listForOperator: { useQuery: () => state.read }, update: { useMutation: mutation } },
    campaignChangeRequest: { listForDeliverable: { useQuery: () => ({ data: [], refetch: vi.fn() }) }, listOpenForOperator: { useQuery: () => state.read }, resolve: { useMutation: mutation }, escalate: { useMutation: mutation }, create: { useMutation: mutation } },
    operatorAction: { listForOperator: { useQuery: () => state.read }, toggleDone: { useMutation: mutation } },
  } };
});
import AfricaPortfolioPage from "@/app/(console)/console/operate/africa-portfolio/page";
import DeliverableDetailPage from "@/app/(console)/console/operate/africa-portfolio/deliverable/[id]/page";
import { usePortfolioOperator } from "@/components/portfolio/use-portfolio-operator";
const render = () => renderToStaticMarkup(createElement(AfricaPortfolioPage));
function Probe() { const { operator, error } = usePortfolioOperator(); return createElement("p", null, error?.message ?? operator?.id ?? "absent"); }
beforeEach(() => {
  state.role = "ADMIN"; state.requested = "team-b"; state.tab = "KPIS";
  state.own = { data: null, isLoading: false, refetch: vi.fn() };
  state.available = { data: [{ id: "team-a", name: "Équipe A", createdAt: new Date(0) }, { id: "team-b", name: "Équipe B", createdAt: new Date(1) }], refetch: vi.fn() };
  state.campaigns = { data: [], isLoading: false, refetch: vi.fn() };
  state.read = { data: { total: 0, byRag: {}, byStatus: {} }, isLoading: false, refetch: vi.fn() };
});
describe("contexte de suivi sans rattachement inventé", () => {
  it("reprend l’équipe explicitement choisie par l’administrateur", () => {
    const html = render(); expect(html).toContain("Équipe B"); expect(html).toContain("Équipe du portefeuille"); expect(html).not.toContain("Aucune équipe rattachée");
  });
  it("ne remplace pas une équipe demandée absente par la première équipe", () => {
    state.requested = "team-inconnue";
    const html = renderToStaticMarkup(createElement(Probe)); expect(html).toContain("équipe demandée"); expect(html).not.toContain("team-a");
  });
  it("ne remplace pas une équipe étrangère demandée par celle du compte", () => {
    state.role = "USER"; state.own = { data: { id: "team-a" }, refetch: vi.fn() };
    const html = renderToStaticMarkup(createElement(Probe)); expect(html).toContain("équipe demandée"); expect(html).not.toContain("team-a");
  });
  it("conserve le contexte dans les liens du détail", () => {
    state.read = { data: [{ id: "task-fixture", status: "TODO", rag: "GREEN", deliverableType: "POSTER", campaignId: "campaign-fixture", language: "FR", campaign: { id: "campaign-fixture", name: "Campagne de recette", strategyId: "strategy-fixture" } }], refetch: vi.fn() };
    const html = renderToStaticMarkup(createElement(DeliverableDetailPage));
    expect(html).toContain("Campagne de recette"); expect(html).toContain('/console/operate/africa-portfolio?operator=team-b'); expect(html).toContain('/cockpit/operate/campaigns/campaign-fixture?operator=team-b');
  });
  it("rend une campagne reçue avant la création de ses livrables", () => {
    state.tab = "PROJECTS"; state.read = { data: [], refetch: vi.fn() };
    state.campaigns = { data: [{ id: "campaign-new", name: "Brief tout juste reçu", strategyId: "brand-new" }], refetch: vi.fn() };
    const html = render(); expect(html).toContain("Brief tout juste reçu");
    expect(html).toContain("Aucun livrable"); expect(html).toContain("campaign-new?operator=team-b");
    expect(html).not.toContain("Aucune campagne avec des livrables");
  });
  it("ne cache pas une erreur du registre de campagnes derrière une liste de tâches vide", () => {
    state.tab = "PROJECTS"; state.read = { data: [], refetch: vi.fn() };
    state.campaigns = { error: new Error("Registre campagnes indisponible"), refetch: vi.fn() };
    expect(render()).toContain("Registre campagnes indisponible");
  });
  for (const tab of ["KPIS", "PROJECTS", "DELIVERABLES", "ACTIONS", "TICKETS"]) {
    it(`${tab} distingue une lecture refusée d’une liste vide`, () => {
      state.tab = tab; state.read = { data: undefined, error: new Error("Lecture de recette refusée"), isLoading: false, refetch: vi.fn() };
      const html = render(); expect(html).toContain("Lecture de recette refusée"); expect(html).toContain('role="alert"'); expect(html).toContain("Réessayer la lecture");
      expect(html).not.toMatch(/Aucun(e)? (campagne|livrable|action|ticket|reprise)|Livrables totaux|0 tickets ouverts/);
    });
    it(`${tab} distingue chargement et vide`, () => {
      state.tab = tab; state.read = { data: undefined, isLoading: true, refetch: vi.fn() };
      const html = render(); expect(html).toContain("Chargement"); expect(html).not.toMatch(/Aucun(e)? (campagne|livrable|action|ticket|reprise)|Livrables totaux|0 tickets ouverts/);
    });
  }
});
