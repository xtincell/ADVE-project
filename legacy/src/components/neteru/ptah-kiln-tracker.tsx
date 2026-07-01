"use client";

/**
 * <PtahKilnTracker> — Neteru UI Kit (Layer 5).
 *
 * Vue Mission Control des forges en cours et récentes — cross-strategy.
 * Tableau de bord pour les opérateurs UPgraders.
 */

import { trpc } from "@/lib/trpc/client";
import { Hammer, CheckCircle, Loader2, XCircle, Activity } from "lucide-react";

export function PtahKilnTracker() {
  const { data: forges, isLoading } = trpc.ptah.listForges.useQuery({ limit: 50 });
  const { data: health } = trpc.ptah.listProviderHealth.useQuery();

  if (isLoading) {
    return <div className="text-sm text-foreground-secondary">Chargement de la fonderie…</div>;
  }

  const running = forges?.filter((f) => f.status === "CREATED" || f.status === "IN_PROGRESS") ?? [];
  const completed = forges?.filter((f) => f.status === "COMPLETED") ?? [];
  const failed = forges?.filter((f) => f.status === "FAILED" || f.status === "VETOED") ?? [];

  const totalCost = completed.reduce((s, f) => s + (f.realisedCostUsd ?? 0), 0);
  const totalSuperfans = completed.reduce((s, f) => s + (f.realisedSuperfans ?? 0), 0);
  const avgCps = totalSuperfans > 0 ? totalCost / totalSuperfans : 0;

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Loader2} label="En forge" value={running.length} color="text-amber-300" spin />
        <StatTile icon={CheckCircle} label="Forgés" value={completed.length} color="text-emerald-300" />
        <StatTile icon={XCircle} label="Échecs/Vétos" value={failed.length} color="text-error" />
        <StatTile
          icon={Activity}
          label="$ / superfan"
          value={avgCps > 0 ? `$${avgCps.toFixed(2)}` : "—"}
          color="text-blue-300"
        />
      </div>

      {/* Provider health */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Hammer className="h-4 w-4 text-amber-300" />
          État des providers (circuit breaker)
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {health?.knownProviders.map((p) => {
            const dbHealth = health.health.find((h) => h.provider === p.provider);
            return (
              <ProviderHealthCell
                key={p.provider}
                name={p.provider}
                available={p.available}
                circuitState={dbHealth?.circuitState ?? "CLOSED"}
                totalRequests={dbHealth?.totalRequests ?? 0}
                totalFailures={dbHealth?.totalFailures ?? 0}
              />
            );
          })}
        </div>
      </div>

      {/* Running forges */}
      {running.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">En forge</h3>
          <div className="space-y-2">
            {running.map((f) => (
              <ForgeRow key={f.id} forge={f} />
            ))}
          </div>
        </div>
      )}

      {/* Recent completions */}
      {completed.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Forgés récemment ({completed.length})</h3>
          <div className="space-y-2">
            {completed.slice(0, 10).map((f) => (
              <ForgeRow key={f.id} forge={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  spin,
}: {
  icon: typeof Hammer;
  label: string;
  value: number | string;
  color: string;
  spin?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color} ${spin ? "animate-spin" : ""}`} />
        <span className="text-xs uppercase tracking-wider text-foreground-tertiary">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function ProviderHealthCell({
  name,
  available,
  circuitState,
  totalRequests,
  totalFailures,
}: {
  name: string;
  available: boolean;
  circuitState: string;
  totalRequests: number;
  totalFailures: number;
}) {
  // lafusee:allow-adhoc-completion: Ptah forge kiln progress display (forge tasks ratio, not pillar)
  const failRate = totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0;
  const stateColor =
    circuitState === "OPEN" ? "text-error" : circuitState === "HALF_OPEN" ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="rounded-lg bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-foreground">{name}</span>
        <span className={`text-[10px] ${stateColor}`}>● {circuitState}</span>
      </div>
      <div className="mt-1 text-[10px] text-foreground-secondary">
        {available ? "✓ disponible" : "⚠ unavailable"}
      </div>
      <div className="mt-1 text-[10px] text-foreground-tertiary">
        {totalRequests} req · {failRate.toFixed(1)}% fail
      </div>
    </div>
  );
}

interface ForgeRow {
  id: string;
  forgeKind: string;
  provider: string;
  providerModel: string;
  pillarSource: string;
  manipulationMode: string;
  status: string;
  estimatedCostUsd: number;
  realisedCostUsd: number | null;
  realisedSuperfans: number | null;
  createdAt: Date;
}

function ForgeRow({ forge }: { forge: ForgeRow }) {
  const isRunning = forge.status === "CREATED" || forge.status === "IN_PROGRESS";
  const isOK = forge.status === "COMPLETED";
  const Icon = isOK ? CheckCircle : isRunning ? Loader2 : XCircle;
  const color = isOK ? "text-emerald-400" : isRunning ? "text-amber-400" : "text-error";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
      <Icon className={`h-3 w-3 ${color} ${isRunning ? "animate-spin" : ""}`} />
      <span className="font-medium text-foreground">{forge.forgeKind}</span>
      <span className="text-foreground-tertiary">·</span>
      <span className="text-foreground-secondary">{forge.provider}/{forge.providerModel}</span>
      <span className="text-foreground-tertiary">·</span>
      <span className="text-foreground-secondary">P-{forge.pillarSource}</span>
      <span className="text-foreground-tertiary">·</span>
      <span className="text-foreground-secondary">{forge.manipulationMode}</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-foreground-secondary">${(forge.realisedCostUsd ?? forge.estimatedCostUsd).toFixed(3)}</span>
        {forge.realisedSuperfans !== null && (
          <span className="text-emerald-400">{forge.realisedSuperfans} sf</span>
        )}
      </div>
    </div>
  );
}
