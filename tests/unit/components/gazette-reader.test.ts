// @vitest-environment jsdom
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { JehutyFeedItem, SignalReading } from "@/lib/types/jehuty";

const query = vi.hoisted(() => ({ read: vi.fn(), result: {} as { data?: SignalReading; isLoading?: boolean; error?: Error; refetch?: () => void } }));
vi.mock("@/lib/trpc/client", () => ({ trpc: { jehuty: { readSignal: { useQuery: (input: unknown) => { query.read(input); return query.result; } } } } }));
import { compareObjective } from "@/domain/recommendation-comparison";
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

  it("rereads exact article evidence separately from documentary support and keeps the proposal pending", () => {
    const url = "https://presse.example/a";
    const article: JehutyFeedItem = { ...item, externalUrl: url, source: "Journal local", articleContext: {
      articleUrl: url, linkedAnalyses: [], brandContext: [], batchIds: ["batch-a"], recommendations: [{
        id: "r-a", batchId: "batch-a", targetPillarKey: "I", targetField: "catalogueParCanal", explain: "Une piste conditionnelle.",
        status: "PENDING", createdAt: item.createdAt, documentaryGrounding: { band: "NO_SOURCE", score: 0 },
        articleGrounding: { receiptId: "receipt-a", sourceId: "digest-a", sourceUrl: url, source: "Journal local", publishedAt: item.createdAt,
          qualification: "REPORTED", observationHash: "input-hash", band: "WEAK", score: .25, unverifiedCitations: [],
          excerpts: [{ field: "summary", text: "Extrait exact utilisé, avec sa dernière phrase.", start: 20, end: 70 }] },
      }],
    } };
    render(React.createElement(GazetteReader, { item: article, ...actions }));
    const right = screen.getByRole("region", { name: "La lecture pour votre marque" });
    expect(within(right).getByText(/Proposition à examiner/)).toBeTruthy();
    expect(within(right).getByText("Appui lexical partiel · 25 %")).toBeTruthy();
    expect(within(right).getByText("Recouvrement non mesurable")).toBeTruthy();
    expect(within(right).getByText("Extrait exact utilisé, avec sa dernière phrase.")).toBeTruthy();
    expect(within(right).getByRole("link", { name: /Journal local/ }).getAttribute("href")).toBe(url);
    expect(right.textContent).toContain("Documentation de marque");
    expect(right.textContent).toContain("Il ne valide ni les faits rapportés ni l’impact supposé");
    expect(actions.onNotoria).not.toHaveBeenCalled();
  });

  it("keeps a source-supported but unbenchmarked proposal out of the shortlist and shows its basis", () => {
    const url = "https://presse.example/a";
    const article: JehutyFeedItem = {...item, externalUrl:url, articleContext:{
      articleUrl:url, brandContext:[], batchIds:["a"], linkedAnalyses:[], recommendations:[],
      lastActionAnalysis:{at:item.createdAt,status:"COMPLETE",retained:0}, toInvestigate:[{
        id:"r1",batchId:"a",targetPillarKey:"I",targetField:"catalogueParCanal",explain:"Hypothèse de travail",
        createdAt:item.createdAt,status:"PENDING",actionBasis:{field:"title",quote:"Une livraison à Abidjan",start:0,end:22,
          anchor:{pillarKey:"A",field:"promesse",quote:"Décider où aller"},action:"Tester les sorties proposées aux foodies.",
          implication:"Une occasion de choix à étudier.",measure:"Mesurer la préférence entre sortir et commander.",
          reviewReason:"Le passage justifie cette comparaison des occasions.",comparison:compareObjective({
            objective:"Distinguer les occasions de sortie",criterion:"",unit:"",direction:"higher",candidate:null,evidence:[],basis:"projection",
          })},
      }],
    }};
    render(React.createElement(GazetteReader,{item:article,...actions}));
    const right=screen.getByRole("region",{name:"La lecture pour votre marque"});
    expect(right.textContent).toContain("Pistes à instruire (1)");
    expect(right.textContent).toContain("Une livraison à Abidjan");
    expect(right.textContent).toContain("Mesurer la préférence entre sortir et commander.");
    expect(right.textContent).not.toContain("Actions tirées de l’article (1)");
  });
  it("does not invent article grounding for an old proposal", () => {
    const article: JehutyFeedItem = { ...item, externalUrl: "https://presse.example/a", articleContext: {
      articleUrl: "https://presse.example/a", linkedAnalyses: [], brandContext: [], batchIds: ["old"], recommendations: [{
        id: "r-old", batchId: "old", targetPillarKey: "I", targetField: "copyStrategy", explain: "Ancienne piste.", status: "PENDING", createdAt: item.createdAt,
      }],
    } };
    render(React.createElement(GazetteReader, { item: article, ...actions }));
    const right = screen.getByRole("region", { name: "La lecture pour votre marque" });
    expect(within(right).getAllByText("Non mesuré")).toHaveLength(2);
    expect(right.textContent).toContain("L’extrait exact utilisé pour cette proposition n’est pas conservé");
    expect(right.textContent).not.toContain("Appui lexical");
    expect(right.textContent).toContain("Historique des recommandations générales (1)");
    expect(right.textContent).not.toContain("Actions tirées de l’article (1)");
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
