"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import {
  Building, AlertTriangle, TrendingUp, Crown, Search,
  ArrowRight, CheckCircle, Loader2, Plus, Eye,
} from "lucide-react";

const CLASSIFICATIONS = ["ALL", "ZOMBIE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"] as const;
type Classification = (typeof CLASSIFICATIONS)[number];

const CLASS_COLORS: Record<string, string> = {
  ZOMBIE: "bg-red-500/15 text-red-300",
  ORDINAIRE: "bg-zinc-500/15 text-zinc-300",
  FORTE: "bg-blue-500/15 text-blue-300",
  CULTE: "bg-violet-500/15 text-violet-300",
  ICONE: "bg-amber-500/15 text-amber-300",
};

function getClassification(composite: number): string {
  if (composite >= 170) return "ICONE";
  if (composite >= 140) return "CULTE";
  if (composite >= 110) return "FORTE";
  if (composite >= 80) return "ORDINAIRE";
  return "ZOMBIE";
}

export default function MarquesPage() {
  const [filter, setFilter] = useState<Classification>("ALL");
  const [driftOnly, setDriftOnly] = useState(false);
  const [search, setSearch] = useState("");

  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});
  const { data: intakesData } = trpc.quickIntake.listAll.useQuery({ limit: 100 });
  const intakes = Array.isArray(intakesData) ? intakesData : (intakesData as { items?: unknown[] } | undefined)?.items ?? [];

  const utils = trpc.useUtils();
  const convertMutation = trpc.quickIntake.convert.useMutation({
    onSuccess: () => {
      utils.strategy.list.invalidate();
      utils.quickIntake.listAll.invalidate();
    },
  });

  if (isLoading) return <SkeletonPage />;

  const allBrands = (strategies ?? []).map((s) => {
    const vec = (s.advertis_vector ?? {}) as Record<string, number>;
    const composite = vec.composite ?? 0;
    const classification = getClassification(composite);
    const pillarScores = ["a", "d", "v", "e", "r", "t", "i", "s"].map(k => vec[k] ?? 0);
    const weakPillars = ["A", "D", "V", "E", "R", "T", "I", "S"].filter((_, i) => pillarScores[i]! < 15);
    const isDrift = weakPillars.length >= 3;
    return { ...s, composite, classification, pillarScores, weakPillars, isDrift, vec };
  });

  // Pending intakes (COMPLETED but not CONVERTED)
  const pendingIntakes = (intakes as Array<Record<string, unknown>>).filter(
    (i) => i.status === "COMPLETED" && !i.convertedToId
  );

  // Filter
  let filtered = allBrands;
  if (filter !== "ALL") filtered = filtered.filter(b => b.classification === filter);
  if (driftOnly) filtered = filtered.filter(b => b.isDrift);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => b.name.toLowerCase().includes(q));
  }

  // Stats
  const zombieCount = allBrands.filter(b => b.classification === "ZOMBIE").length;
  const driftCount = allBrands.filter(b => b.isDrift).length;
  const avgScore = allBrands.length > 0 ? Math.round(allBrands.reduce((s, b) => s + b.composite, 0) / allBrands.length) : 0;
  const topBrand = allBrands.sort((a, b) => b.composite - a.composite)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marques"
        description={`${allBrands.length} brand instance(s) — diagnostics, scores, filtres`}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Marques" },
        ]}
      >
        <Link
          href="/console/oracle/intake"
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle marque
        </Link>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total marques" value={allBrands.length} icon={Building} />
        <StatCard title="Zombies" value={zombieCount} icon={AlertTriangle} />
        <StatCard title="Score moyen" value={`${avgScore}/200`} icon={TrendingUp} />
        <StatCard title="Top" value={topBrand?.name ?? "—"} icon={Crown} />
      </div>

      {/* Pending intakes to convert */}
      {pendingIntakes.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-300">
            {pendingIntakes.length} intake(s) a convertir
          </h3>
          <div className="space-y-2">
            {pendingIntakes.map((intake) => (
              <div key={String(intake.id)} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-card px-4 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{String(intake.companyName || intake.contactEmail || "Sans nom")}</p>
                  <p className="text-[10px] text-foreground-muted">{String(intake.sector ?? "—")} — {String(intake.country ?? "—")}</p>
                </div>
                <button
                  onClick={() => convertMutation.mutate({ intakeId: String(intake.id), userId: "" })}
                  disabled={convertMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {convertMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                  Convertir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-card px-3 py-2">
          <Search className="h-3.5 w-3.5 text-foreground-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-40 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          />
        </div>
        {CLASSIFICATIONS.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === c
                ? "bg-violet-600 text-white"
                : "bg-card text-foreground-muted hover:text-foreground border border-border-subtle"
            }`}
          >
            {c === "ALL" ? "Toutes" : c}
          </button>
        ))}
        <button
          onClick={() => setDriftOnly(!driftOnly)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            driftOnly
              ? "bg-red-500/20 text-red-300 border border-red-500/30"
              : "bg-card text-foreground-muted hover:text-foreground border border-border-subtle"
          }`}
        >
          <AlertTriangle className="mr-1 inline h-3 w-3" /> Drift ({driftCount})
        </button>
      </div>

      {/* Brands grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Aucune marque"
          description={filter !== "ALL" ? "Aucune marque dans cette categorie." : "Creez votre premiere marque via l'intake."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((brand) => {
            const isActive = brand.status === "ACTIVE";
            const isQuickIntake = brand.status === "QUICK_INTAKE";
            const isInProgress = brand.status === "IN_PROGRESS";

            return (
              <div
                key={brand.id}
                className={`group rounded-xl border p-4 transition-colors ${
                  isActive
                    ? "border-emerald-500/20 bg-card hover:border-emerald-500/40"
                    : isQuickIntake
                      ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"
                      : "border-border-subtle bg-card hover:border-violet-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{brand.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CLASS_COLORS[brand.classification] ?? "bg-zinc-500/15 text-zinc-300"}`}>
                        {brand.classification}
                      </span>
                      {/* Status badge */}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive ? "bg-emerald-500/15 text-emerald-300" :
                        isQuickIntake ? "bg-amber-500/15 text-amber-300" :
                        isInProgress ? "bg-violet-500/15 text-violet-300" :
                        "bg-zinc-500/15 text-zinc-300"
                      }`}>
                        {isActive ? "ACTIVE" : isQuickIntake ? "INTAKE" : brand.status}
                      </span>
                      {brand.isDrift && (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                          DRIFT
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-foreground-muted mb-2">
                      Score: {brand.composite}/200
                    </p>
                    {brand.weakPillars.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {brand.weakPillars.map(p => (
                          <span key={p} className="rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] text-red-400">{p} &lt;15</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <AdvertisRadar scores={brand.vec as Record<import("@/lib/types/advertis-vector").PillarKey, number>} size="xs" />
                  </div>
                </div>
                {/* Action links */}
                <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-2">
                  <Link
                    href={`/cockpit/brand/identity?strategy=${brand.id}`}
                    className="flex items-center gap-1 rounded-md bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-300 hover:bg-violet-500/25 transition-colors"
                  >
                    <Eye className="h-3 w-3" /> Cockpit
                  </Link>
                  <Link
                    href={`/console/oracle/brands/${brand.id}`}
                    className="flex items-center gap-1 text-[10px] text-foreground-muted hover:text-foreground transition-colors"
                  >
                    Detail <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
