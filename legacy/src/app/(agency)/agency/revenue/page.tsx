"use client";

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonTable } from "@/components/shared/loading-skeleton";
import { DollarSign, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function AgencyRevenuePage() {
  const { data: commissions, isLoading } = trpc.commission.list.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Revenus" breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Revenus" }]} />
        <SkeletonTable rows={6} />
      </div>
    );
  }

  const items = commissions?.items ?? [];
  const totalGross = items.reduce((sum, c) => sum + (Number(c.grossAmount) || 0), 0);
  const totalNet = items.reduce((sum, c) => sum + (Number(c.netAmount) || 0), 0);
  const totalOperatorFees = items.reduce((sum, c) => sum + (Number(c.operatorFee) || 0), 0);
  const paidCount = items.filter((c) => c.status === "PAID").length;
  const pendingCount = items.filter((c) => c.status === "PENDING" || c.status === "CALCULATED").length;

  const tableData = items.map((c) => ({
    id: c.id,
    missionId: c.missionId ?? "-",
    grossAmount: Number(c.grossAmount) || 0,
    commissionRate: Number(c.commissionRate) || 0,
    commissionAmount: Number(c.commissionAmount) || 0,
    operatorFee: Number(c.operatorFee) || 0,
    netAmount: Number(c.netAmount) || 0,
    status: c.status,
    createdAt: c.createdAt,
    paidAt: c.paidAt,
  }));

  const columns = [
    {
      key: "missionId",
      header: "Mission",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-zinc-300 font-mono">{item.missionId.slice(0, 8)}...</span>
      ),
    },
    {
      key: "grossAmount",
      header: "Montant brut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-white">{item.grossAmount.toLocaleString("fr-FR")} XAF</span>
      ),
    },
    {
      key: "commissionRate",
      header: "Taux",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-zinc-300">{(item.commissionRate * 100).toFixed(0)}%</span>
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
      key: "netAmount",
      header: "Net talent",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-white">{item.netAmount.toLocaleString("fr-FR")} XAF</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => <StatusBadge status={item.status} />,
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
        title="Revenus"
        description="Suivi financier de votre agence"
        breadcrumbs={[{ label: "Agence", href: "/agency" }, { label: "Revenus" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Montant brut total" value={`${(totalGross / 1000).toFixed(0)}k XAF`} icon={DollarSign} />
        <StatCard title="Fees operateur" value={`${(totalOperatorFees / 1000).toFixed(0)}k XAF`} icon={TrendingUp} />
        <StatCard title="Paiements effectues" value={paidCount} icon={CheckCircle} />
        <StatCard title="En attente" value={pendingCount} icon={Clock} />
      </div>

      {tableData.length === 0 ? (
        <EmptyState icon={DollarSign} title="Aucun revenu" description="Les revenus apparaitront ici une fois les missions completees." />
      ) : (
        <DataTable data={tableData} columns={columns} pageSize={10} />
      )}
    </div>
  );
}
