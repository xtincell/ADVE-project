// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SalesCustomerChat } from "@/components/console/sales-customer-chat";

vi.mock("@/components/shared/markdown-content", () => ({ MarkdownContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
const conversation = { brand: "Marque de recette", sellerMode: "AI", state: "DISCOVERY", offer: { name: "Gold", terms: "Présence mensuelle, sans promesse de réservation.", amount: 60000, currency: "XOF", paymentInstructions: "Versement au compte attesté de la marque." }, messages: [{ id: "first", role: "customer", body: "Je voudrais connaître vos possibilités.", at: "2026-11-04T10:00:00Z" }], stopped: false };
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function serve(value: unknown) { vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => value }))); }

describe("the private dossier continues the public sales conversation", () => {
  it("does not display the internal default offer as a proposal before the seller has presented one", async () => {
    serve(conversation); render(React.createElement(SalesCustomerChat, { token: "a".repeat(64) }));
    await screen.findByText("Je voudrais connaître vos possibilités.");
    expect(screen.queryByText(/Gold/)).toBeNull();
    expect(screen.queryByText(conversation.offer.terms)).toBeNull();
    expect(screen.getByText(/Assistant commercial IA/)).toBeTruthy();
  });

  it("shows the actual proposal and preserves the independently confirmed payment status", async () => {
    serve({ ...conversation, state: "PAID", payment: { reference: "sales-receipt", status: "PAID", amount: 60000, currency: "XOF", beneficiary: "La marque locale", paidAt: "2026-11-04T11:00:00Z" } });
    render(React.createElement(SalesCustomerChat, { token: "b".repeat(64) }));
    await screen.findByText(conversation.offer.terms);
    expect(screen.getByText(/Gold/)).toBeTruthy(); expect(screen.getByText(conversation.offer.paymentInstructions)).toBeTruthy();
    expect(screen.getByText("Paiement vérifié par l’équipe.")).toBeTruthy();
    expect(screen.getByText("sales-receipt")).toBeTruthy();
  });

  it("identifies a human team and keeps a received stop request visible", async () => {
    serve({ ...conversation, sellerMode: "HUMAN", stopped: true, replyStatus: "TEAM_REVIEW" }); render(React.createElement(SalesCustomerChat, { token: "c".repeat(64) }));
    await screen.findByText("Votre demande d’arrêt est enregistrée. L’équipe ne vous relance plus.");
    expect(screen.getByText("Votre conversation privée avec l’équipe")).toBeTruthy();
    expect(screen.queryByText(/Assistant commercial IA/)).toBeNull();
    expect(screen.queryByText("Votre message est reçu. L’équipe peut reprendre cet échange.")).toBeNull();
  });

  it("shows a received message awaiting team review without claiming that an answer is being prepared", async () => {
    serve({ ...conversation, replyStatus: "TEAM_REVIEW" }); render(React.createElement(SalesCustomerChat, { token: "d".repeat(64) }));
    await screen.findByText("Votre message est reçu. L’équipe peut reprendre cet échange.");
    expect(screen.queryByText("Votre interlocuteur prépare sa réponse.")).toBeNull();
    expect(screen.queryByText(/répondra|sous 24|dans quelques/)).toBeNull();
  });

  it("keeps a questions-only conversation free of an offer price and payment card even if unused offer fields are present", async () => {
    serve({ ...conversation, state: "PROPOSAL", informationOnly: true }); render(React.createElement(SalesCustomerChat, { token: "e".repeat(64) }));
    await screen.findByText("L’équipe doit confirmer les prestations et les conditions avant toute souscription.");
    expect(screen.queryByText(/Gold/)).toBeNull(); expect(screen.queryByText(conversation.offer.terms)).toBeNull();
    expect(screen.queryByLabelText("Paiement de l’affaire")).toBeNull();
  });

  it("shows the frozen proposal and sends a bounded confirmation of that exact version without claiming a payment", async () => {
    const token = "f".repeat(64);
    const proposal = { id: "00000000-0000-4000-8000-000000000001", offerId: "gold", offerName: "Gold", amount: 120000, unitPrice: 60000, currency: "XOF", billing: "MONTHLY", quantity: 2, countryCode: "CI", terms: "C".repeat(4000), scope: ["Deux établissements"], exclusions: ["Achat média"], preparedAt: "2026-11-04T10:00:00Z", sourceVersion: "catalogue-4", gloryOutputId: "quote", documentUrl: `/api/sales/${token}/proposal` };
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { received: true } : { ...conversation, state: "PROPOSAL", proposal } }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token }));
    await screen.findByRole("button", { name: "Confirmer cette proposition" });
    expect(screen.getByText(/Gold · 120.?000.*par mois/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ouvrir le devis" }).getAttribute("href")).toBe(proposal.documentUrl);
    expect(screen.queryByText(conversation.offer.terms)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirmer cette proposition" }));
    await screen.findByText("Votre confirmation a été transmise à l’équipe.");
    const sent = JSON.parse(String(fetcher.mock.calls.find(call => call[1]?.method === "POST")![1]!.body));
    expect(sent.proposalId).toBe(proposal.id); expect(sent.body).toContain("120"); expect(sent.body).toContain("XOF"); expect(sent.body).toContain("par mois"); expect(sent.body).toContain(`J’accepte les conditions de la proposition ${proposal.id}`);
    expect(sent.body.length).toBeLessThan(4000); expect(sent.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(screen.queryByText("Paiement vérifié par l’équipe.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmer cette proposition" })).toBeNull();
  });

  it("retries the same proposal confirmation after an uncertain send", async () => {
    const token = "9".repeat(64);
    const proposal = { id: "00000000-0000-4000-8000-000000000002", offerId: "gold", offerName: "Gold", amount: 60000, unitPrice: 60000, currency: "XOF", billing: "MONTHLY", quantity: 1, countryCode: "CI", terms: "Conditions approuvées.", scope: [], exclusions: [], preparedAt: "2026-11-04T10:00:00Z", sourceVersion: "4", gloryOutputId: "quote", documentUrl: `/api/sales/${token}/proposal` };
    let attempts = 0;
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? { ok: ++attempts > 1, json: async () => ({ received: true }) } : { ok: true, json: async () => ({ ...conversation, state: "PROPOSAL", proposal }) });
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmer cette proposition" }));
    fireEvent.click(await screen.findByRole("button", { name: "Vérifier l’envoi" }));
    await waitFor(() => expect(screen.getByText("Votre confirmation a été transmise à l’équipe.")).toBeTruthy());
    const sent = fetcher.mock.calls.filter(call => call[1]?.method === "POST");
    expect(sent).toHaveLength(2); expect(sent[1]![1]!.body).toBe(sent[0]![1]!.body);
  });
});
