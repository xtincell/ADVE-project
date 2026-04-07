"use client";

import { useState } from "react";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { trpc } from "@/lib/trpc/client";
import {
  FileText,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Loader2,
  CheckCircle,
  AlertCircle,
  Circle,
  Sparkles,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

const STATUS_ICONS = {
  complete: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/20" },
  partial: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-900/20" },
  empty: { icon: Circle, color: "text-zinc-600", bg: "bg-zinc-900/20" },
};

export default function PropositionPage() {
  const strategyId = useCurrentStrategyId();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const completeness = trpc.strategyPresentation.completeness.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId }
  );

  const [enrichResult, setEnrichResult] = useState<{
    enriched: string[]; failed: string[]; seeded: string[]; total: number;
    frameworksExecuted: number; finalScore: string; finalComplete: number; finalPartial: number; finalEmpty: number;
    sectionFeedback: Record<string, { before: string; after: string; action: string }>;
    message: string;
  } | null>(null);

  const enrichMutation = trpc.strategyPresentation.enrichOracle.useMutation({
    onSuccess: (data) => {
      setEnrichResult(data);
      completeness.refetch();
    },
  });

  const shareMutation = trpc.strategyPresentation.shareLink.useMutation({
    onSuccess: (data) => {
      setShareUrl(data.url);
    },
  });

  if (!strategyId) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        Selectionnez une strategie pour acceder a la proposition.
      </div>
    );
  }

  async function handleShare(persona?: "consultant" | "client" | "creative") {
    shareMutation.mutate({ strategyId: strategyId!, persona });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    const fullUrl = `${window.location.origin}${shareUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePreview() {
    if (shareUrl) {
      window.open(shareUrl, "_blank");
    } else {
      handleShare();
    }
  }

  const report = completeness.data ?? {};
  const totalSections = SECTION_REGISTRY.length;
  const completeSections = Object.values(report).filter((s) => s === "complete").length;
  const partialSections = Object.values(report).filter((s) => s === "partial").length;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-zinc-100">
          <FileText className="h-7 w-7 text-violet-400" />
          L'Oracle — Proposition Strategique
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Document vivant assemble depuis vos piliers ADVE-RTIS, Artemis et outils Glory.
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-300">Completude du document</span>
          <span className="text-sm text-zinc-500">
            {completeSections}/{totalSections} complets, {partialSections} partiels
          </span>
        </div>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${(completeSections / totalSections) * 100}%` }}
          />
          <div
            className="bg-yellow-500 transition-all"
            style={{ width: `${(partialSections / totalSections) * 100}%` }}
          />
        </div>
      </div>

      {/* Artemis enrichment */}
      {completeSections < totalSections && (
        <div className="rounded-xl border border-violet-800/30 bg-violet-950/15 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <div>
                <p className="text-sm font-semibold text-violet-300">Assembler L'Oracle</p>
                <p className="text-xs text-violet-400/60">
                  Artemis execute les frameworks necessaires pour remplir les {totalSections - completeSections} sections manquantes.
                </p>
              </div>
              <AiBadge />
            </div>
            <button
              onClick={() => enrichMutation.mutate({ strategyId: strategyId! })}
              disabled={enrichMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {enrichMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Artemis en cours...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Lancer Artemis</>
              )}
            </button>
          </div>
          {enrichResult && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-violet-300">{enrichResult.finalScore} — {enrichResult.message}</p>
              {enrichResult.seeded.length > 0 && (
                <p className="text-xs text-emerald-400">Metriques seedees : {enrichResult.seeded.join(", ")}</p>
              )}
              {enrichResult.failed.length > 0 && (
                <p className="text-xs text-red-400">Echouees : {enrichResult.failed.join(", ")}</p>
              )}
              <details className="text-xs text-zinc-500">
                <summary className="cursor-pointer hover:text-zinc-300">Detail par section ({enrichResult.frameworksExecuted} frameworks executes)</summary>
                <div className="mt-1 max-h-48 overflow-y-auto rounded border border-zinc-800 bg-zinc-900/50 p-2">
                  {Object.entries(enrichResult.sectionFeedback).map(([id, fb]) => (
                    <div key={id} className="flex items-center justify-between border-b border-zinc-800/30 py-1 last:border-0">
                      <span className="text-zinc-400">{id}</span>
                      <span className={fb.after === "complete" ? "text-emerald-400" : fb.after === "partial" ? "text-yellow-400" : "text-zinc-600"}>
                        {fb.after} {fb.action !== "inchange" && <span className="text-zinc-600">({fb.action})</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          {enrichMutation.error && (
            <p className="mt-3 text-xs text-red-400">{enrichMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Section checklist */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Sections</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {SECTION_REGISTRY.map((section) => {
            const status = report[section.id] ?? "empty";
            const { icon: StatusIcon, color, bg } = STATUS_ICONS[status];
            return (
              <div
                key={section.id}
                className={`flex items-center gap-3 rounded-lg border border-zinc-800 ${bg} px-4 py-3`}
              >
                <StatusIcon className={`h-4 w-4 ${color}`} />
                <div className="flex-1">
                  <span className="text-xs font-bold text-zinc-600">{section.number}</span>
                  <span className="ml-2 text-sm text-zinc-300">{section.title}</span>
                </div>
                <span className={`text-xs capitalize ${color}`}>{status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handlePreview}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
        >
          <ExternalLink className="h-4 w-4" />
          Previsualiser
        </button>

        <div className="flex gap-1 rounded-lg border border-zinc-700 bg-zinc-800/50">
          {(["consultant", "client", "creative"] as const).map((persona) => (
            <button
              key={persona}
              onClick={() => handleShare(persona)}
              disabled={shareMutation.isPending}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            >
              {shareMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Share2 className="h-3 w-3" />
              )}
              {persona}
            </button>
          ))}
        </div>

        {shareUrl && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copie!" : "Copier le lien"}
          </button>
        )}

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800"
        >
          Export PDF
        </button>
      </div>

      {/* Share URL display */}
      {shareUrl && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="text-xs text-zinc-600">Lien partageable :</p>
          <p className="mt-1 break-all font-mono text-sm text-orange-400">
            {typeof window !== "undefined" ? window.location.origin : ""}{shareUrl}
          </p>
        </div>
      )}
    </div>
  );
}
