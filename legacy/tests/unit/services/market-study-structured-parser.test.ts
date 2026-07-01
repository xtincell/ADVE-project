import { describe, it, expect } from "vitest";
import { parseStructuredMarketStudy } from "@/server/services/seshat/market-study-ingestion/extractor-structured";

const FRONTMATTER_OK = `---
format: structured-market-study/v1
study:
  title: "ZA Cosmetics Pulse 2025"
  publisher: "Euromonitor"
  publishedAt: "2025-09-15"
  methodology: "Panel 1200 + sell-out Nielsen"
  sampleSize: 1200
  geography: "ZA"
  sectorCoverage:
    - "cosmetics"
    - "beauty"
scoping:
  countryCode: "ZA"
  sector: "cosmetics"
  brandNature: "PRODUCT"
  cascadeLevel: "MASTER_BRAND"
  period: "2024-2029"
sources:
  - "Euromonitor 2025 Beauty Pulse"
  - "Nielsen ZA Q3 2024"
---
`;

function buildDoc(sectionsBody: string): string {
  return FRONTMATTER_OK + "\n# Étude de marché — fiche\n\n" + sectionsBody;
}

const ALL_SECTIONS_FILLED = `## §1 TAM / SAM / SOM

| metric | value | currency | year | methodology | source |
|---|---|---|---|---|---|
| TAM | 1200 | USD M | 2024 | top-down | "page 12" |
| SAM | 600 | USD M | 2024 | bottom-up | "page 13" |
| SOM | - | - | - | - | - |

## §2 Croissance

| segment | cagr | period | source |
|---|---|---|---|
| skincare premium | 0.085 | 2024-2029 | "page 18" |

## §3 Concurrents

| name | marketSharePct | year | source |
|---|---|---|---|
| L'Oréal | 22.0 | 2024 | "page 25" |
| Unilever | 18.5 | 2024 | "page 25" |

## §4 Segments

| segment | sizePct | demographics | behaviors | painPoints |
|---|---|---|---|---|
| Aspirational urban GenZ | 28.0 | age=18-25, income=mid | social-driven; influencer-buying | price; trust |

## §5 Prix

| tier | range | asp | source |
|---|---|---|---|
| premium | 200-500 ZAR | 350 | "page 32" |

## §6 Canaux

| channel | sharePct | growthTrend |
|---|---|---|
| e-commerce | 12.5 | +18% YoY |
| pharmacy | 35.0 | flat |

## §7 Réglementaire

| regulation | impactSeverity | timeline |
|---|---|---|
| POPIA data localization | HIGH | Q1 2026 |

## §8 Macro

| trend | evidence | timeHorizon |
|---|---|---|
| load-shedding ESKOM | "industry assoc filings" | MEDIUM |

## §9 Signaux faibles

| event | causalChain | impactCategory | urgency |
|---|---|---|---|
| TikTok Shop launch ZA | platform onboarding -> creator commerce -> mass adoption | DTC | HIGH |

## §10 Trend Tracker

| code | label | value | year | source | confidence |
|---|---|---|---|---|---|
| A1 | Confiance consommateur | 105 | 2024 | "page 12" | 0.9 |
| A2 | Inflation IPC (12 mois) | 5.2 | 2024 | "page 14" | 0.95 |
| B3 | Mobile money pénétration | - | - | - | - |
| E12 | Top 3 leaders parts de marché | 58 | 2024 | "page 25" | - |
`;

describe("parseStructuredMarketStudy — happy path", () => {
  it("extracts all sections from a fully-filled document", () => {
    const result = parseStructuredMarketStudy(buildDoc(ALL_SECTIONS_FILLED));
    if (!result.ok) throw new Error(`expected ok, got errors: ${result.errors.join(" | ")}`);

    expect(result.frontmatter.format).toBe("structured-market-study/v1");
    expect(result.frontmatter.study.title).toBe("ZA Cosmetics Pulse 2025");
    expect(result.frontmatter.study.sectorCoverage).toEqual(["cosmetics", "beauty"]);
    expect(result.frontmatter.scoping?.countryCode).toBe("ZA");
    expect(result.frontmatter.scoping?.sector).toBe("cosmetics");
    expect(result.frontmatter.sources).toEqual([
      "Euromonitor 2025 Beauty Pulse",
      "Nielsen ZA Q3 2024",
    ]);

    const ext = result.extraction;
    expect(ext.study.title).toBe("ZA Cosmetics Pulse 2025");
    expect(ext.study.geography).toBe("ZA");
    expect(ext.study.sampleSize).toBe(1200);

    expect(ext.tam).toEqual({
      value: 1200,
      year: 2024,
      currency: "USD M",
      methodology: "top-down",
      source: '"page 12"',
    });
    expect(ext.sam?.value).toBe(600);
    expect(ext.som).toBeUndefined();

    expect(ext.growthRates).toHaveLength(1);
    expect(ext.growthRates[0]).toEqual({
      segment: "skincare premium",
      cagr: 0.085,
      period: "2024-2029",
      source: '"page 18"',
    });

    expect(ext.competitorShares).toHaveLength(2);
    expect(ext.competitorShares[0]?.name).toBe("L'Oréal");
    expect(ext.competitorShares[0]?.marketSharePct).toBe(22.0);

    expect(ext.consumerSegments).toHaveLength(1);
    const seg = ext.consumerSegments[0]!;
    expect(seg.segment).toBe("Aspirational urban GenZ");
    expect(seg.sizePct).toBe(28.0);
    expect(seg.demographics).toEqual({ age: "18-25", income: "mid" });
    expect(seg.behaviors).toEqual(["social-driven", "influencer-buying"]);
    expect(seg.painPoints).toEqual(["price", "trust"]);

    expect(ext.pricePoints).toHaveLength(1);
    expect(ext.pricePoints[0]?.asp).toBe(350);

    expect(ext.channelMix).toHaveLength(2);
    expect(ext.channelMix[0]?.channel).toBe("e-commerce");
    expect(ext.channelMix[0]?.sharePct).toBe(12.5);

    expect(ext.regulatorySignals).toHaveLength(1);
    expect(ext.regulatorySignals[0]?.impactSeverity).toBe("HIGH");

    expect(ext.macroSignals).toHaveLength(1);
    expect(ext.macroSignals[0]?.timeHorizon).toBe("MEDIUM");

    expect(ext.weakSignals).toHaveLength(1);
    expect(ext.weakSignals[0]?.causalChain).toEqual([
      "platform onboarding",
      "creator commerce",
      "mass adoption",
    ]);
    expect(ext.weakSignals[0]?.urgency).toBe("HIGH");

    expect(ext.trendTracker).toBeDefined();
    expect(Object.keys(ext.trendTracker ?? {})).toEqual(["A1", "A2", "E12"]);
    expect(ext.trendTracker?.A1?.value).toBe(105);
    expect(ext.trendTracker?.A1?.confidence).toBe(0.9);
    expect(ext.trendTracker?.B3).toBeUndefined();
    expect(ext.trendTracker?.E12?.confidence).toBeUndefined();
  });
});

describe("parseStructuredMarketStudy — anti-fabrication", () => {
  it("treats `-` and empty cells as null/absent across all sections", () => {
    const empty = `## §1 TAM / SAM / SOM

| metric | value | currency | year | methodology | source |
|---|---|---|---|---|---|
| TAM | - | - | - | - | - |
| SAM | - | - | - | - | - |
| SOM | - | - | - | - | - |

## §2 Croissance

| segment | cagr | period | source |
|---|---|---|---|

## §3 Concurrents

| name | marketSharePct | year | source |
|---|---|---|---|

## §4 Segments

| segment | sizePct | demographics | behaviors | painPoints |
|---|---|---|---|---|

## §5 Prix

| tier | range | asp | source |
|---|---|---|---|

## §6 Canaux

| channel | sharePct | growthTrend |
|---|---|---|

## §7 Réglementaire

| regulation | impactSeverity | timeline |
|---|---|---|

## §8 Macro

| trend | evidence | timeHorizon |
|---|---|---|

## §9 Signaux faibles

| event | causalChain | impactCategory | urgency |
|---|---|---|---|

## §10 Trend Tracker

| code | label | value | year | source | confidence |
|---|---|---|---|---|---|
`;
    const result = parseStructuredMarketStudy(buildDoc(empty));
    if (!result.ok) throw new Error(`expected ok, got: ${result.errors.join(" | ")}`);
    expect(result.extraction.tam).toBeUndefined();
    expect(result.extraction.sam).toBeUndefined();
    expect(result.extraction.som).toBeUndefined();
    expect(result.extraction.growthRates).toEqual([]);
    expect(result.extraction.competitorShares).toEqual([]);
    expect(result.extraction.consumerSegments).toEqual([]);
    expect(result.extraction.pricePoints).toEqual([]);
    expect(result.extraction.channelMix).toEqual([]);
    expect(result.extraction.regulatorySignals).toEqual([]);
    expect(result.extraction.macroSignals).toEqual([]);
    expect(result.extraction.weakSignals).toEqual([]);
    expect(result.extraction.trendTracker).toBeUndefined();
  });

  it("skips trend tracker rows where value is empty (anti-fab)", () => {
    const body = `${ALL_SECTIONS_FILLED}`.replace(
      "| A1 | Confiance consommateur | 105 | 2024 | \"page 12\" | 0.9 |",
      "| A1 | Confiance consommateur | - | - | - | - |",
    );
    const result = parseStructuredMarketStudy(buildDoc(body));
    if (!result.ok) throw new Error(result.errors.join(" | "));
    expect(result.extraction.trendTracker?.A1).toBeUndefined();
    expect(result.extraction.trendTracker?.A2).toBeDefined();
  });
});

describe("parseStructuredMarketStudy — error cases", () => {
  it("rejects a document missing the frontmatter delimiters", () => {
    const result = parseStructuredMarketStudy("# No frontmatter\n\n## §1 TAM");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" | ")).toMatch(/frontmatter/i);
  });

  it("rejects a wrong format version", () => {
    const fm = FRONTMATTER_OK.replace(
      "format: structured-market-study/v1",
      "format: structured-market-study/v999",
    );
    const result = parseStructuredMarketStudy(fm + ALL_SECTIONS_FILLED);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" | ")).toMatch(/Unsupported format/);
  });

  it("rejects placeholders left in study.title", () => {
    const fm = FRONTMATTER_OK.replace(
      'title: "ZA Cosmetics Pulse 2025"',
      'title: "REMPLIR — titre exact"',
    );
    const result = parseStructuredMarketStudy(fm + ALL_SECTIONS_FILLED);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" | ")).toMatch(/title.*placeholder/i);
  });

  it("rejects a section table with mismatched headers", () => {
    const broken = `## §1 TAM / SAM / SOM

| metric | value | year | source |
|---|---|---|---|
| TAM | 1200 | 2024 | "page 12" |

## §3 Concurrents

| name | marketSharePct | year | source |
|---|---|---|---|
| L'Oréal | 22.0 | 2024 | "page 25" |
`;
    const result = parseStructuredMarketStudy(buildDoc(broken));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" | ")).toMatch(/§1.*header mismatch/);
  });

  it("rejects an invalid impactSeverity enum value", () => {
    const broken = `## §7 Réglementaire

| regulation | impactSeverity | timeline |
|---|---|---|
| FX controls | EXTREME | 2026 |
`;
    const result = parseStructuredMarketStudy(buildDoc(broken));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" | ")).toMatch(/impactSeverity.*invalid value "EXTREME"/);
  });

  it("rejects partially-filled TAM rows (value without year)", () => {
    const broken = `## §1 TAM / SAM / SOM

| metric | value | currency | year | methodology | source |
|---|---|---|---|---|---|
| TAM | 1200 | USD M | - | top-down | "page 12" |
`;
    const result = parseStructuredMarketStudy(buildDoc(broken));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" | ")).toMatch(/§1 TAM.*required/);
  });

  it("warns when a section is missing entirely from the document", () => {
    const partial = `## §1 TAM / SAM / SOM

| metric | value | currency | year | methodology | source |
|---|---|---|---|---|---|
| TAM | 1200 | USD M | 2024 | top-down | "page 12" |
`;
    const result = parseStructuredMarketStudy(buildDoc(partial));
    if (!result.ok) throw new Error(result.errors.join(" | "));
    const warningsJoined = result.warnings.join(" | ");
    expect(warningsJoined).toMatch(/§3.*absent/);
    expect(warningsJoined).toMatch(/§10.*absent/);
  });
});

describe("parseStructuredMarketStudy — frontmatter edge cases", () => {
  it("supports frontmatter with no scoping block", () => {
    const fm = `---
format: structured-market-study/v1
study:
  title: "Minimal study"
  geography: "CM"
  sectorCoverage:
    - "telco"
---
`;
    const result = parseStructuredMarketStudy(fm + "\n## §1 TAM / SAM / SOM\n\n| metric | value | currency | year | methodology | source |\n|---|---|---|---|---|---|\n");
    if (!result.ok) throw new Error(result.errors.join(" | "));
    expect(result.frontmatter.scoping).toBeDefined();
    expect(result.frontmatter.scoping?.countryCode).toBeUndefined();
  });

  it("normalizes sampleSize=0 to undefined (placeholder convention)", () => {
    const fm = FRONTMATTER_OK.replace("sampleSize: 1200", "sampleSize: 0");
    const result = parseStructuredMarketStudy(fm + ALL_SECTIONS_FILLED);
    if (!result.ok) throw new Error(result.errors.join(" | "));
    expect(result.extraction.study.sampleSize).toBeUndefined();
  });
});
