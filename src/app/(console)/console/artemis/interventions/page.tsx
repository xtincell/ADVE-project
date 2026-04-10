"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  HandHelping,
  Clock,
  CheckCircle,
  AlertCircle,
  FileQuestion,
  AlertTriangle,
} from "lucide-react";

export default function InterventionsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: interventions, isLoading } = trpc.intervention.list.useQuery({});

  if (isLoading) return <SkeletonPage />;

  const items = interventions ?? [];
  const pending = items.filter((i) => {
    const d = i.data as Record<string, unknown> | null;
    return d?.status === "pending" || d?.status === "PENDING";
  });
  const inProgress = items.filter((i) => {
    const d = i.data as Record<string, unknown> | null;
    return d?.status === "in_progress" || d?.status === "IN_PROGRESS";
  });
  const resolved = items.filter((i) => {
    const d = i.data as Record<string, unknown> | null;
    return d?.status === "resolved" || d?.status === "RESOLVED" || d?.status === "COMPLETED";
  });

  const filteredItems =
    activeTab === "pending" ? pending
    : activeTab === "in_progress" ? inProgress
    : activeTab === "resolved" ? resolved
    : items;

  const tabs = [
    { key: "all", label: "Toutes", count: items.length },
    { key: "pending", label: "En attente", count: pending.length },
    { key: "in_progress", label: "En cours", count: inProgress.length },
    { key: "resolved", label: "Resolues", count: resolved.length },
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
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total demandes" value={items.length} icon={FileQuestion} />
        <StatCard title="En attente" value={pending.length} icon={Clock} />
        <StatCard title="En cours" value={inProgress.length} icon={AlertCircle} />
        <StatCard title="Resolues" value={resolved.length} icon={CheckCircle} />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={HandHelping}
          title="Aucune intervention"
          description="Les demandes d'intervention apparaitront ici une fois soumises par les clients ou l'equipe."
        />
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const d = item.data as Record<string, unknown> | null;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card-hover"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {(d?.title as string) ?? item.type}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {(d?.description as string) ?? "Demande d'intervention"}
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                    {d?.urgency != null && (
                      <span className="ml-2">
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        {String(d.urgency)}
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={(d?.status as string) ?? "pending"} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
