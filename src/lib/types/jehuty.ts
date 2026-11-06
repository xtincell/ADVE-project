/**
 * JEHUTY Types — Strategic Intelligence Feed
 */
import type { SignalInputSnapshot, SignalBrandContextSnapshot } from "@/domain/signal-provenance";

/** Two-page reader: frozen analysis inputs and its complete interpretation. */
export interface SignalReading {
  signalId: string;
  strategyId: string;
  title: string;
  interpretation: string;
  createdAt: string;
  provenanceStatus: "TRACEABLE" | "REFERENCED" | "UNTRACEABLE";
  inputSignals: Array<SignalInputSnapshot & { article?: {
    title: string; content: string; url: string; source: string;
    imageUrl?: string; publishedAt?: string;
  } }>;
  brandContextSnapshot: SignalBrandContextSnapshot | null;
  currentBrandContext: ArticleBrandInterpretation["brandContext"];
}

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

export interface ArticleSourceGrounding {
  receiptId: string;
  sourceId: string;
  sourceUrl: string;
  source: string | null;
  publishedAt: string | null;
  qualification: "REPORTED";
  observationHash: string;
  excerpts: Array<{ field: "title" | "summary"; text: string; start: number; end: number }>;
  score: number;
  band: "GROUNDED" | "WEAK" | "UNGROUNDED" | "NO_SOURCE";
  unverifiedCitations: string[];
}

/** Article facts and the brand's reading remain separate, joined by exact source URL. */
export interface ArticleBrandInterpretation {
  articleUrl: string;
  linkedAnalyses: Array<{ id: string; title: string; text: string; pillarKeys: string[]; sourceUrl: string; createdAt: string }>;
  recommendations: Array<{ id: string; batchId: string; targetPillarKey: string; targetField: string; explain: string; status: string; createdAt: string;
    /** Received article and documentary sources are two different evidence scopes. */
    articleGrounding?: ArticleSourceGrounding;
    documentaryGrounding?: { score: number; band: ArticleSourceGrounding["band"] };
  }>;
  brandContext: Array<{ pillarKey: string; field: string; label: string; text: string; source: "ADVE"; certainty?: string; stale: boolean }>;
  batchIds: string[];
}

// ── Feed Item ─────────────────────────────────────────────────────

export interface JehutyFeedItem {
  id: string;
  sourceType: JehutySourceType;
  sourceId: string;
  category: JehutyCategory;

  // Content
  title: string;
  summary: string;
  /** Complete measured observation; the editorial excerpt is not its receipt. */
  observation?: string;
  pillarKey?: string;
  strategyId: string;
  strategyName?: string;

  // Qualification
  urgency: "NOW" | "SOON" | "LATER" | null;
  impact: "LOW" | "MEDIUM" | "HIGH" | null;
  confidence: number | null;
  priority: number;

  // Editorial
  advantages?: string[];
  disadvantages?: string[];

  // Curation
  curation?: { action: JehutyCurationAction; note?: string };

  // Meta
  createdAt: string;
  source?: string;
  /** Lien externe (articles de veille « Le monde dehors », fix 2026-07-20). */
  externalUrl?: string;
  /** Vignette réelle fournie par le flux RSS (articles de veille). */
  imageUrl?: string;
  articleContext?: ArticleBrandInterpretation;
  sources?: Array<{ url: string; title: string }>;
  /** Distinguish the publication date from the collection date. */
  dateKind?: "PUBLISHED" | "COLLECTED";
}

// ── Priority Calculation ──────────────────────────────────────────

const URGENCY_NORM: Record<string, number> = { NOW: 1.0, SOON: 0.6, LATER: 0.3 };
const IMPACT_NORM: Record<string, number> = { HIGH: 1.0, MEDIUM: 0.6, LOW: 0.3 };

export function computePriority(
  urgency: string | null,
  impact: string | null,
  confidence: number | null,
  createdAt: Date | string,
): number {
  const u = urgency === null ? 0.5 : URGENCY_NORM[urgency] ?? 0.5;
  const i = impact === null ? 0.5 : IMPACT_NORM[impact] ?? 0.5;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, Math.min(1, 1 - ageHours / 168)); // clamped [0,1]
  // Neutral ranking weight is not a measured confidence displayed to the user.
  const c = Math.max(0, Math.min(1, typeof confidence === "number" && Number.isFinite(confidence) ? confidence : 0.5));
  return u * i * freshness * Math.max(0.1, c);
}

// ── Dashboard ─────────────────────────────────────────────────────

export interface JehutyDashboard {
  totalItems: number;
  criticalCount: number;
  acceptanceRate: number | null;
  marketHealthScore: number | null;
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
