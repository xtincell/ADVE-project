/**
 * Board-Ready Export — v4
 *
 * Generates a structured 6-slide deck data object for board presentations.
 * Output can be rendered as PDF client-side or used as JSON for custom rendering.
 *
 * Slides:
 *   1. Score Overview (brand name, classification, composite /200, confidence)
 *   2. ADVE Breakdown (8 pillar scores with labels)
 *   3. Top 5 Recommendations
 *   4. Campaign/Mission Progress
 *   5. ROI Projection in FCFA
 *   6. Next Steps (from pillar S sprint + I action catalogue)
 */

import { db } from "@/lib/db";
import {
  classifyBrand,
  PILLAR_NAMES,
  PILLAR_KEYS,
  type PillarKey,
} from "@/lib/types/advertis-vector";

// ── Types ──────────────────────────────────────────────────────────────

export interface BoardSlide {
  slideNumber: number;
  title: string;
  titleEn: string;
  content: Record<string, unknown>;
}

export interface BoardDeck {
  brandName: string;
  generatedAt: string;
  language: "FR" | "EN";
  slides: BoardSlide[];
  metadata: {
    strategyId: string;
    composite: number;
    classification: string;
    confidence: number;
  };
}

// ── Main export function ───────────────────────────────────────────────

export async function generateBoardDeck(
  strategyId: string,
  options?: { language?: "FR" | "EN" },
): Promise<BoardDeck> {
  const lang = options?.language ?? "FR";

  // Load strategy with all relations needed
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      pillars: true,
      campaigns: {
        where: { status: { not: "DELETED" } },
        include: { missions: true },
      },
      recommendations: {
        where: { status: "ACCEPTED" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      scoreSnapshots: {
        orderBy: { measuredAt: "desc" },
        take: 2,
      },
    },
  });

  const vector = (strategy.advertis_vector as Record<string, number>) ?? {};
  const composite = vector.composite ?? 0;
  const confidence = vector.confidence ?? 0;
  const classification = classifyBrand(composite);

  const pillarMap: Record<string, Record<string, unknown>> = {};
  for (const p of strategy.pillars) {
    pillarMap[p.key] = (p.content as Record<string, unknown>) ?? {};
  }

  // ── Slide 1: Score Overview ──────────────────────────────────────

  const slide1: BoardSlide = {
    slideNumber: 1,
    title: "Vue d'ensemble de la marque",
    titleEn: "Brand Overview",
    content: {
      brandName: strategy.name,
      composite,
      compositeMax: 200,
      classification,
      classificationLabel: {
        ZOMBIE: lang === "FR" ? "Zombie" : "Zombie",
        ORDINAIRE: lang === "FR" ? "Ordinaire" : "Ordinary",
        FORTE: lang === "FR" ? "Forte" : "Strong",
        CULTE: lang === "FR" ? "Culte" : "Cult",
        ICONE: lang === "FR" ? "Icone" : "Icon",
      }[classification],
      confidence: Math.round(confidence * 100),
      previousComposite: strategy.scoreSnapshots[1]
        ? ((strategy.scoreSnapshots[1].advertis_vector as Record<string, number>)?.composite ?? null)
        : null,
      trend: strategy.scoreSnapshots[1]
        ? composite - ((strategy.scoreSnapshots[1].advertis_vector as Record<string, number>)?.composite ?? 0)
        : null,
    },
  };

  // ── Slide 2: ADVE Breakdown ─────────────────────────────────────

  const pillarBreakdown = PILLAR_KEYS.map((key) => ({
    key,
    name: PILLAR_NAMES[key as PillarKey],
    score: vector[key] ?? 0,
    max: 25,
    percentage: Math.round(((vector[key] ?? 0) / 25) * 100),
  }));

  const slide2: BoardSlide = {
    slideNumber: 2,
    title: "Diagnostic ADVE-RTIS",
    titleEn: "ADVE-RTIS Diagnostic",
    content: {
      pillars: pillarBreakdown,
      adveSubtotal: (vector.a ?? 0) + (vector.d ?? 0) + (vector.v ?? 0) + (vector.e ?? 0),
      rtisSubtotal: (vector.r ?? 0) + (vector.t ?? 0) + (vector.i ?? 0) + (vector.s ?? 0),
    },
  };

  // ── Slide 3: Top 5 Recommendations ──────────────────────────────

  const slide3: BoardSlide = {
    slideNumber: 3,
    title: "Recommandations prioritaires",
    titleEn: "Priority Recommendations",
    content: {
      recommendations: strategy.recommendations.map((r, idx) => ({
        rank: idx + 1,
        title: r.explain ?? `Recommandation ${idx + 1}`,
        pillar: r.targetPillarKey,
        pillarName: PILLAR_NAMES[(r.targetPillarKey ?? "a") as PillarKey],
        impact: r.impact ?? "MEDIUM",
        source: r.source,
      })),
      totalAvailable: strategy.recommendations.length,
    },
  };

  // ── Slide 4: Campaign/Mission Progress ──────────────────────────

  const totalMissions = strategy.campaigns.reduce((sum, c) => sum + c.missions.length, 0);
  const completedMissions = strategy.campaigns.reduce(
    (sum, c) => sum + c.missions.filter((m) => m.status === "COMPLETED").length,
    0,
  );
  const activeCampaigns = strategy.campaigns.filter(
    (c) => !["COMPLETED", "CANCELLED"].includes(c.status),
  );

  const slide4: BoardSlide = {
    slideNumber: 4,
    title: "Avancement des operations",
    titleEn: "Operations Progress",
    content: {
      activeCampaigns: activeCampaigns.length,
      totalCampaigns: strategy.campaigns.length,
      totalMissions,
      completedMissions,
      completionRate: totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0,
      campaignSummary: activeCampaigns.slice(0, 5).map((c) => ({
        name: c.name,
        status: c.status,
        budget: c.budget,
        currency: c.budgetCurrency,
        missionCount: c.missions.length,
        completedCount: c.missions.filter((m) => m.status === "COMPLETED").length,
      })),
    },
  };

  // ── Slide 5: ROI Projection (FCFA) ─────────────────────────────

  const totalBudget = strategy.campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0);
  const vPillar = pillarMap.v ?? {};
  const tPillar = pillarMap.t ?? {};

  const slide5: BoardSlide = {
    slideNumber: 5,
    title: "Investissement et projection ROI",
    titleEn: "Investment & ROI Projection",
    content: {
      totalBudgetXAF: totalBudget,
      currency: "XAF",
      pillarVScore: vector.v ?? 0,
      pillarTScore: vector.t ?? 0,
      valueProposition: vPillar.propositionDeValeur ?? vPillar.valueProposition ?? null,
      brandMarketFitScore: tPillar.brandMarketFitScore ?? null,
      revenueModel: vPillar.modeleEconomique ?? vPillar.economicModel ?? null,
      note: lang === "FR"
        ? "Projection basee sur les scores V (Valeur) et T (Track). Les chiffres sont indicatifs."
        : "Projection based on V (Value) and T (Track) scores. Figures are indicative.",
    },
  };

  // ── Slide 6: Next Steps ─────────────────────────────────────────

  const sPillar = pillarMap.s ?? {};
  const iPillar = pillarMap.i ?? {};

  const slide6: BoardSlide = {
    slideNumber: 6,
    title: "Prochaines etapes",
    titleEn: "Next Steps",
    content: {
      sprint90Days: sPillar.sprint90Days ?? sPillar.sprint90days ?? null,
      strategicPriorities: sPillar.prioritesStrategiques ?? sPillar.strategicPriorities ?? null,
      innovationOpportunities: iPillar.actionsExhaustives
        ? (iPillar.actionsExhaustives as unknown[]).slice(0, 5)
        : null,
      roadmapPhases: sPillar.phases ?? sPillar.roadmap ?? null,
    },
  };

  return {
    brandName: strategy.name,
    generatedAt: new Date().toISOString(),
    language: lang,
    slides: [slide1, slide2, slide3, slide4, slide5, slide6],
    metadata: {
      strategyId,
      composite,
      classification,
      confidence,
    },
  };
}
