"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Lightbulb, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const PILLAR_LABELS: Record<string, { name: string; color: string }> = {
  a: { name: "Authenticite", color: "oklch(0.60 0.22 25)" },
  d: { name: "Distinction", color: "oklch(0.60 0.22 265)" },
  v: { name: "Valeur", color: "oklch(0.65 0.20 145)" },
  e: { name: "Engagement", color: "oklch(0.65 0.18 340)" },
};

export default function MestorRecosPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const activeStrategies = (strategies ?? []).filter((s) => s.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recommandations"
        description="Le Commandant analyse R+T et propose des enrichissements granulaires pour chaque pilier ADVE"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Mestor", href: "/console/mestor" },
          { label: "Recommandations" },
        ]}
      />

      {/* Operations legend */}
      <div className="flex flex-wrap gap-2">
        {["SET", "ADD", "MODIFY", "REMOVE", "EXTEND"].map((op) => (
          <span key={op} className="rounded-md bg-background-overlay px-2 py-1 text-[10px] font-mono text-foreground-muted">
            {op}
          </span>
        ))}
      </div>

      {/* Per-strategy recommendations */}
      {activeStrategies.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Lightbulb className="mx-auto mb-3 h-8 w-8 text-foreground-muted" />
          <p className="text-sm text-foreground-muted">Aucune strategie active.</p>
        </div>
      ) : (
        activeStrategies.map((s) => (
          <div key={s.id} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">{s.name}</h3>
              <Link
                href={`/console/strategy-portfolio/clients/${s.id}`}
                className="text-xs text-foreground-muted hover:text-foreground"
              >
                Voir strategie <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(["a", "d", "v", "e"] as const).map((key) => {
                const pillar = PILLAR_LABELS[key] ?? { name: key.toUpperCase(), color: "gray" };
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border-subtle p-3"
                    style={{ borderLeftColor: pillar.color, borderLeftWidth: 3 }}
                  >
                    <p className="text-xs font-semibold text-foreground">{pillar.name}</p>
                    <p className="mt-1 text-[10px] text-foreground-muted">Aucune reco en attente</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* How it works */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-6">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Processus de recommandation</h3>
        <p className="text-xs text-foreground-muted">
          1. L'Hyperviseur lance le Protocole R (diagnostic) puis T (confrontation marche).
          2. Le Commandant analyse R+T et produit des recommandations par champ pour chaque pilier ADVE.
          3. L'operateur review et accepte/rejette chaque recommendation.
          4. Les recos acceptees sont ecrites dans les piliers via le Pillar Gateway.
        </p>
      </div>
    </div>
  );
}
