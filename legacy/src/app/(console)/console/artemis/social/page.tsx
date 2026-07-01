"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Tabs } from "@/components/shared/tabs";
import {
  Share2,
  Users,
  Heart,
  TrendingUp,
  Plus,
  Link2,
  Eye,
} from "lucide-react";

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState("followers");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const { data: strategies } = trpc.strategy.list.useQuery({});
  const { data: performance, isLoading: loadingPerf } = trpc.social.getPerformance.useQuery(
    { strategyId: selectedStrategyId ?? "" },
    { enabled: !!selectedStrategyId },
  );

  const allStrategies = strategies ?? [];
  const summary = performance?.summary;
  const signals = performance?.signals ?? [];

  // Vague 7 — traque unifiée followers + tags. strategyId null = comptes
  // propres La Fusée ; sinon la marque sélectionnée.
  const followerTrends = trpc.social.followerTrends.useQuery({
    strategyId: selectedStrategyId,
    days: 90,
  });
  const recordSnapshot = trpc.social.recordFollowerSnapshot.useMutation({
    onSuccess: () => followerTrends.refetch(),
  });
  const [snapForm, setSnapForm] = useState({ platform: "INSTAGRAM", handle: "", followers: "", mentions: "" });

  const tabs = [
    { key: "followers", label: "Followers & tags", count: followerTrends.data?.length ?? 0 },
    { key: "connections", label: "Connexions", count: 0 },
    { key: "posts", label: "Publications", count: signals.length },
    { key: "metrics", label: "Metriques", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Connections"
        description="Gestion des connexions sociales, publications et metriques d'engagement"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Social" },
        ]}
      >
        <a
          href="/console/anubis/credentials"
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Plus className="h-4 w-4" /> Connecter un compte
        </a>
      </PageHeader>

      {/* Strategy selector */}
      <div className="rounded-xl border border-border bg-background/80 p-4">
        <label className="block text-sm font-medium text-foreground-secondary mb-2">Client</label>
        <select
          value={selectedStrategyId ?? ""}
          onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white"
        >
          <option value="">Selectionnez un client pour voir les metriques sociales</option>
          {allStrategies.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedStrategyId && loadingPerf && <SkeletonPage />}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Publications trackees"
          value={summary?.postCount ?? 0}
          icon={Link2}
        />
        <StatCard
          title="Impressions totales"
          value={new Intl.NumberFormat("fr-FR").format(summary?.totalImpressions ?? 0)}
          icon={Eye}
        />
        <StatCard
          title="Engagement total"
          value={new Intl.NumberFormat("fr-FR").format(summary?.totalEngagement ?? 0)}
          icon={Heart}
        />
        <StatCard
          title="Taux d'engagement moy."
          value={`${(summary?.avgEngagementRate ?? 0).toFixed(2)}%`}
          icon={TrendingUp}
          trend={
            (summary?.avgEngagementRate ?? 0) > 3
              ? "up"
              : (summary?.avgEngagementRate ?? 0) > 0
                ? "flat"
                : undefined
          }
          trendValue={
            (summary?.avgEngagementRate ?? 0) > 3
              ? "Bon"
              : (summary?.avgEngagementRate ?? 0) > 0
                ? "Moyen"
                : "Aucune donnee"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === "followers" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="mb-3 text-xs text-foreground-muted">
              {selectedStrategyId
                ? "Followers de la marque sélectionnée."
                : "Comptes propres La Fusée / UPgraders (aucun client sélectionné)."}{" "}
              Saisie manuelle (manual-first, ADR-0060) — l'ingestion connecteur viendra alimenter la même table.
            </p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <select
                value={snapForm.platform}
                onChange={(e) => setSnapForm({ ...snapForm, platform: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "TWITTER", "YOUTUBE"].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                placeholder="@handle"
                value={snapForm.handle}
                onChange={(e) => setSnapForm({ ...snapForm, handle: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="Followers"
                value={snapForm.followers}
                onChange={(e) => setSnapForm({ ...snapForm, followers: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <input
                placeholder="Tags / mentions (période)"
                value={snapForm.mentions}
                onChange={(e) => setSnapForm({ ...snapForm, mentions: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <button
                onClick={() =>
                  recordSnapshot.mutate({
                    strategyId: selectedStrategyId,
                    platform: snapForm.platform as "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE",
                    handle: snapForm.handle,
                    followerCount: Number(snapForm.followers) || 0,
                    mentionsCount: snapForm.mentions ? Number(snapForm.mentions) : undefined,
                    source: "MANUAL",
                  })
                }
                disabled={recordSnapshot.isPending || snapForm.handle.trim().length === 0}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
              >
                Enregistrer l'instantané
              </button>
            </div>
            {recordSnapshot.error && <p className="mt-2 text-xs text-error">{recordSnapshot.error.message}</p>}
          </div>

          {(followerTrends.data ?? []).length === 0 ? (
            <EmptyState
              icon={Users}
              title="Aucun instantané followers"
              description="Enregistre un premier instantané ci-dessus — le delta 90 jours se construit à partir de deux mesures."
            />
          ) : (
            <div className="space-y-2">
              {followerTrends.data!.map((acc) => (
                <div key={acc.key} className="flex items-center justify-between rounded-lg border border-border bg-background/80 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {acc.platform} · @{acc.handle}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      Dernière mesure {new Date(acc.lastCapturedAt).toLocaleDateString("fr-FR")} · {acc.series.length} point(s) sur 90 j
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-mono text-sm text-white">
                      {new Intl.NumberFormat("fr-FR").format(acc.current)} followers
                    </span>
                    <span className={acc.delta >= 0 ? "text-success" : "text-error"}>
                      {acc.delta >= 0 ? "+" : ""}{new Intl.NumberFormat("fr-FR").format(acc.delta)} / 90 j
                    </span>
                    <span className="text-foreground-secondary">{acc.mentions} tag(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {activeTab === "connections" && (
        <EmptyState
          icon={Share2}
          title="Aucune connexion sociale"
          description="Connectez vos comptes de reseaux sociaux pour commencer le suivi."
        />
      )}
      {activeTab === "posts" && (
        <>
          {signals.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="Aucune publication"
              description={selectedStrategyId
                ? "Aucun signal social trouve pour ce client. Utilisez l'API pour ingerer des metriques."
                : "Selectionnez un client pour voir les publications trackees."}
            />
          ) : (
            <div className="space-y-2">
              {signals.map((signal) => {
                const data = signal.data as Record<string, unknown> | null;
                return (
                  <div
                    key={signal.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/80 p-4 transition-colors hover:border-border"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {(data?.platform as string) ?? "Social"} — Post {(data?.postId as string) ?? ""}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {new Date(signal.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-foreground-secondary">
                      <span>{new Intl.NumberFormat("fr-FR").format((data?.impressions as number) ?? 0)} impr.</span>
                      <span>{new Intl.NumberFormat("fr-FR").format((data?.engagement as number) ?? 0)} eng.</span>
                      <span className="font-medium text-white">
                        {((data?.engagementRate as number) ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {activeTab === "metrics" && (
        <EmptyState
          icon={TrendingUp}
          title="Aucune metrique"
          description="Les metriques d'engagement social seront affichees une fois les comptes connectes."
        />
      )}
    </div>
  );
}
