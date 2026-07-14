import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  sectorHeadTerm,
  subjectSourcesFor,
  SEARCH_LOCALES,
} from "@/server/services/seshat/external-feeds/feed-sources";
import { rankItemsByRelevance } from "@/server/services/seshat/external-feeds/relevance";
import { brandFeedSubjects } from "@/server/services/seshat/external-feeds/brand-feed";
import type { RssItem } from "@/server/services/seshat/external-feeds/rss";

// ── ADR-0143 : terme-tête searchable (coupe la queue marketing) ───────────────
describe("sectorHeadTerm (ADR-0143)", () => {
  it("coupe la queue marketing/positionnement d'un secteur ADVE", () => {
    expect(sectorHeadTerm("foodtech / découverte culinaire communautaire")).toBe("foodtech");
    expect(sectorHeadTerm("FMCG / Agroalimentaire")).toBe("FMCG");
    expect(sectorHeadTerm("cosmétique — beauté naturelle")).toBe("cosmétique");
  });
  it("laisse intact un terme déjà court, jamais vide", () => {
    expect(sectorHeadTerm("fintech")).toBe("fintech");
    expect(sectorHeadTerm("  ")).toBe("");
    expect(sectorHeadTerm("équipement audiovisuel")).toBe("équipement audiovisuel");
  });
});

// ── ADR-0143 : la langue N'EST PAS un filtre (multi-langue par sujet) ─────────
describe("subjectSourcesFor (ADR-0143 — langue non filtrante)", () => {
  it("interroge CHAQUE langue de SEARCH_LOCALES pour un sujet", () => {
    const srcs = subjectSourcesFor("SPAWT", "CI");
    expect(srcs).toHaveLength(SEARCH_LOCALES.length);
    const urls = srcs.map((s) => s.url).join(" ");
    // fr ET en présents → un article anglophone sur la marque n'est pas exclu.
    expect(urls).toContain("hl=fr");
    expect(urls).toContain("hl=en");
    for (const s of srcs) expect(s.url).toContain("gl=CI");
  });
  it("ignore un sujet trop court (bruit)", () => {
    expect(subjectSourcesFor("a", "CI")).toHaveLength(0);
  });
});

// ── ADR-0143 : sujets d'une marque = elle-même + son secteur ─────────────────
describe("brandFeedSubjects (ADR-0143 — ensemble de sujets)", () => {
  it("compose marque + terme-tête secteur + extras, dédupliqué", () => {
    const subs = brandFeedSubjects({
      name: "SPAWT",
      sector: "foodtech / découverte culinaire communautaire",
      extraSubjects: ["restauration Abidjan", "SPAWT"],
    });
    expect(subs).toContain("SPAWT");
    expect(subs).toContain("foodtech");
    expect(subs).toContain("restauration Abidjan");
    // "SPAWT" présent une seule fois malgré le doublon.
    expect(subs.filter((s) => s === "SPAWT")).toHaveLength(1);
  });
});

// ── ADR-0143 : filtre de pertinence DÉTERMINISTE (zéro LLM) ───────────────────
describe("rankItemsByRelevance (ADR-0143 — pertinence non-LLM)", () => {
  const NOW = Date.parse("2026-07-14T12:00:00Z");
  const mk = (title: string, summary = "", pubDate = "2026-07-13T10:00:00Z"): RssItem => ({
    title,
    link: `https://ex.com/${encodeURIComponent(title).slice(0, 12)}`,
    pubDate,
    summary,
  });

  it("écarte les items sans lien avec les sujets, garde les pertinents", () => {
    const items = [
      mk("SPAWT lève des fonds pour sa foodtech à Abidjan"),
      mk("La météo sera clémente ce week-end en Bretagne"),
      mk("Le championnat de pétanque bat son plein"),
    ];
    const out = rankItemsByRelevance(items, ["SPAWT", "foodtech"], { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toContain("SPAWT");
  });

  it("classe la mention exacte de marque (titre) au-dessus d'un simple mot-clé", () => {
    const items = [
      mk("Tendances foodtech en Afrique de l'Ouest"), // mot-clé secteur seul
      mk("SPAWT, l'app qui cartonne à Abidjan"), // marque exacte dans le titre
    ];
    const out = rankItemsByRelevance(items, ["SPAWT", "foodtech"], { now: NOW });
    expect(out[0]!.title).toContain("SPAWT");
    expect(out[0]!.relevance).toBeGreaterThan(out[1]!.relevance);
  });

  it("déduplique par titre et respecte la limite", () => {
    const items = [
      mk("SPAWT foodtech news"),
      mk("SPAWT foodtech news"), // doublon
      mk("SPAWT ouvre un bureau"),
    ];
    const out = rankItemsByRelevance(items, ["SPAWT"], { now: NOW, limit: 5 });
    expect(out).toHaveLength(2);
  });

  it("sujets vides → aucun résultat (jamais de bruit non filtré)", () => {
    expect(rankItemsByRelevance([mk("n'importe quoi")], [], { now: NOW })).toHaveLength(0);
  });
});

// ── ADR-0143 : verrou anti-LLM sur le chemin du feed d'actualité ──────────────
describe("feed path is LLM-free (ADR-0143 HARD)", () => {
  const base = join(process.cwd(), "src/server/services/seshat/external-feeds");
  const files = ["index.ts", "feed-sources.ts", "rss.ts", "relevance.ts", "brand-feed.ts"];
  for (const f of files) {
    it(`${f} n'importe ni n'appelle le LLM Gateway`, () => {
      const src = readFileSync(join(base, f), "utf8");
      expect(src).not.toMatch(/from ["']@\/server\/services\/llm-gateway/);
      expect(src).not.toMatch(/\bcallLLM\s*\(/);
    });
  }
});
