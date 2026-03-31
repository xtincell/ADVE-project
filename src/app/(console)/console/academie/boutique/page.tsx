"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  ShoppingBag,
  Package,
  DollarSign,
  TrendingUp,
  Plus,
  Tag,
} from "lucide-react";

export default function BoutiquePage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "Tous", count: 0 },
    { key: "templates", label: "Templates", count: 0 },
    { key: "resources", label: "Ressources", count: 0 },
    { key: "merchandise", label: "Merchandise", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boutique"
        description="Articles, templates et ressources premium de l'Academie"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Academie", href: "/console/academie" },
          { label: "Boutique" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouvel article
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Articles" value={0} icon={Package} />
        <StatCard title="Ventes totales" value="0 XAF" icon={DollarSign} />
        <StatCard title="Articles actifs" value={0} icon={Tag} />
        <StatCard title="Croissance ventes" value="- %" icon={TrendingUp} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={ShoppingBag}
        title="Aucun article"
        description="Ajoutez des templates, ressources et articles a la boutique de l'Academie."
      />
    </div>
  );
}
