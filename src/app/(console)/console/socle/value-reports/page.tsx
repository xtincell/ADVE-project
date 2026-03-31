"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  FileBarChart,
  TrendingUp,
  Calendar,
  CheckCircle,
  Plus,
  BarChart3,
} from "lucide-react";

export default function ValueReportsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "Tous", count: 0 },
    { key: "draft", label: "Brouillons", count: 0 },
    { key: "published", label: "Publies", count: 0 },
    { key: "archived", label: "Archives", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports de valeur"
        description="Tableaux de bord et rapports de valeur client"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Rapports de valeur" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouveau rapport
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total rapports" value={0} icon={FileBarChart} />
        <StatCard title="Publies ce mois" value={0} icon={CheckCircle} />
        <StatCard title="Score moyen" value="- /100" icon={TrendingUp} />
        <StatCard title="Prochain rapport" value="-" icon={Calendar} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={BarChart3}
        title="Aucun rapport de valeur"
        description="Les rapports de valeur generes pour les clients apparaitront ici."
      />
    </div>
  );
}
