"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { Zap, Play, CheckCircle, Building2 } from "lucide-react";
import Link from "next/link";

export default function BootSequencesPage() {
  const { data: strategies, isLoading } = trpc.strategy.list.useQuery({});
  const startMutation = trpc.bootSequence.start.useMutation();
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  const allStrategies = strategies ?? [];
  const activeStrategies = allStrategies.filter((s) => s.status === "ACTIVE");

  // Determine boot status based on whether strategy has a complete vector
  const booted = activeStrategies.filter((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    return v && (v.composite ?? 0) > 0;
  });
  const needsBoot = activeStrategies.filter((s) => {
    const v = s.advertis_vector as Record<string, number> | null;
    return !v || (v.composite ?? 0) === 0;
  });

  const handleStartBoot = () => {
    if (!selectedStrategyId) return;
    startMutation.mutate(
      { strategyId: selectedStrategyId },
      {
        onSuccess: () => {
          setShowStartModal(false);
          // Navigate would go to /console/oracle/boot/[sessionId]
        },
      },
    );
  };

  if (isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boot Sequences"
        description="Sessions d'onboarding client (60-90 min) - calibrage des 8 piliers ADVE"
        breadcrumbs={[{ label: "Console", href: "/console" }, { label: "Oracle" }, { label: "Boot Sequences" }]}
      >
        <button
          onClick={() => setShowStartModal(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          <Play className="h-4 w-4" />
          Demarrer un Boot Sequence
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Clients calibres" value={booted.length} icon={CheckCircle} />
        <StatCard title="En attente de boot" value={needsBoot.length} icon={Zap} />
        <StatCard title="Clients actifs" value={activeStrategies.length} icon={Building2} />
      </div>

      {/* Needs Boot */}
      {needsBoot.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">En attente de calibrage</h3>
          <div className="space-y-2">
            {needsBoot.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
                <div>
                  <p className="font-medium text-white">{s.name}</p>
                  <p className="text-xs text-zinc-400">{s.description}</p>
                </div>
                <Link
                  href={`/console/oracle/boot/${s.id}`}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-amber-400"
                >
                  Calibrer
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already Booted */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Clients calibres</h3>
        {booted.length === 0 ? (
          <EmptyState icon={Zap} title="Aucun boot sequence termine" description="Les sessions de calibrage ADVE apparaitront ici." />
        ) : (
          <div className="space-y-2">
            {booted.map((s) => {
              const v = s.advertis_vector as Record<string, number> | null;
              const composite = v ? ["a", "d", "v", "e", "r", "t", "i", "s"].reduce((sum, k) => sum + (v[k] ?? 0), 0) : 0;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700">
                  <div>
                    <p className="font-medium text-white">{s.name}</p>
                    <p className="text-xs text-zinc-400">Score: {composite.toFixed(0)}/200</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status="completed" />
                    <Link
                      href={`/console/oracle/boot/${s.id}`}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Recalibrer
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start Boot Modal */}
      <Modal open={showStartModal} onClose={() => setShowStartModal(false)} title="Demarrer un Boot Sequence" size="md">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Selectionnez un client pour demarrer le calibrage des 8 piliers ADVE.</p>
          <select
            value={selectedStrategyId ?? ""}
            onChange={(e) => setSelectedStrategyId(e.target.value || null)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Selectionnez un client</option>
            {activeStrategies.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowStartModal(false)} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
              Annuler
            </button>
            <button
              onClick={handleStartBoot}
              disabled={!selectedStrategyId || startMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              {startMutation.isPending ? "Demarrage..." : "Demarrer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
