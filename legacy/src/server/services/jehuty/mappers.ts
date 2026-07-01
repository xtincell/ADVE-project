/**
 * JEHUTY Mappers — Transform source records into JehutyFeedItem
 */

import type { JehutyFeedItem, JehutyCategory, JehutyCurationAction } from "@/lib/types/jehuty";
import { computePriority } from "@/lib/types/jehuty";

type CurationRecord = { action: string; note?: string | null } | undefined;

// ── Signal → FeedItem ─────────────────────────────────────────────

const SIGNAL_TYPE_TO_CATEGORY: Record<string, JehutyCategory> = {
  MARKET_SIGNAL: "MARKET_SIGNAL",
  WEAK_SIGNAL_ALERT: "WEAK_SIGNAL",
  SCORE_IMPROVEMENT: "SCORE_DRIFT",
  SCORE_DECLINE: "SCORE_DRIFT",
  NOTORIA_BATCH_READY: "RECOMMENDATION",
  STRONG: "EXTERNAL_SIGNAL",
  WEAK: "WEAK_SIGNAL",
  METRIC: "MARKET_SIGNAL",
};

export function mapSignalToFeedItem(
  signal: {
    id: string;
    strategyId: string;
    type: string;
    data: unknown;
    createdAt: Date;
  },
  curation: CurationRecord,
  strategyName?: string,
): JehutyFeedItem {
  const data = (signal.data ?? {}) as Record<string, unknown>;
  const category = SIGNAL_TYPE_TO_CATEGORY[signal.type] ?? "EXTERNAL_SIGNAL";

  const VALID_URGENCIES = ["NOW", "SOON", "LATER"];
  const rawUrgency = String(data.urgency ?? "");
  const urgency = VALID_URGENCIES.includes(rawUrgency) ? rawUrgency : (signal.type.includes("DECLINE") ? "NOW" : "SOON");
  const rawSeverity = String(data.severity ?? "");
  const impact = (rawSeverity === "critical" || rawSeverity === "high") ? "HIGH"
    : rawSeverity === "medium" ? "MEDIUM"
      : "LOW";
  const confidence = typeof data.confidence === "number" && Number.isFinite(data.confidence) ? data.confidence : 0.5;

  const title = (data.title as string) ?? (data.thesis as string) ?? `Signal ${signal.type}`;
  const summary = (data.content as string) ?? (data.recommendedAction as string) ?? (data.brandImpact as string) ?? "";

  return {
    id: `signal:${signal.id}`,
    sourceType: "SIGNAL",
    sourceId: signal.id,
    category,
    title: title.slice(0, 120),
    summary: summary.slice(0, 300),
    pillarKey: (data.relatedPillars as string[] | undefined)?.[0] ?? (data.pillar as string) ?? undefined,
    strategyId: signal.strategyId,
    strategyName,
    urgency: urgency as JehutyFeedItem["urgency"],
    impact: impact as JehutyFeedItem["impact"],
    confidence,
    priority: computePriority(urgency, impact, confidence, signal.createdAt),
    advantages: (data.advantages as string[]) ?? undefined,
    disadvantages: (data.disadvantages as string[]) ?? undefined,
    curation: curation ? { action: curation.action as JehutyCurationAction, note: curation.note ?? undefined } : undefined,
    createdAt: signal.createdAt.toISOString(),
    source: signal.type,
  };
}

// ── Recommendation → FeedItem ─────────────────────────────────────

export function mapRecoToFeedItem(
  reco: {
    id: string;
    strategyId: string;
    targetPillarKey: string;
    targetField: string;
    operation: string;
    explain: string;
    advantages: unknown;
    disadvantages: unknown;
    urgency: string;
    impact: string;
    confidence: number;
    source: string;
    status: string;
    publishedAt: Date | null;
    createdAt: Date;
  },
  curation: CurationRecord,
  strategyName?: string,
): JehutyFeedItem {
  const opLabel = reco.operation === "ADD" ? "Ajouter" : reco.operation === "MODIFY" ? "Modifier" : reco.operation === "REMOVE" ? "Supprimer" : reco.operation === "EXTEND" ? "Enrichir" : "Mettre a jour";

  return {
    id: `reco:${reco.id}`,
    sourceType: "RECOMMENDATION",
    sourceId: reco.id,
    category: "RECOMMENDATION",
    title: `${opLabel} ${reco.targetPillarKey.toUpperCase()}.${reco.targetField}`,
    summary: reco.explain,
    pillarKey: reco.targetPillarKey,
    strategyId: reco.strategyId,
    strategyName,
    urgency: reco.urgency as JehutyFeedItem["urgency"],
    impact: reco.impact as JehutyFeedItem["impact"],
    confidence: reco.confidence,
    priority: computePriority(reco.urgency, reco.impact, reco.confidence, reco.createdAt),
    advantages: Array.isArray(reco.advantages) ? reco.advantages as string[] : undefined,
    disadvantages: Array.isArray(reco.disadvantages) ? reco.disadvantages as string[] : undefined,
    curation: curation ? { action: curation.action as JehutyCurationAction, note: curation.note ?? undefined } : undefined,
    createdAt: reco.createdAt.toISOString(),
    source: `Notoria/${reco.source}`,
  };
}

// ── KnowledgeEntry (DIAGNOSTIC_RESULT) → FeedItem ─────────────────

export function mapDiagnosticToFeedItem(
  entry: {
    id: string;
    data: unknown;
    pillarFocus: string | null;
    createdAt: Date;
  },
  curation: CurationRecord,
  strategyId: string,
  strategyName?: string,
): JehutyFeedItem {
  const data = (entry.data ?? {}) as Record<string, unknown>;
  const severity = (data.severity as string) ?? "medium";
  const urgency = severity === "critical" || severity === "high" ? "NOW" : "SOON";
  const impact = severity === "critical" ? "HIGH" : severity === "high" ? "HIGH" : "MEDIUM";

  return {
    id: `diag:${entry.id}`,
    sourceType: "DIAGNOSTIC",
    sourceId: entry.id,
    category: "DIAGNOSTIC",
    title: (data.title as string) ?? (data.diagnostic as string)?.slice(0, 80) ?? "Diagnostic NETERU",
    summary: (data.prescription as string) ?? (data.diagnostic as string) ?? "",
    pillarKey: entry.pillarFocus ?? undefined,
    strategyId,
    strategyName,
    urgency: urgency as JehutyFeedItem["urgency"],
    impact: impact as JehutyFeedItem["impact"],
    confidence: typeof data.confidence === "number" ? data.confidence : 0.6,
    priority: computePriority(urgency, impact, 0.6, entry.createdAt),
    curation: curation ? { action: curation.action as JehutyCurationAction, note: curation.note ?? undefined } : undefined,
    createdAt: entry.createdAt.toISOString(),
    source: "Artemis/Diagnostic",
  };
}
