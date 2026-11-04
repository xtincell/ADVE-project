// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrmSalesDesk } from "@/components/console/crm-sales-desk";

const calls = vi.hoisted(() => ({ deal: vi.fn(), prepare: vi.fn(), update: vi.fn(), invalidate: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "owner", name: "Responsable", role: "ADMIN" } } }) }));
vi.mock("@/components/console/crm-sales-payment", () => ({ CrmSalesPayment: () => null }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ crm: { invalidate: calls.invalidate }, strategy: { list: { invalidate: vi.fn() } } }),
  strategy: { list: { useQuery: () => ({ data: [{ id: "brand", name: "La marque", pillars: [] }, { id: "another-brand", name: "Autre marque", pillars: [] }] }) } },
  crm: {
    listDeals: { useQuery: () => ({ data: [{ id: "deal", sellerStrategyId: "brand", companyName: "Restaurant", contactName: "Client" }] }) },
    getDeal: { useQuery: ({ id }: { id: string }) => ({ data: id ? calls.deal() : undefined }) },
    listActivities: { useQuery: () => ({ data: [] }) },
    listSalesRepresentatives: { useQuery: () => ({ data: [] }) },
    salesRosterOptions: { useQuery: () => ({ data: { canManage: true, users: [] } }) },
    listSalesMessages: { useQuery: () => ({ data: [{ id: "question", direction: "IN", body: "J’ai besoin de deux établissements en France.", channel: "WEB", status: "RECEIVED", createdAt: "2026-11-04T10:00:00Z" }] }) },
    createDeal: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    updateDeal: { useMutation: () => ({ mutateAsync: calls.update, isPending: false }) },
    recordInboundSalesMessage: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    createSalesCustomerAccess: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    sendSalesCustomerMessage: { useMutation: () => ({ mutateAsync: vi.fn() }) },
    prepareSalesOffer: { useMutation: () => ({ mutateAsync: calls.prepare, isPending: false }) },
  },
} }));
const mandate = { offerId: "gold", offerVersion: "4", offerName: "Gold", terms: "Présence mensuelle approuvée.", amount: 0, currency: "XXX", sellerId: "owner", deliveryOwnerId: "owner", beneficiary: "La marque", expiresAt: "2026-12-30T16:00:00.000Z", paymentInstructions: "Paiement après accord.", channels: ["WEB"], pricingRule: { kind: "MARKET_TIER", tierKey: "RETAINER_BASE", countryCodes: ["CI", "FR"], maxQuantity: 3 } };
const deal = { id: "deal", sellerStrategyId: "brand", companyName: "Restaurant", contactName: "Client", revision: 7, commercial: { node: "QUALIFIED", need: "Deux établissements en France.", mandate } };
const proposal = { id: "00000000-0000-4000-8000-000000000001", offerId: "gold", offerName: "Gold", amount: 598, unitPrice: 299, currency: "EUR", billing: "MONTHLY", quantity: 2, countryCode: "FR", terms: mandate.terms, scope: [], exclusions: [], preparedAt: "2026-11-04T10:00:00Z", sourceVersion: "4", gloryOutputId: "quote" };
beforeEach(() => { vi.stubGlobal("React", React); vi.clearAllMocks(); window.history.replaceState({}, "", "/"); calls.deal.mockReturnValue(deal); calls.prepare.mockResolvedValue({ dealId: "deal", revision: 8, proposal }); calls.invalidate.mockResolvedValue(undefined); calls.update.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function selectDeal() { fireEvent.change(screen.getByLabelText("Affaire"), { target: { value: "deal" } }); fireEvent.change(screen.getByLabelText("Point de contact"), { target: { value: "WEB" } }); }

describe("the seller prepares a proposal from approved prices", () => {
  it("sends the customer's need, country and quantity without an editable price, then presents a separately prepared proposal", async () => {
    const view = render(React.createElement(CrmSalesDesk)); selectDeal();
    expect(screen.getByText(/Besoin du client/).parentElement?.textContent).toContain(deal.commercial.need);
    expect(screen.queryByText(/XXX/)).toBeNull(); expect(screen.queryByLabelText("Prix à proposer")).toBeNull();
    fireEvent.change(screen.getByLabelText("Pays du client"), { target: { value: "FR" } });
    fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Réponse client à l’origine de la demande (facultatif)"), { target: { value: "question" } });
    fireEvent.submit(screen.getByRole("form", { name: "Préparer la proposition du client" }));
    await waitFor(() => expect(calls.prepare).toHaveBeenCalledOnce());
    expect(calls.prepare.mock.calls[0]![0]).toMatchObject({ dealId: "deal", expectedRevision: 7, offerId: "gold", countryCode: "FR", quantity: 2, customerMessageId: "question" });
    expect(calls.prepare.mock.calls[0]![0]).not.toHaveProperty("amount"); expect(calls.update).not.toHaveBeenCalled();
    calls.deal.mockReturnValue({ ...deal, revision: 8, commercial: { ...deal.commercial, proposal } }); view.rerender(React.createElement(CrmSalesDesk));
    expect(screen.getByText(/Gold · 598.*par mois/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Présenter la proposition au client" }));
    await waitFor(() => expect(calls.update).toHaveBeenCalledOnce());
    expect(calls.update.mock.calls[0]![0]).toMatchObject({ dealId: "deal", salesStep: { expectedRevision: 8, channel: "WEB", command: { type: "PROPOSE" } } });
  });

  it("keeps the same preparation request after an uncertain response", async () => {
    calls.prepare.mockRejectedValueOnce(new Error("Réponse interrompue")).mockResolvedValueOnce({ dealId: "deal", revision: 8, proposal });
    render(React.createElement(CrmSalesDesk)); selectDeal();
    fireEvent.change(screen.getByLabelText("Pays du client"), { target: { value: "CI" } });
    const form = screen.getByRole("form", { name: "Préparer la proposition du client" }); fireEvent.submit(form);
    await screen.findByRole("button", { name: "Vérifier cette préparation" });
    expect((screen.getByLabelText("Pays du client") as HTMLSelectElement).disabled).toBe(false);
    expect(form.querySelector("fieldset")!.disabled).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(calls.prepare).toHaveBeenCalledTimes(2));
    expect(calls.prepare.mock.calls[1]![0]).toEqual(calls.prepare.mock.calls[0]![0]);
  });

  it("keeps a presented proposal unchanged while handling an objection", () => {
    calls.deal.mockReturnValue({ ...deal, commercial: { ...deal.commercial, node: "OBJECTION", proposal } });
    render(React.createElement(CrmSalesDesk)); selectDeal();
    expect(screen.getByRole("region", { name: "Proposition préparée" })).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Préparer la proposition du client" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Présenter la proposition au client" })).toBeNull();
    expect(calls.prepare).not.toHaveBeenCalled();
  });

  it("uses the current approved sales-tree choice to present a prepared proposal", async () => {
    const tree = { version: "1", start: "review", nodes: [
      { id: "review", prompt: "Le client souhaite-t-il cette proposition ?", choices: [{ id: "present", label: "Présenter la proposition préparée", next: "agreement", decision: { type: "PROPOSE" } }] },
      { id: "agreement", prompt: "Attendre l’accord du client.", choices: [{ id: "wait", label: "Attendre", next: "agreement" }] },
    ] };
    calls.deal.mockReturnValue({ ...deal, commercial: { ...deal.commercial, mandate: { ...mandate, conversationTree: tree }, treeNodeId: "review", proposal } });
    render(React.createElement(CrmSalesDesk)); selectDeal();
    fireEvent.click(screen.getByRole("button", { name: "Présenter la proposition au client" }));
    await waitFor(() => expect(calls.update).toHaveBeenCalledOnce());
    expect(calls.update.mock.calls[0]![0]).toMatchObject({ dealId: "deal", salesStep: { expectedRevision: 7, channel: "WEB", command: { type: "BRANCH", choiceId: "present", evidence: `Présentation de la proposition ${proposal.id}` } } });
  });

  it("does not bypass the sales tree when presentation belongs to a different step", () => {
    const tree = { version: "1", start: "clarify", nodes: [
      { id: "clarify", prompt: "Préciser le besoin avant de présenter.", choices: [{ id: "continue", label: "Le besoin est compris", next: "review" }] },
      { id: "review", prompt: "Présenter la proposition.", choices: [{ id: "present", label: "Présenter", next: "review", decision: { type: "PROPOSE" } }] },
    ] };
    calls.deal.mockReturnValue({ ...deal, commercial: { ...deal.commercial, mandate: { ...mandate, conversationTree: tree }, treeNodeId: "clarify", proposal } });
    render(React.createElement(CrmSalesDesk)); selectDeal();
    const button = screen.getByRole("button", { name: "Présenter la proposition au client" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Suivez l’étape courante de la conversation avant de présenter la proposition.")).toBeTruthy();
    fireEvent.click(button); expect(calls.update).not.toHaveBeenCalled();
  });

  it("starts with the linked brand and preserves a later choice by the seller", async () => {
    window.history.replaceState({}, "", "/console/socle/pipeline?strategy=brand");
    const view = render(React.createElement(CrmSalesDesk));
    await waitFor(() => expect((screen.getByLabelText("Marque vendeuse") as HTMLSelectElement).value).toBe("brand"));
    fireEvent.change(screen.getByLabelText("Marque vendeuse"), { target: { value: "another-brand" } });
    view.rerender(React.createElement(CrmSalesDesk));
    expect((screen.getByLabelText("Marque vendeuse") as HTMLSelectElement).value).toBe("another-brand");
  });
});
