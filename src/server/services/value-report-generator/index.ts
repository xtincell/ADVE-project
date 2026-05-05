import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * Value Report Generator — Monthly evolution reports with real period comparison
 */

import { db } from "@/lib/db";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";

interface ValueReport {
  strategyId: string;
  period: string;
  generatedAt: string;
  summary: {
    currentScore: number;
    previousScore: number;
    delta: number;
    classification: string;
    previousClassification: string;
    trend: "UP" | "DOWN" | "STABLE";
  };
  pillarEvolution: Array<{
    pillar: PillarKey;
    name: string;
    current: number;
    previous: number;
    delta: number;
    trend: "UP" | "DOWN" | "STABLE";
  }>;
  devotion: {
    current: Record<string, number>;
    previous: Record<string, number> | null;
    delta: Record<string, number>;
  } | null;
  cultIndex: {
    current: number;
    previous: number;
    delta: number;
    tier: string;
  } | null;
  missionStats: {
    total: number;
    completed: number;
    inProgress: number;
    avgQcScore: number;
    onTimeRate: number;
  };
  campaignStats: {
    active: number;
    completed: number;
    totalBudget: number;
    currency: string;
  };
  recommendations: Array<{
    pillar: string;
    priority: number;
    recommendation: string;
    impact: string;
  }>;
  highlights: string[];
}

export async function generate(strategyId: string, period: string): Promise<ValueReport> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      pillars: true,
      missions: true,
      campaigns: true,
      devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 2 },
    },
  });

  const vector = (strategy.advertis_vector as Record<string, number>) ?? {};
  const currentScore = vector.composite ?? 0;

  // Get REAL previous score from ScoreSnapshot (30 days ago)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const previousSnapshot = await db.scoreSnapshot.findFirst({
    where: { strategyId, measuredAt: { lte: thirtyDaysAgo } },
    orderBy: { measuredAt: "desc" },
  });

  const previousVector = (previousSnapshot?.advertis_vector as Record<string, number>) ?? {};
  const previousScore = previousVector.composite ?? 0;
  const scoreDelta = currentScore - previousScore;

  // Build REAL pillar evolution with history
  const pillarEvolution = ([...PILLAR_STORAGE_KEYS] as PillarKey[]).map((pillar) => {
    const current = vector[pillar] ?? 0;
    const previous = previousVector[pillar] ?? 0;
    const delta = current - previous;
    return {
      pillar,
      name: PILLAR_NAMES[pillar],
      current,
      previous,
      delta,
      trend: delta > 1 ? "UP" as const : delta < -1 ? "DOWN" as const : "STABLE" as const,
    };
  });

  // Devotion comparison
  const [currentDevotion, previousDevotion] = strategy.devotionSnapshots;
  const devotionData = currentDevotion ? {
    current: {
      spectateur: currentDevotion.spectateur,
      interesse: currentDevotion.interesse,
      participant: currentDevotion.participant,
      engage: currentDevotion.engage,
      ambassadeur: currentDevotion.ambassadeur,
      evangeliste: currentDevotion.evangeliste,
    },
    previous: previousDevotion ? {
      spectateur: previousDevotion.spectateur,
      interesse: previousDevotion.interesse,
      participant: previousDevotion.participant,
      engage: previousDevotion.engage,
      ambassadeur: previousDevotion.ambassadeur,
      evangeliste: previousDevotion.evangeliste,
    } : null,
    delta: {
      spectateur: currentDevotion.spectateur - (previousDevotion?.spectateur ?? 0),
      interesse: currentDevotion.interesse - (previousDevotion?.interesse ?? 0),
      participant: currentDevotion.participant - (previousDevotion?.participant ?? 0),
      engage: currentDevotion.engage - (previousDevotion?.engage ?? 0),
      ambassadeur: currentDevotion.ambassadeur - (previousDevotion?.ambassadeur ?? 0),
      evangeliste: currentDevotion.evangeliste - (previousDevotion?.evangeliste ?? 0),
    },
  } : null;

  // Cult Index comparison
  const cultSnapshots = await db.cultIndexSnapshot.findMany({
    where: { strategyId },
    orderBy: { measuredAt: "desc" },
    take: 2,
  });
  const cultData = cultSnapshots[0] ? {
    current: cultSnapshots[0].compositeScore,
    previous: cultSnapshots[1]?.compositeScore ?? 0,
    delta: cultSnapshots[0].compositeScore - (cultSnapshots[1]?.compositeScore ?? 0),
    tier: cultSnapshots[0].tier,
  } : null;

  // Mission stats with real QC scores
  const completedMissions = strategy.missions.filter((m) => m.status === "COMPLETED");
  const inProgressMissions = strategy.missions.filter((m) => m.status === "IN_PROGRESS");

  const qcReviews = await db.qualityReview.findMany({
    where: { deliverable: { mission: { strategyId } } },
    select: { overallScore: true },
  });
  const avgQcScore = qcReviews.length > 0
    ? qcReviews.reduce((sum, r) => sum + r.overallScore, 0) / qcReviews.length
    : 0;

  // On-time rate from SLA data
  const missionsWithDeadline = strategy.missions.filter((m) => m.slaDeadline);
  const onTimeMissions = missionsWithDeadline.filter((m) =>
    m.status === "COMPLETED" && m.slaDeadline && m.updatedAt <= m.slaDeadline
  );
  const onTimeRate = missionsWithDeadline.length > 0
    // lafusee:allow-adhoc-completion: value-report KPI metric (composite scoring ratio)
    ? (onTimeMissions.length / missionsWithDeadline.length) * 100
    : 100;

  // Campaign stats
  const activeCampaigns = strategy.campaigns.filter((c) => c.status !== "ARCHIVED" && c.status !== "CANCELLED");
  const completedCampaigns = strategy.campaigns.filter((c) => c.status === "ARCHIVED" || c.state === "POST_CAMPAIGN");
  const totalBudget = strategy.campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0);

  // Smart recommendations
  const recommendations = generateSmartRecommendations(pillarEvolution, avgQcScore, onTimeRate, cultData);

  // Highlights
  const highlights = generateHighlights(pillarEvolution, scoreDelta, completedMissions.length, cultData);

  return {
    strategyId,
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      currentScore,
      previousScore,
      delta: scoreDelta,
      classification: classifyScore(currentScore),
      previousClassification: classifyScore(previousScore),
      trend: scoreDelta > 3 ? "UP" : scoreDelta < -3 ? "DOWN" : "STABLE",
    },
    pillarEvolution,
    devotion: devotionData,
    cultIndex: cultData,
    missionStats: {
      total: strategy.missions.length,
      completed: completedMissions.length,
      inProgress: inProgressMissions.length,
      avgQcScore: Math.round(avgQcScore * 100) / 100,
      onTimeRate: Math.round(onTimeRate),
    },
    campaignStats: {
      active: activeCampaigns.length,
      completed: completedCampaigns.length,
      totalBudget,
      currency: "XAF",
    },
    recommendations,
    highlights,
  };
}

function generateSmartRecommendations(
  pillarEvolution: ValueReport["pillarEvolution"],
  avgQcScore: number,
  onTimeRate: number,
  cultData: ValueReport["cultIndex"]
) {
  const recs: ValueReport["recommendations"] = [];

  // Declining pillars
  const declining = pillarEvolution.filter((p) => p.trend === "DOWN").sort((a, b) => a.delta - b.delta);
  for (const p of declining.slice(0, 2)) {
    recs.push({
      pillar: p.name,
      priority: 1,
      recommendation: `Le pilier ${p.name} a baisse de ${Math.abs(p.delta).toFixed(1)} pts. Planifier un diagnostic ARTEMIS cible.`,
      impact: "Score composite risque de continuer a baisser sans intervention.",
    });
  }

  // Weak pillars (< 10/25)
  const weak = pillarEvolution.filter((p) => p.current < 10 && p.trend !== "UP").sort((a, b) => a.current - b.current);
  for (const p of weak.slice(0, 2)) {
    recs.push({
      pillar: p.name,
      priority: 2,
      recommendation: `Le pilier ${p.name} est a ${p.current.toFixed(1)}/25. Completer le contenu du pilier via l'editeur ADVE.`,
      impact: `+${(15 - p.current).toFixed(0)} pts potentiels sur le composite.`,
    });
  }

  // QC quality
  if (avgQcScore > 0 && avgQcScore < 6) {
    recs.push({
      pillar: "Qualite",
      priority: 2,
      recommendation: `Score QC moyen a ${avgQcScore.toFixed(1)}/10. Renforcer les briefs et le suivi des livrables.`,
      impact: "Impact direct sur la satisfaction client et le taux de First Pass.",
    });
  }

  // SLA compliance
  if (onTimeRate < 80) {
    recs.push({
      pillar: "Operations",
      priority: 1,
      recommendation: `Taux de respect SLA a ${onTimeRate}%. Revoir la charge equipe et les delais.`,
      impact: "Risque de perte de confiance client.",
    });
  }

  // Cult Index
  if (cultData && cultData.current < 40) {
    recs.push({
      pillar: "Engagement",
      priority: 2,
      recommendation: `Cult Index a ${cultData.current}/100 (${cultData.tier}). Activer les rituels de marque et le programme Ambassador.`,
      impact: "Passage au tier superieur = croissance organique acceleree.",
    });
  }

  return recs.sort((a, b) => a.priority - b.priority);
}

function generateHighlights(
  pillarEvolution: ValueReport["pillarEvolution"],
  scoreDelta: number,
  completedMissions: number,
  cultData: ValueReport["cultIndex"]
): string[] {
  const highlights: string[] = [];

  if (scoreDelta > 5) highlights.push(`Score en hausse de +${scoreDelta.toFixed(0)} pts ce mois`);
  if (scoreDelta < -5) highlights.push(`Attention: baisse de ${Math.abs(scoreDelta).toFixed(0)} pts ce mois`);

  const improving = pillarEvolution.filter((p) => p.trend === "UP");
  if (improving.length > 0) {
    highlights.push(`${improving.length} pilier(s) en progression: ${improving.map((p) => p.name).join(", ")}`);
  }

  if (completedMissions > 0) highlights.push(`${completedMissions} mission(s) completee(s) ce mois`);

  if (cultData && cultData.delta > 5) {
    highlights.push(`Cult Index en hausse: +${cultData.delta.toFixed(0)} pts`);
  }

  return highlights;
}

function classifyScore(score: number): string {
  if (score <= 80) return "ZOMBIE";
  if (score <= 120) return "ORDINAIRE";
  if (score <= 160) return "FORTE";
  if (score <= 180) return "CULTE";
  return "ICONE";
}

export async function exportHtml(strategyId: string, period: string): Promise<string> {
  const report = await generate(strategyId, period);
  const r = report;

  const trendIcon = (trend: string) => trend === "UP" ? "↑" : trend === "DOWN" ? "↓" : "→";
  const trendColor = (trend: string) => trend === "UP" ? "#22c55e" : trend === "DOWN" ? "#ef4444" : "#71717a";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Value Report — ${r.period} — ${r.strategyId}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #e4e4e7; margin: 0; padding: 32px; }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 18px; font-weight: 600; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 8px; }
    .subtitle { color: #71717a; font-size: 14px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 16px; }
    .card-label { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .card-delta { font-size: 12px; margin-top: 2px; }
    .pillar-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1f1f23; }
    .pillar-name { font-weight: 500; min-width: 140px; }
    .pillar-bar { flex: 1; margin: 0 16px; height: 8px; background: #27272a; border-radius: 4px; overflow: hidden; }
    .pillar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .pillar-score { font-weight: 600; min-width: 60px; text-align: right; }
    .rec { background: #18181b; border-left: 3px solid #8b5cf6; padding: 12px 16px; margin-bottom: 8px; border-radius: 0 8px 8px 0; }
    .rec-title { font-weight: 600; font-size: 14px; }
    .rec-impact { font-size: 12px; color: #a1a1aa; margin-top: 4px; }
    .highlight { background: #1a1a2e; border: 1px solid #2d2d5e; border-radius: 8px; padding: 10px 14px; margin-bottom: 6px; font-size: 13px; }
    .footer { margin-top: 40px; text-align: center; color: #52525b; font-size: 11px; }
    @media print { body { background: white; color: #18181b; } .card { border-color: #d4d4d8; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Value Report</h1>
    <p class="subtitle">Periode : ${r.period} | Genere le ${new Date(r.generatedAt).toLocaleDateString("fr-FR")}</p>

    <div class="grid">
      <div class="card">
        <div class="card-label">Score ADVE</div>
        <div class="card-value">${r.summary.currentScore.toFixed(0)}/200</div>
        <div class="card-delta" style="color: ${trendColor(r.summary.trend)}">${trendIcon(r.summary.trend)} ${r.summary.delta >= 0 ? "+" : ""}${r.summary.delta.toFixed(0)} pts</div>
      </div>
      <div class="card">
        <div class="card-label">Classification</div>
        <div class="card-value" style="font-size: 18px;">${r.summary.classification}</div>
        <div class="card-delta">${r.summary.previousClassification !== r.summary.classification ? `Avant: ${r.summary.previousClassification}` : "Stable"}</div>
      </div>
      <div class="card">
        <div class="card-label">Missions</div>
        <div class="card-value">${r.missionStats.completed}/${r.missionStats.total}</div>
        <div class="card-delta">QC moy: ${r.missionStats.avgQcScore}/10</div>
      </div>
      <div class="card">
        <div class="card-label">Cult Index</div>
        <div class="card-value">${r.cultIndex?.current.toFixed(0) ?? "—"}/100</div>
        <div class="card-delta" style="color: ${trendColor(r.cultIndex && r.cultIndex.delta > 2 ? "UP" : r.cultIndex && r.cultIndex.delta < -2 ? "DOWN" : "STABLE")}">${r.cultIndex ? `${trendIcon(r.cultIndex.delta > 2 ? "UP" : r.cultIndex.delta < -2 ? "DOWN" : "STABLE")} ${r.cultIndex.tier}` : "N/A"}</div>
      </div>
    </div>

    ${r.highlights.length > 0 ? `
    <h2>Faits marquants</h2>
    ${r.highlights.map((h) => `<div class="highlight">${h}</div>`).join("")}
    ` : ""}

    <h2>Evolution par pilier</h2>
    ${r.pillarEvolution.map((p) => `
    <div class="pillar-row">
      <span class="pillar-name">${p.name}</span>
      <div class="pillar-bar">
        <div class="pillar-fill" style="width: ${(p.current / 25) * 100}%; background: ${trendColor(p.trend)};"></div>
      </div>
      <span class="pillar-score" style="color: ${trendColor(p.trend)}">${p.current.toFixed(1)}/25 ${trendIcon(p.trend)}${p.delta !== 0 ? ` (${p.delta >= 0 ? "+" : ""}${p.delta.toFixed(1)})` : ""}</span>
    </div>
    `).join("")}

    ${r.recommendations.length > 0 ? `
    <h2>Recommandations</h2>
    ${r.recommendations.map((rec) => `
    <div class="rec">
      <div class="rec-title">${rec.pillar} — ${rec.recommendation}</div>
      <div class="rec-impact">${rec.impact}</div>
    </div>
    `).join("")}
    ` : ""}

    <div class="footer">
      <p>Rapport genere par LaFusee Industry OS — Protocole ADVE-RTIS</p>
      <p>De la Poussiere a l'Etoile</p>
    </div>
  </div>
</body>
</html>`;
}
