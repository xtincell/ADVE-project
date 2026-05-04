/**
 * WAKANDA SEED — Intelligence data
 *
 * MarketStudy (2), MarketSource (4), MarketSynthesis (2),
 * CompetitorSnapshot (6), KnowledgeEntry (10), InsightReport (3),
 * AttributionEvent (5), CohortSnapshot (3),
 * FrameworkResult (3) + FrameworkExecution (4)
 */

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedIntelligence(prisma: PrismaClient, brands: Brands) {

  // ================================================================
  // MARKET STUDIES (2)
  // ================================================================
  const studies = [
    { id: "wk-study-cosmetics", strategyId: brands.bliss.strategy.id, title: "Marche cosmetiques Wakanda 2026", objective: "Cartographier le marche cosmetiques premium au Wakanda pour identifier les opportunites de croissance.", status: "COMPLETED", summary: "Marche de 285 milliards XAF en croissance de 18%/an. Le segment premium represente 35% avec une forte demande pour les produits naturels et heritage." },
    { id: "wk-study-fintech", strategyId: brands.vibranium.strategy.id, title: "Fintech mobile Wakanda 2026", objective: "Evaluer l'ecosysteme fintech mobile wakandais et les opportunites pour Vibranium Tech.", status: "COMPLETED", summary: "Penetration mobile money a 72%. Marche fintech en croissance de 25%/an. Segment epargne digitale sous-explore." },
  ];

  for (const s of studies) {
    await prisma.marketStudy.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        strategyId: s.strategyId,
        title: s.title,
        objective: s.objective,
        status: s.status,
        summary: s.summary,
        completedAt: daysAfter(T.now, -15),
        createdAt: daysAfter(T.now, -30),
      },
    });
    track("MarketStudy");
  }

  // ================================================================
  // MARKET SOURCES (4, 2 per study)
  // ================================================================
  const sources = [
    { id: "wk-msource-01", studyId: "wk-study-cosmetics", sourceType: "REPORT", title: "Euromonitor — Beauty & Personal Care Wakanda 2026", reliability: 0.92 },
    { id: "wk-msource-02", studyId: "wk-study-cosmetics", sourceType: "SURVEY", title: "Enquete terrain 500 consommatrices Biryongo", reliability: 0.85 },
    { id: "wk-msource-03", studyId: "wk-study-fintech", sourceType: "REPORT", title: "GSMA — State of Mobile Money in Africa 2026", reliability: 0.95 },
    { id: "wk-msource-04", studyId: "wk-study-fintech", sourceType: "DATABASE", title: "Banque Centrale du Wakanda — Statistiques paiements Q1 2026", reliability: 0.98 },
  ];

  for (const src of sources) {
    await prisma.marketSource.upsert({
      where: { id: src.id },
      update: {},
      create: {
        id: src.id,
        studyId: src.studyId,
        sourceType: src.sourceType,
        title: src.title,
        reliability: src.reliability,
        extractedAt: daysAfter(T.now, -20),
        createdAt: daysAfter(T.now, -25),
      },
    });
    track("MarketSource");
  }

  // ================================================================
  // MARKET SYNTHESES (2, 1 per study)
  // ================================================================
  await prisma.marketSynthesis.upsert({
    where: { id: "wk-msynth-01" },
    update: {},
    create: {
      id: "wk-msynth-01",
      studyId: "wk-study-cosmetics",
      topic: "Opportunites segment premium naturel",
      findings: { mainInsight: "Le segment premium naturel represente 12% du marche mais croit a 28%/an", opportunity: "Positionnement heritage + ingredients naturels = niche en expansion rapide", threats: ["Arrivee de L'Oreal avec gamme naturelle", "Hausse des couts matieres premieres"], recommendations: ["Verrouiller le positionnement vibranium comme ingredient-cle", "Investir dans la R&D ingredients locaux"] } as Prisma.InputJsonValue,
      confidence: 0.88,
      pillarImpact: { v: "HIGH", d: "MEDIUM", t: "HIGH" } as Prisma.InputJsonValue,
      createdAt: daysAfter(T.now, -15),
    },
  });
  track("MarketSynthesis");

  await prisma.marketSynthesis.upsert({
    where: { id: "wk-msynth-02" },
    update: {},
    create: {
      id: "wk-msynth-02",
      studyId: "wk-study-fintech",
      topic: "Gap epargne digitale jeunes actifs",
      findings: { mainInsight: "68% des 22-35 ans n'ont pas de produit d'epargne structure", opportunity: "Micro-epargne automatique via mobile money = marche inexploite", threats: ["Regulation en evolution", "MTN MoMo pourrait lancer un produit similaire"], recommendations: ["Lancer MVP epargne automatique en Q2", "Partenariat avec operateurs mobile money"] } as Prisma.InputJsonValue,
      confidence: 0.82,
      pillarImpact: { v: "HIGH", e: "HIGH", r: "MEDIUM" } as Prisma.InputJsonValue,
      createdAt: daysAfter(T.now, -15),
    },
  });
  track("MarketSynthesis");

  // ================================================================
  // COMPETITOR SNAPSHOTS (6: 3 BLISS, 3 VIBRANIUM)
  // ================================================================
  const competitors = [
    // BLISS competitors
    { id: "wk-comp-loreal", sector: "Cosmetiques", market: "Wakanda", name: "L'Oreal Afrique", strengths: ["Budget marketing massif", "Distribution large", "R&D avancee"], weaknesses: ["Perception corporate", "Manque d'ancrage local", "Prix eleves"], positioning: "Mass premium international", estimatedScore: 155 },
    { id: "wk-comp-shea", sector: "Cosmetiques", market: "Wakanda", name: "Shea Moisture Wakanda", strengths: ["Heritage naturel credible", "Communaute engagee", "Prix accessibles"], weaknesses: ["Packaging basique", "Pas de tech-beauty", "Distribution limitee"], positioning: "Naturel accessible", estimatedScore: 128 },
    { id: "wk-comp-kbeauty", sector: "Cosmetiques", market: "Wakanda", name: "K-Beauty Wakanda (Glow Lab)", strengths: ["Innovation rapide", "Tendance K-beauty", "Packaging instagrammable"], weaknesses: ["Pas de racine culturelle locale", "Supply chain fragile", "Copie plus que creation"], positioning: "Innovation cosmetique trend-driven", estimatedScore: 135 },
    // VIBRANIUM competitors
    { id: "wk-comp-wave", sector: "Fintech", market: "Wakanda", name: "Wave Wakanda", strengths: ["0% frais transfert", "UX simple", "Croissance virale"], weaknesses: ["Pas d'epargne", "Pas de credit", "Modele non rentable"], positioning: "Transfert gratuit mobile", estimatedScore: 142 },
    { id: "wk-comp-orange", sector: "Fintech", market: "Wakanda", name: "Orange Money Wakanda", strengths: ["Base clients massive", "Confiance operateur telecom", "Points de vente partout"], weaknesses: ["UX depassee", "Innovation lente", "Frais eleves"], positioning: "Mobile money historique", estimatedScore: 138 },
    { id: "wk-comp-mtn", sector: "Fintech", market: "Wakanda", name: "MTN MoMo Wakanda", strengths: ["Reseau dense", "API ouvertes", "Partenariats commercants"], weaknesses: ["Interface datee", "Support client faible", "Pas de produits epargne avances"], positioning: "Mobile money universel", estimatedScore: 145 },
  ];

  for (const comp of competitors) {
    await prisma.competitorSnapshot.upsert({
      where: { id: comp.id },
      update: {},
      create: {
        id: comp.id,
        sector: comp.sector,
        market: comp.market,
        name: comp.name,
        strengths: comp.strengths as Prisma.InputJsonValue,
        weaknesses: comp.weaknesses as Prisma.InputJsonValue,
        positioning: comp.positioning,
        estimatedScore: comp.estimatedScore,
        source: "Analyse Artemis — benchmark sectoriel Q1 2026",
        measuredAt: daysAfter(T.now, -10),
      },
    });
    track("CompetitorSnapshot");
  }

  // ================================================================
  // KNOWLEDGE ENTRIES (10)
  // ================================================================
  const knowledgeEntries = [
    { id: "wk-knowledge-01", entryType: "SECTOR_BENCHMARK" as const, sector: "Cosmetiques", data: { avgComposite: 135, topBrand: "BLISS", bottomBrand: "Glow Lab", avgRetention: 0.45, avgNPS: 52 }, successScore: 0.85 },
    { id: "wk-knowledge-02", entryType: "SECTOR_BENCHMARK" as const, sector: "Fintech", data: { avgComposite: 128, topBrand: "MTN MoMo", bottomBrand: "Wave", avgRetention: 0.62, avgNPS: 38 }, successScore: 0.72 },
    { id: "wk-knowledge-03", entryType: "SECTOR_BENCHMARK" as const, sector: "EdTech", data: { avgComposite: 98, topBrand: "Shuri Academy", bottomBrand: "WK Learn", avgRetention: 0.35, avgNPS: 45 }, successScore: 0.65 },
    { id: "wk-knowledge-04", entryType: "SECTOR_BENCHMARK" as const, sector: "Tourisme", data: { avgComposite: 88, topBrand: "Jabari Heritage", bottomBrand: "WK Tours", avgRetention: 0.28, avgNPS: 55 }, successScore: 0.60 },
    { id: "wk-knowledge-05", entryType: "CAMPAIGN_TEMPLATE" as const, sector: "Cosmetiques", data: { type: "PRODUCT_LAUNCH", avgROI: 2.8, bestChannels: ["Instagram", "OOH", "Event"], avgBudget: 8000000, successRate: 0.72 }, successScore: 0.78 },
    { id: "wk-knowledge-06", entryType: "CAMPAIGN_TEMPLATE" as const, sector: "Fintech", data: { type: "AWARENESS", avgROI: 1.5, bestChannels: ["Facebook", "Radio", "Partenariats"], avgBudget: 5000000, successRate: 0.58 }, successScore: 0.62 },
    { id: "wk-knowledge-07", entryType: "CREATOR_PATTERN" as const, sector: null, data: { tier: "MAITRE", avgFirstPassRate: 0.87, avgMissions: 12, topSkill: "Direction Artistique", avgScore: 8.8 }, successScore: 0.90 },
    { id: "wk-knowledge-08", entryType: "CREATOR_PATTERN" as const, sector: null, data: { tier: "COMPAGNON", avgFirstPassRate: 0.72, avgMissions: 6, topSkill: "Copywriting", avgScore: 7.5 }, successScore: 0.75 },
    { id: "wk-knowledge-09", entryType: "DIAGNOSTIC_RESULT" as const, sector: "Cosmetiques", data: { brandName: "BLISS", initialScore: 142, finalScore: 200, timeToICONE: "3 mois", keyLevers: ["heritage narrative", "vibranium ingredient", "app engagement"] }, successScore: 0.97 },
    { id: "wk-knowledge-10", entryType: "MISSION_OUTCOME" as const, sector: "Cosmetiques", data: { missionType: "KV_CREATION", avgQuality: 8.9, avgDeliveryTime: "12 jours", successRate: 0.92, topTalent: "Kofi Asante" }, successScore: 0.88 },
  ];

  for (const ke of knowledgeEntries) {
    await prisma.knowledgeEntry.upsert({
      where: { id: ke.id },
      update: { countryCode: "WK", market: "Wakanda" }, // ADR-0037 PR-A — backfill on re-seed.
      create: {
        id: ke.id,
        entryType: ke.entryType,
        sector: ke.sector,
        market: "Wakanda", // ADR-0037 — texte libre legacy, conservé pour compat lookup ; countryCode est la SoT.
        countryCode: "WK", // ADR-0037 PR-A — pays-scopé, ISO-2.
        data: ke.data as Prisma.InputJsonValue,
        successScore: ke.successScore,
        sampleSize: ke.entryType === "SECTOR_BENCHMARK" ? 15 : 1,
        createdAt: daysAfter(T.now, -10),
      },
    });
    track("KnowledgeEntry");
  }

  // ================================================================
  // INSIGHT REPORTS (3)
  // ================================================================
  const reports = [
    { id: "wk-insight-01", strategyId: brands.bliss.strategy.id, reportType: "GROWTH_ANALYSIS", title: "Growth Analysis Q1 — BLISS", data: { period: "Q1 2026", compositeGrowth: "+58 points", revenueGrowth: "+340%", topDriver: "Heritage Collection", nps: 72, retention: 0.68 }, summary: "Croissance exceptionnelle en Q1. Le lancement Heritage a ete le principal moteur. NPS a 72, au-dessus du benchmark sectoriel." },
    { id: "wk-insight-02", strategyId: brands.bliss.strategy.id, reportType: "COMPETITIVE_INTEL", title: "Competitive Intel Mars 2026", data: { period: "Mars 2026", mainThreat: "L'Oreal naturelle", opportunity: "K-Beauty en recul", recommendation: "Renforcer positionnement heritage + tech" }, summary: "L'Oreal lance une gamme naturelle mais sans ancrage local. Opportunite de renforcer le positionnement heritage + vibranium." },
    { id: "wk-insight-03", strategyId: brands.bliss.strategy.id, reportType: "IMPACT_ASSESSMENT", title: "RTIS Impact Assessment", data: { rtisROI: 4.2, scoreImprovement: "+58 points en 3 mois", campaignsLaunched: 2, missionsCompleted: 5, revenueAttributed: 4850000 }, summary: "Le ROI du RTIS est de 4.2x apres 3 mois. Le score ADVERTIS est passe de 142 a 200. Deux campagnes lancees avec succes." },
  ];

  for (const r of reports) {
    await prisma.insightReport.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        strategyId: r.strategyId,
        reportType: r.reportType,
        title: r.title,
        data: r.data as Prisma.InputJsonValue,
        summary: r.summary,
        generatedAt: daysAfter(T.now, -5),
      },
    });
    track("InsightReport");
  }

  // ================================================================
  // ATTRIBUTION EVENTS (5)
  // ================================================================
  const attributions = [
    { id: "wk-attr-01", strategyId: brands.bliss.strategy.id, eventType: "PURCHASE", source: "instagram", medium: "social_paid", campaign: "heritage-collection", value: 23500 },
    { id: "wk-attr-02", strategyId: brands.bliss.strategy.id, eventType: "SITE_VISIT", source: "ooh", medium: "billboard", campaign: "heritage-ooh-biryongo", value: 0 },
    { id: "wk-attr-03", strategyId: brands.bliss.strategy.id, eventType: "APP_RETENTION", source: "app", medium: "push_notification", campaign: "glow-push-weekly", value: 2500 },
    { id: "wk-attr-04", strategyId: brands.bliss.strategy.id, eventType: "REACTIVATION", source: "email", medium: "email_campaign", campaign: "heritage-winback", value: 15000 },
    { id: "wk-attr-05", strategyId: brands.bliss.strategy.id, eventType: "SIGNUP", source: "event", medium: "glow_night", campaign: "heritage-launch-event", value: 0 },
  ];

  for (const attr of attributions) {
    await prisma.attributionEvent.upsert({
      where: { id: attr.id },
      update: {},
      create: {
        id: attr.id,
        strategyId: attr.strategyId,
        eventType: attr.eventType,
        source: attr.source,
        medium: attr.medium,
        campaign: attr.campaign,
        value: attr.value,
        currency: "XAF",
        convertedAt: daysAfter(T.now, -5),
        createdAt: daysAfter(T.now, -5),
      },
    });
    track("AttributionEvent");
  }

  // ================================================================
  // COHORT SNAPSHOTS (3, Jan-Mar for BLISS)
  // ================================================================
  const cohorts = [
    { id: "wk-cohort-bliss-jan", cohortKey: "2026-01", period: "Janvier 2026", size: 245, retentionRate: 0.72, revenuePerUser: 18500, churnRate: 0.28 },
    { id: "wk-cohort-bliss-feb", cohortKey: "2026-02", period: "Fevrier 2026", size: 580, retentionRate: 0.68, revenuePerUser: 21200, churnRate: 0.32 },
    { id: "wk-cohort-bliss-mar", cohortKey: "2026-03", period: "Mars 2026", size: 1247, retentionRate: 0.75, revenuePerUser: 24800, churnRate: 0.25 },
  ];

  for (const c of cohorts) {
    await prisma.cohortSnapshot.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        strategyId: brands.bliss.strategy.id,
        cohortKey: c.cohortKey,
        period: c.period,
        size: c.size,
        retentionRate: c.retentionRate,
        revenuePerUser: c.revenuePerUser,
        churnRate: c.churnRate,
        metrics: { avgOrders: c.retentionRate > 0.7 ? 2.3 : 1.8, ltv: c.revenuePerUser * 4, acquisitionCost: 3500 } as Prisma.InputJsonValue,
        measuredAt: new Date(`2026-0${cohorts.indexOf(c) + 1}-28`),
      },
    });
    track("CohortSnapshot");
  }

  // ================================================================
  // FRAMEWORK — First ensure a Framework record exists
  // ================================================================
  const framework = await prisma.framework.upsert({
    where: { slug: "brand-health-check" },
    update: {},
    create: {
      id: "wk-framework-bhc",
      slug: "brand-health-check",
      name: "Brand Health Check",
      layer: "MEASUREMENT",
      description: "Evaluation de la sante de marque a travers les 8 piliers ADVERTIS.",
    },
  });
  track("Framework");

  // ================================================================
  // FRAMEWORK RESULTS (3 for BLISS) + FRAMEWORK EXECUTIONS (4)
  // ================================================================
  const fwResults = [
    { id: "wk-fwresult-01", frameworkId: framework.id, strategyId: brands.bliss.strategy.id, pillarKey: "a", score: 25, confidence: 0.97 },
    { id: "wk-fwresult-02", frameworkId: framework.id, strategyId: brands.bliss.strategy.id, pillarKey: "d", score: 25, confidence: 0.97 },
    { id: "wk-fwresult-03", frameworkId: framework.id, strategyId: brands.bliss.strategy.id, pillarKey: "v", score: 25, confidence: 0.96 },
  ];

  for (const fr of fwResults) {
    await prisma.frameworkResult.upsert({
      where: { id: fr.id },
      update: {},
      create: {
        id: fr.id,
        frameworkId: fr.frameworkId,
        strategyId: fr.strategyId,
        pillarKey: fr.pillarKey,
        input: { pillarKey: fr.pillarKey, strategyId: fr.strategyId } as Prisma.InputJsonValue,
        output: { score: fr.score, maxScore: 25, status: "VALIDATED" } as Prisma.InputJsonValue,
        score: fr.score,
        confidence: fr.confidence,
        createdAt: T.scoresValidated,
      },
    });
    track("FrameworkResult");
  }

  // 3 COMPLETED executions for BLISS results
  for (let i = 0; i < 3; i++) {
    await prisma.frameworkExecution.upsert({
      where: { id: `wk-fwexec-bliss-${i + 1}` },
      update: {},
      create: {
        id: `wk-fwexec-bliss-${i + 1}`,
        resultId: fwResults[i].id,
        status: "COMPLETED",
        input: { pillarKey: fwResults[i].pillarKey } as Prisma.InputJsonValue,
        output: { score: 25, details: "Pilier valide a 25/25" } as Prisma.InputJsonValue,
        durationMs: 1200 + (i * 300),
        aiCost: 0.02,
        startedAt: hoursAfter(T.scoresValidated, -1),
        completedAt: T.scoresValidated,
        createdAt: T.scoresValidated,
      },
    });
    track("FrameworkExecution");
  }

  // 1 FAILED execution for JABARI (edge case)
  const jabariResult = await prisma.frameworkResult.upsert({
    where: { id: "wk-fwresult-jabari" },
    update: {},
    create: {
      id: "wk-fwresult-jabari",
      frameworkId: framework.id,
      strategyId: brands.jabari.strategy.id,
      pillarKey: "a",
      input: { pillarKey: "a", strategyId: brands.jabari.strategy.id } as Prisma.InputJsonValue,
      score: null,
      confidence: null,
      createdAt: daysAfter(T.now, -12),
    },
  });

  await prisma.frameworkExecution.upsert({
    where: { id: "wk-fwexec-jabari-fail" },
    update: {},
    create: {
      id: "wk-fwexec-jabari-fail",
      resultId: jabariResult.id,
      status: "FAILED",
      input: { pillarKey: "a" } as Prisma.InputJsonValue,
      error: "Donnees insuffisantes pour le pilier A — contenu minimal, pas de sources vault.",
      durationMs: 450,
      aiCost: 0.01,
      startedAt: daysAfter(T.now, -12),
      createdAt: daysAfter(T.now, -12),
    },
  });
  track("FrameworkExecution");

  console.log("[OK] Intelligence: 2 studies, 4 sources, 2 syntheses, 6 competitors, 10 knowledge, 3 insights, 5 attributions, 3 cohorts, 4 frameworks");
}
