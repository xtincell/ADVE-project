// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublicSalesEntry } from "@/components/console/public-sales-entry";

vi.mock("@/components/shared/markdown-content", () => ({ MarkdownContent: ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children) }));
const entry = { publicId: "brand-public", brandName: "Marque de recette", welcome: "Bienvenue. Quel est votre besoin ?", available: true, sellerMode: "AI", offers: [{ id: "first", name: "Premier sujet", terms: "Conditions", amount: 1000, currency: "XOF" }, { id: "second", name: "Second sujet", terms: "Autres conditions", amount: 2000, currency: "XOF" }] };
const response = (data: unknown, ok = true, status = 200) => ({ ok, status, json: async () => data });
beforeEach(() => { vi.stubGlobal("React", React); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("a visitor starts an existing sales conversation", () => {
  it("accepts a first message without account, coordinates or forced offer choice and protects the opening with a separate secret", async () => {
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? response({ error: "Réponse interrompue" }, false, 503) : response(entry));
    vi.stubGlobal("fetch", fetcher);
    render(React.createElement(PublicSalesEntry, { publicId: entry.publicId }));
    await screen.findByText(entry.welcome);
    expect((screen.getByLabelText("Votre sujet (facultatif)") as HTMLSelectElement).value).toBe("");
    expect(screen.queryByRole("link", { name: /Échanger avec .* sur WhatsApp/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Votre premier message"), { target: { value: "Je cherche un conseil pour mon restaurant." } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await screen.findByRole("button", { name: "Vérifier l’envoi" });
    const sent = JSON.parse(String(fetcher.mock.calls.find(call => call[1]?.method === "POST")![1]!.body));
    expect(sent.message).toBe("Je cherche un conseil pour mon restaurant.");
    expect(sent.clientSecret).toMatch(/^[a-f0-9]{64}$/); expect(sent.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(sent.clientSecret).not.toBe(sent.requestId);
    expect(sent).not.toHaveProperty("offerId"); expect(sent).not.toHaveProperty("displayName"); expect(sent).not.toHaveProperty("email");
    expect(fetcher.mock.calls[0]![0]).not.toContain(sent.clientSecret);
    expect(JSON.parse(sessionStorage.getItem("sales-entry:brand-public")!)).toEqual(sent);
  });

  it("retries the identical protected opening after a reload even if new admissions have since been paused", async () => {
    let available = true;
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? response({ error: "Envoi non confirmé" }, false, 503) : response({ ...entry, available }));
    vi.stubGlobal("fetch", fetcher);
    const first = render(React.createElement(PublicSalesEntry, { publicId: entry.publicId }));
    await screen.findByText(entry.welcome);
    fireEvent.change(screen.getByLabelText("Votre premier message"), { target: { value: "Ma première question." } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await screen.findByRole("button", { name: "Vérifier l’envoi" });
    first.unmount(); available = false;
    render(React.createElement(PublicSalesEntry, { publicId: entry.publicId }));
    await screen.findByText(/Cette équipe ne prend pas/);
    expect((screen.getByRole("button", { name: "Vérifier l’envoi" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Vérifier l’envoi" }));
    await waitFor(() => expect(fetcher.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(2));
    const posts = fetcher.mock.calls.filter(call => call[1]?.method === "POST");
    expect(posts[1]![1]!.body).toEqual(posts[0]![1]!.body);
  });

  it("lets the same browser resume its private conversation without requesting a new dossier", async () => {
    const path = "/sales/" + "a".repeat(64);
    sessionStorage.setItem("sales-entry:brand-public", JSON.stringify({ path }));
    const fetcher = vi.fn(async () => response(entry)); vi.stubGlobal("fetch", fetcher);
    render(React.createElement(PublicSalesEntry, { publicId: entry.publicId }));
    const resume = await screen.findByRole("link", { name: "Reprendre ma conversation" });
    expect(resume.getAttribute("href")).toBe(path);
    expect(screen.queryByRole("button", { name: "Envoyer" })).toBeNull();
    expect(fetcher.mock.calls).toHaveLength(1);
  });

  it("rejects an external redirect returned by a malformed response", async () => {
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? response({ path: "https://other.example/sales/" + "b".repeat(64) }) : response(entry));
    vi.stubGlobal("fetch", fetcher);
    render(React.createElement(PublicSalesEntry, { publicId: entry.publicId })); await screen.findByText(entry.welcome);
    fireEvent.change(screen.getByLabelText("Votre premier message"), { target: { value: "Mon besoin." } }); fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await screen.findByRole("alert");
    expect(JSON.parse(sessionStorage.getItem("sales-entry:brand-public")!)).not.toHaveProperty("path");
  });

  it("allows correction after a definite validation refusal instead of freezing the rejected message", async () => {
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => options?.method === "POST" ? response({ error: "Vérifiez votre message avant de commencer." }, false, 400) : response(entry));
    vi.stubGlobal("fetch", fetcher); render(React.createElement(PublicSalesEntry, { publicId: entry.publicId })); await screen.findByText(entry.welcome);
    fireEvent.change(screen.getByLabelText("Votre premier message"), { target: { value: "Un message refusé." } }); fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Votre premier message") as HTMLTextAreaElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText("Votre premier message"), { target: { value: "Mon message corrigé." } });
    expect((screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement).disabled).toBe(false);
    expect(sessionStorage.getItem("sales-entry:brand-public")).toBeNull();
  });

  it("welcomes questions without a public price or purchase action when the team has not approved subscriptions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ ...entry, informationOnly: true, offers: [{ id: "first", name: "Les services de la marque" }] })));
    render(React.createElement(PublicSalesEntry, { publicId: entry.publicId }));
    await screen.findByText("L’équipe doit confirmer les prestations et les conditions avant toute souscription.");
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeTruthy();
    expect(screen.queryByText(/1.?000|EUR|XOF|Acheter|Souscrire/)).toBeNull();
  });

  it("offers only this brand's approved WhatsApp contact even when new conversations are paused", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ ...entry, available: false, informationOnly: true, brandName: "Marque & Café", humanContact: { name: "Alexandre", whatsapp: "237600000001", whatsappUrl: "https://wa.me/237600000001" } })));
    render(React.createElement(PublicSalesEntry, { publicId: entry.publicId }));
    const link = await screen.findByRole("link", { name: "Échanger avec Alexandre sur WhatsApp" });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin + url.pathname).toBe("https://wa.me/237600000001");
    expect(url.searchParams.get("text")).toBe("Bonjour Alexandre, je vous contacte au sujet de Marque & Café.");
    expect(url.href).not.toContain("/sales/"); expect(url.href).not.toContain("clientSecret");
  });
});
