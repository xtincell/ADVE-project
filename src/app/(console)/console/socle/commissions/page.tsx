"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs } from "@/components/shared/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";

const fmt = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " XAF";

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type TabKey = "all" | "pending" | "paid" | "cancelled";

export default function CommissionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Array<Record<string, unknown>>
  >([]);

  const { data: commissions, isLoading } = trpc.commission.list.useQuery({
    limit: 100,
  });
  const markPaidMutation = trpc.commission.markPaid.useMutation();
  const generatePaymentMutation =
    trpc.commission.generatePaymentOrder.useMutation();
  const utils = trpc.useUtils();

  const allCommissions = commissions?.items ?? [];
  const pending = allCommissions.filter((c) => c.status === "PENDING");
  const paid = allCommissions.filter((c) => c.status === "PAID");
  const cancelled = allCommissions.filter((c) => c.status === "CANCELLED");

  const totalAmount = allCommissions.reduce(
    (sum, c) => sum + (c.commissionAmount ?? 0),
    0,
  );

  // Filter by tab
  const filtered =
    activeTab === "pending"
      ? pending
      : activeTab === "paid"
        ? paid
        : activeTab === "cancelled"
          ? cancelled
          : allCommissions;

  const tableData = filtered.map((c) => ({
    id: c.id as string,
    talentId: (c.talentId ?? "-") as string,
    missionId: c.missionId as string,
    commissionAmount: (c.commissionAmount ?? 0) as number,
    tierAtTime: (c.tierAtTime ?? "-") as string,
    operatorFee: (c.operatorFee ?? 0) as number,
    status: (c.status ?? "PENDING") as string,
    createdAt: c.createdAt as string | Date,
    paidAt: c.paidAt as string | Date | null,
    grossAmount: (c.grossAmount ?? 0) as number,
    commissionRate: (c.commissionRate ?? 0) as number,
    netAmount: (c.netAmount ?? 0) as number,
  }));

  const handleMarkPaid = () => {
    if (!confirmId) return;
    markPaidMutation.mutate(
      { id: confirmId },
      {
        onSuccess: () => {
          utils.commission.list.invalidate();
          setConfirmId(null);
        },
      },
    );
  };

  const handleGeneratePaymentOrder = () => {
    const pendingSelected = selectedItems.filter(
      (item) => item.status === "PENDING",
    );
    for (const item of pendingSelected) {
      generatePaymentMutation.mutate(
        { commissionId: item.id as string },
        { onSuccess: () => utils.commission.list.invalidate() },
      );
    }
  };

  const tabs = [
    { key: "all", label: "Toutes", count: allCommissions.length },
    { key: "pending", label: "En attente", count: pending.length },
    { key: "paid", label: "Payees", count: paid.length },
    { key: "cancelled", label: "Annulees", count: cancelled.length },
  ];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissions"
        description="Gestion et reglement des commissions creatifs"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Commissions" },
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total commissions"
          value={allCommissions.length}
          icon={DollarSign}
        />
        <StatCard
          title="En attente"
          value={pending.length}
          icon={Clock}
          trend={pending.length > 0 ? "up" : "flat"}
          trendValue={fmt(
            pending.reduce(
              (sum, c) => sum + (c.commissionAmount ?? 0),
              0,
            ),
          )}
        />
        <StatCard
          title="Payees"
          value={paid.length}
          icon={CheckCircle}
          trend={paid.length > 0 ? "up" : "flat"}
          trendValue={fmt(
            paid.reduce(
              (sum, c) => sum + (c.commissionAmount ?? 0),
              0,
            ),
          )}
        />
        <StatCard
          title="Montant total"
          value={fmt(totalAmount)}
          icon={DollarSign}
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
      />

      {/* Bulk action bar */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
          <span className="text-sm text-zinc-400">
            {selectedItems.length} selectionne(s)
          </span>
          <button
            onClick={handleGeneratePaymentOrder}
            disabled={
              generatePaymentMutation.isPending ||
              selectedItems.filter((i) => i.status === "PENDING")
                .length === 0
            }
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            Generer ordre de paiement
          </button>
        </div>
      )}

      {/* Table */}
      {tableData.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Aucune commission"
          description="Les commissions apparaitront ici une fois les missions terminees."
        />
      ) : (
        <DataTable
          data={tableData}
          selectable
          onSelectionChange={(selected) => setSelectedItems(selected)}
          columns={[
            {
              key: "talentId",
              header: "Creatif",
              render: (item) => (
                <span className="text-sm text-zinc-300">
                  {(item.talentId as string).slice(0, 10)}...
                </span>
              ),
            },
            {
              key: "missionId",
              header: "Mission",
              render: (item) => (
                <span className="font-mono text-xs text-zinc-400">
                  {(item.missionId as string).slice(0, 12)}...
                </span>
              ),
            },
            {
              key: "commissionAmount",
              header: "Montant",
              sortable: true,
              render: (item) => (
                <span className="font-bold text-white">
                  {fmt(item.commissionAmount as number)}
                </span>
              ),
            },
            {
              key: "tierAtTime",
              header: "Tier",
              sortable: true,
              render: (item) => (
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {item.tierAtTime as string}
                </span>
              ),
            },
            {
              key: "operatorFee",
              header: "Fee operateur",
              sortable: true,
              render: (item) => (
                <span className="text-zinc-400">
                  {fmt(item.operatorFee as number)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Statut",
              sortable: true,
              render: (item) => (
                <StatusBadge
                  status={item.status as string}
                  variantMap={{
                    pending:
                      "bg-amber-400/15 text-amber-400 ring-amber-400/30",
                    paid: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
                    cancelled:
                      "bg-red-400/15 text-red-400 ring-red-400/30",
                  }}
                />
              ),
            },
            {
              key: "createdAt",
              header: "Date",
              sortable: true,
              sortFn: (a, b) =>
                new Date(a.createdAt as string).getTime() -
                new Date(b.createdAt as string).getTime(),
              render: (item) => (
                <span className="text-xs text-zinc-500">
                  {fmtDate(item.createdAt as string | Date)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              sortable: false,
              render: (item) =>
                (item.status as string) === "PENDING" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmId(item.id as string);
                    }}
                    className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30"
                  >
                    Marquer paye
                  </button>
                ) : (item.paidAt as string | null) ? (
                  <span className="text-xs text-zinc-500">
                    {fmtDate(item.paidAt as string)}
                  </span>
                ) : null,
            },
          ]}
          pageSize={15}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={handleMarkPaid}
        title="Confirmer le paiement"
        message="Voulez-vous marquer cette commission comme payee ? Cette action est irreversible."
        confirmLabel="Marquer paye"
        cancelLabel="Annuler"
        variant="info"
      />
    </div>
  );
}
