"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  Crown,
  Users,
  Star,
  TrendingUp,
  Plus,
  UserCheck,
} from "lucide-react";

export default function ClubPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "Tous", count: 0 },
    { key: "vip", label: "VIP", count: 0 },
    { key: "premium", label: "Premium", count: 0 },
    { key: "standard", label: "Standard", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Club Members"
        description="Gestion des membres du club et programmes de fidelite"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Arene" },
          { label: "Club" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouveau membre
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total membres" value={0} icon={Users} />
        <StatCard title="Membres VIP" value={0} icon={Crown} />
        <StatCard title="Satisfaction moy." value="- /10" icon={Star} />
        <StatCard title="Croissance" value="- %" icon={TrendingUp} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={UserCheck}
        title="Aucun membre"
        description="Les membres du club apparaitront ici. Invitez des clients a rejoindre le programme."
      />
    </div>
  );
}
