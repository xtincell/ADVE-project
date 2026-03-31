"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Radar,
  Eye,
  TrendingUp,
  AlertTriangle,
  Globe,
  Search,
} from "lucide-react";

export default function TarsisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="TARSIS - Intelligence Marche"
        description="Signal intelligence, veille concurrentielle et contexte marche"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Signal" },
          { label: "TARSIS" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Signaux detectes" value={0} icon={Radar} />
        <StatCard title="Concurrents suivis" value={0} icon={Eye} />
        <StatCard title="Tendances actives" value={0} icon={TrendingUp} />
        <StatCard title="Alertes en cours" value={0} icon={AlertTriangle} />
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Veille concurrentielle */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Veille concurrentielle</h3>
          </div>
          <EmptyState
            icon={Eye}
            title="Aucun concurrent suivi"
            description="Ajoutez des concurrents pour commencer la veille automatique."
          />
        </div>

        {/* Contexte marche */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Contexte marche</h3>
          </div>
          <EmptyState
            icon={Globe}
            title="Aucune donnee marche"
            description="Les analyses de contexte marche apparaitront ici."
          />
        </div>
      </div>

      {/* Signal intelligence feed */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Flux de signaux</h3>
        </div>
        <EmptyState
          icon={Radar}
          title="Aucun signal"
          description="Les signaux d'intelligence marche seront affiches ici en temps reel."
        />
      </div>
    </div>
  );
}
