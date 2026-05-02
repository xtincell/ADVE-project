"use client";

import { useState } from "react";
import { DollarSign, Calendar, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

export default function EarningsMissionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const commissions = trpc.commission.getByCreator.useQuery({});
  const missions = trpc.mission.list.useQuery({ limit: 200 });

  if (commissions.isLoading) return <SkeletonPage />;

  const missionMap = new Map(
    (missions.data ?? []).map((m) => [m.id, m.title])
  );
  const getMissionLabel = (missionId: string) =>
    missionMap.get(missionId) ?? `Mission ${missionId.slice(0, 8)}...`;

  const allCommissions = commissions.data ?? [];

  const filtered =
    statusFilter === "all"
      ? allCommissions
      : allCommissions.filter((c) => c.status === statusFilter);

  const totalEarned = allCommissions.reduce((s, c) => s + c.netAmount, 0);

  const now = new Date();
  const thisMonthEarnings = allCommissions
    .filter((c) => {
      const d = new Date(c.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, c) => s + c.netAmount, 0);

  const missionsPaid = allCommissions.filter((c) => c.status === "PAID").length;

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  type CommissionItem = (typeof allCommissions)[number];

  const columns = [
    {
      key: "missionId",
      header: "Mission",
      render: (item: CommissionItem) => (
        <span className="font-medium text-white">{getMissionLabel(item.missionId)}</span>
      ),
    },
    {
      key: "campaign",
      header: "Campagne",
      render: (item: CommissionItem) => (
        <span className="text-foreground-secondary">{getMissionLabel(item.missionId)}</span>
      ),
    },
    {
      key: "netAmount",
      header: "Montant",
      render: (item: CommissionItem) => (
        <span className="font-semibold text-white">
          {new Intl.NumberFormat("fr-FR").format(item.netAmount)} FCFA
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (item: CommissionItem) => (
        <StatusBadge
          status={item.status}
          variantMap={{
            paid: "bg-success/15 text-success ring-success",
            pending: "bg-warning/15 text-warning ring-warning",
            cancelled: "bg-error/15 text-error ring-error",
          }}
        />
      ),
    },
    {
      key: "tierAtTime",
      header: "Tier",
      render: (item: CommissionItem) => (
        <span className="text-xs text-foreground-muted">{item.tierAtTime}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (item: CommissionItem) =>
        new Date(item.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
  ];

  const statusOptions = [
    { key: "all", label: "Tous" },
    { key: "PENDING", label: "En attente" },
    { key: "PAID", label: "Payes" },
    { key: "CANCELLED", label: "Annules" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gains Missions"
        description="Suivi de vos gains par mission"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Gains" },
          { label: "Missions" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total gagne"
          value={`${fmt(totalEarned)} FCFA`}
          icon={DollarSign}
          trend="up"
          trendValue={`${allCommissions.length} missions`}
        />
        <StatCard
          title="Ce mois"
          value={`${fmt(thisMonthEarnings)} FCFA`}
          icon={Calendar}
        />
        <StatCard
          title="Missions payees"
          value={missionsPaid}
          icon={CheckCircle}
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {statusOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setStatusFilter(opt.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === opt.key
                ? "bg-surface-raised text-white"
                : "text-foreground-secondary hover:bg-background hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Aucune commission pour ce filtre"
          description="Les commissions de vos missions completees apparaitront ici."
        />
      ) : (
        <DataTable
          data={filtered as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]["columns"]}
          pageSize={10}
        />
      )}
    </div>
  );
}
