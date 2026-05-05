import { PILLAR_STORAGE_KEYS } from "@/domain";

/**
 * Mestor Insights — Proactive alert generation
 * Rule-based + AI-generated insights on coherence, stale pillars, signals, opportunities
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import { PILLAR_KEYS } from "@/domain/pillars";

export type InsightSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type InsightType = "COHERENCE" | "STALE_PILLAR" | "SIGNAL_ALERT" | "OPPORTUNITY" | "CULT_INDEX" | "SLA_RISK" | "DRIFT";

export interface MestorInsight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  pillarKey?: string;
  actionable: boolean;
  suggestedAction?: string;
  data?: Record<string, unknown>;
}

/**
 * Generate proactive insights for a strategy
 */
export async function generateInsights(strategyId: string): Promise<MestorInsight[]> {
  const insights: MestorInsight[] = [];

  const [strategy, pillars, signals, devotionSnapshots, cultSnapshots] = await Promise.all([
    db.strategy.findUniqueOrThrow({ where: { id: strategyId }, include: { drivers: true, missions: true } }),
    db.pillar.findMany({ where: { strategyId } }),
    db.signal.findMany({ where: { strategyId }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.devotionSnapshot.findMany({ where: { strategyId }, orderBy: { measuredAt: "desc" }, take: 2 }),
    db.cultIndexSnapshot.findMany({ where: { strategyId }, orderBy: { measuredAt: "desc" }, take: 2 }),
  ]);

  const vector = strategy.advertis_vector as Record<string, number> | null;

  // === COHERENCE CHECK ===
  if (vector) {
    const scores = Object.values(vector).filter((v) => typeof v === "number" && v <= 25);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const spread = max - min;

    if (spread > 15) {
      insights.push({
        type: "COHERENCE",
        severity: "HIGH",
        title: "Déséquilibre entre piliers",
        description: `Écart de ${spread} points entre le pilier le plus fort et le plus faible. Un écart > 15 indique un manque de cohérence stratégique.`,
        actionable: true,
        suggestedAction: "Lancer un diagnostic ARTEMIS sur les piliers faibles",
        data: { spread, min, max },
      });
    }
  }

  // === STALE PILLARS ===
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  for (const pillar of pillars) {
    if (pillar.updatedAt < thirtyDaysAgo) {
      insights.push({
        type: "STALE_PILLAR",
        severity: "MEDIUM",
        title: `Pilier "${pillar.key}" non mis à jour`,
        description: `Le pilier ${pillar.key} n'a pas été mis à jour depuis plus de 30 jours.`,
        pillarKey: pillar.key,
        actionable: true,
        suggestedAction: `Planifier une session de revue du pilier ${pillar.key}`,
      });
    }
  }

  // === INCOMPLETE PILLARS ===
  const allPillarKeys = [...PILLAR_KEYS];
  const existingKeys = pillars.map((p) => p.key);
  const missingKeys = allPillarKeys.filter((k) => !existingKeys.includes(k));
  if (missingKeys.length > 0) {
    insights.push({
      type: "STALE_PILLAR",
      severity: "HIGH",
      title: `${missingKeys.length} pilier(s) incomplet(s)`,
      description: `Les piliers suivants n'ont pas de contenu: ${missingKeys.join(", ")}`,
      actionable: true,
      suggestedAction: "Compléter les piliers manquants via le Boot Sequence ou manuellement",
    });
  }

  // === CRITICAL SIGNALS ===
  const criticalSignals = signals.filter((s) => {
    const data = s.data as Record<string, unknown> | null;
    return data?.severity === "critical" || data?.severity === "high";
  });
  if (criticalSignals.length > 0) {
    insights.push({
      type: "SIGNAL_ALERT",
      severity: "CRITICAL",
      title: `${criticalSignals.length} signal(aux) critique(s)`,
      description: "Des signaux critiques nécessitent une attention immédiate.",
      actionable: true,
      suggestedAction: "Consulter les signaux dans le Signal Dashboard",
      data: { count: criticalSignals.length },
    });
  }

  // === CULT INDEX ===
  if (cultSnapshots.length > 0) {
    const latest = cultSnapshots[0];
    if (latest && latest.compositeScore < 30) {
      insights.push({
        type: "CULT_INDEX",
        severity: "MEDIUM",
        title: "Cult Index faible",
        description: `Le Cult Index est à ${latest.compositeScore}/100 (tier: ${latest.tier}). Des actions d'engagement sont recommandées.`,
        actionable: true,
        suggestedAction: "Activer le programme Ambassador et les rituels de marque",
        data: { score: latest.compositeScore, tier: latest.tier },
      });
    }
  }

  // === DEVOTION LADDER ===
  if (devotionSnapshots.length >= 2) {
    const current = devotionSnapshots[0];
    const previous = devotionSnapshots[1];
    if (!current || !previous) return insights;
    const currentEngaged = current.engage + current.ambassadeur + current.evangeliste;
    const previousEngaged = previous.engage + previous.ambassadeur + previous.evangeliste;
    if (currentEngaged < previousEngaged - 0.05) {
      insights.push({
        type: "DRIFT",
        severity: "HIGH",
        title: "Régression de la Devotion Ladder",
        description: "La proportion de l'audience engagée a diminué. Risque de désengagement.",
        actionable: true,
        suggestedAction: "Analyser les causes et relancer les programmes d'engagement",
      });
    }
  }

  // === SLA RISK ===
  const pendingMissions = strategy.missions.filter((m) => m.status === "IN_PROGRESS");
  for (const mission of pendingMissions) {
    if (mission.slaDeadline && new Date(mission.slaDeadline) < new Date(Date.now() + 48 * 60 * 60 * 1000)) {
      insights.push({
        type: "SLA_RISK",
        severity: mission.slaDeadline < new Date() ? "CRITICAL" : "HIGH",
        title: `SLA en danger: ${mission.title}`,
        description: `La mission "${mission.title}" approche ou dépasse son échéance SLA.`,
        actionable: true,
        suggestedAction: "Escalader la mission ou réassigner",
      });
    }
  }

  // === OPPORTUNITIES ===
  if (strategy.drivers.length < 3) {
    insights.push({
      type: "OPPORTUNITY",
      severity: "LOW",
      title: "Sous-utilisation des Drivers",
      description: `Seulement ${strategy.drivers.length} Driver(s) actif(s). Explorer d'autres canaux pour diversifier la présence.`,
      actionable: true,
      suggestedAction: "Utiliser l'outil GLORY 'digital-planner' pour identifier les canaux à activer",
    });
  }

  return insights.sort((a, b) => {
    const order: Record<InsightSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });
}

/**
 * Generate insights for the Console (cross-client)
 */
export async function generateEcosystemInsights(): Promise<MestorInsight[]> {
  const insights: MestorInsight[] = [];

  const [strategies, pendingCommissions, runningProcesses] = await Promise.all([
    db.strategy.findMany({ where: { status: "ACTIVE" }, include: { missions: { where: { status: "IN_PROGRESS" } } } }),
    db.commission.findMany({ where: { status: "PENDING" } }),
    db.process.findMany({ where: { status: "RUNNING", nextRunAt: { lte: new Date() } } }),
  ]);

  // Pending commissions alert
  if (pendingCommissions.length > 5) {
    const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.netAmount, 0);
    insights.push({
      type: "OPPORTUNITY",
      severity: "MEDIUM",
      title: `${pendingCommissions.length} commissions en attente`,
      description: `${totalAmount.toLocaleString()} XAF en commissions non payées.`,
      actionable: true,
      suggestedAction: "Traiter les paiements via Mobile Money",
    });
  }

  // Overdue processes
  if (runningProcesses.length > 0) {
    insights.push({
      type: "SLA_RISK",
      severity: "HIGH",
      title: `${runningProcesses.length} process(us) en retard`,
      description: "Des processus planifiés n'ont pas été exécutés à temps.",
      actionable: true,
      suggestedAction: "Vérifier le Process Scheduler",
    });
  }

  return insights;
}

/**
 * Generate AI-powered strategic insights using Claude
 * Complements rule-based insights with deeper analysis
 */
export async function generateAIInsights(strategyId: string): Promise<MestorInsight[]> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: {
      pillars: true,
      drivers: { where: { deletedAt: null, status: "ACTIVE" } },
      campaigns: { where: { status: { not: "ARCHIVED" } }, take: 5 },
      signals: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!strategy) return [];

  const vec = strategy.advertis_vector as Record<string, number> | null;
  const bizCtx = strategy.businessContext as Record<string, unknown> | null;

  const contextLines = [
    `Marque: ${strategy.name}`,
    `Statut: ${strategy.status}`,
    vec ? `Score ADVE: A=${vec.a}, D=${vec.d}, V=${vec.v}, E=${vec.e}, R=${vec.r}, T=${vec.t}, I=${vec.i}, S=${vec.s} (total: ${[...PILLAR_STORAGE_KEYS].reduce((s, k) => s + (vec[k] ?? 0), 0).toFixed(0)}/200)` : "Score ADVE: non disponible",
    bizCtx ? `Modele: ${bizCtx.businessModel}, Positionnement: ${bizCtx.positioningArchetype}` : "",
    `Piliers remplis: ${strategy.pillars.map((p) => p.key).join(", ") || "aucun"}`,
    `Drivers actifs: ${strategy.drivers.map((d) => `${d.channel}`).join(", ") || "aucun"}`,
    `Campagnes: ${strategy.campaigns.map((c) => `${c.name} (${c.status})`).join(", ") || "aucune"}`,
    `Derniers signaux: ${strategy.signals.map((s) => s.type).join(", ") || "aucun"}`,
  ].filter(Boolean);

  try {
    const result = await callLLM({
      system: `Tu es Mestor, le moteur d'insights strategiques de LaFusee.
Analyse le contexte de cette marque et genere 3-5 insights strategiques actionnables.
Chaque insight doit etre en JSON avec: type (COHERENCE|STALE_PILLAR|SIGNAL_ALERT|OPPORTUNITY|CULT_INDEX|SLA_RISK|DRIFT), severity (LOW|MEDIUM|HIGH|CRITICAL), title, description, suggestedAction.
Reponds UNIQUEMENT avec un tableau JSON.`,
      prompt: `Contexte marque:\n${contextLines.join("\n")}\n\nGenere les insights strategiques AI.`,
      caller: "mestor:ai_insights",
      strategyId,
      maxOutputTokens: 2048,
    });

    // Parse JSON array from response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      type?: string;
      severity?: string;
      title?: string;
      description?: string;
      suggestedAction?: string;
    }>;

    return parsed
      .filter((item) => item.type && item.title && item.description)
      .map((item) => ({
        type: (item.type as InsightType) ?? "OPPORTUNITY",
        severity: (item.severity as InsightSeverity) ?? "MEDIUM",
        title: item.title!,
        description: item.description!,
        actionable: !!item.suggestedAction,
        suggestedAction: item.suggestedAction,
        data: { source: "ai" },
      }));
  } catch {
    return [];
  }
}

/**
 * Generate combined insights (rule-based + AI)
 */
export async function generateCombinedInsights(strategyId: string): Promise<MestorInsight[]> {
  const [ruleInsights, aiInsights] = await Promise.all([
    generateInsights(strategyId),
    generateAIInsights(strategyId).catch((err) => { console.warn("[mestor] AI insights failed:", err instanceof Error ? err.message : err); return []; }),
  ]);

  // Merge and deduplicate by title similarity
  const combined = [...ruleInsights];
  for (const ai of aiInsights) {
    const isDuplicate = combined.some(
      (existing) => existing.title.toLowerCase().includes(ai.title.toLowerCase().slice(0, 20))
    );
    if (!isDuplicate) {
      combined.push(ai);
    }
  }

  return combined.sort((a, b) => {
    const order: Record<InsightSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });
}
