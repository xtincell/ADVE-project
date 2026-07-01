/**
 * JEHUTY Types — Strategic Intelligence Feed
 */

// ── Feed Categories ───────────────────────────────────────────────

export type JehutyCategory =
  | "RECOMMENDATION"
  | "MARKET_SIGNAL"
  | "WEAK_SIGNAL"
  | "SCORE_DRIFT"
  | "DIAGNOSTIC"
  | "EXTERNAL_SIGNAL";

export type JehutySourceType = "SIGNAL" | "RECOMMENDATION" | "DIAGNOSTIC";

export type JehutyCurationAction = "PINNED" | "DISMISSED" | "NOTORIA_TRIGGERED";

// ── Feed Item ─────────────────────────────────────────────────────

export interface JehutyFeedItem {
  id: string;
  sourceType: JehutySourceType;
  sourceId: string;
  category: JehutyCategory;

  // Content
  title: string;
  summary: string;
  pillarKey?: string;
  strategyId: string;
  strategyName?: string;

  // Qualification
  urgency: "NOW" | "SOON" | "LATER";
  impact: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  priority: number;

  // Editorial
  advantages?: string[];
  disadvantages?: string[];

  // Curation
  curation?: { action: JehutyCurationAction; note?: string };

  // Meta
  createdAt: string;
  source?: string;
}

// ── Priority Calculation ──────────────────────────────────────────

const URGENCY_NORM: Record<string, number> = { NOW: 1.0, SOON: 0.6, LATER: 0.3 };
const IMPACT_NORM: Record<string, number> = { HIGH: 1.0, MEDIUM: 0.6, LOW: 0.3 };

export function computePriority(
  urgency: string,
  impact: string,
  confidence: number,
  createdAt: Date | string,
): number {
  const u = URGENCY_NORM[urgency] ?? 0.5;
  const i = IMPACT_NORM[impact] ?? 0.5;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, Math.min(1, 1 - ageHours / 168)); // clamped [0,1]
  const c = Math.max(0, Math.min(1, Number.isFinite(confidence) ? confidence : 0.5));
  return u * i * freshness * Math.max(0.1, c);
}

// ── Dashboard ─────────────────────────────────────────────────────

export interface JehutyDashboard {
  totalItems: number;
  criticalCount: number;
  acceptanceRate: number;
  marketHealthScore: number;
}

// ── Category Config ───────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<JehutyCategory, { label: string; color: string; icon: string }> = {
  RECOMMENDATION: { label: "Recommandation", color: "bg-violet-500/15 text-violet-300", icon: "Sparkles" },
  MARKET_SIGNAL: { label: "Signal Marche", color: "bg-cyan-500/15 text-cyan-300", icon: "TrendingUp" },
  WEAK_SIGNAL: { label: "Signal Faible", color: "bg-amber-500/15 text-amber-300", icon: "AlertTriangle" },
  SCORE_DRIFT: { label: "Mouvement Score", color: "bg-emerald-500/15 text-emerald-300", icon: "Activity" },
  DIAGNOSTIC: { label: "Diagnostic", color: "bg-orange-500/15 text-orange-300", icon: "Stethoscope" },
  EXTERNAL_SIGNAL: { label: "Signal Externe", color: "bg-red-500/15 text-red-300", icon: "Globe" },
};
