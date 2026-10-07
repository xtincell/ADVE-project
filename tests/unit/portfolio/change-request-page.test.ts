import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  operator: {} as Record<string, unknown>, tasks: {} as Record<string, unknown>,
  tickets: {} as Record<string, unknown>, mutationError: null as Error | null,
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ id: "task-fixture" }), useRouter: () => ({}), usePathname: () => "/console/operate/africa-portfolio", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/trpc/client", () => {
  const mutation = () => ({ isPending: false, error: state.mutationError, mutate: vi.fn(), mutateAsync: vi.fn() });
  return { trpc: {
    auth: { me: { useQuery: () => ({ data: { role: "USER" }, refetch: vi.fn() }) } },
    useUtils: () => ({ campaignDeliverable: { invalidate: vi.fn() }, campaignChangeRequest: { invalidate: vi.fn() } }),
    operator: { getOwn: { useQuery: () => state.operator }, list: { useQuery: () => ({ data: [], refetch: vi.fn() }) } },
    campaignDeliverable: { listForOperator: { useQuery: () => state.tasks }, update: { useMutation: mutation } },
    campaignChangeRequest: { listForDeliverable: { useQuery: () => state.tickets },
      resolve: { useMutation: mutation }, escalate: { useMutation: mutation }, create: { useMutation: mutation } },
  } };
});
import DeliverableDetailPage from "@/app/(console)/console/operate/africa-portfolio/deliverable/[id]/page";
import AfricaPortfolioPage from "@/app/(console)/console/operate/africa-portfolio/page";
const render = () => renderToStaticMarkup(createElement(DeliverableDetailPage));
beforeEach(() => {
  state.operator = { data: { id: "operator-fixture" }, refetch: vi.fn() };
  state.tasks = { data: [{ id: "task-fixture", taskCode: "FC-TEST-001.03", status: "TODO", rag: "GREEN",
    deliverableType: "POSTER_60x40", language: "FR", campaignId: "campaign-fixture",
    campaign: { id: "campaign-fixture", name: "Campagne synthétique", strategyId: "strategy-fixture" } }],
    refetch: vi.fn(), isLoading: false };
  state.tickets = { data: [], refetch: vi.fn(), isLoading: false };
  state.mutationError = null;
});
describe("réception du détail et des erreurs de reprise", () => {
  it("conserve le vrai code de tâche et le nom de campagne", () => {
    const html = render(); expect(html).toContain("FC-TEST-001.03"); expect(html).toContain("Campagne synthétique");
  });
  it("ne remplace pas un refus de liste des tickets par zéro ticket", () => {
    state.tickets = { data: undefined, error: new Error("Lecture des tickets refusée"), refetch: vi.fn() };
    const html = render(); expect(html).toContain("Lecture des tickets refusée");
    expect(html).toContain('role="alert"'); expect(html).not.toContain("Tickets modifs (0)");
  });
  it("n'annonce pas un livrable absent pendant le chargement", () => {
    state.tasks = { data: undefined, isLoading: true, refetch: vi.fn() };
    const html = render(); expect(html).toContain("Chargement du livrable"); expect(html).not.toContain("introuvable");
  });
  it("affiche une erreur de contexte au lieu de charger indéfiniment", () => {
    state.operator = { data: undefined, error: new Error("Équipe inaccessible"), refetch: vi.fn() };
    expect(render()).toContain("Équipe inaccessible");
  });
  it("rend visible une résolution ou une mise à jour refusée", () => {
    state.mutationError = new Error("Le ticket est déjà clôturé");
    expect(render()).toContain("Le ticket est déjà clôturé");
  });
  it("ne charge pas indéfiniment un compte sans équipe", () => {
    state.operator = { data: null, refetch: vi.fn() };
    expect(render()).toContain("Aucune équipe rattachée à ce compte");
    expect(renderToStaticMarkup(createElement(AfricaPortfolioPage))).toContain("Aucune équipe rattachée à ce compte");
  });
  it("le portefeuille affiche aussi un refus de contexte avec reprise", () => {
    state.operator = { data: undefined, error: new Error("Équipe inaccessible"), refetch: vi.fn() };
    const html = renderToStaticMarkup(createElement(AfricaPortfolioPage));
    expect(html).toContain("Équipe inaccessible"); expect(html).toContain("Réessayer la lecture");
  });
});
