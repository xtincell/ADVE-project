// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrmSalesPublicEntry } from "@/components/console/crm-sales-public-entry";

const calls = vi.hoisted(() => ({ query: vi.fn(), fetch: vi.fn(), save: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ crm: { getSalesPublicEntry: { fetch: calls.fetch }, invalidate: calls.invalidate } }),
  crm: {
    getSalesPublicEntry: { useQuery: calls.query },
    saveSalesPublicEntry: { useMutation: () => ({ mutateAsync: calls.save, isPending: false }) },
  },
} }));
const props = {
  strategyId: "owned-brand", brandName: "La marque", representative: { id: "seller", name: "Camille", status: "ACTIVE" },
  catalogue: [{ id: "gold", nom: "Gold", prix: 60000, conditionsTarifaires: "Présence mensuelle selon les conditions approuvées." }],
  offerVersion: "4", principals: [{ id: "owner", label: "Équipe de la marque" }], defaultPrincipalId: "owner", canManage: true,
};
const questionEntry = {
  strategyId: "owned-brand", representativeId: "seller", enabled: true, informationOnly: true,
  publicBrandName: "La marque publique", welcome: "Bonjour. Quelle est votre question ?", market: "Abidjan",
  maxConversationsPerDay: 10, maxConversationsPerHour: 5, publicId: "public-brand", revision: 2,
  offers: [{ offerId: "gold", offerVersion: "4", offerName: "Gold", terms: "Expliquer les services ; l’équipe doit confirmer les conditions.", currency: "XOF", deliveryOwnerId: "owner", expiresAt: "2026-12-30T16:00:00.000Z" }],
  humanContact: { name: "Alexandre", whatsapp: "237600000001" },
};
beforeEach(() => {
  vi.stubGlobal("React", React); vi.clearAllMocks();
  calls.query.mockReturnValue({ data: { entry: null, available: false }, isLoading: false, error: null });
  calls.fetch.mockResolvedValue({ entry: null }); calls.save.mockResolvedValue(undefined); calls.invalidate.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fill(container: HTMLElement, name: string, value: string) {
  fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } });
}

describe("the brand chooses what its public team may do", () => {
  it("publishes questions without inventing a price or payment instructions", async () => {
    const { container } = render(React.createElement(CrmSalesPublicEntry, props));
    fireEvent.click(screen.getByRole("button", { name: "Préparer l’accueil public" }));
    fireEvent.click(screen.getByLabelText("Répondre aux questions"));
    expect((screen.getByLabelText("Nom de la personne à contacter") as HTMLInputElement).value).toBe("");
    fill(container, "humanContactName", "Alexandre"); fill(container, "humanContactWhatsapp", "+237 6 00 00 00 01");
    expect(screen.queryByLabelText("Prix à proposer")).toBeNull();
    expect(screen.queryByLabelText("Entreprise qui reçoit le paiement")).toBeNull();
    expect(screen.queryByLabelText("Comment le client paie")).toBeNull();
    expect(screen.queryByLabelText("Permettre au vendeur de demander le paiement")).toBeNull();
    fireEvent.change(screen.getByLabelText("Offre du catalogue"), { target: { value: "gold" } });
    fill(container, "market", "Abidjan"); fill(container, "offer:0:currency", "XOF"); fill(container, "offer:0:expiry", "2026-12-30T16:00");
    fill(container, "offer:0:terms", "Expliquer les services ; l’équipe doit confirmer les conditions.");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer l’entrée publique de marque" }));
    expect(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" })).toBeTruthy();
    expect(screen.queryByText(/^Gold ·/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/J’autorise la publication de cet accueil et ces informations/));
    fireEvent.submit(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" }));
    await waitFor(() => expect(calls.save).toHaveBeenCalledOnce());
    const submitted = calls.save.mock.calls[0]![0];
    expect(submitted).toMatchObject({ informationOnly: true, collectionAttested: false, humanContact: { name: "Alexandre", whatsapp: "237600000001" }, offers: [{ offerId: "gold", currency: "XOF", deliveryOwnerId: "owner" }] });
    for (const key of ["amount", "beneficiary", "paymentInstructions", "collection"]) expect(submitted.offers[0]).not.toHaveProperty(key);
  });

  it("retains questions-only permission when closing new admissions", async () => {
    calls.query.mockReturnValue({ data: { entry: questionEntry, available: true }, isLoading: false, error: null });
    calls.fetch.mockResolvedValue({ entry: questionEntry });
    render(React.createElement(CrmSalesPublicEntry, props));
    expect(screen.getByText("Répondre aux questions")).toBeTruthy();
    expect(screen.queryByText(/Paiement à configurer/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fermer aux nouveaux visiteurs" }));
    await waitFor(() => expect(calls.save).toHaveBeenCalledOnce());
    expect(calls.save.mock.calls[0]![0]).toMatchObject({ informationOnly: true, enabled: false, expectedRevision: 2, humanContact: questionEntry.humanContact, offers: questionEntry.offers });
  });

  it("brings back sales conditions when the owner switches from questions to offers", () => {
    calls.query.mockReturnValue({ data: { entry: questionEntry, available: true }, isLoading: false, error: null });
    render(React.createElement(CrmSalesPublicEntry, props));
    fireEvent.click(screen.getByRole("button", { name: "Modifier l’accueil" }));
    expect((screen.getByLabelText("Nom de la personne à contacter") as HTMLInputElement).value).toBe("Alexandre");
    expect((screen.getByLabelText("Numéro WhatsApp avec indicatif pays") as HTMLInputElement).value).toBe("237600000001");
    expect((screen.getByLabelText("Répondre aux questions") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Prix à proposer")).toBeNull();
    fireEvent.click(screen.getByLabelText("Proposer des offres"));
    expect((screen.getByLabelText("Prix à proposer") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Entreprise qui reçoit le paiement") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Comment le client paie") as HTMLTextAreaElement).required).toBe(true);
    expect(calls.save).not.toHaveBeenCalled();
  });

  it("associates the chosen catalogue offer with an existing country tariff without sending a guessed price", async () => {
    const { container } = render(React.createElement(CrmSalesPublicEntry, props));
    fireEvent.click(screen.getByRole("button", { name: "Préparer l’accueil public" }));
    fireEvent.change(screen.getByLabelText("Offre du catalogue"), { target: { value: "gold" } });
    fireEvent.change(screen.getByLabelText("Comment fixer le prix ?"), { target: { value: "MARKET_TIER" } });
    fireEvent.change(screen.getByLabelText("Formule de référence"), { target: { value: "RETAINER_BASE" } });
    fireEvent.change(screen.getByLabelText(/Pays autorisés/), { target: { value: "CI, FR" } });
    fireEvent.change(screen.getByLabelText("Quantité maximum"), { target: { value: "3" } });
    expect(screen.queryByLabelText("Prix à proposer")).toBeNull(); expect(screen.queryByLabelText("Devise")).toBeNull();
    fill(container, "market", "Équipes en Côte d’Ivoire et en France"); fill(container, "offer:0:expiry", "2026-12-30T16:00");
    fill(container, "offer:0:beneficiary", "La marque"); fill(container, "offer:0:payment", "Paiement après accord sur la proposition.");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer l’entrée publique de marque" }));
    expect(screen.getByText(/Tarif calculé selon le pays · CI, FR · 3 unités maximum/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/J’autorise la publication de cet accueil et ces offres/));
    fireEvent.submit(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" }));
    await waitFor(() => expect(calls.save).toHaveBeenCalledOnce());
    const offer = calls.save.mock.calls[0]![0].offers[0];
    expect(offer).toMatchObject({ offerId: "gold", pricingRule: { kind: "MARKET_TIER", tierKey: "RETAINER_BASE", countryCodes: ["CI", "FR"], maxQuantity: 3 } });
    expect(offer).not.toHaveProperty("amount"); expect(offer).not.toHaveProperty("currency");
  });

  it("requires the owner to choose the treatment of taxes and preserves an explicit rate and exclusions", async () => {
    const { container } = render(React.createElement(CrmSalesPublicEntry, props));
    fireEvent.click(screen.getByRole("button", { name: "Préparer l’accueil public" }));
    fireEvent.change(screen.getByLabelText("Offre du catalogue"), { target: { value: "gold" } });
    const taxChoice = screen.getByLabelText("Comment les taxes sont-elles prises en compte ?") as HTMLSelectElement;
    expect(taxChoice.value).toBe("UNSPECIFIED"); expect(screen.queryByLabelText("Taux de taxe approuvé (%)")).toBeNull();
    fireEvent.change(taxChoice, { target: { value: "EXCLUDED" } });
    fireEvent.change(screen.getByLabelText("Taux de taxe approuvé (%)"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Ce prix correspond à"), { target: { value: "MONTHLY" } });
    fireEvent.change(screen.getByLabelText("Prestations non incluses (facultatif)"), { target: { value: "Achat média\nProduction vidéo" } });
    fill(container, "market", "Abidjan"); fill(container, "offer:0:currency", "XOF"); fill(container, "offer:0:expiry", "2026-12-30T16:00");
    fill(container, "offer:0:beneficiary", "La marque"); fill(container, "offer:0:payment", "Paiement après accord sur la proposition.");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer l’entrée publique de marque" }));
    expect(screen.getByText("Prix hors taxes · taxe ajoutée : 18 %")).toBeTruthy();
    expect(screen.getByText("Non inclus : Achat média ; Production vidéo")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/J’autorise la publication de cet accueil et ces offres/));
    fireEvent.submit(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" }));
    await waitFor(() => expect(calls.save).toHaveBeenCalledOnce());
    expect(calls.save.mock.calls[0]![0].offers[0]).toMatchObject({ amount: 60000, currency: "XOF", billing: "MONTHLY", taxTreatment: "EXCLUDED", taxRatePct: 18, exclusions: ["Achat média", "Production vidéo"] });
  });

  it("reviews and saves the chosen CinetPay account without inventing a server attestation", async () => {
    const entry = { ...questionEntry, informationOnly: false, offers: [{ ...questionEntry.offers[0], amount: 60000, beneficiary: "La marque", paymentInstructions: "Paiement après accord.", collection: { mode: "MANUAL", destinationRef: "Ancien compte", financeOwnerId: "owner" } }] };
    calls.query.mockReturnValue({ data: { entry, available: true }, isLoading: false, error: null }); calls.fetch.mockResolvedValue({ entry });
    const { container } = render(React.createElement(CrmSalesPublicEntry, { ...props, principals: [...props.principals, { id: "mcp:robot", label: "Vendeur IA" }] }));
    fireEvent.click(screen.getByRole("button", { name: "Modifier l’accueil" }));
    expect((screen.getByLabelText("Comment le client peut-il payer ?") as HTMLSelectElement).value).toBe("MANUAL");
    fireEvent.change(screen.getByLabelText("Comment le client peut-il payer ?"), { target: { value: "CINETPAY" } });
    fireEvent.change(screen.getByLabelText("Nom exact du compte CinetPay configuré"), { target: { value: "Compte commercial vérifié" } });
    expect(screen.getByLabelText("Personne chargée du suivi en cas d’incident").querySelector('option[value="mcp:robot"]')).toBeNull();
    fireEvent.click(screen.getByLabelText(/Je confirme les entreprises bénéficiaires/));
    fireEvent.submit(screen.getByRole("form", { name: "Préparer l’entrée publique de marque" }));
    expect(screen.getByText(/Paiement en ligne CinetPay · Paiement à La marque · Compte commercial vérifié/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/J’autorise la publication de cet accueil et ces offres/)); fireEvent.submit(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" }));
    await waitFor(() => expect(calls.save).toHaveBeenCalledOnce());
    const collection = calls.save.mock.calls[0]![0].offers[0].collection;
    expect(collection).toEqual({ mode: "CINETPAY", destinationRef: "Compte commercial vérifié", financeOwnerId: "owner" });
    expect(collection).not.toHaveProperty("providerAccountHash"); expect(collection).not.toHaveProperty("attestedBy");
    expect(container.textContent).not.toContain("clé API");
  });
});
