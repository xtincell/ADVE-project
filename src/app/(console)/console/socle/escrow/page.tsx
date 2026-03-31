"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  Lock,
  DollarSign,
  Clock,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

export default function EscrowPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "Tous", count: 0 },
    { key: "held", label: "En sequestre", count: 0 },
    { key: "released", label: "Liberes", count: 0 },
    { key: "disputed", label: "En litige", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escrow"
        description="Gestion des fonds en sequestre et liberation des paiements"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Escrow" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total escrow" value={0} icon={Lock} />
        <StatCard title="Montant en sequestre" value="0 XAF" icon={DollarSign} />
        <StatCard title="En attente" value={0} icon={Clock} />
        <StatCard title="Liberes" value={0} icon={CheckCircle} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={ShieldCheck}
        title="Aucun escrow"
        description="Les fonds en sequestre apparaitront ici. Les paiements sont securises jusqu'a validation."
      />
    </div>
  );
}
