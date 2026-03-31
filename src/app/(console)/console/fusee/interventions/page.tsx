"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  HandHelping,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  FileQuestion,
} from "lucide-react";

export default function InterventionsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "Toutes", count: 0 },
    { key: "pending", label: "En attente", count: 0 },
    { key: "in_progress", label: "En cours", count: 0 },
    { key: "resolved", label: "Resolues", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interventions"
        description="Gestion des demandes d'intervention et suivi de resolution"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Interventions" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouvelle demande
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total demandes" value={0} icon={FileQuestion} />
        <StatCard title="En attente" value={0} icon={Clock} />
        <StatCard title="En cours" value={0} icon={AlertCircle} />
        <StatCard title="Resolues" value={0} icon={CheckCircle} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={HandHelping}
        title="Aucune intervention"
        description="Les demandes d'intervention apparaitront ici une fois soumises par les clients ou l'equipe."
      />
    </div>
  );
}
