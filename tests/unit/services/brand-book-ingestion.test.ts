/**
 * brand-book-ingestion — extraction déterministe + contrat zéro-fabrication (ADR-0173).
 *
 * Prouve : le parseur structuré (zéro LLM) extrait couleurs/polices et rien d'autre ;
 * le schéma accepte le tout-null (zéro fabrication) ; l'Intent est enregistré partout.
 */
import { describe, it, expect } from "vitest";
import { extractStructured } from "@/server/services/brand-book-ingestion/extractor-structured";
import { previewBrandBook } from "@/server/services/brand-book-ingestion";
import { BrandBookExtractionSchema } from "@/server/services/brand-book-ingestion/schema";
import { INTENT_KINDS } from "@/server/governance/intent-kinds";
import { INTENT_SLOS } from "@/server/governance/slos";
import { manifest } from "@/server/services/brand-book-ingestion/manifest";

const SAMPLE = `MOTION19 — La Boutique Des Créatifs.
Notre palette : bleu #3384FF, noir #1D1D1D, blanc #FFFFFF.
Typographie : Exo 2 pour les titres, Roboto pour le texte courant.
Baseline : « Donnez vie à chaque image ».`;

describe("brand-book-ingestion — extracteur structuré (déterministe, zéro LLM)", () => {
  it("extrait les couleurs hex (dédupliquées) et rien de prose", () => {
    const x = extractStructured(SAMPLE);
    const hexes = x.visual?.colors?.map((c) => c.hex) ?? [];
    expect(hexes).toContain("#3384ff");
    expect(hexes).toContain("#1d1d1d");
    expect(hexes).toContain("#ffffff");
    // Prose → null (le parseur ne fabrique pas).
    expect(x.identity).toBeNull();
    expect(x.distinction).toBeNull();
    expect(x.value).toBeNull();
  });
  it("extrait les familles de police connues", () => {
    const x = extractStructured(SAMPLE);
    const fams = x.visual?.fonts?.map((f) => f.family) ?? [];
    expect(fams).toContain("Exo 2");
    expect(fams).toContain("Roboto");
  });
  it("aucune couleur/police → visual null (jamais de tableau vide)", () => {
    const x = extractStructured("Un texte sans couleur ni police reconnaissable.");
    expect(x.visual).toBeNull();
  });
  it("previewBrandBook STRUCTURED = le plancher déterministe (aucun LLM appelé)", async () => {
    const x = await previewBrandBook({ strategyId: "s", text: SAMPLE, mode: "STRUCTURED", caller: "test" });
    expect(x.visual?.colors?.length).toBeGreaterThan(0);
    expect(x.identity).toBeNull();
  });
});

describe("brand-book-ingestion — contrat zéro-fabrication", () => {
  it("le schéma accepte une extraction entièrement null (absence = null)", () => {
    const r = BrandBookExtractionSchema.safeParse({ identity: null, distinction: null, value: null, visual: null });
    expect(r.success).toBe(true);
  });
  it("le schéma accepte une extraction vide {}", () => {
    expect(BrandBookExtractionSchema.safeParse({}).success).toBe(true);
  });
  it("le schéma rejette une forme corrompue (couleurs = string au lieu d'array)", () => {
    expect(BrandBookExtractionSchema.safeParse({ visual: { colors: "rouge" } }).success).toBe(false);
  });
});

describe("brand-book-ingestion — Intent INGEST_BRAND_BOOK enregistré partout", () => {
  it("présent dans INTENT_KINDS (governor MESTOR, handler brand-book-ingestion)", () => {
    const k = INTENT_KINDS.find((i) => i.kind === "INGEST_BRAND_BOOK");
    expect(k).toBeDefined();
    expect(k?.governor).toBe("MESTOR");
    expect(k?.handler).toBe("brand-book-ingestion");
  });
  it("présent dans les SLOs", () => {
    expect(INTENT_SLOS.some((s) => s.kind === "INGEST_BRAND_BOOK")).toBe(true);
  });
  it("déclaré dans le manifest du service", () => {
    expect(manifest.acceptsIntents).toContain("INGEST_BRAND_BOOK");
    expect(manifest.governor).toBe("MESTOR");
  });
});
