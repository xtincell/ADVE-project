"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { Coins, DollarSign, Users, CheckCircle } from "lucide-react";

export default function AgencyCommissionsPage() {
  const { data: commissions, isLoading } = trpc.commission.list.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Commissions" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Commissions" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = commissions?.items ?? [];
  const totalCommissions = items.reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
  const pendingAmount = items
    .filter((c) => c.status !== "PAID")
    .reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
  const paidAmount = items
    .filter((c) => c.status === "PAID")
    .reduce((sum, c) => sum + (Number(c.commissionAmount) || 0), 0);
  const uniqueTalents = new Set(items.map((c) => c.talentId).filter(Boolean)).size;

  const tableData = items.map((c) => ({
    id: c.id,
    talentId: c.talentId ?? "-",
    missionId: c.missionId ?? "-",
    commissionAmount: Number(c.commissionAmount) || 0,
    tierAtTime: c.tierAtTime ?? "-",
    operatorFee: Number(c.operatorFee) || 0,
    status: c.status,
    createdAt: c.createdAt,
    paidAt: c.paidAt,
  }));

  const columns = [
    {
      key: "talentId",
      header: "Talent",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-zinc-300 font-mono">{item.talentId.slice(0, 8)}...</span>
      ),
    },
    {
      key: "tierAtTime",
      header: "Tier",
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.tierAtTime} />,
    },
    {
      key: "commissionAmount",
      header: "Commission",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm font-medium text-white">{item.commissionAmount.toLocaleString("fr-FR")} XAF</span>
      ),
    },
    {
      key: "operatorFee",
      header: "Fee operateur",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-violet-400">{item.operatorFee.toLocaleString("fr-FR")} XAF</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.status} />,
    },
    {
      key: "paidAt",
      header: "Paye le",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">{item.paidAt ? new Date(item.paidAt).toLocaleDateString("fr-FR") : "-"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Detail des commissions talents"
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Commissions" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total commissions" value={`${(totalCommissions / 1000).toFixed(0)}k XAF`} icon={Coins} />
        <StatCard title="En attente" value={`${(pendingAmount / 1000).toFixed(0)}k XAF`} icon={DollarSign} />
        <StatCard title="Deja paye" value={`${(paidAmount / 1000).toFixed(0)}k XAF`} icon={CheckCircle} />
        <StatCard title="Talents uniques" value={uniqueTalents} icon={Users} />
      </div>

      {tableData.length === 0 ? (
        <EmptyState icon={Coins} title="Aucune commission" description="Les commissions apparaitront ici." />
      ) : (
        <DataTable data={tableData} columns={columns} pageSize={10} />
      )}
    </div>
  );
}
