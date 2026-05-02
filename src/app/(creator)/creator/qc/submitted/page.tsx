"use client";

import { useState } from "react";
import { FileCheck, Eye, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { PillarProgress } from "@/components/shared/pillar-progress";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { type PillarKey } from "@/lib/types/advertis-vector";

/** Neutral fallback style for unknown verdict values */
const VERDICT_FALLBACK_STYLE = "bg-surface-raised text-foreground-secondary ring-border/30";

const VERDICT_MAP: Record<string, string> = {
  ACCEPTED: "bg-success/15 text-success ring-success",
  MINOR_REVISION: "bg-warning/15 text-warning ring-warning",
  MAJOR_REVISION: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
  REJECTED: "bg-error/15 text-error ring-error",
  ESCALATED: "bg-accent/15 text-accent ring-accent/30",
};

const VERDICT_LABELS: Record<string, string> = {
  ACCEPTED: "Accepté",
  MINOR_REVISION: "Révision mineure",
  MAJOR_REVISION: "Révision majeure",
  REJECTED: "Refusé",
  ESCALATED: "Escaladé",
};

/** Get the display label for a verdict, falling back to the raw value */
function getVerdictLabel(verdict: string): string {
  return VERDICT_LABELS[verdict] ?? verdict;
}

/** Get the style for a verdict, falling back to a neutral badge */
function getVerdictStyle(verdict: string): string {
  return VERDICT_MAP[verdict] ?? VERDICT_FALLBACK_STYLE;
}

/** Build a variantMap that includes all known verdicts plus the current label as fallback */
function buildVerdictVariantMap(verdict: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, style] of Object.entries(VERDICT_MAP)) {
    const label = VERDICT_LABELS[key];
    if (label) map[label] = style;
  }
  // If the verdict is unknown, add its label with the fallback style
  const label = getVerdictLabel(verdict);
  if (!(label in map)) {
    map[label] = VERDICT_FALLBACK_STYLE;
  }
  return map;
}

type TabKey = "pending" | "ACCEPTED" | "revision" | "REJECTED";

export default function SubmittedQcPage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [selectedReview, setSelectedReview] = useState<string | null>(null);

  const reviews = trpc.qualityReview.list.useQuery({ limit: 100 });

  if (reviews.isLoading) return <SkeletonPage />;

  const allReviews = reviews.data?.items ?? [];

  // Filter by tab
  const filteredReviews = (() => {
    switch (tab) {
      case "pending":
        return allReviews.filter(
          (r) => r.verdict === "ACCEPTED" && r.overallScore === 0
        );
      case "ACCEPTED":
        return allReviews.filter(
          (r) => r.verdict === "ACCEPTED" && r.overallScore > 0
        );
      case "revision":
        return allReviews.filter(
          (r) => r.verdict === "MINOR_REVISION" || r.verdict === "MAJOR_REVISION"
        );
      case "REJECTED":
        return allReviews.filter((r) => r.verdict === "REJECTED");
      default:
        return allReviews;
    }
  })();

  const selectedData = allReviews.find((r) => r.id === selectedReview);
  const pillarScores = selectedData?.pillarScores as Partial<Record<PillarKey, number>> | null;

  const pendingCount = allReviews.filter(
    (r) => r.verdict === "ACCEPTED" && r.overallScore === 0
  ).length;
  const acceptedCount = allReviews.filter(
    (r) => r.verdict === "ACCEPTED" && r.overallScore > 0
  ).length;
  const revisionCount = allReviews.filter(
    (r) => r.verdict === "MINOR_REVISION" || r.verdict === "MAJOR_REVISION"
  ).length;
  const rejectedCount = allReviews.filter(
    (r) => r.verdict === "REJECTED"
  ).length;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "pending", label: "En attente", count: pendingCount },
    { key: "ACCEPTED", label: "Acceptés", count: acceptedCount },
    { key: "revision", label: "Révision", count: revisionCount },
    { key: "REJECTED", label: "Refusés", count: rejectedCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soumissions QC"
        description="Suivi de vos livrables soumis et retours QC"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "QC" },
          { label: "Soumissions" },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-background/60 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-background text-white"
                : "text-foreground-secondary hover:text-foreground-secondary"
            }`}
          >
            {t.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                tab === t.key
                  ? "bg-surface-raised text-foreground"
                  : "bg-background text-foreground-muted"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Card list */}
      {filteredReviews.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="Aucun retour QC"
          description="Vos livrables soumis et leurs retours QC apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedReview(r.id)}
              className="cursor-pointer rounded-xl border border-border bg-background/80 p-4 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-semibold text-white">
                    {r.deliverable?.title ?? "Livrable"}
                  </h4>
                  <p className="mt-0.5 text-xs text-foreground-muted">
                    Soumis le{" "}
                    {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {r.feedback && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-foreground-secondary">
                      {r.feedback}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-foreground-secondary">
                    {r.overallScore}/10
                  </span>
                  <StatusBadge
                    status={getVerdictLabel(r.verdict)}
                    variantMap={buildVerdictVariantMap(r.verdict)}
                  />
                  <button className="rounded-lg p-1.5 text-foreground-secondary transition-colors hover:bg-background hover:text-white">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review detail modal */}
      <Modal
        open={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title="Détails du retour QC"
        size="lg"
      >
        {selectedData ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                {selectedData.deliverable?.title}
              </h3>
              <StatusBadge
                status={getVerdictLabel(selectedData.verdict)}
                variantMap={buildVerdictVariantMap(selectedData.verdict)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs text-foreground-muted">Score global</p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {selectedData.overallScore}/10
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs text-foreground-muted">Type de review</p>
                <p className="mt-1 text-sm font-semibold text-foreground-secondary">
                  {selectedData.reviewType}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs text-foreground-muted">Date</p>
                <p className="mt-1 text-sm font-semibold text-foreground-secondary">
                  {new Date(selectedData.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Feedback */}
            {selectedData.feedback && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground-secondary">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Feedback
                </h4>
                <div className="rounded-lg border border-border bg-background p-4">
                  <p className="text-sm leading-relaxed text-foreground-secondary">
                    {selectedData.feedback}
                  </p>
                </div>
              </div>
            )}

            {/* Pillar scores */}
            {pillarScores && Object.keys(pillarScores).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground-secondary">
                  Scores par pilier
                </h4>
                <PillarProgress scores={pillarScores} />
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
