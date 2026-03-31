"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs } from "@/components/shared/tabs";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  ArrowRightCircle,
} from "lucide-react";

const INTAKE_STATUS_MAP: Record<string, string> = {
  IN_PROGRESS: "bg-violet-400/15 text-violet-400 ring-violet-400/30",
  COMPLETED: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  CONVERTED: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  EXPIRED: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
};

export default function IntakePage() {
  const { data, isLoading } = trpc.quickIntake.listAll.useQuery({ limit: 100 });
  const convertMutation = trpc.quickIntake.convert.useMutation();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const pending = items.filter((i) => i.status === "IN_PROGRESS");
  const completed = items.filter((i) => i.status === "COMPLETED");
  const converted = items.filter((i) => i.status === "CONVERTED");

  const selectedItem = items.find((i) => i.id === selectedId);

  // Tab filtering
  const tabFiltered = activeTab === "all"
    ? items
    : activeTab === "pending"
      ? pending
      : activeTab === "completed"
        ? completed
        : converted;

  const tabs = [
    { key: "all", label: "Tous", count: items.length },
    { key: "pending", label: "En attente", count: pending.length },
    { key: "completed", label: "Completes", count: completed.length },
    { key: "converted", label: "Convertis", count: converted.length },
  ];

  const handleConvert = () => {
    if (!convertId) return;
    convertMutation.mutate(
      { intakeId: convertId, userId: "system" },
      {
        onSuccess: () => {
          utils.quickIntake.listAll.invalidate();
          setConvertId(null);
        },
      },
    );
  };

  const tableData = tabFiltered.map((i) => {
    const v = i.advertis_vector as Record<string, number> | null;
    const composite = v
      ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (v[k] ?? 0), 0)
      : 0;
    return {
      id: i.id,
      companyName: i.companyName,
      contactName: i.contactName,
      contactEmail: i.contactEmail,
      sector: i.sector ?? "-",
      status: i.status,
      composite,
      classification: i.classification ?? "-",
      createdAt: i.createdAt,
      shareToken: i.shareToken,
      country: (i as Record<string, unknown>).country as string | undefined,
    };
  });

  const columns = [
    {
      key: "companyName",
      header: "Entreprise",
      render: (item: (typeof tableData)[0]) => (
        <div>
          <p className="font-medium text-white">{item.companyName}</p>
          <p className="text-xs text-zinc-500">{item.contactName}</p>
        </div>
      ),
    },
    {
      key: "contactEmail",
      header: "Contact",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-zinc-300">{item.contactEmail}</span>
      ),
    },
    {
      key: "sector",
      header: "Secteur",
      render: (item: (typeof tableData)[0]) => (
        <span className="text-sm text-zinc-300">{item.sector}</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <StatusBadge status={item.status} variantMap={INTAKE_STATUS_MAP} />
      ),
    },
    {
      key: "composite",
      header: "Score",
      sortable: true,
      render: (item: (typeof tableData)[0]) =>
        item.composite > 0 ? (
          <span className="font-bold text-white">
            {item.composite.toFixed(0)}
            <span className="font-normal text-zinc-500">/200</span>
          </span>
        ) : (
          <span className="text-zinc-500">-</span>
        ),
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      render: (item: (typeof tableData)[0]) => (
        <span className="text-xs text-zinc-400">
          {new Date(item.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: (item: (typeof tableData)[0]) =>
        item.status === "COMPLETED" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConvertId(item.id);
            }}
            className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Convertir
          </button>
        ) : null,
    },
  ];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quick Intakes"
        description="Suivi des diagnostics rapides et conversion en Brand Instances"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Oracle" },
          { label: "Quick Intakes" },
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total intakes" value={items.length} icon={ClipboardList} />
        <StatCard
          title="Completes"
          value={completed.length}
          icon={CheckCircle}
          trend={completed.length > 0 ? "up" : "flat"}
        />
        <StatCard title="En attente" value={pending.length} icon={Clock} />
        <StatCard
          title="Convertis"
          value={converted.length}
          icon={ArrowRightCircle}
          trendValue={
            items.length > 0
              ? `${((converted.length / items.length) * 100).toFixed(0)}% taux`
              : "0%"
          }
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Data Table */}
      {tableData.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun Quick Intake"
          description="Les intakes apparaitront ici une fois inities."
        />
      ) : (
        <DataTable
          data={tableData}
          columns={columns}
          pageSize={10}
          onRowClick={(item) => setSelectedId(item.id)}
        />
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={selectedItem?.companyName ?? "Intake"}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500">Contact</p>
                <p className="text-sm text-white">{selectedItem.contactName}</p>
                <p className="text-xs text-zinc-400">{selectedItem.contactEmail}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Secteur</p>
                <p className="text-sm text-white">{selectedItem.sector ?? "Non specifie"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Pays</p>
                <p className="text-sm text-white">
                  {(selectedItem as Record<string, unknown>).country as string ?? "Non specifie"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Classification</p>
                <p className="text-sm text-white">{selectedItem.classification ?? "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Token de partage</p>
              <code className="mt-1 block rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-300">
                {selectedItem.shareToken}
              </code>
            </div>
            <StatusBadge status={selectedItem.status} variantMap={INTAKE_STATUS_MAP} />
          </div>
        )}
      </Modal>

      {/* Convert Confirmation Dialog */}
      <ConfirmDialog
        open={!!convertId}
        onClose={() => setConvertId(null)}
        onConfirm={handleConvert}
        title="Convertir en Brand Instance"
        message="Cet intake sera converti en strategie Brand Instance. Cette action est irreversible."
        confirmLabel="Convertir"
        cancelLabel="Annuler"
        variant="info"
      />
    </div>
  );
}
