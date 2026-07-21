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

/**
 * Règle d'appartenance d'un diagnostic au feed (fix fuite 2026-07-20, pur) :
 *   - mode marque : SEULS les diagnostics portant `data.strategyId` ===
 *     strategyId — jamais de fallback vers l'appelant (c'est le fallback qui
 *     faisait apparaître les intakes d'AUTRES marques, PII incluse, dans la
 *     gazette de chaque founder).
 *   - mode agence : les entrées sans strategyId (télémétrie funnel) sont
 *     exclues aussi — elles ont leur surface Console dédiée.
 */
export function diagnosticBelongsToFeed(
  data: Record<string, unknown>,
  strategyId: string | undefined,
): boolean {
  const diagStrategyId = typeof data.strategyId === "string" ? data.strategyId : undefined;
  if (strategyId) return diagStrategyId === strategyId;
  return Boolean(diagStrategyId);
}

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

  // ── Titre PERSONNALISÉ + synthèse réelle (fix 2026-07-20) ──
  // La gazette affichait « Diagnostic NETERU » ×7 (jargon mythologique
  // interne — interdit client, ADR-0123) sans aucun commentaire : le mapper
  // ignorait le payload réel du diagnostic-engine (symptoms/localization/
  // frameworksUsed). Le titre dit désormais CE que le diagnostic a trouvé.
  const symptoms = typeof data.symptoms === "number" ? data.symptoms : null;
  const localization = Array.isArray(data.localization)
    ? (data.localization as string[])
    : typeof data.localization === "string"
      ? [data.localization]
      : [];
  const localizationLabel = localization
    .map((l) => String(l).toUpperCase())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const title =
    (data.title as string) ??
    (data.diagnostic as string)?.slice(0, 80) ??
    (symptoms !== null && symptoms > 0
      ? `${symptoms} point(s) de friction détecté(s)${localizationLabel ? ` — fondation(s) ${localizationLabel}` : ""}`
      : symptoms === 0
        ? "Examen de votre marque : rien d'alarmant détecté"
        : "Examen de votre marque");
  const frameworksUsed = Array.isArray(data.frameworksUsed) ? (data.frameworksUsed as string[]) : [];
  const summary =
    (data.prescription as string) ??
    (data.diagnostic as string) ??
    [
      symptoms !== null
        ? `${symptoms} symptôme(s) relevé(s) lors de l'examen automatique de vos fondations.`
        : "",
      frameworksUsed.length > 0 ? `Grilles d'analyse mobilisées : ${frameworksUsed.slice(0, 3).join(", ")}.` : "",
      "Le détail et les prescriptions se travaillent avec votre opérateur.",
    ]
      .filter(Boolean)
      .join(" ");

  return {
    id: `diag:${entry.id}`,
    sourceType: "DIAGNOSTIC",
    sourceId: entry.id,
    category: "DIAGNOSTIC",
    title,
    summary,
    pillarKey: entry.pillarFocus ?? undefined,
    strategyId,
    strategyName,
    urgency: urgency as JehutyFeedItem["urgency"],
    impact: impact as JehutyFeedItem["impact"],
    confidence: typeof data.confidence === "number" ? data.confidence : 0.6,
    priority: computePriority(urgency, impact, 0.6, entry.createdAt),
    curation: curation ? { action: curation.action as JehutyCurationAction, note: curation.note ?? undefined } : undefined,
    createdAt: entry.createdAt.toISOString(),
    source: "Examen automatique",
  };
}

// ── Article de veille (EXTERNAL_FEED_DIGEST) → FeedItem ───────────

/**
 * « Le monde dehors » (fix 2026-07-20) : la veille de marque quotidienne
 * (digest déterministe ADR-0143) entre dans la gazette comme items
 * EXTERNAL_SIGNAL — titre = l'article réel, source = le média.
 */
export function mapExternalArticleToFeedItem(
  article: { title?: string; link?: string; source?: string; publishedAt?: string; imageUrl?: string },
  strategyId: string,
  digestCreatedAt: Date,
  curation: CurationRecord,
): JehutyFeedItem {
  const published = article.publishedAt ? new Date(article.publishedAt) : digestCreatedAt;
  const createdAt = Number.isNaN(published.getTime()) ? digestCreatedAt : published;
  return {
    id: `ext:${article.link}`,
    sourceType: "SIGNAL",
    sourceId: article.link ?? "",
    category: "EXTERNAL_SIGNAL",
    title: (article.title ?? "").slice(0, 120),
    summary: article.source ? `Vu chez ${article.source}. À lire si votre marché en parle autour de vous.` : "",
    strategyId,
    urgency: "LATER",
    impact: "LOW",
    confidence: 1,
    priority: computePriority("LATER", "LOW", 1, createdAt),
    externalUrl: article.link,
    ...(article.imageUrl ? { imageUrl: article.imageUrl } : {}),
    curation: curation ? { action: curation.action as JehutyCurationAction, note: curation.note ?? undefined } : undefined,
    createdAt: createdAt.toISOString(),
    source: article.source ?? "Veille de marque",
  };
}
