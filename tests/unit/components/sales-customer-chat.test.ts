// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SalesCustomerChat, salesCheckoutUrl } from "@/components/console/sales-customer-chat";

vi.mock("@/components/shared/markdown-content", () => ({ MarkdownContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
const conversation = { brand: "Marque de recette", sellerMode: "AI", state: "DISCOVERY", offer: { name: "Gold", terms: "Présence mensuelle, sans promesse de réservation.", amount: 60000, currency: "XOF", paymentInstructions: "Versement au compte attesté de la marque." }, messages: [{ id: "first", role: "customer", body: "Je voudrais connaître vos possibilités.", at: "2026-11-04T10:00:00Z" }], stopped: false };
const payableProposal = { id: "00000000-0000-4000-8000-000000000009", offerId: "gold", offerName: "Gold", amount: 60000, unitPrice: 60000, currency: "XOF", billing: "MONTHLY", quantity: 1, countryCode: "CI", terms: "Conditions approuvées.", scope: [], exclusions: [], preparedAt: "2026-11-05T10:00:00Z", sourceVersion: "4", gloryOutputId: "quote", documentUrl: `/api/sales/${"1".repeat(64)}/proposal` };
const checkout = { available: true, provider: "CINETPAY", beneficiary: "La marque locale", requiresEmail: true };
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function serve(value: unknown) { vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => value }))); }

describe("the private dossier continues the public sales conversation", () => {
  it("does not display the internal default offer as a proposal before the seller has presented one", async () => {
    serve(conversation); render(React.createElement(SalesCustomerChat, { token: "a".repeat(64) }));
    await screen.findByText("Je voudrais connaître vos possibilités.");
    expect(screen.queryByText(/Gold/)).toBeNull();
    expect(screen.queryByText(conversation.offer.terms)).toBeNull();
    expect(screen.getByText(/Assistant commercial IA/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Échanger avec .* sur WhatsApp/ })).toBeNull();
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
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { received: true } : { ...conversation, state: "PROPOSAL", proposal, humanContact: { name: "Alexandre", whatsapp: "237600000001", whatsappUrl: "https://wa.me/237600000001" } } }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token }));
    await screen.findByRole("button", { name: "Confirmer cette proposition" });
    expect(screen.getByText(/Gold · 120.?000.*par mois/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ouvrir le devis" }).getAttribute("href")).toBe(proposal.documentUrl);
    expect(screen.getByRole("link", { name: "Télécharger le devis en Markdown" }).getAttribute("href")).toBe(proposal.documentUrl + "?format=md");
    const whatsapp = new URL(screen.getByRole("link", { name: "Échanger avec Alexandre sur WhatsApp" }).getAttribute("href")!);
    expect(whatsapp.searchParams.get("text")).toContain(proposal.id);
    expect(whatsapp.searchParams.get("text")).toContain(conversation.brand);
    expect(whatsapp.href).not.toContain(token); expect(whatsapp.searchParams.get("text")).not.toContain(conversation.messages[0]!.body);
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

  it("allows contact during a questions-only exchange without copying the private link or a customer message", async () => {
    serve({ ...conversation, informationOnly: true, humanContact: { name: "Équipe de la marque", whatsapp: "225000000001", whatsappUrl: "https://wa.me/225000000001" } });
    const token = "7".repeat(64); render(React.createElement(SalesCustomerChat, { token }));
    const link = await screen.findByRole("link", { name: "Échanger avec Équipe de la marque sur WhatsApp" });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://wa.me/225000000001");
    expect(url.searchParams.get("text")).toBe(`Bonjour Équipe de la marque, je vous contacte au sujet de ${conversation.brand}.`);
    expect(url.href).not.toContain(token); expect(url.searchParams.get("text")).not.toContain(conversation.messages[0]!.body);
    expect(screen.queryByRole("link", { name: "Télécharger le devis en Markdown" })).toBeNull();
  });

  it("opens the exact delivery document received from the server after payment without rebuilding its signed URL", async () => {
    const url = "https://powerupgraders.com/api/export/documents/dossier.pdf?signature=a%2Bb%2Fz&expires=1794000000";
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ ...conversation, state: "PAID", deliveryDocument: { activityId: "approved-delivery", url } }) }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "6".repeat(64) }));
    const link = await screen.findByRole("link", { name: "Ouvrir votre document" });
    expect(link.getAttribute("href")).toBe(url); expect(link.getAttribute("rel")).toBe("noreferrer");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("confirms receipt of the exact delivered activity and retries the same message without marking delivery completed", async () => {
    const deliveryDocument = { activityId: "canonical-delivery-activity", url: "https://powerupgraders.com/document.pdf?proof=received" };
    let attempts = 0;
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? { ok: ++attempts > 1, status: attempts > 1 ? 200 : 503, json: async () => ({ received: true }) } : { ok: true, json: async () => ({ ...conversation, state: "PAID", deliveryDocument }) });
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "3".repeat(64) }));
    const button = await screen.findByRole("button", { name: "J’ai bien reçu ce document" });
    fireEvent.change(screen.getByLabelText("Votre message"), { target: { value: "Mon brouillon de suivi." } });
    fireEvent.click(button); fireEvent.click(await screen.findByRole("button", { name: "Vérifier l’envoi" }));
    await screen.findByText("Votre confirmation de réception a été transmise à l’équipe.");
    const posts = fetcher.mock.calls.filter(call => call[1]?.method === "POST");
    expect(posts).toHaveLength(2); expect(posts[1]![1]!.body).toBe(posts[0]![1]!.body);
    const body = JSON.parse(String(posts[0]![1]!.body));
    expect(Object.keys(body).sort()).toEqual(["body", "deliveryActivityId", "requestId"]);
    expect(body).toMatchObject({ deliveryActivityId: deliveryDocument.activityId, body: "Je confirme avoir reçu le document remis dans cette conversation." });
    expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/); expect(body).not.toHaveProperty("state");
    expect(screen.queryByRole("button", { name: "J’ai bien reçu ce document" })).toBeNull();
    expect((screen.getByLabelText("Votre message") as HTMLTextAreaElement).value).toBe("Mon brouillon de suivi.");
  });

  it.each([
    { state: "ACCEPTED", deliveryDocument: { activityId: "ready", url: "https://powerupgraders.com/document.pdf" } },
    { state: "PAID", deliveryDocument: null },
    { state: "PAID", stopped: true, deliveryDocument: { activityId: "ready", url: "https://powerupgraders.com/document.pdf" } },
    { state: "PAID", closed: true, deliveryDocument: { activityId: "ready", url: "https://powerupgraders.com/document.pdf" } },
    { state: "DELIVERED", deliveryDocument: { activityId: "ready", url: "https://powerupgraders.com/document.pdf" } },
  ])("does not request receipt without an active paid document: %j", async value => {
    serve({ ...conversation, ...value }); render(React.createElement(SalesCustomerChat, { token: "3".repeat(64) }));
    await screen.findByText(conversation.messages[0]!.body);
    expect(screen.queryByRole("button", { name: "J’ai bien reçu ce document" })).toBeNull();
  });

  it("does not promote a link written in a message into a delivery document before payment", async () => {
    serve({ ...conversation, state: "ACCEPTED", messages: [{ id: "seller", role: "seller", body: "Voici le document : https://example.test/recopied.pdf", at: "2026-11-04T10:00:00Z" }] });
    render(React.createElement(SalesCustomerChat, { token: "5".repeat(64) }));
    await screen.findByText(/Voici le document/);
    expect(screen.queryByRole("link", { name: "Ouvrir votre document" })).toBeNull();
  });

  it.each(["javascript:alert(1)", "https://user:password@example.test/document.pdf"])("does not turn an unsafe document URL into a client link: %s", async url => {
    serve({ ...conversation, state: "PAID", deliveryDocument: { activityId: "approved-delivery", url } });
    render(React.createElement(SalesCustomerChat, { token: "4".repeat(64) }));
    await screen.findByText(conversation.offer.terms);
    expect(screen.queryByRole("link", { name: "Ouvrir votre document" })).toBeNull();
  });

  it("initializes only the accepted proposal and opens the exact approved provider URL", async () => {
    const url = "https://secure.cinetpay.co/checkout/session?signature=a%2Bb%2Fz";
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { paymentUrl: url, reference: "sales-payment", status: "PENDING", provider: "CINETPAY", beneficiary: checkout.beneficiary, amount: 60000, currency: "XOF" } : { ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout } }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.change(await screen.findByLabelText("Email pour le reçu"), { target: { value: "client@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Payer cette proposition" }));
    await waitFor(() => expect(open).toHaveBeenCalledWith(url, "_self", "noreferrer"));
    const post = fetcher.mock.calls.find(call => call[1]?.method === "POST")!;
    expect(post[0]).toBe(`/api/sales/${"1".repeat(64)}/payment`);
    const request = JSON.parse(String(post[1]!.body));
    expect(Object.keys(request).sort()).toEqual(["email", "proposalId", "requestId"]); expect(request).toMatchObject({ proposalId: payableProposal.id, email: "client@example.test" }); expect(request.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(screen.queryByText("Paiement confirmé.")).toBeNull();
    open.mockRestore();
  });

  it("reuses the exact checkout request after an uncertain response", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? { ok: false, status: 503, json: async () => ({ error: "Réponse interrompue" }) } : { ok: true, json: async () => ({ ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout }) });
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.change(await screen.findByLabelText("Email pour le reçu"), { target: { value: "client@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Payer cette proposition" }));
    fireEvent.click(await screen.findByRole("button", { name: "Vérifier la même demande" }));
    await waitFor(() => expect(fetcher.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(2));
    const posts = fetcher.mock.calls.filter(call => call[1]?.method === "POST"); expect(posts[1]![1]!.body).toBe(posts[0]![1]!.body); expect(open).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Email pour le reçu") as HTMLInputElement).disabled).toBe(true);
    open.mockRestore();
  });

  it("does not open an unapproved URL returned by payment initialization", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { paymentUrl: "https://secure.cinetpay.co.evil.test/pay", reference: "sales-payment", status: "PENDING", provider: "CINETPAY", beneficiary: checkout.beneficiary, amount: 60000, currency: "XOF" } : { ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout } }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.change(await screen.findByLabelText("Email pour le reçu"), { target: { value: "client@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Payer cette proposition" }));
    await screen.findByRole("button", { name: "Vérifier la même demande" }); expect(open).not.toHaveBeenCalled(); expect(screen.queryByRole("link", { name: "Continuer le paiement sur CinetPay" })).toBeNull();
  });

  it("does not open a checkout whose amount differs from the accepted proposal", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { paymentUrl: "https://secure.cinetpay.co/pay", reference: "sales-payment", status: "PENDING", provider: "CINETPAY", beneficiary: checkout.beneficiary, amount: 70000, currency: "XOF" } : { ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout } }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.change(await screen.findByLabelText("Email pour le reçu"), { target: { value: "client@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Payer cette proposition" }));
    await screen.findByText("La demande de paiement ne correspond pas à la proposition. Vérifiez la même demande ou contactez l’équipe."); expect(open).not.toHaveBeenCalled();
  });

  it.each([
    { state: "PROPOSAL", checkout },
    { state: "ACCEPTED", informationOnly: true, checkout },
    { state: "ACCEPTED", checkout: { ...checkout, available: false, reason: "Le paiement en ligne n’est pas autorisé pour cette marque." } },
  ])("does not offer checkout without the server's agreement and availability: %j", async value => {
    serve({ ...conversation, proposal: payableProposal, ...value }); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    await screen.findByText(conversation.messages[0]!.body);
    expect(screen.queryByRole("button", { name: "Payer cette proposition" })).toBeNull(); expect(screen.queryByRole("link", { name: "Continuer le paiement sur CinetPay" })).toBeNull();
  });

  it("does not treat a paid return parameter as payment confirmation", async () => {
    window.history.replaceState({}, "", "/sales/receipt?status=paid");
    serve({ ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout: { ...checkout, available: false }, payment: { reference: "sales-payment", status: "PENDING", amount: 60000, currency: "XOF", beneficiary: checkout.beneficiary, paidAt: null, provider: "CINETPAY", paymentUrl: "https://secure.cinetpay.co/pay" } });
    render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    await screen.findByText("Vérification du paiement en cours."); expect(screen.queryByText("Paiement confirmé.")).toBeNull(); expect(screen.queryByRole("link", { name: "Ouvrir votre document" })).toBeNull(); expect(screen.queryByRole("link", { name: "Continuer le paiement sur CinetPay" })).toBeNull();
    window.history.replaceState({}, "", "/");
  });

  it("shows server-confirmed payment without inventing a delivered document", async () => {
    serve({ ...conversation, state: "PAID", proposal: payableProposal, checkout: { ...checkout, available: false }, payment: { reference: "sales-payment", status: "PAID", amount: 60000, currency: "XOF", beneficiary: checkout.beneficiary, paidAt: "2026-11-05T10:30:00Z", provider: "CINETPAY" } });
    render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    await screen.findByText("Paiement confirmé."); expect(screen.queryByRole("button", { name: "Payer cette proposition" })).toBeNull(); expect(screen.queryByRole("link", { name: "Ouvrir votre document" })).toBeNull();
  });

  it("uses the email already linked by the server without requesting or exposing it again", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({ ok: true, json: async () => options?.method === "POST" ? { paymentUrl: "https://secure.cinetpay.co/pay", reference: "sales-payment", status: "PENDING", provider: "CINETPAY", beneficiary: checkout.beneficiary, amount: 60000, currency: "XOF" } : { ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout: { ...checkout, requiresEmail: false } } }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.click(await screen.findByRole("button", { name: "Payer cette proposition" }));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(screen.queryByLabelText("Email pour le reçu")).toBeNull();
    expect(JSON.parse(String(fetcher.mock.calls.find(call => call[1]?.method === "POST")![1]!.body)).email).toBe("");
  });

  it("resumes an existing authorized checkout without initializing a second payment", async () => {
    const url = "https://secure.cinetpay.co/pay?existing=session";
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout, payment: { reference: "sales-payment", status: "PENDING", amount: 60000, currency: "XOF", beneficiary: checkout.beneficiary, paidAt: null, provider: "CINETPAY", paymentUrl: url } }) }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    expect((await screen.findByRole("link", { name: "Continuer le paiement sur CinetPay" })).getAttribute("href")).toBe(url);
    expect(screen.queryByRole("button", { name: "Payer cette proposition" })).toBeNull(); expect(fetcher).toHaveBeenCalledOnce();
  });

  it("links the customer's existing diagnostic with consent before offering payment, without changing the proposal", async () => {
    let linked = false;
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") { linked = true; return { ok: true, json: async () => ({ linked: true }) }; }
      return { ok: true, json: async () => ({ ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout, diagnostic: { required: true, linked, canLink: !linked, companyName: linked ? "Restaurant du client" : null } }) };
    });
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    const input = await screen.findByLabelText("Lien du résultat du diagnostic");
    expect(screen.queryByRole("button", { name: "Payer cette proposition" })).toBeNull();
    expect(screen.getByRole("link", { name: "Faire mon diagnostic" }).getAttribute("href")).toBe("/intake");
    const diagnosticUrl = new URL("/intake/diagnostic-received/result", window.location.origin).href;
    fireEvent.change(input, { target: { value: diagnosticUrl } });
    fireEvent.change(screen.getByLabelText("Email utilisé pour le diagnostic"), { target: { value: "client@example.test" } });
    fireEvent.click(screen.getByLabelText("J’autorise l’utilisation de ce diagnostic pour préparer et me remettre le rapport commandé."));
    fireEvent.click(screen.getByRole("button", { name: "Associer mon diagnostic" }));
    await screen.findByText("Diagnostic associé : Restaurant du client.");
    const post = fetcher.mock.calls.find(call => call[1]?.method === "POST")!;
    expect(post[0]).toBe(`/api/sales/${"1".repeat(64)}/diagnostic`);
    const request = JSON.parse(String(post[1]!.body));
    expect(Object.keys(request).sort()).toEqual(["consent", "email", "intakeToken", "requestId"]); expect(request).toMatchObject({ intakeToken: diagnosticUrl, email: "client@example.test", consent: true });
    expect(screen.queryByLabelText("Lien du résultat du diagnostic")).toBeNull(); expect(screen.getByRole("button", { name: "Payer cette proposition" })).toBeTruthy(); expect(screen.getByText(/Montant total à payer : 60.?000/)).toBeTruthy();
  });

  it("does not associate a diagnostic without the customer's explicit consent", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout, diagnostic: { required: true, linked: false, canLink: true, companyName: null } }) }));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.change(await screen.findByLabelText("Lien du résultat du diagnostic"), { target: { value: "diagnostic-received" } });
    fireEvent.change(screen.getByLabelText("Email utilisé pour le diagnostic"), { target: { value: "client@example.test" } });
    fireEvent.submit(screen.getByRole("region", { name: "Associer mon diagnostic" }).querySelector("form")!);
    expect(fetcher).toHaveBeenCalledOnce(); expect(screen.getByRole("alert").textContent).toContain("votre autorisation"); expect(screen.queryByRole("button", { name: "Payer cette proposition" })).toBeNull();
  });

  it("preserves the same diagnostic association request after an uncertain response", async () => {
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, json: async () => ({ ...conversation, state: "ACCEPTED", proposal: payableProposal, checkout, diagnostic: { required: true, linked: false, canLink: true, companyName: null } }) });
    vi.stubGlobal("fetch", fetcher); render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    fireEvent.change(await screen.findByLabelText("Lien du résultat du diagnostic"), { target: { value: "diagnostic-received" } }); fireEvent.change(screen.getByLabelText("Email utilisé pour le diagnostic"), { target: { value: "client@example.test" } }); fireEvent.click(screen.getByLabelText("J’autorise l’utilisation de ce diagnostic pour préparer et me remettre le rapport commandé."));
    fireEvent.click(screen.getByRole("button", { name: "Associer mon diagnostic" })); fireEvent.click(await screen.findByRole("button", { name: "Vérifier le même envoi" }));
    await waitFor(() => expect(fetcher.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(2));
    const posts = fetcher.mock.calls.filter(call => call[1]?.method === "POST"); expect(posts[1]![1]!.body).toBe(posts[0]![1]!.body);
  });

  it("shows report preparation only from the server and waits for the actual document", async () => {
    serve({ ...conversation, state: "PAID", proposal: payableProposal, checkout: { ...checkout, available: false }, diagnostic: { required: true, linked: true, canLink: false, companyName: "Restaurant du client", preparation: "PREPARING" } });
    render(React.createElement(SalesCustomerChat, { token: "1".repeat(64) }));
    await screen.findByText("Actualisation du rapport en cours."); expect(screen.queryByRole("button", { name: "Associer mon diagnostic" })).toBeNull(); expect(screen.queryByRole("link", { name: "Ouvrir votre document" })).toBeNull();
  });
});

describe("approved provider checkout destinations", () => {
  it("preserves the exact production URL and permits the second host only for local checks", () => {
    const url = "https://secure.cinetpay.co/pay?signature=a%2Bb"; expect(salesCheckoutUrl(url)).toBe(url);
    const sandbox = "https://secure.cinetpay.net/pay"; expect(salesCheckoutUrl(sandbox)).toBeNull(); expect(salesCheckoutUrl(sandbox, true)).toBe(sandbox);
  });
  it.each(["http://secure.cinetpay.co/pay", "https://secure.cinetpay.co.evil.test/pay", "https://user:password@secure.cinetpay.co/pay", "https://secure.cinetpay.co:8443/pay", "https://secure.cinetpay.co/pay#step", "https://secure.cinetpay.co/pay#", "javascript:alert(1)"])("rejects a destination outside the approved checkout contract: %s", url => { expect(salesCheckoutUrl(url, true)).toBeNull(); });
});
