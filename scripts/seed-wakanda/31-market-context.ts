/**
 * WAKANDA SEED — Market context + Brand context (Seshat wake-up)
 *
 * Réveille Seshat (telemetry tier 1 + tier 3) :
 *  - MarketBenchmark (~36) : CPM, salaires, prod costs across 5 sectors × Wakanda/CM/CI/SN
 *  - MarketSizing (~12) : TAM/SAM/SOM par secteur 2024-2026
 *  - CostStructure (~10) : décomposition % revenue par sector
 *  - CompetitiveLandscape (~6) : leader share + HHI par secteur
 *  - MarketDocument (~6) : études markdown
 *  - MarketContextNode (~6) : tier 3 vector-ready (snapshots des MarketDocuments)
 *  - BrandContextNode (~24) : tier 3 BLISS narrative + pillars + recos embedded
 *  - BrandAction (~30) : taxonomie Pillar I per BLISS
 *  - Sector (5) : entités sectorielles avec Overton state
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedMarketContext(prisma: PrismaClient, brands: Brands) {

  // ============================================================
  // SECTORS (5 — secteurs Wakanda canon)
  // ============================================================
  const sectors = [
    { id: "wk-sector-cosmetics", slug: "cosmetics-wk", name: "Cosmétiques Wakanda",
      culturalAxis: { traditional_to_modern: 0.35, mass_to_premium: 0.78, local_to_global: 0.45 },
      dominantNarratives: ["heritage premium", "vibranium-skincare", "afro-natural"],
      overtonState: { center: "premium-natural-heritage", drift: "+0.18 toward heritage", lastTarsisRefresh: "2026-04-08" } },
    { id: "wk-sector-fintech", slug: "fintech-wk", name: "Fintech Wakanda",
      culturalAxis: { traditional_to_modern: 0.85, mass_to_premium: 0.30, local_to_global: 0.55 },
      dominantNarratives: ["mobile money universel", "épargne digitale", "regtech"],
      overtonState: { center: "epargne-digitale-jeunes", drift: "+0.22 vers automatisation", lastTarsisRefresh: "2026-04-09" } },
    { id: "wk-sector-fmcg-beverage", slug: "fmcg-beverage-wk", name: "FMCG Beverage Wakanda",
      culturalAxis: { traditional_to_modern: 0.50, mass_to_premium: 0.55, local_to_global: 0.20 },
      dominantNarratives: ["craft local", "panthère totem", "moonlit ritual"],
      overtonState: { center: "craft-heritage", drift: "stable", lastTarsisRefresh: "2026-04-05" } },
    { id: "wk-sector-edtech", slug: "edtech-wk", name: "EdTech Wakanda",
      culturalAxis: { traditional_to_modern: 0.90, mass_to_premium: 0.45, local_to_global: 0.70 },
      dominantNarratives: ["IA pour enfants", "code africain", "femmes-tech"],
      overtonState: { center: "code-africain", drift: "+0.30 vers IA", lastTarsisRefresh: "2026-04-07" } },
    { id: "wk-sector-tourism-heritage", slug: "tourism-heritage-wk", name: "Tourisme Heritage Wakanda",
      culturalAxis: { traditional_to_modern: 0.20, mass_to_premium: 0.75, local_to_global: 0.85 },
      dominantNarratives: ["ancestralité", "patrimoine vivant", "luxury-roots"],
      overtonState: { center: "luxe-spirituel", drift: "+0.10 vers immersif", lastTarsisRefresh: "2026-04-06" } },
  ];

  for (const s of sectors) {
    await prisma.sector.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        id: s.id,
        slug: s.slug,
        name: s.name,
        culturalAxis: s.culturalAxis as Prisma.InputJsonValue,
        dominantNarratives: s.dominantNarratives,
        overtonState: s.overtonState as Prisma.InputJsonValue,
        lastObservedAt: daysAfter(T.now, -2),
        countryCodes: ["WK", "CM", "CI", "SN"],
      },
    });
    track("Sector");
  }

  // ============================================================
  // MARKET BENCHMARKS (~36)
  // ============================================================
  const benchmarks: Array<{
    id: string;
    country: string;
    sector: string;
    metric: string;
    unit: string;
    p10: number;
    p50: number;
    p90: number;
    sampleSize: number;
    notes?: string;
  }> = [
    // CPM Meta — Cosmetics, Fintech, FMCG across markets
    { id: "wk-bench-cpm-meta-wk-cosm",  country: "WK", sector: "Cosmetiques", metric: "CPM_META",      unit: "FCFA", p10: 1200, p50: 2400, p90: 4800, sampleSize: 48, notes: "Q1 2026, beauty audience" },
    { id: "wk-bench-cpm-meta-cm-cosm",  country: "CM", sector: "Cosmetiques", metric: "CPM_META",      unit: "FCFA", p10: 1100, p50: 2100, p90: 4200, sampleSize: 32 },
    { id: "wk-bench-cpm-meta-wk-fin",   country: "WK", sector: "Fintech",     metric: "CPM_META",      unit: "FCFA", p10: 950,  p50: 1850, p90: 3600, sampleSize: 28 },
    { id: "wk-bench-cpm-meta-wk-fmcg",  country: "WK", sector: "FMCG",        metric: "CPM_META",      unit: "FCFA", p10: 600,  p50: 1200, p90: 2400, sampleSize: 64 },
    { id: "wk-bench-cpm-meta-wk-edu",   country: "WK", sector: "EdTech",      metric: "CPM_META",      unit: "FCFA", p10: 800,  p50: 1500, p90: 2800, sampleSize: 18 },
    // CPC Google
    { id: "wk-bench-cpc-google-wk-cosm", country: "WK", sector: "Cosmetiques", metric: "CPC_GOOGLE",   unit: "FCFA", p10: 80,   p50: 180,  p90: 380,  sampleSize: 42 },
    { id: "wk-bench-cpc-google-wk-fin",  country: "WK", sector: "Fintech",     metric: "CPC_GOOGLE",   unit: "FCFA", p10: 120,  p50: 240,  p90: 520,  sampleSize: 36 },
    { id: "wk-bench-cpc-google-wk-fmcg", country: "WK", sector: "FMCG",        metric: "CPC_GOOGLE",   unit: "FCFA", p10: 60,   p50: 130,  p90: 280,  sampleSize: 54 },
    // CPA Lead
    { id: "wk-bench-cpa-lead-wk-cosm",   country: "WK", sector: "Cosmetiques", metric: "CPA_LEAD",     unit: "FCFA", p10: 1800, p50: 3500, p90: 6800, sampleSize: 28 },
    { id: "wk-bench-cpa-lead-wk-fin",    country: "WK", sector: "Fintech",     metric: "CPA_LEAD",     unit: "FCFA", p10: 2200, p50: 4500, p90: 9200, sampleSize: 22 },
    // PROD spot 30s
    { id: "wk-bench-prod-30s-wk-cosm",   country: "WK", sector: "Cosmetiques", metric: "PROD_SPOT_30S", unit: "FCFA", p10: 1_200_000, p50: 3_500_000, p90: 8_500_000, sampleSize: 18 },
    { id: "wk-bench-prod-30s-wk-fin",    country: "WK", sector: "Fintech",     metric: "PROD_SPOT_30S", unit: "FCFA", p10: 800_000,   p50: 2_400_000, p90: 6_200_000, sampleSize: 14 },
    { id: "wk-bench-prod-30s-wk-fmcg",   country: "WK", sector: "FMCG",        metric: "PROD_SPOT_30S", unit: "FCFA", p10: 600_000,   p50: 1_800_000, p90: 4_500_000, sampleSize: 22 },
    // Salary director
    { id: "wk-bench-sal-dir-wk",         country: "WK", sector: "AGENCY",      metric: "SALARY_DIRECTOR", unit: "FCFA", p10: 850_000,  p50: 1_400_000, p90: 2_800_000, sampleSize: 24 },
    { id: "wk-bench-sal-dir-cm",         country: "CM", sector: "AGENCY",      metric: "SALARY_DIRECTOR", unit: "FCFA", p10: 750_000,  p50: 1_200_000, p90: 2_500_000, sampleSize: 18 },
    // Retainer agency
    { id: "wk-bench-retainer-wk-cosm",   country: "WK", sector: "Cosmetiques", metric: "RETAINER_AGENCY", unit: "FCFA", p10: 1_500_000, p50: 3_500_000, p90: 8_000_000, sampleSize: 16 },
    { id: "wk-bench-retainer-wk-fin",    country: "WK", sector: "Fintech",     metric: "RETAINER_AGENCY", unit: "FCFA", p10: 2_000_000, p50: 5_000_000, p90: 12_000_000, sampleSize: 12 },
    // Influencer follower
    { id: "wk-bench-infl-follow-wk-cosm", country: "WK", sector: "Cosmetiques", metric: "INFLUENCER_FOLLOWER", unit: "FCFA", p10: 8,    p50: 18,   p90: 45,    sampleSize: 88 },
    { id: "wk-bench-infl-follow-wk-fin",  country: "WK", sector: "Fintech",     metric: "INFLUENCER_FOLLOWER", unit: "FCFA", p10: 12,   p50: 24,   p90: 60,    sampleSize: 32 },
    // CPM TV
    { id: "wk-bench-cpm-tv-wk",          country: "WK", sector: "FMCG",        metric: "CPM_TV",        unit: "FCFA", p10: 1800, p50: 3500, p90: 7200, sampleSize: 14 },
    // OOH Biryongo
    { id: "wk-bench-ooh-biryongo-wk",    country: "WK", sector: "OOH",         metric: "OOH_PANEL_MONTH_BIRYONGO", unit: "FCFA", p10: 800_000, p50: 1_500_000, p90: 3_500_000, sampleSize: 22 },
    // CPC TikTok
    { id: "wk-bench-cpc-tiktok-wk",      country: "WK", sector: "Cosmetiques", metric: "CPC_TIKTOK",    unit: "FCFA", p10: 50,    p50: 110,   p90: 240,   sampleSize: 36 },
    // Email send
    { id: "wk-bench-email-wk",           country: "WK", sector: "Cosmetiques", metric: "EMAIL_PER_K",   unit: "FCFA", p10: 800,   p50: 1500,  p90: 3200,  sampleSize: 24 },
    // SMS
    { id: "wk-bench-sms-wk",             country: "WK", sector: "Cosmetiques", metric: "SMS_PER_K",     unit: "FCFA", p10: 6500,  p50: 9500,  p90: 14000, sampleSize: 18 },
    // Influencer Africa pan
    { id: "wk-bench-infl-pan-africa",    country: "WK", sector: "Cosmetiques", metric: "INFLUENCER_PAN_AFRICA_POST", unit: "FCFA", p10: 500_000, p50: 1_400_000, p90: 4_000_000, sampleSize: 20 },
    // KOC micro
    { id: "wk-bench-koc-wk",             country: "WK", sector: "Cosmetiques", metric: "KOC_MICRO_POST", unit: "FCFA", p10: 25_000, p50: 65_000, p90: 180_000, sampleSize: 84 },
    // Photographer day rate
    { id: "wk-bench-photo-day-wk",       country: "WK", sector: "AGENCY",      metric: "PHOTOGRAPHER_DAY", unit: "FCFA", p10: 250_000, p50: 600_000, p90: 1_400_000, sampleSize: 38 },
    { id: "wk-bench-photo-day-cm",       country: "CM", sector: "AGENCY",      metric: "PHOTOGRAPHER_DAY", unit: "FCFA", p10: 220_000, p50: 480_000, p90: 1_100_000, sampleSize: 26 },
    // Storyboard
    { id: "wk-bench-storyboard-wk",      country: "WK", sector: "AGENCY",      metric: "STORYBOARD_MIN", unit: "FCFA", p10: 35_000, p50: 75_000, p90: 180_000, sampleSize: 22 },
    // FMCG distribution
    { id: "wk-bench-trade-wk-fmcg",      country: "WK", sector: "FMCG",        metric: "TRADE_MARGIN_PCT", unit: "%",   p10: 12,    p50: 22,    p90: 38,    sampleSize: 32 },
    // Tourism heritage
    { id: "wk-bench-tour-night-wk",      country: "WK", sector: "Tourisme",    metric: "AVG_NIGHT_RATE_BOUTIQUE", unit: "FCFA", p10: 35_000, p50: 95_000, p90: 280_000, sampleSize: 24 },
    // EdTech LTV
    { id: "wk-bench-ltv-wk-edu",         country: "WK", sector: "EdTech",      metric: "LTV_USER_12M", unit: "FCFA", p10: 18_000, p50: 38_000, p90: 95_000, sampleSize: 28 },
    // Fintech ARPU
    { id: "wk-bench-arpu-wk-fin",        country: "WK", sector: "Fintech",     metric: "ARPU_MONTH", unit: "FCFA", p10: 800,    p50: 2_200,  p90: 5_800,  sampleSize: 42 },
    // CDN cost
    { id: "wk-bench-cdn-month-wk",       country: "WK", sector: "TECH",        metric: "CDN_PER_TB", unit: "USD",  p10: 35,     p50: 65,     p90: 120,    sampleSize: 14 },
    // SaaS marketing tools
    { id: "wk-bench-saas-mkt-wk",        country: "WK", sector: "AGENCY",      metric: "SAAS_MARKETING_MONTH_PER_BRAND", unit: "USD", p10: 150, p50: 380, p90: 1200, sampleSize: 22 },
  ];

  for (const b of benchmarks) {
    await prisma.marketBenchmark.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        country: b.country,
        sector: b.sector,
        metric: b.metric,
        unit: b.unit,
        p10: b.p10,
        p50: b.p50,
        p90: b.p90,
        sampleSize: b.sampleSize,
        confidence: 0.5 + (b.sampleSize > 30 ? 0.3 : 0.15),
        sourceRef: [{ name: "Wakanda Marketing Benchmarks 2026", year: 2026, notes: b.notes ?? null }] as Prisma.InputJsonValue,
        lastReviewedAt: daysAfter(T.now, -10),
      },
    });
    track("MarketBenchmark");
  }

  // ============================================================
  // MARKET SIZING (~12)
  // ============================================================
  const sizings: Array<{ id: string; country: string; sector: string; segment: string | null; year: number; TAM: number; SAM: number; SOM: number; growthRate: number }> = [
    { id: "wk-sizing-wk-cosm-2024",   country: "WK", sector: "Cosmetiques", segment: null,         year: 2024, TAM: 235_000_000_000, SAM: 92_000_000_000, SOM: 8_500_000_000, growthRate: 0.16 },
    { id: "wk-sizing-wk-cosm-2025",   country: "WK", sector: "Cosmetiques", segment: null,         year: 2025, TAM: 268_000_000_000, SAM: 108_000_000_000, SOM: 11_200_000_000, growthRate: 0.17 },
    { id: "wk-sizing-wk-cosm-2026",   country: "WK", sector: "Cosmetiques", segment: null,         year: 2026, TAM: 312_000_000_000, SAM: 128_000_000_000, SOM: 14_800_000_000, growthRate: 0.18 },
    { id: "wk-sizing-wk-cosm-prem-26", country: "WK", sector: "Cosmetiques", segment: "premium",   year: 2026, TAM: 110_000_000_000, SAM: 42_000_000_000, SOM: 6_200_000_000, growthRate: 0.28 },
    { id: "wk-sizing-wk-fin-2026",    country: "WK", sector: "Fintech",     segment: null,         year: 2026, TAM: 480_000_000_000, SAM: 180_000_000_000, SOM: 22_000_000_000, growthRate: 0.25 },
    { id: "wk-sizing-wk-fin-saving-26", country: "WK", sector: "Fintech",   segment: "savings",    year: 2026, TAM: 92_000_000_000,  SAM: 38_000_000_000, SOM: 5_800_000_000, growthRate: 0.42 },
    { id: "wk-sizing-wk-fmcg-2026",   country: "WK", sector: "FMCG",        segment: null,         year: 2026, TAM: 1_200_000_000_000, SAM: 480_000_000_000, SOM: 38_000_000_000, growthRate: 0.08 },
    { id: "wk-sizing-wk-fmcg-bev-26", country: "WK", sector: "FMCG",        segment: "beverage",   year: 2026, TAM: 280_000_000_000, SAM: 95_000_000_000, SOM: 8_500_000_000, growthRate: 0.11 },
    { id: "wk-sizing-wk-edtech-2026", country: "WK", sector: "EdTech",      segment: null,         year: 2026, TAM: 38_000_000_000,  SAM: 14_000_000_000, SOM: 2_400_000_000, growthRate: 0.32 },
    { id: "wk-sizing-wk-tour-2026",   country: "WK", sector: "Tourisme",    segment: null,         year: 2026, TAM: 145_000_000_000, SAM: 52_000_000_000, SOM: 5_500_000_000, growthRate: 0.18 },
    { id: "wk-sizing-cm-cosm-2026",   country: "CM", sector: "Cosmetiques", segment: null,         year: 2026, TAM: 192_000_000_000, SAM: 78_000_000_000, SOM: 9_200_000_000, growthRate: 0.15 },
    { id: "wk-sizing-ci-fin-2026",    country: "CI", sector: "Fintech",     segment: null,         year: 2026, TAM: 285_000_000_000, SAM: 110_000_000_000, SOM: 13_500_000_000, growthRate: 0.22 },
  ];
  for (const s of sizings) {
    await prisma.marketSizing.upsert({
      where: { country_sector_segment_year: { country: s.country, sector: s.sector, segment: s.segment ?? "", year: s.year } },
      update: {},
      create: {
        id: s.id,
        country: s.country,
        sector: s.sector,
        segment: s.segment,
        year: s.year,
        TAM: s.TAM,
        SAM: s.SAM,
        SOM: s.SOM,
        currency: "FCFA",
        growthRate: s.growthRate,
        confidence: 0.65,
        sourceRef: [{ name: "Wakanda Market Atlas 2026", year: s.year }] as Prisma.InputJsonValue,
      },
    });
    track("MarketSizing");
  }

  // ============================================================
  // COST STRUCTURE (~10)
  // ============================================================
  const costStructures = [
    { id: "wk-cost-cosm-prod",  sector: "Cosmetiques", line: "PRODUCTION", p10: 0.28, p50: 0.38, p90: 0.48 },
    { id: "wk-cost-cosm-media", sector: "Cosmetiques", line: "MEDIA",      p10: 0.18, p50: 0.28, p90: 0.42 },
    { id: "wk-cost-cosm-talent",sector: "Cosmetiques", line: "TALENT",     p10: 0.06, p50: 0.12, p90: 0.20 },
    { id: "wk-cost-cosm-tech",  sector: "Cosmetiques", line: "TECH",       p10: 0.04, p50: 0.08, p90: 0.14 },
    { id: "wk-cost-cosm-ops",   sector: "Cosmetiques", line: "OPS",        p10: 0.08, p50: 0.14, p90: 0.22 },
    { id: "wk-cost-fin-tech",   sector: "Fintech",     line: "TECH",       p10: 0.18, p50: 0.32, p90: 0.50 },
    { id: "wk-cost-fin-media",  sector: "Fintech",     line: "MEDIA",      p10: 0.12, p50: 0.22, p90: 0.35 },
    { id: "wk-cost-fmcg-prod",  sector: "FMCG",        line: "PRODUCTION", p10: 0.45, p50: 0.55, p90: 0.65 },
    { id: "wk-cost-fmcg-media", sector: "FMCG",        line: "MEDIA",      p10: 0.08, p50: 0.16, p90: 0.28 },
    { id: "wk-cost-edtech-tech", sector: "EdTech",     line: "TECH",       p10: 0.25, p50: 0.40, p90: 0.55 },
  ];
  for (const cs of costStructures) {
    await prisma.costStructure.upsert({
      where: { id: cs.id },
      update: {},
      create: {
        id: cs.id,
        sector: cs.sector,
        line: cs.line,
        pctRevenue_p10: cs.p10,
        pctRevenue_p50: cs.p50,
        pctRevenue_p90: cs.p90,
        sourceRef: [{ name: "Wakanda P&L Benchmarks 2026" }] as Prisma.InputJsonValue,
      },
    });
    track("CostStructure");
  }

  // ============================================================
  // COMPETITIVE LANDSCAPE (~6)
  // ============================================================
  const landscapes = [
    { id: "wk-land-cosm-2026",     country: "WK", sector: "Cosmetiques", segment: null,        year: 2026, leaderShare: 0.18, top3HHI: 0.16, notes: "BLISS leader émergent depuis Q1 2026" },
    { id: "wk-land-cosm-prem-26",  country: "WK", sector: "Cosmetiques", segment: "premium",   year: 2026, leaderShare: 0.32, top3HHI: 0.42, notes: "BLISS dépasse L'Oréal naturelle au Wakanda" },
    { id: "wk-land-fin-2026",      country: "WK", sector: "Fintech",     segment: null,        year: 2026, leaderShare: 0.28, top3HHI: 0.38, notes: "MTN MoMo dominant, Wave en croissance" },
    { id: "wk-land-fin-saving-26", country: "WK", sector: "Fintech",     segment: "savings",   year: 2026, leaderShare: 0.12, top3HHI: 0.08, notes: "Marché atomisé, opportunité Vibranium" },
    { id: "wk-land-fmcg-bev-26",   country: "WK", sector: "FMCG",        segment: "beverage",  year: 2026, leaderShare: 0.22, top3HHI: 0.18, notes: "Wakanda Brew challenger crédible" },
    { id: "wk-land-edtech-26",     country: "WK", sector: "EdTech",      segment: null,        year: 2026, leaderShare: 0.18, top3HHI: 0.12, notes: "Shuri Academy gagne la category" },
  ];
  for (const l of landscapes) {
    await prisma.competitiveLandscape.upsert({
      where: { country_sector_segment_year: { country: l.country, sector: l.sector, segment: l.segment ?? "", year: l.year } },
      update: {},
      create: {
        id: l.id,
        country: l.country,
        sector: l.sector,
        segment: l.segment,
        year: l.year,
        leaderShare: l.leaderShare,
        top3HHI: l.top3HHI,
        notes: l.notes,
        sourceRef: [{ name: "Wakanda Competitive Atlas Q1 2026" }] as Prisma.InputJsonValue,
      },
    });
    track("CompetitiveLandscape");
  }

  // ============================================================
  // MARKET DOCUMENTS (~6) + MarketContextNode (vector-ready)
  // ============================================================
  const documents = [
    { id: "wk-mdoc-cosm-prem", title: "Cosmétiques premium Wakanda — Atlas 2026", country: "WK", sector: "Cosmetiques", year: 2026, topics: ["cosmetics", "premium", "wakanda", "heritage"],
      body: "# Cosmétiques premium Wakanda — Atlas 2026\n\nMarché de 110 Md FCFA en 2026, croissance +28%/an sur le segment naturel.\nLeaders : BLISS (32% du segment premium), L'Oréal Africa (24%), Shea Moisture (12%).\n\n## Drivers clés\n- Heritage credibility\n- Vibranium-ingredient narrative\n- App engagement (BLISS exclusif)\n\n## Risques\n- L'Oréal lance gamme naturelle Q3 2026\n- Pression matières premières (+18% YoY)" },
    { id: "wk-mdoc-fin-saving", title: "Épargne digitale jeunes actifs Wakanda 2026", country: "WK", sector: "Fintech", year: 2026, topics: ["fintech", "savings", "youth", "mobile-money"],
      body: "# Épargne digitale jeunes actifs Wakanda 2026\n\n68% des 22-35 ans n'ont pas de produit d'épargne structuré.\nMobile money penetration : 72%.\n\n## Opportunité\nMicro-épargne automatique via mobile money — TAM segment 92 Md FCFA, croissance +42%.\n\n## Players\n- MTN MoMo (28% mobile money global)\n- Wave (transferts gratuits, pas d'épargne)\n- Vibranium Tech (épargne automatique, lancement Q2 2026)" },
    { id: "wk-mdoc-fmcg-bev", title: "FMCG Beverage Wakanda — Craft & Heritage", country: "WK", sector: "FMCG", year: 2026, topics: ["fmcg", "beverage", "craft", "heritage"],
      body: "# FMCG Beverage Wakanda — Craft & Heritage\n\nMarché bières craft en accélération (+11%/an), narrative héritage local privilégiée.\nWakanda Brew positionné moonlit-ritual — challenger crédible." },
    { id: "wk-mdoc-edtech", title: "EdTech Wakanda — IA & code africain", country: "WK", sector: "EdTech", year: 2026, topics: ["edtech", "ai", "code", "africa"],
      body: "# EdTech Wakanda 2026\n\nDrift +0.30 vers l'IA dans les programmes. Shuri Academy aligned." },
    { id: "wk-mdoc-tour-heritage", title: "Tourisme Heritage Wakanda — Luxe spirituel", country: "WK", sector: "Tourisme", year: 2026, topics: ["tourism", "heritage", "luxury"],
      body: "# Tourisme Heritage Wakanda 2026\n\nNuit boutique p50 95k FCFA, drift vers l'immersif." },
    { id: "wk-mdoc-cross-overton", title: "Wakanda Overton Atlas Q1 2026", country: "WK", sector: null, year: 2026, topics: ["overton", "culture", "wakanda"],
      body: "# Wakanda Overton Atlas Q1 2026\n\nObservation Tarsis : 5 secteurs cartographiés, drifts mesurés sur 90 jours." },
  ];

  for (const d of documents) {
    await prisma.marketDocument.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: d.title,
        country: d.country,
        sector: d.sector,
        year: d.year,
        topics: d.topics,
        frontmatter: { source: "wakanda-seed", version: 1 } as Prisma.InputJsonValue,
        body: d.body,
        sourceRef: [{ name: "Wakanda Atlas 2026" }] as Prisma.InputJsonValue,
        indexedAt: daysAfter(T.now, -8),
      },
    });
    track("MarketDocument");

    // MarketContextNode — vector-ready node referencing this document
    const nodeId = `wk-mctx-${d.id}`;
    await prisma.marketContextNode.upsert({
      where: { kind_refId: { kind: "DOCUMENT", refId: d.id } },
      update: {},
      create: {
        id: nodeId,
        kind: "DOCUMENT",
        refId: d.id,
        payload: { title: d.title, summary: d.body.split("\n").slice(0, 6).join("\n"), topics: d.topics } as Prisma.InputJsonValue,
        embedding: [],
        metadata: { country: d.country, sector: d.sector, year: d.year } as Prisma.InputJsonValue,
        contentHash: `wkhash_${d.id}`,
        embeddedAt: null,
      },
    });
    track("MarketContextNode");
  }

  // ============================================================
  // BRAND CONTEXT NODES — BLISS narrative tier 3 (~24)
  // ============================================================
  const blissId = brands.bliss.strategy.id;
  const blissContextNodes: Array<{ kind: string; pillarKey?: string; field?: string; payload: object; sourceId?: string }> = [
    { kind: "PILLAR_FIELD", pillarKey: "a", field: "vision",       payload: { text: "BLISS est la première marque cosmétique panafricaine qui transforme l'éveil rituel matinal en expérience de marque." } },
    { kind: "PILLAR_FIELD", pillarKey: "a", field: "mission",      payload: { text: "Réveiller la beauté ancestrale via la science vibranium, dans chaque maison wakandaise puis africaine." } },
    { kind: "PILLAR_FIELD", pillarKey: "a", field: "heroJourney",  payload: { text: "De la cuisine de la grand-mère à la mégapole de Lagos — le rituel reste, la formule progresse." } },
    { kind: "PILLAR_FIELD", pillarKey: "d", field: "positioning",  payload: { text: "Premium heritage avec ingrédient vibranium scientifique — entre tradition et tech-beauty." } },
    { kind: "PILLAR_FIELD", pillarKey: "d", field: "rivals",       payload: { text: "L'Oréal naturelle (corporate, déconnecté), Shea Moisture (accessible mais basique), K-Beauty (trendy mais déraciné)." } },
    { kind: "PILLAR_FIELD", pillarKey: "v", field: "valueProp",    payload: { text: "Le sérum qui réveille la peau et la mémoire culturelle — 90% naturel, 100% vibranium-infused." } },
    { kind: "PILLAR_FIELD", pillarKey: "v", field: "pricingTier",  payload: { text: "Coffret 38k FCFA, sérum 23k, route boutique + e-commerce + influenceuses tier 1-3." } },
    { kind: "PILLAR_FIELD", pillarKey: "e", field: "channels",     payload: { text: "Instagram (lead 38%), TikTok (24%), OOH Biryongo+Lagos (18%), retail boutique (12%), influenceurs (8%)." } },
    { kind: "PILLAR_FIELD", pillarKey: "e", field: "engagementMix", payload: { text: "Heritage Story (always-on) + drops produit (Q2,Q4) + community rituals weekly." } },
    { kind: "PILLAR_FIELD", pillarKey: "r", field: "risks",        payload: { text: "Dépendance fournisseur vibranium unique, copie L'Oréal sur naturel premium, hausse coûts matières premières +18%." } },
    { kind: "PILLAR_FIELD", pillarKey: "t", field: "trends",       payload: { text: "Clean beauty +145% search YoY, K-Beauty en recul -22%, app-engagement beauty +210%." } },
    { kind: "PILLAR_FIELD", pillarKey: "i", field: "implementations", payload: { text: "Heritage Collection live (Mar 2026), Vibranium Glow lancé (Mar 18), App live (Mar 20), Ambassador program (Mar 25)." } },
    { kind: "PILLAR_FIELD", pillarKey: "s", field: "synthesis",    payload: { text: "BLISS atteint 200/200 ICONE en 90 jours via cascade rituel-tradition + tech-vibranium + app exclusive — modèle réplicable." } },

    { kind: "NARRATIVE",    payload: { name: "Heritage Awakening", summary: "Récit fondateur — la grand-mère Udaku, la formule transmise, la jeune Amara qui la modernise." } },
    { kind: "NARRATIVE",    payload: { name: "Vibranium Glow Night", summary: "Récit secondaire — la nuit qui révèle, la peau qui shimmer sous lumière noire, le rituel partagé." } },
    { kind: "BRANDLEVEL",   payload: { tier: "ICONE", classification: "ICONE", confidence: 0.97, ratifiedAt: T.scoresValidated.toISOString() } },

    { kind: "RECO",         pillarKey: "v", payload: { recoId: "wk-reco-bliss-pricing-q2", text: "Lancer un coffret découverte 14k FCFA pour conversion top-funnel" }, sourceId: "wk-reco-bliss-pricing-q2" },
    { kind: "RECO",         pillarKey: "s", payload: { recoId: "wk-reco-bliss-lagos", text: "Ouvrir Lagos en Q2 2026 via influenceuse-amplifier" }, sourceId: "wk-reco-bliss-lagos" },

    { kind: "ASSET",        payload: { name: "KV Heritage", assetId: "wk-asset-bliss-000", url: "/cdn/wk/bliss/heritage/kv-01.jpg" }, sourceId: "wk-asset-bliss-000" },
    { kind: "ASSET",        payload: { name: "Spot Glow 30s", assetId: "wk-asset-bliss-016", url: "/cdn/wk/bliss/glow/spot-30s.mp4" }, sourceId: "wk-asset-bliss-016" },

    { kind: "SEQUENCE_OUTPUT", payload: { sequenceKey: "campaign-prep-heritage", outputs: ["KV brief", "spot script", "OOH layout", "stories pack"] } },
    { kind: "SEQUENCE_OUTPUT", payload: { sequenceKey: "campaign-prep-glow",     outputs: ["KV brief", "spot script", "icon set", "sound logo"] } },
    { kind: "SEQUENCE_OUTPUT", payload: { sequenceKey: "ambassador-bootstrap",   outputs: ["program charter", "tier ladder", "playbook 90 jours"] } },
  ];

  for (let i = 0; i < blissContextNodes.length; i++) {
    const n = blissContextNodes[i];
    const id = `wk-bctx-bliss-${String(i).padStart(3, "0")}`;
    await prisma.brandContextNode.upsert({
      where: { id },
      update: {},
      create: {
        id,
        strategyId: blissId,
        kind: n.kind,
        pillarKey: n.pillarKey ?? null,
        field: n.field ?? null,
        sourceId: n.sourceId ?? null,
        payload: n.payload as Prisma.InputJsonValue,
        embedding: [],
        embeddingProvider: null,
        embeddingModel: null,
        embeddingDim: null,
        metadata: { country: "WK", sector: "Cosmetiques", businessModel: "D2C" } as Prisma.InputJsonValue,
        contentHash: `wkhash_bliss_${i}`,
        embeddedAt: null,
        createdAt: daysAfter(T.now, -45),
      },
    });
    track("BrandContextNode");
  }

  // ============================================================
  // BRAND ACTIONS — Pillar I taxonomy BLISS (~30)
  // ============================================================
  const blissActions: Array<{ title: string; touchpoint: string; aarrr: string; persona: string; sku: string; budgetMin: number; budgetMax: number; opportunity: string; locality: string; timingOff: number; selected: boolean; status: string; priority: string }> = [
    { title: "OOH Biryongo Heritage 8 panels",   touchpoint: "ATL",     aarrr: "ACQUISITION", persona: "Urban femme 28-40 premium",     sku: "Heritage Coffret",  budgetMin: 8_000_000, budgetMax: 12_000_000, opportunity: "LAUNCH",   locality: "Biryongo CBD",   timingOff: -42, selected: true,  status: "EXECUTED", priority: "P0" },
    { title: "Instagram paid Heritage UGC",      touchpoint: "DIGITAL", aarrr: "ACQUISITION", persona: "Femme 25-35 Lagos/Biryongo",   sku: "Heritage Sérum",    budgetMin: 4_500_000, budgetMax: 7_500_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -38, selected: true,  status: "EXECUTED", priority: "P0" },
    { title: "TikTok Reels Heritage challenge",  touchpoint: "DIGITAL", aarrr: "ACTIVATION",  persona: "Gen Z 18-24",                  sku: "Heritage Sérum",    budgetMin: 2_500_000, budgetMax: 4_000_000,  opportunity: "EVENT",    locality: "Pan-Wakanda",    timingOff: -35, selected: true,  status: "EXECUTED", priority: "P1" },
    { title: "Influenceuse Amina Diop wave 1",   touchpoint: "OWNED",   aarrr: "ACQUISITION", persona: "Influencer follower base",     sku: "Heritage Coffret",  budgetMin: 2_800_000, budgetMax: 3_200_000,  opportunity: "LAUNCH",   locality: "Biryongo+Lagos", timingOff: -32, selected: true,  status: "EXECUTED", priority: "P0" },
    { title: "Event Glow Night Biryongo",        touchpoint: "BTL",     aarrr: "ACTIVATION",  persona: "Urban femme 22-32",            sku: "Glow Sérum",        budgetMin: 6_000_000, budgetMax: 9_000_000,  opportunity: "EVENT",    locality: "Biryongo Marina", timingOff: -25, selected: true,  status: "EXECUTED", priority: "P0" },
    { title: "Email retention Heritage Q1",      touchpoint: "OWNED",   aarrr: "RETENTION",   persona: "Existing customer",            sku: "Heritage Sérum",    budgetMin: 350_000,   budgetMax: 600_000,    opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -20, selected: true,  status: "EXECUTED", priority: "P2" },
    { title: "WhatsApp Business catalogue",      touchpoint: "OWNED",   aarrr: "REVENUE",     persona: "Pan customer",                 sku: "Catalogue full",    budgetMin: 800_000,   budgetMax: 1_400_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -18, selected: true,  status: "EXECUTED", priority: "P1" },
    { title: "Spot TV prime FMCG Heritage 30s",  touchpoint: "ATL",     aarrr: "ACQUISITION", persona: "Femme 30-50 mainstream",       sku: "Heritage Coffret",  budgetMin: 12_000_000, budgetMax: 22_000_000, opportunity: "LAUNCH",   locality: "Pan-Wakanda",    timingOff: -15, selected: false, status: "PROPOSED", priority: "P1" },
    { title: "Boutique pop-up Lagos VI",         touchpoint: "BTL",     aarrr: "REVENUE",     persona: "Premium urban femme",          sku: "Heritage Coffret",  budgetMin: 8_500_000,  budgetMax: 14_000_000, opportunity: "LAUNCH",   locality: "Lagos VI",       timingOff: -8,  selected: true,  status: "SCHEDULED", priority: "P0" },
    { title: "Programme Ambassadeurs Wakanda",   touchpoint: "EARNED",  aarrr: "REFERRAL",    persona: "Superfan tier 2-3",            sku: "Full ladder",       budgetMin: 4_500_000,  budgetMax: 8_500_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -16, selected: true,  status: "EXECUTED", priority: "P0" },
    { title: "Glow Night Lagos extension",       touchpoint: "BTL",     aarrr: "ACTIVATION",  persona: "Urban femme 22-32",            sku: "Glow Sérum",        budgetMin: 7_500_000,  budgetMax: 12_000_000, opportunity: "EVENT",    locality: "Lagos VI",       timingOff: 10,  selected: true,  status: "SCHEDULED", priority: "P0" },
    { title: "Podcast Wakanda Style x BLISS",    touchpoint: "EARNED",  aarrr: "ACQUISITION", persona: "Femme 25-40 culture-driven",   sku: "Heritage",          budgetMin: 600_000,    budgetMax: 1_200_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -3,  selected: true,  status: "EXECUTED", priority: "P2" },
    { title: "Magazine print Vogue Africa",      touchpoint: "ATL",     aarrr: "ACQUISITION", persona: "Premium femme 30-45",          sku: "Heritage Coffret",  budgetMin: 3_500_000,  budgetMax: 5_500_000,  opportunity: "LAUNCH",   locality: "Pan-Africa",     timingOff: -5,  selected: false, status: "PROPOSED", priority: "P1" },
    { title: "Spot YouTube Pre-Roll Heritage",   touchpoint: "DIGITAL", aarrr: "ACQUISITION", persona: "Pan femme",                    sku: "Heritage Coffret",  budgetMin: 1_500_000,  budgetMax: 2_800_000,  opportunity: "LAUNCH",   locality: "Pan-Wakanda",    timingOff: -28, selected: true,  status: "EXECUTED", priority: "P1" },
    { title: "Twitter Thread CEO Amara",         touchpoint: "EARNED",  aarrr: "ACQUISITION", persona: "Tech-aware femme",             sku: "Brand awareness",   budgetMin: 0,           budgetMax: 0,          opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -22, selected: true,  status: "EXECUTED", priority: "P3" },
    { title: "Sample distribution salons",       touchpoint: "BTL",     aarrr: "ACTIVATION",  persona: "Femme 30-45 salons",          sku: "Sample sachets",    budgetMin: 1_800_000,  budgetMax: 3_200_000,  opportunity: "ALWAYS_ON", locality: "Biryongo",       timingOff: -12, selected: true,  status: "EXECUTED", priority: "P2" },
    { title: "Affiliate program micro-influ",    touchpoint: "EARNED",  aarrr: "REFERRAL",    persona: "Micro-influencer 5-50k",       sku: "Heritage+Glow",     budgetMin: 1_200_000,  budgetMax: 2_400_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -10, selected: true,  status: "EXECUTED", priority: "P2" },
    { title: "App push notifications weekly",    touchpoint: "OWNED",   aarrr: "RETENTION",   persona: "App user",                     sku: "App engagement",    budgetMin: 80_000,     budgetMax: 150_000,    opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -6,  selected: true,  status: "EXECUTED", priority: "P1" },
    { title: "Crisis playbook L'Oréal launch",   touchpoint: "OWNED",   aarrr: "RETENTION",   persona: "Existing customer base",       sku: "Crisis comms",      budgetMin: 0,           budgetMax: 500_000,    opportunity: "CRISIS",   locality: "Pan-Wakanda",    timingOff: 5,   selected: false, status: "DRAFT",    priority: "P1" },
    { title: "Capsule collab artist Wakandaise", touchpoint: "OWNED",   aarrr: "ACTIVATION",  persona: "Premium femme 25-40",          sku: "Limited edition",   budgetMin: 5_500_000,  budgetMax: 9_500_000,  opportunity: "SEASONAL", locality: "Pan-Wakanda",    timingOff: 35,  selected: true,  status: "SCHEDULED", priority: "P1" },
    { title: "Cinéma pré-spot Heritage",         touchpoint: "ATL",     aarrr: "ACQUISITION", persona: "Femme 25-45 cinéphile",        sku: "Heritage",          budgetMin: 2_500_000,  budgetMax: 4_500_000,  opportunity: "LAUNCH",   locality: "Biryongo cinemas", timingOff: -15, selected: false, status: "PROPOSED", priority: "P2" },
    { title: "Webinar masterclass rituel",       touchpoint: "OWNED",   aarrr: "ACTIVATION",  persona: "Engaged customer",             sku: "Heritage",          budgetMin: 350_000,    budgetMax: 750_000,    opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -2,  selected: true,  status: "EXECUTED", priority: "P2" },
    { title: "Salon Beauty Africa stand BLISS",  touchpoint: "BTL",     aarrr: "ACQUISITION", persona: "Pro beauté + premium femme",   sku: "Full range",        budgetMin: 12_000_000, budgetMax: 18_000_000, opportunity: "EVENT",    locality: "Lagos",          timingOff: 60,  selected: true,  status: "SCHEDULED", priority: "P0" },
    { title: "Programme fidélité points",        touchpoint: "OWNED",   aarrr: "RETENTION",   persona: "Repeat customer",              sku: "App+web",           budgetMin: 1_800_000,  budgetMax: 3_200_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -10, selected: true,  status: "EXECUTED", priority: "P1" },
    { title: "Boutique flagship Biryongo",       touchpoint: "BTL",     aarrr: "REVENUE",     persona: "Premium femme",                sku: "Full range",        budgetMin: 25_000_000, budgetMax: 45_000_000, opportunity: "LAUNCH",   locality: "Biryongo",       timingOff: 90,  selected: false, status: "DRAFT",    priority: "P1" },
    { title: "Newsletter rituel hebdomadaire",   touchpoint: "OWNED",   aarrr: "RETENTION",   persona: "Subscriber",                   sku: "Editorial",         budgetMin: 120_000,    budgetMax: 280_000,    opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -1,  selected: true,  status: "EXECUTED", priority: "P3" },
    { title: "Gifting cadeaux journalistes",     touchpoint: "EARNED",  aarrr: "ACQUISITION", persona: "Journaliste beauté",           sku: "Heritage Coffret",  budgetMin: 1_500_000,  budgetMax: 2_500_000,  opportunity: "LAUNCH",   locality: "Pan-Africa",     timingOff: -33, selected: true,  status: "EXECUTED", priority: "P1" },
    { title: "Spotify Audio Heritage Tale",      touchpoint: "DIGITAL", aarrr: "ACQUISITION", persona: "Pan femme audio",              sku: "Heritage",          budgetMin: 750_000,    budgetMax: 1_500_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: -8,  selected: true,  status: "EXECUTED", priority: "P2" },
    { title: "Out-of-home aéroport Biryongo",    touchpoint: "ATL",     aarrr: "ACQUISITION", persona: "Travel exec",                  sku: "Heritage Coffret",  budgetMin: 4_500_000,  budgetMax: 8_500_000,  opportunity: "LAUNCH",   locality: "Aéroport BIR",   timingOff: -18, selected: false, status: "PROPOSED", priority: "P2" },
    { title: "B2B salons spa & resort",          touchpoint: "BTL",     aarrr: "REVENUE",     persona: "Spa & resort buyer",           sku: "Range B2B",         budgetMin: 3_500_000,  budgetMax: 6_500_000,  opportunity: "ALWAYS_ON", locality: "Pan-Wakanda",    timingOff: 15,  selected: true,  status: "SCHEDULED", priority: "P1" },
  ];

  for (let i = 0; i < blissActions.length; i++) {
    const a = blissActions[i];
    const id = `wk-action-bliss-${String(i).padStart(3, "0")}`;
    await prisma.brandAction.upsert({
      where: { id },
      update: {},
      create: {
        id,
        strategyId: blissId,
        title: a.title,
        description: `${a.title} — ${a.persona}, ${a.locality}`,
        touchpoint: a.touchpoint,
        aarrrIntent: a.aarrr,
        persona: a.persona,
        sku: a.sku,
        budgetMin: a.budgetMin,
        budgetMax: a.budgetMax,
        budgetCurrency: "XAF",
        opportunity: a.opportunity,
        locality: a.locality,
        timingStart: daysAfter(T.now, a.timingOff),
        timingEnd: daysAfter(T.now, a.timingOff + 14),
        priority: a.priority,
        selected: a.selected,
        source: "NOTORIA_GENERATED",
        status: a.status,
        metadata: { campaign: a.opportunity === "LAUNCH" && a.timingOff < -10 ? "heritage" : a.opportunity === "LAUNCH" && a.timingOff > 0 ? "expansion" : null } as Prisma.InputJsonValue,
        createdAt: daysAfter(T.now, a.timingOff - 7),
      },
    });
    track("BrandAction");
  }

  console.log(
    `  [OK] Market context: ${sectors.length} sectors, ${benchmarks.length} benchmarks, ${sizings.length} sizings, ${costStructures.length} cost structures, ${landscapes.length} landscapes, ${documents.length} documents, ${blissContextNodes.length} BLISS context nodes, ${blissActions.length} brand actions`,
  );
}
