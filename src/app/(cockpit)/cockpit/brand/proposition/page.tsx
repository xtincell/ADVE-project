"use client";

import { useState, useEffect, useRef } from "react";
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
  RefreshCw,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { OracleEnrichmentTracker } from "@/components/neteru/oracle-enrichment-tracker";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";

const STATUS_CONFIG = {
  complete: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-900/20", border: "border-emerald-800/30", label: "Complete" },
  partial: { icon: AlertCircle, color: "text-yellow-400", bg: "bg-yellow-900/20", border: "border-yellow-800/30", label: "Partial" },
  empty: { icon: Circle, color: "text-foreground-muted", bg: "bg-background/20", border: "border-border", label: "Vide" },
};

export default function PropositionPage() {
  const strategyId = useCurrentStrategyId();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isArtemisRunning, setIsArtemisRunning] = useState(false);
  const [enrichLog, setEnrichLog] = useState<string[]>([]);
  const [enrichResult, setEnrichResult] = useState<{
    enriched: string[]; failed: string[]; seeded: string[]; total: number;
    frameworksExecuted: number; finalScore: string; finalComplete: number; finalPartial: number; finalEmpty: number;
    sectionFeedback: Record<string, { before: string; after: string; action: string }>;
    message: string;
    /** Phase 13 R2 — intentId exposé pour streaming/replay NSP. */
    intentId?: string | null;
  } | null>(null);
  /** Phase 13 R2 — last known IntentEmission id pour le tracker NSP replay. */
  const [lastIntentId, setLastIntentId] = useState<string | null>(null);
  const [prevReport, setPrevReport] = useState<Record<string, string>>({});
  const [changedSections, setChangedSections] = useState<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);

  const completeness = trpc.strategyPresentation.completeness.useQuery(
    { strategyId: strategyId ?? "" },
    {
      enabled: !!strategyId,
      refetchInterval: isArtemisRunning ? 3000 : false, // Poll every 3s while Artemis runs
    }
  );

  // Detect section changes during polling
  useEffect(() => {
    const report = completeness.data ?? {};
    if (Object.keys(prevReport).length > 0) {
      const newChanges = new Set(changedSections);
      for (const [id, status] of Object.entries(report)) {
        if (prevReport[id] && prevReport[id] !== status) {
          newChanges.add(id);
          const section = SECTION_REGISTRY.find((s) => s.id === id);
          setEnrichLog((prev) => [...prev, `${section?.number ?? ""} ${section?.title ?? id}: ${prevReport[id]} → ${status}`]);
        }
      }
      setChangedSections(newChanges);
    }
    setPrevReport(report);
  }, [completeness.data]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [enrichLog]);

  const enrichMutation = trpc.strategyPresentation.enrichOracle.useMutation({
    onMutate: () => {
      setIsArtemisRunning(true);
      setEnrichResult(null);
      setChangedSections(new Set());
      setEnrichLog(["Artemis demarre — analyse des sections incompletes..."]);
    },
    onSuccess: (data) => {
      setEnrichResult(data);
      setIsArtemisRunning(false);
      // Phase 13 R2 — capture intentId pour tracker NSP replay (post-completion)
      if (data.intentId) setLastIntentId(data.intentId);
      completeness.refetch();
      setEnrichLog((prev) => [
        ...prev,
        `--- Termine: ${data.finalScore} ---`,
        `${data.enriched.length} enrichies, ${data.frameworksExecuted} frameworks, ${data.seeded.length} metriques seedees`,
        ...(data.intentId ? [`IntentEmission: ${data.intentId.slice(0, 16)}…`] : []),
        ...(data.failed.length > 0 ? [`Echecs: ${data.failed.join(", ")}`] : []),
      ]);
    },
    onError: (err) => {
      setIsArtemisRunning(false);
      // ADR-0022: Oracle errors carry a structured cause { code, governor,
      // remediation, recoverable, context } via TRPCError.cause.
      const cause = (err as unknown as { data?: { cause?: { code?: string; governor?: string; remediation?: string; recoverable?: boolean } } }).data?.cause;
      const code = cause?.code;
      const governor = cause?.governor;
      const remediation = cause?.remediation;
      const lines: string[] = [];
      if (code && governor) {
        lines.push(`ERREUR ${code} (${governor}) — ${err.message.replace(/^\[ORACLE-\d+\]\s*/, "")}`);
        if (remediation) lines.push(`→ ${remediation}`);
        lines.push(`→ Voir /console/governance/oracle-incidents pour le triage.`);
      } else {
        lines.push(`ERREUR: ${err.message}`);
      }
      setEnrichLog((prev) => [...prev, ...lines]);
    },
  });

  const shareMutation = trpc.strategyPresentation.shareLink.useMutation({
    onSuccess: (data) => setShareUrl(data.url),
  });

  if (!strategyId) {
    return (
      <div className="flex h-96 items-center justify-center text-foreground-muted">
        Selectionnez une strategie pour acceder a la proposition.
      </div>
    );
  }

  const report = completeness.data ?? {};
  const totalSections = SECTION_REGISTRY.length;
  const completeSections = Object.values(report).filter((s) => s === "complete").length;
  const partialSections = Object.values(report).filter((s) => s === "partial").length;
  const emptySections = Object.values(report).filter((s) => s === "empty").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <FileText className="h-7 w-7 text-accent" />
          L'Oracle — Proposition Strategique
        </h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Document vivant assemble depuis vos piliers ADVE-RTIS, Artemis et outils Glory.
        </p>
      </div>

      {/* Live score bar */}
      <div className="rounded-xl border border-border bg-background/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-foreground-secondary">Completude</span>
            {isArtemisRunning && <RefreshCw className="h-3 w-3 animate-spin text-accent" />}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-emerald-400">{completeSections} complets</span>
            <span className="text-yellow-400">{partialSections} partiels</span>
            <span className="text-foreground-muted">{emptySections} vides</span>
            <span className="font-bold text-foreground">{completeSections}/{totalSections}</span>
          </div>
        </div>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-background">
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(completeSections / totalSections) * 100}%` }} />
          <div className="bg-yellow-500 transition-all duration-500" style={{ width: `${(partialSections / totalSections) * 100}%` }} />
        </div>
      </div>

      {/* Artemis control + live log */}
      <div className="rounded-xl border border-accent/30 bg-accent/15 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className={`h-5 w-5 ${isArtemisRunning ? "animate-pulse text-accent" : "text-accent"}`} />
            <div>
              <p className="text-sm font-semibold text-accent">Assembler L'Oracle</p>
              <p className="text-xs text-accent/60">
                {isArtemisRunning
                  ? "Frameworks Artemis en execution — les sections se mettent a jour en temps reel..."
                  : `${totalSections - completeSections} sections a completer. Artemis execute les frameworks necessaires.`}
              </p>
            </div>
            <AiBadge />
          </div>
          <button
            onClick={() => enrichMutation.mutate({ strategyId: strategyId! })}
            disabled={enrichMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent disabled:opacity-50"
          >
            {enrichMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Artemis en cours...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Lancer Artemis</>
            )}
          </button>
        </div>

        {/* Live log console */}
        {enrichLog.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-border bg-background p-3 font-mono text-xs">
            {enrichLog.map((line, i) => (
              <div key={i} className={`py-0.5 ${line.startsWith("---") ? "font-bold text-accent" : line.startsWith("ERREUR") ? "text-error" : "text-foreground-muted"}`}>
                <span className="text-foreground-muted select-none">[{String(i).padStart(2, "0")}] </span>
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* Final result details */}
        {enrichResult && !isArtemisRunning && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold text-accent">{enrichResult.finalScore} — {enrichResult.message}</p>
            {enrichResult.seeded.length > 0 && (
              <p className="text-xs text-emerald-400">Metriques seedees : {enrichResult.seeded.join(", ")}</p>
            )}
            <details className="text-xs text-foreground-muted" open>
              <summary className="cursor-pointer hover:text-foreground-secondary">Detail par section</summary>
              <div className="mt-1 max-h-48 overflow-y-auto rounded border border-border bg-background/50 p-2">
                {Object.entries(enrichResult.sectionFeedback).map(([id, fb]) => (
                  <div key={id} className="flex items-center justify-between border-b border-border/30 py-1 last:border-0">
                    <span className="text-foreground-secondary">{id}</span>
                    <span className={fb.after === "complete" ? "text-emerald-400" : fb.after === "partial" ? "text-yellow-400" : "text-foreground-muted"}>
                      {fb.after} <span className="text-foreground-muted">({fb.action})</span>
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {enrichMutation.error && (
          <p className="mt-3 text-xs text-error">{enrichMutation.error.message}</p>
        )}

        {/* Phase 13 (B7 + R2) — NSP streaming tracker (35 sections, tier groups).
            R2 : intentId capturé après mutation enrichOracle pour replay NSP
            (events stockés dans IntentEmissionEvent). Le polling completeness
            alimente le fallback live-pendant-mutation (le vrai pre-completion
            streaming nécessite refactor background queue, hors scope sprint). */}
        <div className="mt-3">
          <OracleEnrichmentTracker
            intentId={lastIntentId}
            completenessReport={completeness.data ?? undefined}
          />
        </div>
      </div>

      {/* Section grid — always visible, live updating */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground-secondary">Sections</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {SECTION_REGISTRY.map((section) => {
            const status = report[section.id] ?? "empty";
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            const justChanged = changedSections.has(section.id);

            return (
              <div
                key={section.id}
                className={`flex items-center gap-3 rounded-lg border ${config.border} ${config.bg} px-4 py-3 transition-all duration-500 ${
                  justChanged ? "ring-2 ring-violet-500/50 scale-[1.01]" : ""
                } ${isArtemisRunning && status !== "complete" ? "animate-pulse" : ""}`}
              >
                <StatusIcon className={`h-4 w-4 shrink-0 ${config.color} ${justChanged ? "animate-bounce" : ""}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground-muted">{section.number}</span>
                    <span className="truncate text-sm text-foreground-secondary">{section.title}</span>
                  </div>
                </div>
                <span className={`shrink-0 text-xs font-medium capitalize ${config.color}`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            if (shareUrl) window.open(shareUrl, "_blank");
            else shareMutation.mutate({ strategyId: strategyId! });
          }}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500"
        >
          <ExternalLink className="h-4 w-4" /> Previsualiser
        </button>

        <div className="flex gap-1 rounded-lg border border-border bg-background/50">
          {(["consultant", "client", "creative"] as const).map((persona) => (
            <button
              key={persona}
              onClick={() => shareMutation.mutate({ strategyId: strategyId!, persona })}
              disabled={shareMutation.isPending}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised hover:text-foreground"
            >
              {shareMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
              {persona}
            </button>
          ))}
        </div>

        {shareUrl && (
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}${shareUrl}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copie!" : "Copier le lien"}
          </button>
        )}

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background"
        >
          Export PDF
        </button>
      </div>

      {/* Share URL */}
      {shareUrl && (
        <div className="rounded-lg border border-border bg-background/50 px-4 py-3">
          <p className="text-xs text-foreground-muted">Lien partageable :</p>
          <p className="mt-1 break-all font-mono text-sm text-orange-400">
            {typeof window !== "undefined" ? window.location.origin : ""}{shareUrl}
          </p>
        </div>
      )}
    </div>
  );
}
