// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { JehutyFeedItem, SignalReading } from "@/lib/types/jehuty";

const query = vi.hoisted(() => ({ read: vi.fn(), result: {} as { data?: SignalReading; isLoading?: boolean; error?: Error; refetch?: () => void } }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { jehuty: { readSignal: { useQuery: (input: unknown) => { query.read(input); return query.result; } } } } }));
import { GazetteReader } from "@/components/cockpit/jehuty/gazette-reader";

const item: JehutyFeedItem = { id: "signal:signal-a", sourceType: "SIGNAL", sourceId: "signal-a", strategyId: "brand-a", category: "WEAK_SIGNAL", title: "Point de vigilance", summary: "Un aperçu…", observation: "Une interprétation complète. Dernière phrase conservée.", urgency: "NOW", impact: null, confidence: .94, priority: 1, createdAt: "2026-11-05T11:00:00Z", source: "Analyse des signaux de la marque" };
const actions = { onClose: vi.fn(), onNotoria: vi.fn(), isNotoriaPending: false, onPin: vi.fn(), onUnpin: vi.fn(), onDismiss: vi.fn() };
const reading: SignalReading = { signalId: "signal-a", strategyId: "brand-a", title: item.title, interpretation: item.observation!, createdAt: item.createdAt, provenanceStatus: "UNTRACEABLE", inputSignals: [], brandContextSnapshot: null, currentBrandContext: [] };

beforeEach(() => { vi.stubGlobal("React", React); query.read.mockClear(); query.result = { data: reading }; actions.onNotoria.mockClear(); actions.onClose.mockClear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Gazette source and interpretation reader", () => {
  it("does not query sources or generate anything when closed", () => {
    render(React.createElement(GazetteReader, { item: null, ...actions }));
    expect(query.read).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(actions.onNotoria).not.toHaveBeenCalled();
  });

  it("opens the exact signal, keeps its complete interpretation and explains missing legacy evidence", () => {
    render(React.createElement(GazetteReader, { item, ...actions }));
    const dialog = screen.getByRole("dialog", { name: "La Gazette · sources et décryptage" });
    expect(query.read).toHaveBeenCalledWith({ strategyId: "brand-a", signalId: "signal-a" });
    expect(within(dialog).getByRole("region", { name: "Les sources de cette analyse" }).textContent).toContain("Aucun article précis");
    expect(within(dialog).getByRole("region", { name: "L’interprétation pour votre marque" }).textContent).toContain("Dernière phrase conservée.");
    expect(within(dialog).queryByRole("link", { name: /Consulter la source/ })).toBeNull();
    expect(actions.onNotoria).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Proposer des actions avec l’IA" }));
    expect(actions.onNotoria).toHaveBeenCalledOnce();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(actions.onClose).toHaveBeenCalledOnce();
  });

  it("keeps a captured article on the left and its interpretation on the right without mixing AI inputs", () => {
    query.result = { data: { ...reading, provenanceStatus: "TRACEABLE", inputSignals: [
      { title: "Nouvelle ouverture", content: "Entrée transmise", sourceType: "NEWS", sourceUrl: "https://presse.example/ouverture", collectedAt: item.createdAt, kind: "COLLECTED", article: { title: "Nouvelle ouverture", content: "Extrait exact du journal.", url: "https://presse.example/ouverture", imageUrl: "https://presse.example/photo.jpg", source: "Journal local" } },
      { title: "Piste de travail", content: "Hypothèse à confronter.", sourceType: "INFERENCE", collectedAt: item.createdAt, kind: "INFERRED" },
    ] } };
    render(React.createElement(GazetteReader, { item, ...actions }));
    const sources = screen.getByRole("region", { name: "Les sources de cette analyse" });
    expect(within(sources).getByRole("link", { name: /Consulter la source/ }).getAttribute("href")).toBe("https://presse.example/ouverture");
    expect(within(sources).getByText("Extrait exact du journal.")).toBeTruthy();
    expect(within(sources).getByText("Hypothèse générée · à vérifier")).toBeTruthy();
    expect(sources.querySelector("img")?.getAttribute("src")).toBe("https://presse.example/photo.jpg");
    expect(actions.onNotoria).not.toHaveBeenCalled();
  });

  it("uses the same dialog for a headline article with no second signal query or truncated received text", () => {
    const article = { ...item, externalUrl: "https://presse.example/a", source: "Journal local", title: "Actualité du quartier", observation: "Texte reçu. ".repeat(100) + "FIN_ARTICLE", articleContext: { articleUrl: "https://presse.example/a", linkedAnalyses: [], recommendations: [], brandContext: [], batchIds: [] } };
    render(React.createElement(GazetteReader, { item: article, ...actions }));
    expect(query.read).not.toHaveBeenCalled();
    const left = screen.getByRole("region", { name: "L’actualité" });
    const received = within(left).getByText(/FIN_ARTICLE/);
    expect(received.className).not.toContain("line-clamp");
    expect(screen.getByRole("region", { name: "La lecture pour votre marque" })).toBeTruthy();
    expect(actions.onNotoria).not.toHaveBeenCalled();
  });

  it("distinguishes preserved legacy references from a complete historical snapshot", () => {
    query.result = { data: { ...reading, provenanceStatus: "REFERENCED", inputSignals: [
      { title: "Article conservé", content: "", sourceType: "REFERENCE", sourceUrl: "https://presse.example/archive", collectedAt: "", kind: "UNSPECIFIED", article: { title: "Article retrouvé", content: "Extrait reçu ultérieurement.", url: "https://presse.example/archive", source: "Journal local" } },
    ] } };
    render(React.createElement(GazetteReader, { item, ...actions }));
    expect(screen.getByText(/Des références ont été conservées/)).toBeTruthy();
    expect(screen.queryByText(/Aucun article précis/)).toBeNull();
    expect(screen.getByRole("link", { name: /Consulter la source/ }).getAttribute("href")).toBe("https://presse.example/archive");
    expect(screen.queryByText("Contexte de marque utilisé à cette date")).toBeNull();
    expect(screen.queryByText("Texte transmis à l’analyse")).toBeNull();
    expect(screen.getByText("Extrait reçu ultérieurement.")).toBeTruthy();
  });

  it("renders a repeated stored heading only once while preserving the full body", () => {
    query.result = { data: { ...reading, interpretation: item.title + "\n\n" + item.observation } };
    render(React.createElement(GazetteReader, { item, ...actions }));
    const right = screen.getByRole("region", { name: "L’interprétation pour votre marque" });
    expect(within(right).getAllByText(item.title)).toHaveLength(1);
    expect(within(right).getByText(item.observation!)).toBeTruthy();
  });

  it("keeps the interpretation visible when evidence loading fails, with an explicit retry", () => {
    const retry = vi.fn(); query.result = { error: new Error("offline"), refetch: retry };
    render(React.createElement(GazetteReader, { item, ...actions }));
    expect(screen.getByRole("alert").textContent).toContain("n’ont pas pu être chargées");
    expect(screen.getByText(item.observation!)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer la lecture" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Aucun article précis/)).toBeNull();
  });
});
