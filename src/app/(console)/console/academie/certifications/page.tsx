"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import {
  Award,
  Users,
  CheckCircle,
  Clock,
  Plus,
  ShieldCheck,
} from "lucide-react";

export default function CertificationsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const tabs = [
    { key: "all", label: "Toutes", count: 0 },
    { key: "active", label: "Actives", count: 0 },
    { key: "pending", label: "En cours d'examen", count: 0 },
    { key: "expired", label: "Expirees", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certifications"
        description="Programmes de certification et validation des competences"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Academie", href: "/console/academie" },
          { label: "Certifications" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200">
          <Plus className="h-4 w-4" /> Nouvelle certification
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Certifications" value={0} icon={Award} />
        <StatCard title="Certifies" value={0} icon={Users} />
        <StatCard title="Taux de reussite" value="- %" icon={CheckCircle} />
        <StatCard title="En examen" value={0} icon={Clock} />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Empty state */}
      <EmptyState
        icon={ShieldCheck}
        title="Aucune certification"
        description="Creez des programmes de certification pour valider les competences des creatifs."
      />
    </div>
  );
}
