"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { SearchFilter } from "@/components/shared/search-filter";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  AlertCircle,
} from "lucide-react";

type Commission = {
  id: string;
  missionId: string;
  talentId: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
  operatorFee?: number | null;
  currency: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning ring-warning",
  PAID: "bg-success/15 text-success ring-success",
  CANCELLED: "bg-error/15 text-error ring-error",
  PROCESSING: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
};

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  // Use commission.list as the invoice/payment data source
  const commissionsQuery = trpc.commission.list.useQuery({ limit: 100 });

  const allCommissions = (commissionsQuery.data?.items ?? []) as unknown as Commission[];

  const pendingCommissions = allCommissions.filter((c) => c.status === "PENDING");
  const paidCommissions = allCommissions.filter((c) => c.status === "PAID");
  const processingCommissions = allCommissions.filter((c) => c.status === "PROCESSING");

  const totalAmount = allCommissions.reduce((sum, c) => sum + c.grossAmount, 0);
  const pendingAmount = pendingCommissions.reduce((sum, c) => sum + c.grossAmount, 0);
  const paidAmount = paidCommissions.reduce((sum, c) => sum + c.grossAmount, 0);

  const tabFiltered =
    activeTab === "all"
      ? allCommissions
      : activeTab === "pending"
        ? pendingCommissions
        : activeTab === "paid"
          ? paidCommissions
          : processingCommissions;

  const filtered = tabFiltered.filter(
    (c) =>
      !search ||
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.missionId.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "all", label: "Toutes", count: allCommissions.length },
    { key: "pending", label: "En attente", count: pendingCommissions.length },
    { key: "paid", label: "Payees", count: paidCommissions.length },
    { key: "processing", label: "En cours", count: processingCommissions.length },
  ];

  if (commissionsQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Gestion de la facturation et suivi des paiements"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Factures" },
        ]}
      >
        <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground">
          <Plus className="h-4 w-4" /> Nouvelle facture
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total factures"
          value={allCommissions.length}
          icon={Receipt}
        />
        <StatCard
          title="Montant total"
          value={totalAmount > 0 ? `${totalAmount.toLocaleString("fr-FR")} XAF` : "0 XAF"}
          icon={DollarSign}
        />
        <StatCard
          title="En attente"
          value={pendingCommissions.length}
          icon={Clock}
          trend={pendingCommissions.length > 0 ? "up" : "flat"}
          trendValue={pendingAmount > 0 ? `${pendingAmount.toLocaleString("fr-FR")} XAF` : ""}
        />
        <StatCard
          title="Payees"
          value={paidCommissions.length}
          icon={CheckCircle}
          trendValue={paidAmount > 0 ? `${paidAmount.toLocaleString("fr-FR")} XAF` : ""}
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher par ID ou mission..."
        value={search}
        onChange={setSearch}
      />

      {/* Invoice / Commission list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Aucune facture"
          description="Les factures apparaitront ici une fois creees. Suivez les paiements et relances."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const statusColors = STATUS_BADGE_COLORS[c.status] ?? "bg-surface-raised text-foreground-secondary ring-border/30";
            return (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-background/80 p-4 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">
                        #{c.id.slice(0, 8)}
                      </h4>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusColors}`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                      <span>Mission: {c.missionId.slice(0, 8)}...</span>
                      <span>Taux: {(c.commissionRate * 100).toFixed(0)}%</span>
                      <span>Commission: {c.commissionAmount.toLocaleString("fr-FR")} {c.currency}</span>
                      {c.operatorFee != null && c.operatorFee > 0 && (
                        <span>Frais op: {c.operatorFee.toLocaleString("fr-FR")} {c.currency}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {c.paidAt && (
                        <span className="text-success">
                          Paye le {new Date(c.paidAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      {c.grossAmount.toLocaleString("fr-FR")} {c.currency}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      Net: {c.netAmount.toLocaleString("fr-FR")} {c.currency}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
