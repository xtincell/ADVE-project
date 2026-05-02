"use client";

import { Star, DollarSign, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

const DEFAULT_QC_RATE = 5000; // FCFA fallback when not configured in DB

export default function EarningsQcPage() {
  const reviews = trpc.qualityReview.getByReviewer.useQuery({});

  // Load QC compensation rate from system config (McpServerConfig key: system-config)
  const systemConfigQuery = trpc.systemConfig.get.useQuery({ key: "system-config" });
  const dbConfig = systemConfigQuery.data as Record<string, unknown> | null;
  const QC_COMPENSATION_PER_REVIEW =
    typeof dbConfig?.qcCompensationPerReview === "number"
      ? dbConfig.qcCompensationPerReview
      : DEFAULT_QC_RATE;

  if (reviews.isLoading || systemConfigQuery.isLoading) return <SkeletonPage />;

  const myReviews = reviews.data ?? [];
  const completedReviews = myReviews.filter(
    (r) => r.overallScore > 0 && r.reviewType === "PEER",
  );
  const totalCompensation = completedReviews.length * QC_COMPENSATION_PER_REVIEW;
  const avgPerReview =
    completedReviews.length > 0
      ? totalCompensation / completedReviews.length
      : 0;

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  type ReviewItem = (typeof completedReviews)[number];

  // Extract pillar reviewed from pillarScores
  const getPillarReviewed = (item: ReviewItem): string => {
    const scores = item.pillarScores as Record<string, unknown> | null;
    if (!scores) return "N/A";
    const keys = Object.keys(scores);
    return keys.length > 0 ? keys[0]! : "N/A";
  };

  const columns = [
    {
      key: "id",
      header: "Review ID",
      render: (item: ReviewItem) => (
        <span className="font-mono text-xs text-foreground-secondary">{item.id.slice(0, 8)}</span>
      ),
    },
    {
      key: "deliverable",
      header: "Mission",
      render: (item: ReviewItem) => (
        <span className="font-medium text-white">
          {item.deliverable?.title ?? "N/A"}
        </span>
      ),
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (item: ReviewItem) => (
        <StatusBadge
          status={item.verdict}
          variantMap={{
            accepted: "bg-success/15 text-success ring-success",
            minor_revision: "bg-warning/15 text-warning ring-warning",
            major_revision: "bg-orange-400/15 text-orange-400 ring-orange-400/30",
            rejected: "bg-error/15 text-error ring-error",
            escalated: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
          }}
        />
      ),
    },
    {
      key: "pillar",
      header: "Pilier",
      render: (item: ReviewItem) => (
        <span className="text-sm text-foreground-secondary">{getPillarReviewed(item)}</span>
      ),
    },
    {
      key: "compensation",
      header: "Compensation",
      render: () => (
        <span className="font-medium text-success">
          {fmt(QC_COMPENSATION_PER_REVIEW)} FCFA
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (item: ReviewItem) =>
        new Date(item.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gains QC"
        description={`Compensation pour vos evaluations QC — Taux actuel : ${fmt(QC_COMPENSATION_PER_REVIEW)} FCFA par review`}
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Gains" },
          { label: "QC" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Reviews effectuees"
          value={completedReviews.length}
          icon={CheckCircle}
        />
        <StatCard
          title="Total gains QC"
          value={`${fmt(totalCompensation)} FCFA`}
          icon={DollarSign}
          trend="up"
          trendValue={`${fmt(QC_COMPENSATION_PER_REVIEW)} FCFA/review`}
        />
        <StatCard
          title="Moyenne par review"
          value={`${fmt(avgPerReview)} FCFA`}
          icon={Star}
        />
      </div>

      {/* Note about eligibility */}
      <div className="rounded-xl border border-border bg-background/80 p-4">
        <p className="text-sm text-foreground-secondary">
          <span className="font-semibold text-foreground-secondary">Note :</span> Les reviews QC
          donnent droit a une compensation pour les reviewers qualifies (tier{" "}
          <span className="font-semibold text-warning">COMPAGNON</span> et au-dessus).
        </p>
      </div>

      {completedReviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="Aucune review effectuee"
          description="Vos peer reviews et compensations apparaitront ici. Disponible a partir du tier COMPAGNON."
        />
      ) : (
        <DataTable
          data={completedReviews as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]["columns"]}
          pageSize={10}
        />
      )}
    </div>
  );
}
