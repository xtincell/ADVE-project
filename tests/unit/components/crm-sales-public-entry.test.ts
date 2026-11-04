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
    expect(screen.queryByLabelText("Prix à proposer")).toBeNull();
    expect(screen.queryByLabelText("Entreprise qui reçoit le paiement")).toBeNull();
    expect(screen.queryByLabelText("Comment le client paie")).toBeNull();
    expect(screen.queryByLabelText("Permettre au vendeur de demander le paiement")).toBeNull();
    fireEvent.change(screen.getByLabelText("Offre du catalogue"), { target: { value: "gold" } });
    fill(container, "market", "Abidjan"); fill(container, "offer:0:currency", "XOF"); fill(container, "offer:0:expiry", "2026-12-30T16:00");
    fill(container, "offer:0:terms", "Expliquer les services ; l’équipe doit confirmer les conditions.");
    fireEvent.submit(screen.getByRole("form", { name: "Préparer l’entrée publique de marque" }));
    expect(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" })).toBeTruthy();
    expect(screen.queryByText(/60.?000/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/J’autorise la publication de cet accueil et ces informations/));
    fireEvent.submit(screen.getByRole("form", { name: "Approuver l’entrée publique de marque" }));
    await waitFor(() => expect(calls.save).toHaveBeenCalledOnce());
    const submitted = calls.save.mock.calls[0]![0];
    expect(submitted).toMatchObject({ informationOnly: true, collectionAttested: false, offers: [{ offerId: "gold", currency: "XOF", deliveryOwnerId: "owner" }] });
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
    expect(calls.save.mock.calls[0]![0]).toMatchObject({ informationOnly: true, enabled: false, expectedRevision: 2, offers: questionEntry.offers });
  });

  it("brings back sales conditions when the owner switches from questions to offers", () => {
    calls.query.mockReturnValue({ data: { entry: questionEntry, available: true }, isLoading: false, error: null });
    render(React.createElement(CrmSalesPublicEntry, props));
    fireEvent.click(screen.getByRole("button", { name: "Modifier l’accueil" }));
    expect((screen.getByLabelText("Répondre aux questions") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByLabelText("Prix à proposer")).toBeNull();
    fireEvent.click(screen.getByLabelText("Proposer des offres"));
    expect((screen.getByLabelText("Prix à proposer") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Entreprise qui reçoit le paiement") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Comment le client paie") as HTMLTextAreaElement).required).toBe(true);
    expect(calls.save).not.toHaveBeenCalled();
  });
});
