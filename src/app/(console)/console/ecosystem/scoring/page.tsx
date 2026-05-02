"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Globe, BarChart3, TrendingUp, Award } from "lucide-react";
import { classifyBrand } from "@/lib/types/advertis-vector";
import { PILLAR_STORAGE_KEYS } from "@/domain";

export default function ScoringStandardPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const allStrategies = strategies ?? [];
  const scored = allStrategies.map((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    const composite = v ? [...PILLAR_STORAGE_KEYS].reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
    return { ...s, composite, classification: classifyBrand(composite) };
  }).sort((a, b) => b.composite - a.composite);

  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, c) => s + c.composite, 0) / scored.length) : 0;

  // Distribution by classification
  const dist: Record<string, number> = {};
  for (const s of scored) {
    dist[s.classification] = (dist[s.classification] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Score ADVE-RTIS /200" description="Le standard de mesure de force de marque — distribution et stats de diffusion" breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Ecosysteme", href: "/console/ecosystem" }, { label: "Scoring" }]} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Marques scorees" value={scored.length} icon={Globe} />
        <StatCard title="Score moyen" value={`${avgScore}/200`} icon={BarChart3} />
        <StatCard title="Score max" value={scored.length > 0 ? `${scored[0]!.composite}/200` : "—"} icon={TrendingUp} />
        <StatCard title="Classifications" value={Object.keys(dist).length} icon={Award} />
      </div>

      {/* Distribution */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Distribution par classification</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {["ZOMBIE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"].map((cls) => (
            <div key={cls} className="rounded-lg bg-background-overlay p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{dist[cls] ?? 0}</p>
              <p className="text-xs text-foreground-muted">{cls}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Classement des marques</h3>
        <div className="space-y-2">
          {scored.slice(0, 20).map((s, i) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border-subtle p-3">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-bold text-foreground-muted">#{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-foreground-muted">{s.classification}</p>
                </div>
              </div>
              <ScoreBadge score={s.composite} size="sm" showClassification={false} showRing={false} animated={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
