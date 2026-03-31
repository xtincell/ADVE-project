"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ClipboardList,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight,
  Building2,
  UserCheck,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface KanbanColumn {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  bgColor: string;
  items: KanbanCard[];
}

interface KanbanCard {
  id: string;
  companyName: string;
  contact: string;
  scoreRange?: string;
  date: string | Date;
  status: string;
  link?: string;
}

export default function PipelinePage() {
  const { data: intakes, isLoading: loadingIntakes } =
    trpc.quickIntake.listAll.useQuery({ limit: 100 });
  const { data: strategies, isLoading: loadingStrat } =
    trpc.strategy.list.useQuery({});

  const isLoading = loadingIntakes || loadingStrat;

  const intakeItems = intakes?.items ?? [];
  const allStrategies = strategies ?? [];

  // Derive pipeline categories
  const prospects = intakeItems.filter((i) => i.status === "IN_PROGRESS");
  const qualified = intakeItems.filter((i) => i.status === "COMPLETED");
  const converted = intakeItems.filter((i) => i.status === "CONVERTED");
  const activeClients = allStrategies.filter((s) => s.status === "ACTIVE");

  // Stats
  const totalIntakes = intakeItems.length;
  const conversionRate =
    totalIntakes > 0
      ? ((converted.length / totalIntakes) * 100).toFixed(1)
      : "0.0";
  const activeStrategyCount = activeClients.length;

  // Average time to convert (from createdAt to updatedAt for converted intakes)
  const avgConvertDays = useMemo(() => {
    if (converted.length === 0) return 0;
    const totalDays = converted.reduce((sum, i) => {
      const created = new Date(i.createdAt).getTime();
      const updated = new Date(i.updatedAt).getTime();
      return sum + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round(totalDays / converted.length);
  }, [converted]);

  // Build Kanban columns
  const columns: KanbanColumn[] = [
    {
      key: "prospects",
      label: "Prospects",
      icon: <ClipboardList className="h-4 w-4" />,
      color: "text-violet-400",
      borderColor: "border-violet-500/30",
      bgColor: "bg-violet-500/5",
      items: prospects.map((i) => ({
        id: i.id,
        companyName: i.companyName,
        contact: i.contactName,
        date: i.createdAt,
        status: "IN_PROGRESS",
      })),
    },
    {
      key: "qualified",
      label: "Qualifies",
      icon: <UserCheck className="h-4 w-4" />,
      color: "text-blue-400",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/5",
      items: qualified.map((i) => {
        const vector = i.advertis_vector as Record<string, number> | null;
        const composite = vector
          ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce(
              (sum, k) => sum + (vector[k] ?? 0),
              0,
            )
          : 0;
        return {
          id: i.id,
          companyName: i.companyName,
          contact: i.contactName,
          scoreRange: composite > 0 ? `${composite.toFixed(0)}/200` : undefined,
          date: i.createdAt,
          status: "COMPLETED",
        };
      }),
    },
    {
      key: "converted",
      label: "Convertis",
      icon: <CheckCircle className="h-4 w-4" />,
      color: "text-amber-400",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      items: converted.map((i) => {
        const vector = i.advertis_vector as Record<string, number> | null;
        const composite = vector
          ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce(
              (sum, k) => sum + (vector[k] ?? 0),
              0,
            )
          : 0;
        return {
          id: i.id,
          companyName: i.companyName,
          contact: i.contactName,
          scoreRange: composite > 0 ? `${composite.toFixed(0)}/200` : undefined,
          date: i.updatedAt,
          status: "CONVERTED",
          link: i.convertedToId
            ? `/console/oracle/clients/${i.convertedToId}`
            : undefined,
        };
      }),
    },
    {
      key: "active",
      label: "Clients actifs",
      icon: <Building2 className="h-4 w-4" />,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgColor: "bg-emerald-500/5",
      items: activeClients.map((s) => {
        const vector = s.advertis_vector as Record<string, number> | null;
        const composite = vector
          ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce(
              (sum, k) => sum + (vector[k] ?? 0),
              0,
            )
          : 0;
        return {
          id: s.id,
          companyName: s.name,
          contact: s.description ?? "",
          scoreRange: composite > 0 ? `${composite.toFixed(0)}/200` : undefined,
          date: s.updatedAt,
          status: "ACTIVE",
          link: `/console/oracle/clients/${s.id}`,
        };
      }),
    },
  ];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline CRM"
        description="Entonnoir de conversion Quick Intake vers Client"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Socle" },
          { label: "Pipeline" },
        ]}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Quick Intakes"
          value={totalIntakes}
          icon={ClipboardList}
        />
        <StatCard
          title="Taux de conversion"
          value={`${conversionRate}%`}
          icon={TrendingUp}
          trend={Number(conversionRate) > 20 ? "up" : "flat"}
          trendValue={`${converted.length} convertis`}
        />
        <StatCard
          title="Strategies actives"
          value={activeStrategyCount}
          icon={Zap}
        />
        <StatCard
          title="Temps moyen conversion"
          value={`${avgConvertDays}j`}
          icon={Clock}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`flex w-72 shrink-0 flex-col rounded-xl border ${col.borderColor} ${col.bgColor}`}
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={col.color}>{col.icon}</span>
                <h3 className={`text-sm font-semibold ${col.color}`}>
                  {col.label}
                </h3>
              </div>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {col.items.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex-1 space-y-2 p-3">
              {col.items.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">
                  Aucun element
                </p>
              ) : (
                col.items.slice(0, 10).map((card) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3 transition-colors hover:border-zinc-700"
                  >
                    <p className="text-sm font-medium text-white">
                      {card.companyName}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {card.contact}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {card.scoreRange && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                            {card.scoreRange}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-600">
                          {fmtDate(card.date)}
                        </span>
                      </div>
                      {card.link && (
                        <Link
                          href={card.link}
                          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
              {col.items.length > 10 && (
                <p className="text-center text-[10px] text-zinc-600">
                  +{col.items.length - 10} autres
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
