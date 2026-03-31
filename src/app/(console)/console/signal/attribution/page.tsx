"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  GitBranch,
  BarChart3,
  Target,
  DollarSign,
  Layers,
} from "lucide-react";

export default function AttributionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attribution"
        description="Attribution multi-touch, poids des canaux et ROI par point de contact"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Signal" },
          { label: "Attribution" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Evenements d'attribution" value={0} icon={GitBranch} />
        <StatCard title="Canaux actifs" value={0} icon={Layers} />
        <StatCard title="ROI moyen" value="- %" icon={BarChart3} />
        <StatCard title="Valeur attribuee" value="0 XAF" icon={DollarSign} />
      </div>

      {/* Attribution model */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Modele d'attribution</h3>
          </div>
          <div className="flex gap-2">
            {["Premier contact", "Dernier contact", "Lineaire", "Position"].map((model) => (
              <button
                key={model}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
              >
                {model}
              </button>
            ))}
          </div>
        </div>
        <EmptyState
          icon={GitBranch}
          title="Aucun evenement d'attribution"
          description="Les evenements d'attribution multi-touch apparaitront ici une fois les parcours de conversion traces."
        />
      </div>

      {/* Poids des canaux */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Poids des canaux</h3>
        </div>
        <EmptyState
          icon={BarChart3}
          title="Aucune donnee de canal"
          description="Les poids de chaque canal et leur contribution au ROI seront affiches ici."
        />
      </div>
    </div>
  );
}
