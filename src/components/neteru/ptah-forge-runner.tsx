"use client";

/**
 * <PtahForgeRunner> — Neteru UI Kit (Layer 5).
 *
 * Affiche l'état d'une forge Ptah en cours / complétée. Polling intelligent
 * jusqu'à COMPLETED ou FAILED. Affiche prompt, provider, model, coût estimé,
 * cost_per_expected_superfan, manipulation mode, pillar source.
 *
 * Cf. PANTHEON.md §2.5 — Ptah forge master.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Loader2, CheckCircle, XCircle, Sparkles, Hammer } from "lucide-react";

type ForgeKindLabel = Record<string, string>;
const KIND_LABELS: ForgeKindLabel = {
  image: "Image",
  video: "Vidéo",
  audio: "Audio",
  icon: "Icône",
  refine: "Raffinement",
  transform: "Transformation",
  classify: "Classification",
  stock: "Stock",
  design: "Design",
};

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  peddler: { label: "Peddler", color: "text-orange-300" },
  dealer: { label: "Dealer", color: "text-purple-300" },
  facilitator: { label: "Facilitator", color: "text-blue-300" },
  entertainer: { label: "Entertainer", color: "text-success" },
};

interface PtahForgeRunnerProps {
  taskId: string;
  /** Polling interval ms (default 2000). 0 = no polling. */
  pollIntervalMs?: number;
  onComplete?: (urls: string[]) => void;
}

export function PtahForgeRunner({ taskId, pollIntervalMs = 2000, onComplete }: PtahForgeRunnerProps) {
  const { data: task, refetch } = trpc.ptah.getForge.useQuery(
    { taskId },
    {
      refetchInterval: (query) => {
        const status = (query.state.data as { status?: string } | undefined)?.status;
        if (status === "COMPLETED" || status === "FAILED" || status === "VETOED") return false;
        return pollIntervalMs > 0 ? pollIntervalMs : false;
      },
    },
  );

  const [hasNotified, setHasNotified] = useState(false);
  useEffect(() => {
    if (!task) return;
    if (task.status === "COMPLETED" && !hasNotified && onComplete) {
      const urls = (task.resultUrls as string[]) ?? [];
      onComplete(urls);
      setHasNotified(true);
    }
  }, [task, hasNotified, onComplete]);

  if (!task) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
        <Loader2 className="h-4 w-4 animate-spin text-foreground-secondary" />
      </div>
    );
  }

  const status = task.status;
  const isRunning = status === "CREATED" || status === "IN_PROGRESS";
  const isOK = status === "COMPLETED";
  const isError = status === "FAILED" || status === "VETOED";
  const mode = MODE_LABELS[task.manipulationMode] ?? { label: task.manipulationMode, color: "text-foreground-secondary" };
  const expectedCps = task.expectedSuperfans
    ? Math.round((task.estimatedCostUsd / task.expectedSuperfans) * 1000) / 1000
    : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/5 via-white/[0.02] to-transparent p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <Hammer className="h-5 w-5 text-warning" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Ptah · {KIND_LABELS[task.forgeKind] ?? task.forgeKind}</span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-foreground-secondary">
                {task.provider} / {task.providerModel}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <span className={mode.color}>{mode.label}</span>
              <span className="text-foreground-tertiary">·</span>
              <span className="text-foreground-secondary">Pillar {task.pillarSource}</span>
              <span className="text-foreground-tertiary">·</span>
              <span className="text-foreground-secondary">${task.estimatedCostUsd.toFixed(3)}</span>
              {expectedCps !== null && (
                <>
                  <span className="text-foreground-tertiary">·</span>
                  <span className="text-foreground-secondary">{task.expectedSuperfans} superfans potentiels (${expectedCps}/sf)</span>
                </>
              )}
            </div>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      {isRunning && (
        <div className="mt-4 flex items-center gap-2 text-xs text-foreground-secondary">
          <Loader2 className="h-3 w-3 animate-spin" />
          {status === "CREATED" ? "Brief envoyé au provider…" : "Forge en cours…"}
        </div>
      )}

      {isError && task.errorMessage && (
        <div className="mt-4 rounded-md bg-error/10 p-3 text-xs text-error">{task.errorMessage}</div>
      )}

      {isOK && task.versions.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {task.versions.slice(0, 6).map((v) => (
            <AssetThumb key={v.id} url={v.cdnUrl ?? v.url} kind={v.kind} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; fg: string; icon: typeof Loader2 }> = {
    CREATED: { label: "Créé", bg: "bg-warning/10", fg: "text-warning", icon: Sparkles },
    IN_PROGRESS: { label: "En forge", bg: "bg-warning/10", fg: "text-warning", icon: Loader2 },
    COMPLETED: { label: "Forgé", bg: "bg-success/10", fg: "text-success", icon: CheckCircle },
    FAILED: { label: "Échec", bg: "bg-error/10", fg: "text-error", icon: XCircle },
    VETOED: { label: "Vetoé Thot", bg: "bg-error/10", fg: "text-error", icon: XCircle },
    EXPIRED: { label: "Expiré", bg: "bg-surface-raised", fg: "text-foreground-secondary", icon: XCircle },
  };
  const c = config[status] ?? config.CREATED!;
  const Icon = c.icon;
  return (
    <div className={`flex items-center gap-1.5 rounded-full ${c.bg} px-3 py-1 text-xs font-semibold ${c.fg}`}>
      <Icon className={`h-3 w-3 ${status === "IN_PROGRESS" ? "animate-spin" : ""}`} />
      {c.label}
    </div>
  );
}

function AssetThumb({ url, kind }: { url: string; kind: string }) {
  if (kind === "video") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg border border-white/5 bg-black">
        <video src={url} controls className="h-full w-full object-cover" />
      </div>
    );
  }
  if (kind === "audio") {
    return (
      <div className="flex aspect-video items-center rounded-lg border border-white/5 bg-black/40 p-3">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block aspect-square overflow-hidden rounded-lg border border-white/5 bg-black/30 transition-transform hover:scale-105"
    >
      <Image src={url} alt={kind} fill unoptimized className="object-cover" />
    </a>
  );
}
