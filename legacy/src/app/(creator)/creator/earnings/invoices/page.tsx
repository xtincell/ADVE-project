"use client";

import { useState } from "react";
import { FileText, DollarSign, Download, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";

export default function InvoicesPage() {
  const [toast, setToast] = useState(false);

  const commissions = trpc.commission.getByCreator.useQuery({});

  if (commissions.isLoading) return <SkeletonPage />;

  const allCommissions = commissions.data ?? [];

  // Group paid commissions into invoice records by month
  const invoiceMap = new Map<string, typeof allCommissions>();
  for (const c of allCommissions.filter((c) => c.status === "PAID")) {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!invoiceMap.has(key)) invoiceMap.set(key, []);
    invoiceMap.get(key)!.push(c);
  }

  const invoices = Array.from(invoiceMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([period, items], idx, arr) => {
      const total = items.reduce((s, c) => s + c.netAmount, 0);
      const earliest = items.reduce(
        (min, c) => (new Date(c.createdAt) < min ? new Date(c.createdAt) : min),
        new Date(items[0]!.createdAt),
      );
      return {
        id: period,
        invoiceNumber: `FAC-${period.replace("-", "")}`,
        period,
        label: new Date(period + "-01").toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
        total,
        currency: items[0]?.currency ?? "XAF",
        status: "PAID" as const,
        createdAt: earliest.toISOString(),
      };
    });

  const totalInvoiced = invoices.reduce((s, inv) => s + inv.total, 0);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  const handleDownload = (invoice?: (typeof invoices)[number]) => {
    const rows = invoice ? [invoice] : invoices;
    const csvHeader = "N° Facture;Periode;Total;Devise;Statut\n";
    const csvBody = rows.map((inv) =>
      `${inv.invoiceNumber};${inv.label};${inv.total};${inv.currency};${inv.status}`
    ).join("\n");
    const blob = new Blob([csvHeader + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = invoice ? `${invoice.invoiceNumber}.csv` : "factures-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  type InvoiceItem = (typeof invoices)[number];

  const columns = [
    {
      key: "invoiceNumber",
      header: "N\u00b0 Facture",
      render: (item: InvoiceItem) => (
        <span className="font-medium text-white">{item.invoiceNumber}</span>
      ),
    },
    {
      key: "period",
      header: "Periode",
      render: (item: InvoiceItem) => (
        <span className="capitalize text-zinc-300">{item.label}</span>
      ),
    },
    {
      key: "total",
      header: "Montant",
      render: (item: InvoiceItem) => (
        <span className="font-semibold text-white">
          {new Intl.NumberFormat("fr-FR").format(item.total)} FCFA
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (item: InvoiceItem) => (
        <StatusBadge
          status={item.status}
          variantMap={{
            paid: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
            pending: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
            draft: "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30",
          }}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Cree le",
      render: (item: InvoiceItem) =>
        new Date(item.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      render: () => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <Download className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Factures"
        description="Recapitulatif de vos factures mensuelles"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Gains" },
          { label: "Factures" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Factures totales"
          value={invoices.length}
          icon={FileText}
        />
        <StatCard
          title="Total facture"
          value={`${fmt(totalInvoiced)} FCFA`}
          icon={DollarSign}
          trend="up"
          trendValue={`${invoices.length} factures`}
        />
        <StatCard
          title="Dernier paiement"
          value={
            invoices.length > 0
              ? new Date(invoices[0]!.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "N/A"
          }
          icon={Clock}
        />
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune facture"
          description="Vos factures apparaitront ici au fur et a mesure de vos missions completees et payees."
        />
      ) : (
        <DataTable
          data={invoices as unknown as Record<string, unknown>[]}
          columns={columns as Parameters<typeof DataTable>[0]["columns"]}
          pageSize={10}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white shadow-lg">
          Export telecharge avec succes
        </div>
      )}
    </div>
  );
}
