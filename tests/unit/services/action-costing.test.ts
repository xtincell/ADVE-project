/**
 * Thot — atomized composite action-costing (ADR-0093) — pure deterministic tests.
 *
 * No DB : exercises the pure estimator core, zone-fallback logic, unit conversion,
 * catalog integrity, and enum parity with the Prisma schema.
 */

import { describe, it, expect } from "vitest";
import {
  CostDriver as PrismaCostDriver,
  CostUnit as PrismaCostUnit,
  ZoneIndexFamily as PrismaZoneIndexFamily,
} from "@prisma/client";

import { ACTION_COST_CATALOG, CATALOG_BY_KEY } from "@/server/services/financial-brain/action-costing/catalog";
import {
  computeActionCost,
  resolveCatalogComponentsFixed,
  QUALITY_SENSITIVE_DRIVERS,
} from "@/server/services/financial-brain/action-costing/estimator";
import { convertRateUnit } from "@/server/services/financial-brain/action-costing/provider-rate";
import { convertFixedParity, EUR_TO_CFA } from "@/server/services/financial-brain/action-costing/currency-fx";
import { resolveAcrossChain, neighborsOf } from "@/server/services/financial-brain/action-costing/zone-index";
import { ZONE_INDEX_SEED } from "@/server/services/financial-brain/action-costing/seed-data";
import type { ComputeContext, EstimateInput } from "@/server/services/financial-brain/action-costing/types";

const baseContext = (over: Partial<ComputeContext> = {}): ComputeContext => ({
  zoneCode: "CM",
  baseZoneCode: "CM",
  currency: "XAF",
  zoneMultiplier: 1,
  taxRatePct: 0.1925,
  usedFallback: false,
  fallbackChain: [],
  ...over,
});

function estimatePhoto(input: EstimateInput, ctx: ComputeContext) {
  const tpl = CATALOG_BY_KEY.PHOTO_SESSION_HALF_DAY!;
  return computeActionCost({
    templateKey: tpl.actionKey,
    baseCurrency: "XAF",
    defaultMarginPct: 0.2,
    defaultContingencyPct: 0.05,
    components: resolveCatalogComponentsFixed(tpl),
    context: ctx,
    input,
  });
}

describe("action-costing — enum parity with Prisma schema", () => {
  const drivers = new Set(Object.values(PrismaCostDriver));
  const units = new Set(Object.values(PrismaCostUnit));
  const families = new Set(Object.values(PrismaZoneIndexFamily));

  it("every catalog atom uses a valid CostDriver + CostUnit", () => {
    for (const t of ACTION_COST_CATALOG) {
      for (const c of t.components) {
        expect(drivers.has(c.driver), `${t.actionKey}/${c.label} driver`).toBe(true);
        if (c.unit) expect(units.has(c.unit), `${t.actionKey}/${c.label} unit`).toBe(true);
        if (c.indexFamily) expect(families.has(c.indexFamily)).toBe(true);
      }
    }
  });

  it("every seeded zone-index uses a valid ZoneIndexFamily", () => {
    for (const z of ZONE_INDEX_SEED) expect(families.has(z.family)).toBe(true);
  });

  it("quality-sensitive drivers are a subset of the driver enum", () => {
    for (const d of QUALITY_SENSITIVE_DRIVERS) expect(drivers.has(d)).toBe(true);
  });
});

describe("action-costing — catalog integrity", () => {
  it("actionKeys are unique", () => {
    const keys = ACTION_COST_CATALOG.map((t) => t.actionKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every template has at least one atom + non-negative baseRates", () => {
    for (const t of ACTION_COST_CATALOG) {
      expect(t.components.length, t.actionKey).toBeGreaterThan(0);
      for (const c of t.components) expect(c.baseRate ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it("the flagship séance photo is atomized (matériel + cout horaire + lieu + post-prod)", () => {
    const photo = CATALOG_BY_KEY.PHOTO_SESSION_HALF_DAY!;
    const drv = new Set(photo.components.map((c) => c.driver));
    expect(drv.has("LABOR")).toBe(true);
    expect(drv.has("EQUIPMENT_RENTAL")).toBe(true);
    expect(drv.has("LOCATION")).toBe(true);
    expect(drv.has("POST_PRODUCTION")).toBe(true);
  });
});

describe("action-costing — deterministic composite estimate", () => {
  it("séance photo @ CM / STANDARD composes the exact atomized total", () => {
    const r = estimatePhoto({ zoneCode: "CM", qualityTier: "STANDARD" }, baseContext());
    // 100000 + 32000 + 60000 + 40000 + 75000 + 50000 + 72000 + 25000
    expect(r.subtotalHt).toBe(454000);
    expect(r.marginAmount).toBe(90800); // 20%
    expect(r.contingencyAmount).toBe(22700); // 5%
    expect(r.totalHt).toBe(567500);
    expect(r.taxAmount).toBe(109244); // round(567500 * 0.1925)
    expect(r.totalTtc).toBe(676744);
    expect(r.amount).toBe(r.totalTtc);
    expect(r.lineItems).toHaveLength(8);
    expect(r.currency).toBe("XAF");
  });

  it("is deterministic — same inputs yield the same numbers", () => {
    const a = estimatePhoto({ zoneCode: "CM" }, baseContext());
    const b = estimatePhoto({ zoneCode: "CM" }, baseContext());
    expect(b.totalTtc).toBe(a.totalTtc);
    expect(b.lineItems.map((l) => l.amount)).toEqual(a.lineItems.map((l) => l.amount));
  });

  it("quality tier scales the production-effort atoms (PREMIUM > STANDARD > BASIC)", () => {
    const basic = estimatePhoto({ zoneCode: "CM", qualityTier: "BASIC" }, baseContext());
    const std = estimatePhoto({ zoneCode: "CM", qualityTier: "STANDARD" }, baseContext());
    const prem = estimatePhoto({ zoneCode: "CM", qualityTier: "PREMIUM" }, baseContext());
    expect(basic.totalTtc).toBeLessThan(std.totalTtc);
    expect(std.totalTtc).toBeLessThan(prem.totalTtc);
  });

  it("market cost-of-living multiplier scales base-zone atoms", () => {
    const cm = estimatePhoto({ zoneCode: "CM" }, baseContext());
    const ga = estimatePhoto({ zoneCode: "GA" }, baseContext({ zoneCode: "GA", zoneMultiplier: 1.3 }));
    expect(ga.subtotalHt).toBe(Math.round(cm.subtotalHt * 1.3));
  });

  it("disabling an optional atom removes it from the subtotal", () => {
    const full = estimatePhoto({ zoneCode: "CM" }, baseContext());
    const noMakeup = estimatePhoto(
      { zoneCode: "CM", componentOverrides: { "Maquillage / stylisme": { disabled: true } } },
      baseContext(),
    );
    expect(noMakeup.lineItems).toHaveLength(full.lineItems.length - 1);
    expect(noMakeup.subtotalHt).toBe(full.subtotalHt - 50000);
  });

  it("a quantity override scales the targeted atom (cout horaire × durée)", () => {
    const base = estimatePhoto({ zoneCode: "CM" }, baseContext());
    const longer = estimatePhoto(
      { zoneCode: "CM", componentOverrides: { Retouche: { quantity: 12 } } },
      baseContext(),
    );
    // Retouche 12000 × (12 - 6) = +72000
    expect(longer.subtotalHt).toBe(base.subtotalHt + 72000);
  });

  it("every priced template produces a positive TTC at base zone", () => {
    for (const t of ACTION_COST_CATALOG) {
      const r = computeActionCost({
        templateKey: t.actionKey,
        baseCurrency: "XAF",
        defaultMarginPct: t.defaultMarginPct ?? 0.2,
        defaultContingencyPct: t.defaultContingencyPct ?? 0.05,
        components: resolveCatalogComponentsFixed(t),
        context: baseContext(),
        input: { zoneCode: "CM" },
      });
      expect(r.totalTtc, t.actionKey).toBeGreaterThan(0);
      expect(r.totalTtc).toBeGreaterThan(r.totalHt);
    }
  });
});

describe("action-costing — zone-index fallback (ADR-0087 §3)", () => {
  it("direct zone hit → no fallback", () => {
    const r = resolveAcrossChain("CI", ["SN", "BF"], (z) => (z === "CI" ? 105 : null));
    expect(r.value).toBe(105);
    expect(r.usedFallback).toBe(false);
    expect(r.fallbackChain).toEqual([]);
  });

  it("missing zone → economic-neighbor fallback with chain", () => {
    const r = resolveAcrossChain("BF", ["CI", "ML", "SN"], (z) => (z === "ML" ? 92 : null));
    expect(r.value).toBe(92);
    expect(r.usedFallback).toBe(true);
    expect(r.zoneUsed).toBe("ML");
    expect(r.fallbackChain).toEqual(["CI", "ML"]);
  });

  it("no value anywhere → null", () => {
    const r = resolveAcrossChain("XX", ["YY"], () => null);
    expect(r.value).toBeNull();
  });

  it("neighborsOf surfaces direct neighbors then bloc peers", () => {
    const cm = neighborsOf("CM");
    expect(cm).toContain("GA");
    expect(cm).not.toContain("CM");
  });
});

describe("action-costing — provider rate unit conversion", () => {
  it("converts DAY ↔ HOUR with HOURS_PER_DAY=8", () => {
    expect(convertRateUnit(80000, "DAY", "HOUR")).toBe(10000);
    expect(convertRateUnit(10000, "HOUR", "DAY")).toBe(80000);
    expect(convertRateUnit(80000, "DAY", "HALF_DAY")).toBe(40000);
  });

  it("passes through non-time units unchanged", () => {
    expect(convertRateUnit(50000, "FLAT", "DAY")).toBe(50000);
    expect(convertRateUnit(12000, "SQUARE_METER", "HOUR")).toBe(12000);
  });
});

describe("action-costing — F6 conversion de devise à parité FIXE", () => {
  it("identité si même devise", () => {
    expect(convertFixedParity(90000, "XAF", "XAF")).toBe(90000);
    expect(convertFixedParity(500, "EUR", "EUR")).toBe(500);
  });

  it("XOF ↔ XAF = 1:1 (parité CFA commune)", () => {
    expect(convertFixedParity(120000, "XOF", "XAF")).toBe(120000);
    expect(convertFixedParity(75000, "XAF", "XOF")).toBe(75000);
  });

  it("EUR → CFA multiplie par la parité gelée 655,957", () => {
    expect(convertFixedParity(100, "EUR", "XAF")).toBeCloseTo(100 * EUR_TO_CFA, 6);
    expect(convertFixedParity(100, "EUR", "XOF")).toBeCloseTo(100 * EUR_TO_CFA, 6);
  });

  it("CFA → EUR divise par la parité (aller-retour exact)", () => {
    const eur = 250;
    const xaf = convertFixedParity(eur, "EUR", "XAF")!;
    expect(convertFixedParity(xaf, "XAF", "EUR")).toBeCloseTo(eur, 9);
  });

  it("devise flottante → null (non convertible sans source de taux — jamais de mécompte)", () => {
    expect(convertFixedParity(100, "USD", "XAF")).toBeNull();
    expect(convertFixedParity(100, "XAF", "USD")).toBeNull();
    expect(convertFixedParity(100, "NGN", "XOF")).toBeNull();
    expect(convertFixedParity(100, "GHS", "EUR")).toBeNull();
  });
});
