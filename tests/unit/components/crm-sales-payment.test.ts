// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrmSalesPayment } from "@/components/console/crm-sales-payment";

const calls = vi.hoisted(() => ({ list: vi.fn(), request: vi.fn(), reconcile: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/trpc/client", () => ({ trpc: {
  useUtils: () => ({ crm: { invalidate: calls.invalidate } }), crm: {
    listCommercialPaymentRequests: { useQuery: calls.list },
    requestSalesPayment: { useMutation: () => ({ mutateAsync: calls.request, isPending: false }) },
    reconcileSalesPayment: { useMutation: () => ({ mutateAsync: calls.reconcile, isPending: false }) },
  },
} }));
const request = { dealId: "owned-deal", companyName: "Restaurant", contactName: "Client", offerName: "Gold", amount: 60000, currency: "XOF", reference: "vente-unique", status: "PENDING", beneficiary: "La marque", destinationRef: "Compte de la marque", paymentInstructions: "Indiquer la référence de l’affaire.", paidAt: null, canReconcile: true };
beforeEach(() => {
  vi.stubGlobal("React", React); vi.clearAllMocks(); calls.invalidate.mockResolvedValue(undefined); calls.reconcile.mockResolvedValue(request);
  calls.list.mockReturnValue({ data: [request], isLoading: false, error: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const props = { dealId: "owned-deal", strategyId: "owned-brand", revision: 2, node: "ACCEPTED", canRequest: true };
function fill(container: HTMLElement, name: string, value: string) { fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } }); }
function fillProof(container: HTMLElement) {
  fill(container, "amount", "60000"); fill(container, "externalReference", "RELEVE-2026-11-02-12"); fill(container, "evidence", "Montant et devise vérifiés sur le relevé indépendant de la banque.");
}
describe("sales payment supervision", () => {
  it("shows the payment destination without offering reconciliation to an unauthorized person", () => {
    calls.list.mockReturnValue({ data: [{ ...request, canReconcile: false }], isLoading: false, error: null });
    render(React.createElement(CrmSalesPayment, props));
    expect(screen.getByText("vente-unique")).toBeTruthy();
    expect(screen.queryByText("Vérifier un paiement reçu")).toBeNull(); expect(calls.reconcile).not.toHaveBeenCalled();
    expect(screen.getByText("La personne désignée doit vérifier le paiement.")).toBeTruthy();
  });
  it("submits the independently entered amount in major units and waits for the server's financial state", async () => {
    const { container } = render(React.createElement(CrmSalesPayment, props)); fillProof(container);
    fireEvent.submit(container.querySelector('form[aria-label="Vérifier un paiement reçu"]')!);
    await waitFor(() => expect(calls.invalidate).toHaveBeenCalledOnce());
    expect(calls.reconcile.mock.calls[0]![0]).toMatchObject({ dealId: "owned-deal", observedAmount: 60000, currency: "XOF", externalReference: "RELEVE-2026-11-02-12", evidence: "Montant et devise vérifiés sur le relevé indépendant de la banque." });
    expect(screen.queryByText("Paiement vérifié")).toBeNull(); expect(screen.getByText("Paiement à vérifier")).toBeTruthy();
  });
  it("reuses the exact reconciliation receipt after an interrupted response", async () => {
    calls.reconcile.mockRejectedValueOnce(new Error("Résultat inconnu")).mockResolvedValueOnce(request);
    const { container } = render(React.createElement(CrmSalesPayment, props)); fillProof(container);
    const form = container.querySelector('form[aria-label="Vérifier un paiement reçu"]')!;
    fireEvent.submit(form);
    await waitFor(() => expect(container.textContent).toContain("Vérifier ce paiement"));
    expect(container.querySelector("fieldset")!.disabled).toBe(true);
    fireEvent.submit(form);
    await waitFor(() => expect(calls.invalidate).toHaveBeenCalledOnce());
    expect(calls.reconcile).toHaveBeenCalledTimes(2); expect(calls.reconcile.mock.calls[1]![0]).toEqual(calls.reconcile.mock.calls[0]![0]);
  });
  it("keeps the same receipt when reconciliation succeeds but refreshing the page data fails", async () => {
    calls.invalidate.mockRejectedValueOnce(new Error("Actualisation interrompue")).mockResolvedValueOnce(undefined);
    const { container } = render(React.createElement(CrmSalesPayment, props)); fillProof(container);
    const form = container.querySelector('form[aria-label="Vérifier un paiement reçu"]')!;
    fireEvent.submit(form);
    await waitFor(() => expect(container.textContent).toContain("Vérifier ce paiement"));
    fireEvent.submit(form);
    await waitFor(() => expect(calls.invalidate).toHaveBeenCalledTimes(2));
    expect(calls.reconcile.mock.calls[1]![0]).toEqual(calls.reconcile.mock.calls[0]![0]);
  });
});
