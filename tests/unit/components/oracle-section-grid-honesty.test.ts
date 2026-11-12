// @vitest-environment jsdom
/**
 * Plan 4.11.e — la grille de l'Oracle n'annonce pas de sections complètes
 * tant qu'aucune n'est rédigée.
 *
 * Deux mesures distinctes cohabitent dans la grille : la MATIÈRE que les piliers
 * fournissent à une section (`strategyPresentation.completeness`) et le RÉSULTAT
 * enregistré par la rédaction (`oracle.listSections`). Sur un Oracle vierge dont
 * les piliers sont renseignés, chaque carte « À produire » portait la pastille
 * « complète » — « La section dit tout ce qu'elle a à dire » — et l'en-tête
 * comptait « à jour » une section terminée sans contenu rédigé.
 */
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { sectionId: number; status: string; payloadSize: number; confidence: number | null; staleAt: null; lastError: null };
const f = vi.hoisted(() => ({ sections: [] as Row[] }));

vi.mock("@/components/cockpit/use-can-operate", () => ({ useCanOperate: () => true }));
vi.mock("@/hooks/use-oracle-stream", () => ({
  useOracleStream: () => ({
    sectionsState: new Map(), assemblerState: { phase: "idle" }, log: [], isStreaming: false, error: null, clearLog: () => {},
  }),
}));
vi.mock("@/lib/trpc/client", () => {
  const mutation = () => ({ mutate: () => {}, isPending: false, error: null });
  return { trpc: { oracle: {
    listSections: { useQuery: () => ({ data: { sections: f.sections }, refetch: async () => ({}) }) },
    getSection: { useQuery: () => ({ data: undefined, isLoading: false }) },
    generateSection: { useMutation: mutation },
    retrySection: { useMutation: mutation },
    assembleOracle: { useMutation: mutation },
  } } };
});

import { OracleProgressivePanel } from "@/components/cockpit/oracle/progressive-panel";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

function rows(status: (n: number) => string, payloadSize: (n: number) => number): Row[] {
  return SECTION_REGISTRY.map((meta) => {
    const n = Number(meta.number);
    return { sectionId: n, status: status(n), payloadSize: payloadSize(n), confidence: 0.8, staleAt: null, lastError: null };
  });
}
/** 27 sections nourries par les piliers, 8 partiellement — comme le reçu local 519. */
const FED = Object.fromEntries(SECTION_REGISTRY.map((meta, i) => [meta.id, i < 27 ? "complete" : "partial"] as const));

function render() {
  const el = document.createElement("div");
  el.innerHTML = renderToStaticMarkup(React.createElement(OracleProgressivePanel, {
    strategyId: "synthetic", contentFillById: FED,
  }));
  return el;
}
const readButtons = (el: HTMLElement) => Array.from(el.querySelectorAll("button")).filter((b) => b.textContent === "lire");

beforeEach(() => { vi.stubGlobal("React", React); });

describe("grille Oracle — matière des piliers distincte des sections rédigées", () => {
  it("ne qualifie aucune section de complète quand aucune n'est rédigée", () => {
    f.sections = rows(() => "PENDING", () => 0);
    const el = render();
    const text = el.textContent ?? "";
    expect(text).toContain("0 rédigées · 0 à jour");
    expect(text).not.toMatch(/complète/i);
    expect(text).not.toContain("dit tout ce qu'elle a à dire");
    expect(el.querySelectorAll("[title*='rédigée']").length).toBe(27);
    expect(text.match(/· nourrie/g)?.length).toBe(27);
  });

  it("ne compte pas « à jour » une section terminée sans contenu rédigé", () => {
    f.sections = rows((n) => (n <= 6 ? "COMPLETE" : "PENDING"), () => 0);
    const el = render();
    const text = el.textContent ?? "";
    expect(text).toContain("0 rédigées · 0 à jour");
    expect(text.match(/Résultat vide/g)?.length).toBe(6);
    expect(text).not.toMatch(/Rédigée(?!s)/);
    expect(text).toContain("6 sans contenu enregistré");
    expect(readButtons(el)).toHaveLength(0);
  });

  it("garde les sections rédigées lisibles et à jour", () => {
    f.sections = rows(() => "COMPLETE", () => 420);
    const el = render();
    expect(el.textContent).toContain("35 rédigées · 35 à jour");
    expect(readButtons(el)).toHaveLength(35);
  });
});
