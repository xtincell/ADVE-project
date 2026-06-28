import { describe, it, expect } from "vitest";
import { computeQuoteTotals, quoteReference, type QuoteLine } from "@/server/services/mission-quote";

/** Devis structuré (ADR-0118) — calculs purs, zéro mock. */

describe("mission-quote — computeQuoteTotals", () => {
  it("sous-total = Σ qty×unitPrice, TVA et total", () => {
    const lines: QuoteLine[] = [
      { label: "Séance photo", qty: 1, unitPrice: 300000 },
      { label: "Retouche", qty: 10, unitPrice: 5000 },
    ];
    const t = computeQuoteTotals(lines, 19.25); // TVA Cameroun
    expect(t.subtotal).toBe(350000);
    expect(t.taxAmount).toBe(67375); // 350000 × 0.1925
    expect(t.total).toBe(417375);
  });

  it("TVA 0 → total = sous-total", () => {
    const t = computeQuoteTotals([{ label: "x", qty: 2, unitPrice: 100 }], 0);
    expect(t.subtotal).toBe(200);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(200);
  });

  it("valeurs non finies traitées comme 0 (jamais NaN)", () => {
    const t = computeQuoteTotals([{ label: "x", qty: NaN, unitPrice: 100 }], 10);
    expect(t.subtotal).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe("mission-quote — quoteReference", () => {
  it("référence déterministe DEV-<mission8>-<seq>", () => {
    expect(quoteReference("abcdef1234567890", 1)).toBe("DEV-ABCDEF12-001");
    expect(quoteReference("abcdef1234567890", 42)).toBe("DEV-ABCDEF12-042");
  });
});
