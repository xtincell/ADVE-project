import { describe, it, expect } from "vitest";
import { BRAND_ASSET_KINDS, isBrandAssetKind } from "@/domain/brand-asset-kinds";
import { KIND_TO_PILLAR, inferPillarSource } from "@/server/services/source-classifier/pillar-mapping";
import { classifyByHeuristic } from "@/server/services/source-classifier/mime-heuristics";

const PILLARS = ["A", "D", "V", "E", "R", "T", "I", "S"] as const;

describe("source-classifier — KIND_TO_PILLAR exhaustivity (multi-pillar coverage)", () => {
  it("maps every BrandAssetKind to a valid PillarKey", () => {
    for (const kind of BRAND_ASSET_KINDS) {
      const pillar = KIND_TO_PILLAR[kind];
      expect(pillar, `Missing KIND_TO_PILLAR entry for ${kind}`).toBeDefined();
      expect(PILLARS).toContain(pillar);
    }
  });

  it("inferPillarSource returns a valid pillar for every kind", () => {
    for (const kind of BRAND_ASSET_KINDS) {
      const pillar = inferPillarSource(kind);
      expect(PILLARS).toContain(pillar);
    }
  });

  it("covers all 8 ADVERTIS pillars across the canonical taxonomy", () => {
    const pillarsCovered = new Set(BRAND_ASSET_KINDS.map((k) => KIND_TO_PILLAR[k]));
    for (const p of PILLARS) {
      expect(pillarsCovered.has(p), `No BrandAssetKind maps to pillar ${p}`).toBe(true);
    }
  });

  it("LOGO_FINAL → A, CHROMATIC_STRATEGY → D, PERSONA → E (sanity)", () => {
    expect(KIND_TO_PILLAR.LOGO_FINAL).toBe("A");
    expect(KIND_TO_PILLAR.CHROMATIC_STRATEGY).toBe("D");
    expect(KIND_TO_PILLAR.PERSONA).toBe("E");
    expect(KIND_TO_PILLAR.MANIFESTO).toBe("A");
    expect(KIND_TO_PILLAR.SUPERFAN_JOURNEY).toBe("E");
    expect(KIND_TO_PILLAR.BIG_IDEA).toBe("I");
  });
});

describe("source-classifier — mime+filename heuristic", () => {
  it("recognises an SVG with 'logo' in the name as LOGO_FINAL", () => {
    const r = classifyByHeuristic({
      mimeType: "image/svg+xml",
      fileType: "svg",
      fileName: "acme-logo.svg",
    });
    expect(r.kind).toBe("LOGO_FINAL");
    expect(r.confidence).toBeGreaterThan(0.7);
    expect(isBrandAssetKind(r.kind)).toBe(true);
  });

  it("falls back to KV_VISUAL with low confidence for an unnamed PNG", () => {
    const r = classifyByHeuristic({
      mimeType: "image/png",
      fileType: "png",
      fileName: "screenshot-2026-05-02.png",
    });
    expect(r.kind).toBe("KV_VISUAL");
    expect(r.needsVision).toBe(true);
  });

  it("recognises a brandbook PDF with 'manifesto' in the filename", () => {
    const r = classifyByHeuristic({
      mimeType: "application/pdf",
      fileType: "pdf",
      fileName: "acme-manifesto-v2.pdf",
    });
    expect(r.kind).toBe("MANIFESTO");
    expect(r.confidence).toBeGreaterThan(0.65);
  });

  it("defaults a generic PDF to CREATIVE_BRIEF (decomposer will refine)", () => {
    const r = classifyByHeuristic({
      mimeType: "application/pdf",
      fileType: "pdf",
      fileName: "company-document.pdf",
    });
    expect(r.kind).toBe("CREATIVE_BRIEF");
    // Low confidence triggers decomposer.
    expect(r.confidence).toBeLessThan(0.7);
  });

  it("classifies a plain-text manifesto note via content match", () => {
    const r = classifyByHeuristic({
      mimeType: "text/plain",
      fileType: "txt",
      fileName: "notes.txt",
      rawContent: "This manifesto declares our brand commitments to authenticity.",
    });
    expect(r.kind).toBe("MANIFESTO");
  });

  it("classifies a video file as VIDEO_SPOT", () => {
    const r = classifyByHeuristic({
      mimeType: "video/mp4",
      fileType: "mp4",
      fileName: "campaign-spot-final.mp4",
    });
    expect(r.kind).toBe("VIDEO_SPOT");
    expect(r.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("never returns an invalid BrandAssetKind", () => {
    const samples = [
      { mimeType: null, fileType: null, fileName: null },
      { mimeType: "application/octet-stream", fileType: "bin", fileName: "weird.bin" },
      { mimeType: "image/jpeg", fileType: "jpg", fileName: "" },
    ];
    for (const s of samples) {
      const r = classifyByHeuristic(s);
      expect(isBrandAssetKind(r.kind)).toBe(true);
    }
  });
});
