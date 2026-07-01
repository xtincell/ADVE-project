"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { Radio, Activity, AlertTriangle, TrendingUp } from "lucide-react";

export default function AgencySignalsPage() {
  const { data: strategies } = trpc.strategy.list.useQuery({});
  // Get signals for the first strategy (agency-scoped via operator isolation)
  const firstStrategyId = strategies?.[0]?.id;
  const { data: signals, isLoading } = trpc.signal.list.useQuery(
    { strategyId: firstStrategyId ?? "" },
    { enabled: !!firstStrategyId },
  );

  if (isLoading || !strategies) {
    return (
      <div className="space-y-6">
        <PageHeader title="Signaux" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Signaux" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = (signals ?? []) as Array<Record<string, unknown>>;
  const typeCount: Record<string, number> = {};
  for (const s of items) {
    const t = String(s.type ?? "UNKNOWN");
    typeCount[t] = (typeCount[t] ?? 0) + 1;
  }
  const severityCritical = items.filter((s) => {
    const data = s.data as Record<string, unknown> | null;
    return data?.severity === "critical" || data?.severity === "high";
  }).length;

  const tableData = items.map((s) => {
    const data = s.data as Record<string, unknown> | null;
    return {
      id: String(s.id),
      type: String(s.type ?? "UNKNOWN"),
      severity: String(data?.severity ?? "-"),
      summary: String(data?.summary ?? data?.message ?? "-").slice(0, 80),
      feedbackStatus: String(data?.feedbackStatus ?? "-"),
      createdAt: s.createdAt as string | null,
    };
  });

  const columns = [
    {
      key: "type",
      header: "Type",
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.type} />,
    },
    {
      key: "severity",
      header: "Severite",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className={`text-sm ${item.severity === "critical" || item.severity === "high" ? "font-semibold text-red-400" : "text-zinc-300"}`}>
          {item.severity}
        </span>
      ),
    },
    {
      key: "summary",
      header: "Resume",
      render: (item: (typeof tableData)[0]) => <span className="text-sm text-zinc-300">{item.summary}</span>,
    },
    {
      key: "feedbackStatus",
      header: "Feedback",
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.feedbackStatus} />,
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Signaux"
        description={`${items.length} signaux detectes`}
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Signaux" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total signaux" value={items.length} icon={Radio} />
        <StatCard title="Types distincts" value={Object.keys(typeCount).length} icon={Activity} />
        <StatCard title="Critiques/Hauts" value={severityCritical} icon={AlertTriangle} trend={severityCritical > 0 ? "down" : undefined} />
        <StatCard title="Marques suivies" value={strategies?.length ?? 0} icon={TrendingUp} />
      </div>

      {tableData.length === 0 ? (
        <EmptyState icon={Radio} title="Aucun signal" description="Les signaux de marche de vos clients apparaitront ici." />
      ) : (
        <DataTable data={tableData} columns={columns} pageSize={10} />
      )}
    </div>
  );
}
