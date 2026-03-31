"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  Newspaper,
  Send,
  Scissors,
  FileText,
  Plus,
  BarChart3,
} from "lucide-react";

export default function PrPage() {
  const [activeTab, setActiveTab] = useState("releases");

  const tabs = [
    { key: "releases", label: "Communiques", count: 0 },
    { key: "distributions", label: "Distributions", count: 0 },
    { key: "clippings", label: "Clippings", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relations Presse"
        description="Gestion des communiques, distributions et retombees presse"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "PR" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouveau communique
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Communiques" value={0} icon={FileText} />
        <StatCard title="Distributions" value={0} icon={Send} />
        <StatCard title="Clippings" value={0} icon={Scissors} />
        <StatCard title="Portee estimee" value="0" icon={BarChart3} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state per tab */}
      {activeTab === "releases" && (
        <EmptyState
          icon={Newspaper}
          title="Aucun communique de presse"
          description="Redigez et publiez des communiques de presse pour vos clients."
        />
      )}
      {activeTab === "distributions" && (
        <EmptyState
          icon={Send}
          title="Aucune distribution"
          description="Les distributions de communiques aux medias apparaitront ici."
        />
      )}
      {activeTab === "clippings" && (
        <EmptyState
          icon={Scissors}
          title="Aucun clipping"
          description="Les retombees presse et clippings seront collectes ici automatiquement."
        />
      )}
    </div>
  );
}
