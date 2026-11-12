// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CrmSalesPortfolio, SalesPortfolioAuthorizationForm } from "@/components/console/crm-sales-portfolio";
import { authorizeSalesPortfolioInput, type AuthorizeSalesPortfolioInput } from "@/server/services/crm-engine/portfolio-contract";

const queries = vi.hoisted(() => ({ list: vi.fn(), authorize: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ crm: { invalidate: queries.invalidate } }), crm: {
    listAuthorizedSalesPortfolios: { useQuery: queries.list },
    authorizeSalesPortfolio: { useMutation: () => ({ mutateAsync: queries.authorize }) },
  },
} }));
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const props = {
  strategyId: "owned-brand", representative: { id: "owned-seller", name: "Camille", status: "ACTIVE", mode: "AI", dailyTokenBudget: 150000, dailyRunLimit: 10, maxTurns: 12 },
  catalogue: [{ id: "gold", nom: "Gold", prix: 60000, conditionsTarifaires: "Présence mensuelle, sans garantie de réservation." }],
  offerVersion: "4", principals: [{ id: "owner", label: "Responsable de marque" }, { id: "finance", label: "Responsable finance" }], defaultPrincipalId: "owner",
};
function fill(container: HTMLElement, name: string, value: string) {
  const input = container.querySelector(`[name="${name}"]`)!;
  fireEvent.change(input, { target: { value } });
}
function prepare(container: HTMLElement) {
  fireEvent.change(screen.getByLabelText("Offre du catalogue"), { target: { value: "gold" } });
  fill(container, "currency", "XOF"); fill(container, "expiry", "2026-12-30T16:00");
  fill(container, "beneficiary", "La marque locale"); fill(container, "payment", "Versement sur le compte de la marque, référence de l’affaire obligatoire.");
  fill(container, "destinationRef", "Compte de collecte de la marque"); fill(container, "financeOwner", "finance");
  fill(container, "market", "Abidjan, Côte d’Ivoire"); fill(container, "sourceLabel", "Rencontres du salon"); fill(container, "sourceReference", "Dossier salon / fiches reçues"); fill(container, "eligibilityBasis", "Ces restaurateurs ont demandé une proposition commerciale après notre échange au salon.");
  fill(container, "origin:0", "salon-fiche-12"); fill(container, "company:0", "Restaurant A"); fill(container, "contact:0", "Personne A"); fill(container, "email:0", "a@example.test");
  fill(container, "firstContactAt", "2026-12-03T10:00"); fill(container, "followUps", "3, 7"); fill(container, "dailyOutboundLimit", "2"); fill(container, "minIntervalHours", "24");
  fireEvent.click(container.querySelector('input[name="outboundEmail"]')!);
}
describe("one reviewed authorization for an explicit portfolio", () => {
  it("reviews each person's own coordinates and the common commitment before creating anything", async () => {
    const authorize = vi.fn(async (_input: AuthorizeSalesPortfolioInput) => undefined);
    const onClose = vi.fn();
    const { container } = render(React.createElement(SalesPortfolioAuthorizationForm, { ...props, authorize, onClose }));
    prepare(container);
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un contact" }));
    fill(container, "origin:1", "salon-fiche-18"); fill(container, "company:1", "Restaurant B"); fill(container, "contact:1", "Personne B"); fill(container, "phone:1", "+225000000002");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer les contacts à confier" }));
    expect(authorize).not.toHaveBeenCalled();
    expect(screen.getByText("2 contacts choisis")).toBeTruthy();
    expect(screen.getByText("a@example.test")).toBeTruthy(); expect(screen.getByText("+225000000002")).toBeTruthy();
    expect(screen.getByText(/Temps d’attente entre les relances : 3 jours, puis 7 jours, depuis le dernier envoi confirmé/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Je confirme que l’entreprise bénéficiaire/)); fireEvent.click(screen.getByLabelText(/Je confie ces personnes au vendeur/));
    fireEvent.submit(screen.getByRole("form", { name: "Confier les contacts au vendeur" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const submitted = authorizeSalesPortfolioInput.parse(authorize.mock.calls[0]![0]);
    expect(submitted.mandate).toMatchObject({ offerId: "gold", offerVersion: "4", amount: 60000, currency: "XOF", beneficiary: "La marque locale", collection: { destinationRef: "Compte de collecte de la marque", financeOwnerId: "finance" } });
    expect(submitted.members).toEqual([
      { originKey: "salon-fiche-12", companyName: "Restaurant A", contactName: "Personne A", contactEmail: "a@example.test" },
      { originKey: "salon-fiche-18", companyName: "Restaurant B", contactName: "Personne B", contactPhone: "+225000000002" },
    ]);
    expect(submitted.mandate).not.toHaveProperty("sellerId"); expect(submitted.mandate).not.toHaveProperty("intakePaymentReference");
  });
  it("rechecks the exact authorization after an uncertain result instead of creating another request", async () => {
    const authorize = vi.fn<(input: AuthorizeSalesPortfolioInput) => Promise<void>>().mockRejectedValueOnce(new Error("Connexion interrompue")).mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    const { container } = render(React.createElement(SalesPortfolioAuthorizationForm, { ...props, authorize, onClose })); prepare(container);
    fireEvent.submit(screen.getByRole("form", { name: "Préparer les contacts à confier" }));
    fireEvent.click(screen.getByLabelText(/Je confirme que l’entreprise bénéficiaire/)); fireEvent.click(screen.getByLabelText(/Je confie ces personnes au vendeur/));
    fireEvent.submit(screen.getByRole("form", { name: "Confier les contacts au vendeur" }));
    await screen.findByRole("button", { name: "Vérifier cet envoi" });
    expect((screen.getByRole("button", { name: "Modifier les contacts ou les conditions" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole("form", { name: "Confier les contacts au vendeur" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(authorize).toHaveBeenCalledTimes(2); expect(authorize.mock.calls[1]![0]).toEqual(authorize.mock.calls[0]![0]);
  });
  it("requires a distinct source identity and usable contact coordinates before review", () => {
    const authorize = vi.fn(async (_input: AuthorizeSalesPortfolioInput) => undefined);
    const { container } = render(React.createElement(SalesPortfolioAuthorizationForm, { ...props, authorize, onClose: vi.fn() })); prepare(container);
    fill(container, "email:0", "");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer les contacts à confier" }));
    expect(screen.getByRole("alert").textContent).toContain("Un téléphone ou un email réel est nécessaire");
    expect(screen.queryByRole("form", { name: "Confier les contacts au vendeur" })).toBeNull(); expect(authorize).not.toHaveBeenCalled();
  });
  it("reads the authorized snapshot and actual next action on a fresh mount without reauthorizing", () => {
    queries.list.mockReturnValue({ isLoading: false, error: null, data: [{ receipt: {
      requestId: "00000000-0000-4000-8000-000000000001", intentId: "intent", strategyId: "owned-brand", representativeId: "owned-seller", representativeName: "Camille", authorizedBy: "owner", authorizedAt: "2026-11-02T10:00:00.000Z", market: "Abidjan", source: { label: "Salon", reference: "Fiches salon", eligibilityBasis: "Demande de proposition au salon." },
      mandate: { offerId: "gold", offerVersion: "4", offerName: "Gold", terms: "Anciennes conditions approuvées et conservées.", amount: 60000, currency: "XOF", sellerId: "mcp:owned", deliveryOwnerId: "owner", beneficiary: "La marque", expiresAt: "2026-12-30T16:00:00.000Z", paymentInstructions: "Instructions approuvées", channels: ["EMAIL"], outreachPolicy: { firstContactAt: "2026-12-03T10:00:00.000Z", followUpAfterDays: [], dailyOutboundLimit: 2, minIntervalHours: 24 }, collection: { mode: "MANUAL", destinationRef: "Compte approuvé", financeOwnerId: "finance", attestedBy: "owner", attestedAt: "2026-11-02T10:00:00.000Z" } },
      members: [{ originKey: "fiche-12", companyName: "Restaurant A", contactName: "Personne A", contactEmail: "a@example.test", dealId: "owned-deal", initialRunId: "run" }],
    }, outcomes: [{ dealId: "owned-deal", stage: "LEAD", node: "QUALIFIED", nextAction: "Préparer la proposition demandée par le client.", nextDeadline: "2026-12-04T10:00:00.000Z", contactStopped: false, runStatus: "DONE" }] }] });
    render(React.createElement(CrmSalesPortfolio, { ...props, catalogue: [{ id: "gold", nom: "Gold", prix: 90000, conditionsTarifaires: "Nouvelle proposition non approuvée." }], offerVersion: "5", canManage: false }));
    expect(screen.getByText("Préparer la proposition demandée par le client.")).toBeTruthy();
    expect(screen.getByText("Anciennes conditions approuvées et conservées.")).toBeTruthy();
    expect(screen.queryByText("Nouvelle proposition non approuvée.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Choisir les contacts" })).toBeNull();
    expect(queries.authorize).not.toHaveBeenCalled();
  });

  it("uses the shared CinetPay selection in the reviewed authorization and its retry body", async () => {
    const authorize = vi.fn<(input: AuthorizeSalesPortfolioInput) => Promise<void>>().mockRejectedValueOnce(new Error("Réponse interrompue")).mockResolvedValueOnce(undefined);
    const { container } = render(React.createElement(SalesPortfolioAuthorizationForm, { ...props, authorize, onClose: vi.fn() })); prepare(container);
    fireEvent.change(screen.getByLabelText("Comment le client peut-il payer ?"), { target: { value: "CINETPAY" } });
    fill(container, "destinationRef", "Compte commercial vérifié");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer les contacts à confier" }));
    expect(within(screen.getByRole("form", { name: "Confier les contacts au vendeur" })).getByText(/Paiement en ligne CinetPay/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Je confirme que l’entreprise bénéficiaire/)); fireEvent.click(screen.getByLabelText(/Je confie ces personnes au vendeur/));
    fireEvent.submit(screen.getByRole("form", { name: "Confier les contacts au vendeur" }));
    fireEvent.click(await screen.findByRole("button", { name: "Vérifier cet envoi" }));
    await waitFor(() => expect(authorize).toHaveBeenCalledTimes(2));
    expect(authorize.mock.calls[1]![0]).toEqual(authorize.mock.calls[0]![0]);
    expect(authorize.mock.calls[0]![0].mandate.collection).toEqual({ mode: "CINETPAY", destinationRef: "Compte commercial vérifié", financeOwnerId: "finance" });
  });
});
