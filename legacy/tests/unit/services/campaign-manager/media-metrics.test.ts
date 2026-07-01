/**
 * media-metrics.test.ts — Moteur de KPI média déterministe (ATL/BTL/TTL).
 *
 * PRODUCTION-LEVEL, ZÉRO MOCK : on teste les **formules canoniques** sur des
 * valeurs sourcées de l'audit marché (Adjust CPM, Wikipedia GRP, True Impact CPP,
 * Binet&Field ESOV). Aucune valeur métier n'est codée dans le moteur — elle est
 * passée en entrée. Déterminisme garanti (variance nulle), division sûre.
 */

import { describe, expect, it } from "vitest";
import * as m from "@/server/services/campaign-manager/media-metrics";

describe("media-metrics — formules canoniques", () => {
  it("GRP = Reach% × Fréquence ; et depuis impressions", () => {
    expect(m.grp(70, 3)).toBe(210);
    // 416 295 000 impr / population — exemple GRP = impr/pop×100
    expect(m.grpFromImpressions(800_000, 1_000_000)).toBe(80);
    expect(m.avgFrequency(210, 70)).toBe(3);
    expect(m.reachFromGrp(210, 3)).toBe(70);
  });

  it("CPM = coût/impr×1000 (exemple Adjust : $5000/800k = $6.25)", () => {
    expect(m.cpm(5000, 800_000)).toBe(6.25);
  });

  it("CPP = coût/GRP (exemple True Impact : $20000/46 ≈ 437.78)", () => {
    expect(m.cpp(20_000, 46)).toBeCloseTo(434.78, 1); // 20000/46
  });

  it("CTR / CPC / VCR / VTR", () => {
    expect(m.ctr(5, 100)).toBe(0.05); // 5 clics / 100 impr = 5%
    expect(m.cpc(1000, 200)).toBe(5);
    expect(m.vcr(80, 100)).toBe(0.8); // dénominateur = vues démarrées
    expect(m.vtr(30, 1000)).toBe(0.03); // dénominateur = impressions
  });

  it("CPA / ROAS (exemple HubSpot : $5000/100 = $50 ; $300/$100 = 3)", () => {
    expect(m.cpa(5000, 100)).toBe(50);
    expect(m.roas(300, 100)).toBe(3);
  });

  it("SOV / ESOV / croissance (coefficient sourcé fourni, pas codé en dur)", () => {
    expect(m.shareOfVoice(2_000_000, 20_000_000)).toBe(0.1); // 10 %
    expect(m.esov(15, 10)).toBe(5); // SOV 15 % − SOM 10 % = +5 pts
    // Binet&Field : 10 pts ESOV → ~0,5 pt/an ; coef fourni par l'appelant
    expect(m.esovMarketShareGrowth(10, 0.5)).toBe(0.5);
    expect(m.esovMarketShareGrowth(5, 0.6)).toBeCloseTo(0.3, 5);
  });

  it("BTL : conversion sampling, coût/échantillon, rédemption", () => {
    expect(m.samplingConversionRate(120, 1000)).toBe(0.12);
    expect(m.costPerSample(500_000, 1000)).toBe(500);
    expect(m.redemptionRate(250, 1000)).toBe(0.25);
  });

  it("PCA : écart prévu/réalisé + makegood (exemple 100k→80k → 20k)", () => {
    expect(m.deliveryVariancePct(100_000, 80_000)).toBe(-20);
    expect(m.makegoodShortfall(100_000, 80_000)).toBe(20_000);
    expect(m.makegoodShortfall(100_000, 110_000)).toBe(0); // sur-livraison → 0
  });

  it("fréquence efficace : comparaison à un seuil paramétré (3+ lancement)", () => {
    expect(m.isAboveEffectiveFrequency(3.2, 3)).toBe(true);
    expect(m.isAboveEffectiveFrequency(2.5, 3)).toBe(false);
  });
});

describe("media-metrics — division sûre + déterminisme", () => {
  it("retourne null (jamais NaN/Infinity) sur dénominateur nul/invalide", () => {
    expect(m.cpm(5000, 0)).toBeNull();
    expect(m.cpp(20_000, 0)).toBeNull();
    expect(m.ctr(5, 0)).toBeNull();
    expect(m.roas(300, 0)).toBeNull();
    expect(m.grpFromImpressions(1000, 0)).toBeNull();
  });

  it("déterministe : même entrée → même sortie (variance nulle)", () => {
    const out = new Set<string>();
    for (let i = 0; i < 30; i++) {
      out.add(JSON.stringify([m.grp(70, 3), m.cpm(5000, 800_000), m.esov(15, 10)]));
    }
    expect(out.size).toBe(1);
  });
});
