"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  Radio,
  Activity,
  Monitor,
  MapPin,
  Eye,
  Power,
  PowerOff,
  Sparkles,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const CHANNEL_ICONS: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  TIKTOK: "🎵",
  YOUTUBE: "▶️",
  LINKEDIN: "💼",
  TWITTER: "🐦",
  GOOGLE_ADS: "🔍",
  EMAIL: "📧",
  SMS: "📱",
  WHATSAPP: "💬",
  PRINT: "🖨️",
  OOH: "🏙️",
  RADIO: "📻",
  TV: "📺",
  EVENT: "🎪",
};

const TYPE_COLORS: Record<string, string> = {
  DIGITAL: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  PHYSICAL: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  EXPERIENTIAL: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  MEDIA: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
};

export default function DriversConsolePage() {
  const { data: drivers, isLoading } = trpc.driver.list.useQuery({});
  const { data: strategies } = trpc.strategy.list.useQuery({});
  const utils = trpc.useUtils();

  const activateMutation = trpc.driver.activate.useMutation({
    onSuccess: () => utils.driver.list.invalidate(),
  });
  const deactivateMutation = trpc.driver.deactivate.useMutation({
    onSuccess: () => utils.driver.list.invalidate(),
  });

  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const allDrivers = drivers ?? [];
  const strategyList = strategies ?? [];
  const strategyMap = new Map(strategyList.map((s) => [s.id, s.name]));

  const channels = useMemo(
    () => Array.from(new Set(allDrivers.map((d) => d.channel))),
    [allDrivers],
  );
  const channelTypes = useMemo(
    () => Array.from(new Set(allDrivers.map((d) => d.channelType).filter(Boolean))),
    [allDrivers],
  );

  // Filter
  const filtered = allDrivers.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filterValues.channel && d.channel !== filterValues.channel) return false;
    if (filterValues.channelType && d.channelType !== filterValues.channelType)
      return false;
    return true;
  });

  // Stats
  const activeCount = allDrivers.filter((d) => d.status === "ACTIVE").length;
  const digitalCount = allDrivers.filter(
    (d) => d.channelType === "DIGITAL",
  ).length;
  const physicalCount = allDrivers.filter(
    (d) => d.channelType === "PHYSICAL" || d.channelType === "EXPERIENTIAL" || d.channelType === "MEDIA",
  ).length;

  // Selected driver detail
  const detail = selectedDriver
    ? allDrivers.find((d) => d.id === selectedDriver)
    : null;
  const detailPillar = detail
    ? (detail.pillarPriority as Record<string, number> | null)
    : null;
  const detailFormatSpecs = detail
    ? (detail.formatSpecs as Record<string, unknown> | null)
    : null;
  const detailConstraints = detail
    ? (detail.constraints as Record<string, unknown> | null)
    : null;
  const detailQcCriteria = detail
    ? (detail.qcCriteria as Record<string, unknown> | null)
    : null;
  const detailBriefTemplate = detail
    ? (detail.briefTemplate as Record<string, unknown> | null)
    : null;
  const detailGloryTools = detail?.gloryTools ?? [];

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Gestion des canaux et leurs specifications"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "Drivers" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total drivers" value={allDrivers.length} icon={Radio} />
        <StatCard title="Actifs" value={activeCount} icon={Activity} />
        <StatCard title="Canaux digitaux" value={digitalCount} icon={Monitor} />
        <StatCard
          title="Canaux physiques"
          value={physicalCount}
          icon={MapPin}
        />
      </div>

      {/* Search + Filters */}
      <SearchFilter
        placeholder="Rechercher un driver..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "channel",
            label: "Canal",
            options: channels.map((c) => ({ value: c, label: c })),
          },
          {
            key: "channelType",
            label: "Type",
            options: channelTypes.map((t) => ({ value: t, label: t })),
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) =>
          setFilterValues((p) => ({ ...p, [key]: value }))
        }
      />

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Aucun driver"
          description="Les drivers apparaitront ici une fois configures."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((d) => {
            const pillar = d.pillarPriority as Record<string, number> | null;
            const topPillars = pillar
              ? Object.entries(pillar)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
              : [];

            return (
              <div
                key={d.id}
                onClick={() => setSelectedDriver(d.id)}
                className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {CHANNEL_ICONS[d.channel] ?? "📡"}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{d.name}</h3>
                      <p className="text-xs text-zinc-500">
                        {strategyMap.get(d.strategyId) ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                        TYPE_COLORS[d.channelType ?? ""] ??
                        "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30"
                      }`}
                    >
                      {d.channelType ?? "-"}
                    </span>
                    <StatusBadge status={d.status ?? "ACTIVE"} />
                  </div>
                </div>

                {/* Pillar priority display */}
                {topPillars.length > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    {topPillars.map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center gap-1 rounded-md bg-zinc-800/50 px-2 py-1"
                      >
                        <span className="text-xs font-bold text-zinc-300">
                          {key.toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {Number(val).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Glory tools count */}
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {(d.gloryTools as unknown[])?.length ?? 0} glory tools
                  </span>
                  <span>{d.channel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedDriver}
        onClose={() => setSelectedDriver(null)}
        title={detail?.name ?? "Driver"}
        size="lg"
      >
        {detail ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-center gap-4">
              <span className="text-4xl">
                {CHANNEL_ICONS[detail.channel] ?? "📡"}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                      TYPE_COLORS[detail.channelType ?? ""] ??
                      "bg-zinc-400/15 text-zinc-400 ring-zinc-400/30"
                    }`}
                  >
                    {detail.channelType ?? "-"}
                  </span>
                  <StatusBadge status={detail.status ?? "ACTIVE"} />
                  <span className="text-xs text-zinc-500">
                    {detail.channel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Strategie: {strategyMap.get(detail.strategyId) ?? "-"}
                </p>
              </div>
            </div>

            {/* Pillar Priority */}
            {detailPillar && Object.keys(detailPillar).length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Priorite par pilier
                </h4>
                <div className="space-y-2">
                  {Object.entries(detailPillar)
                    .sort((a, b) => b[1] - a[1])
                    .map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-8 text-xs font-bold text-zinc-300">
                          {key.toUpperCase()}
                        </span>
                        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-zinc-800/50">
                          <div
                            className="h-full rounded-full bg-blue-500/50 transition-all"
                            style={{
                              width: `${Math.min((Number(val) / 25) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-zinc-400">
                          {Number(val).toFixed(1)}/25
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Format Specs */}
            {detailFormatSpecs && Object.keys(detailFormatSpecs).length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Format Specs
                </h4>
                <pre className="max-h-40 overflow-auto text-xs text-zinc-300">
                  {JSON.stringify(detailFormatSpecs, null, 2)}
                </pre>
              </div>
            )}

            {/* Constraints */}
            {detailConstraints &&
              Object.keys(detailConstraints).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Contraintes
                  </h4>
                  <pre className="max-h-40 overflow-auto text-xs text-zinc-300">
                    {JSON.stringify(detailConstraints, null, 2)}
                  </pre>
                </div>
              )}

            {/* Brief Template */}
            {detailBriefTemplate &&
              Object.keys(detailBriefTemplate).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Brief Template
                  </h4>
                  <pre className="max-h-40 overflow-auto text-xs text-zinc-300">
                    {JSON.stringify(detailBriefTemplate, null, 2)}
                  </pre>
                </div>
              )}

            {/* QC Criteria */}
            {detailQcCriteria &&
              Object.keys(detailQcCriteria).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Criteres QC
                  </h4>
                  <pre className="max-h-40 overflow-auto text-xs text-zinc-300">
                    {JSON.stringify(detailQcCriteria, null, 2)}
                  </pre>
                </div>
              )}

            {/* Glory Tools */}
            {detailGloryTools.length > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Glory Tools ({detailGloryTools.length})
                </h4>
                <div className="space-y-2">
                  {detailGloryTools.map((tool) => (
                    <div
                      key={(tool as Record<string, unknown>).id as string}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                    >
                      <span className="text-sm text-white">
                        {(tool as Record<string, unknown>).name as string}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {(tool as Record<string, unknown>).type as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-zinc-800 pt-4">
              {detail.status === "ACTIVE" ? (
                <button
                  onClick={() => {
                    deactivateMutation.mutate({ id: detail.id });
                    setSelectedDriver(null);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20"
                >
                  <PowerOff className="h-4 w-4" /> Desactiver
                </button>
              ) : (
                <button
                  onClick={() => {
                    activateMutation.mutate({ id: detail.id });
                    setSelectedDriver(null);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Power className="h-4 w-4" /> Activer
                </button>
              )}
              <button
                onClick={() => {
                  /* generateSpecs requires strategyId + channel */
                }}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                <Sparkles className="h-4 w-4" /> Generer specs
              </button>
              <button
                onClick={() => {
                  /* auditCoherence requires strategyId */
                }}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                <ShieldCheck className="h-4 w-4" /> Auditer coherence
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          </div>
        )}
      </Modal>
    </div>
  );
}
