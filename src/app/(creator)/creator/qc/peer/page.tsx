"use client";

import { useState } from "react";
import { Shield, Star, CheckCircle, Eye, Clock, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SelectInput } from "@/components/shared/select-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { TierBadge } from "@/components/shared/tier-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_STORAGE_KEYS } from "@/domain";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const PILLAR_KEYS: PillarKey[] = [...PILLAR_STORAGE_KEYS];

export default function PeerReviewPage() {
  const [reviewModal, setReviewModal] = useState<string | null>(null);
  const [deliverablePreview, setDeliverablePreview] = useState<{
    title: string;
    fileUrl?: string | null;
    status: string;
    createdAt: string;
  } | null>(null);
  const [verdict, setVerdict] = useState("");
  const [feedback, setFeedback] = useState("");
  const [overallScore, setOverallScore] = useState(7);
  const [pillarScores, setPillarScores] = useState<Record<string, number>>(
    Object.fromEntries(PILLAR_KEYS.map((k) => [k, 15]))
  );

  const profile = trpc.guilde.getMyProfile.useQuery();
  const reviews = trpc.qualityReview.list.useQuery({ limit: 50 });
  const myReviews = trpc.qualityReview.getByReviewer.useQuery({});

  const submitReview = trpc.qualityReview.submit.useMutation({
    onSuccess: () => {
      reviews.refetch();
      myReviews.refetch();
      setReviewModal(null);
      setVerdict("");
      setFeedback("");
      setOverallScore(7);
      setPillarScores(Object.fromEntries(PILLAR_KEYS.map((k) => [k, 15])));
    },
  });

  if (profile.isLoading || reviews.isLoading) return <SkeletonPage />;

  const tier = (profile.data?.tier ?? "APPRENTI") as GuildTier;
  const isEligible = tier === "COMPAGNON" || tier === "MAITRE" || tier === "ASSOCIE";

  // Filter to show reviews that need peer review (pending ones not yet reviewed)
  const pendingReviews = (reviews.data?.items ?? []).filter(
    (r) => r.verdict === "ACCEPTED" && r.overallScore === 0
  );

  // Stats
  const completedReviews = myReviews.data ?? [];
  const now = new Date();
  const completedThisMonth = completedReviews.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const avgReviewTime = completedReviews.length > 0
    ? (completedReviews.reduce((sum, r) => sum + (r.reviewDuration ?? 0), 0) / completedReviews.length / 60).toFixed(0)
    : "N/A";

  if (!isEligible) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reviews Pair"
          description="Évaluez les livrables d'autres créatifs"
          breadcrumbs={[
            { label: "Creator", href: "/creator" },
            { label: "QC" },
            { label: "Reviews" },
          ]}
        />
        <EmptyState
          icon={Shield}
          title="Tier requis : COMPAGNON+"
          description="Les peer reviews sont accessibles à partir du tier COMPAGNON. Continuez à progresser pour débloquer cette fonctionnalité."
        />
      </div>
    );
  }

  const handleSubmitReview = () => {
    if (!reviewModal || !verdict || !feedback) return;
    submitReview.mutate({
      deliverableId: reviewModal,
      verdict: verdict as "ACCEPTED" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECTED",
      pillarScores,
      overallScore,
      feedback,
      reviewType: "PEER",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews Pair"
        description={`${pendingReviews.length} livrable(s) à évaluer`}
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "QC" },
          { label: "Reviews" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="À reviewer"
          value={pendingReviews.length}
          icon={Eye}
          trend={pendingReviews.length > 0 ? "up" : "flat"}
          trendValue={pendingReviews.length > 0 ? "En attente" : "Tout à jour"}
        />
        <StatCard
          title="Complétées ce mois"
          value={completedThisMonth.length}
          icon={CheckCircle}
          trend="up"
          trendValue={`${completedReviews.length} total`}
        />
        <StatCard
          title="Temps moyen review"
          value={avgReviewTime === "N/A" ? "N/A" : `${avgReviewTime} min`}
          icon={Clock}
        />
      </div>

      {/* Pending reviews list */}
      {pendingReviews.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="Aucun livrable à reviewer"
          description="Tous les livrables ont été évalués. Revenez plus tard."
        />
      ) : (
        <div className="space-y-4">
          {pendingReviews.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {r.deliverable?.title ?? "Livrable"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-foreground-muted">
                    <span>
                      Soumis le{" "}
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="text-foreground-muted">|</span>
                    <span>Type: {r.reviewType}</span>
                  </div>
                </div>
                <StatusBadge status="En attente" variantMap={{
                  "en_attente": "bg-warning/15 text-warning ring-warning",
                }} />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    const fileUrl = r.deliverable?.fileUrl as string | undefined;
                    if (fileUrl) {
                      window.open(fileUrl, "_blank", "noopener,noreferrer");
                    } else {
                      setDeliverablePreview({
                        title: r.deliverable?.title ?? "Livrable",
                        fileUrl: r.deliverable?.fileUrl as string | null | undefined,
                        status: r.deliverable?.status ?? "PENDING",
                        createdAt: r.createdAt as unknown as string,
                      });
                    }
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Voir le livrable
                </button>
                <button
                  onClick={() => setReviewModal(r.deliverableId)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-medium text-foreground-muted transition-colors hover:bg-foreground"
                >
                  <Star className="h-3.5 w-3.5" />
                  Évaluer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deliverable preview modal */}
      <Modal
        open={!!deliverablePreview}
        onClose={() => setDeliverablePreview(null)}
        title="Apercu du livrable"
        size="md"
      >
        {deliverablePreview && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white">
                {deliverablePreview.title}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-foreground-muted">Statut</span>
                <p className="mt-0.5 font-medium text-foreground-secondary">
                  {deliverablePreview.status}
                </p>
              </div>
              <div>
                <span className="text-foreground-muted">Soumis le</span>
                <p className="mt-0.5 font-medium text-foreground-secondary">
                  {new Date(deliverablePreview.createdAt).toLocaleDateString(
                    "fr-FR",
                    { day: "numeric", month: "long", year: "numeric" }
                  )}
                </p>
              </div>
            </div>
            <p className="text-xs text-foreground-muted">
              Aucun fichier attache a ce livrable. L&apos;evaluation peut etre
              basee sur les informations de la mission.
            </p>
            <button
              onClick={() => setDeliverablePreview(null)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
            >
              Fermer
            </button>
          </div>
        )}
      </Modal>

      {/* Review form modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title="Évaluer le livrable"
        size="lg"
      >
        <div className="space-y-5">
          <FormField label="Verdict" required>
            <SelectInput
              value={verdict}
              onChange={(v) => setVerdict(v as string)}
              options={[
                { value: "ACCEPTED", label: "Accepté" },
                { value: "MINOR_REVISION", label: "Révision mineure" },
                { value: "MAJOR_REVISION", label: "Révision majeure" },
                { value: "REJECTED", label: "Refusé" },
              ]}
              placeholder="Choisir un verdict..."
            />
          </FormField>

          <FormField label={`Score global : ${overallScore}/10`} required>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={overallScore}
              onChange={(e) => setOverallScore(parseFloat(e.target.value))}
              className="w-full accent-white"
            />
            <div className="flex justify-between text-xs text-foreground-muted">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
          </FormField>

          {/* Pillar scores */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
              Scores par pilier ADVE
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {PILLAR_KEYS.map((key) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-foreground-secondary">
                      <span className="font-bold">{key.toUpperCase()}</span> - {PILLAR_NAMES[key]}
                    </label>
                    <span className="text-xs font-semibold text-foreground-secondary">
                      {pillarScores[key]}/25
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    value={pillarScores[key]}
                    onChange={(e) =>
                      setPillarScores((prev) => ({
                        ...prev,
                        [key]: parseInt(e.target.value),
                      }))
                    }
                    className="w-full accent-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <FormField label="Feedback détaillé" required>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Décrivez les points forts, les axes d'amélioration et vos recommandations..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setReviewModal(null)}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={!verdict || !feedback || submitReview.isPending}
              className="flex-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground disabled:opacity-50"
            >
              {submitReview.isPending ? "Envoi..." : "Soumettre l'évaluation"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
