"use client";

/**
 * CalibrationReviewPanel — Phase 23 Epic 6 Story 6.4 (UX-DR4 + UX-DR15 + UX-DR22).
 *
 * The operator's statistical-judgement surface for the superfan-attribution model
 * (ADR-0081). It shows ROC AUC / RMSE as **values against declared thresholds**
 * (W&B metrics-as-data pattern) — never a pass/fail badge that strips the
 * operator's authority. Pass / near / fail is conveyed by icon + label + token
 * (colour is never the sole carrier — UX-DR22 a11y).
 *
 * Two peer tabs of equal status (manual-first parity, ADR-0060) :
 *   - "Calibration auto"      → RUN_ATTRIBUTION_CALIBRATION mode AUTO (fit regression)
 *   - "Coefficients manuels"  → mode MANUAL_COEFFICIENTS (operator-entered, FR25)
 * Switching tabs does not lose entered coefficients (state lives in the panel).
 *
 * Two host contexts, one component, identical interaction contract :
 *   - host="dialog"  → wrapped in the `dialog` primitive size=xl ("dialog-wide"),
 *                      summoned from the B1/B2 hub views ;
 *   - host="inline"  → rendered inline in the B3 master-detail pane.
 *
 * Progress streams over NSP SSE (`useCalibrationStream`) into a
 * `role="status" aria-live="polite"` region (NFR3 + UX-DR17). Accept is the one
 * primary-rouge action (the consequential forward act) ; Reject is ghost — Reject
 * is NEVER primary-rouge (UX-DR16). Accept runs the calibration (if not already)
 * THEN promotes the sub-cluster one rung via `PROMOTE_PIVOT_SUBCLUSTER` —
 * `governedProcedure` mutations only (hash-chained, ADR-0080). A completed
 * promotion confirms inline with act + actor + a one-hop snapshot link (UX-DR14),
 * not a generic toast.
 *
 * DS rigour (lives under `src/components/**`) : semantic design tokens only,
 * Console `data-density="compact"`, composes `Dialog` / `Tabs` / `Badge` /
 * `ProvenancePopover` primitives, axe-clean, keyboard-navigable.
 */

import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Play,
  Cpu,
  PencilLine,
  MinusCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Badge } from "@/components/primitives/badge";
import { ProvenancePopover } from "@/components/cockpit/governance/provenance-popover";
import { useCalibrationStream } from "@/hooks/use-calibration-stream";

const LADDER = ["STUB", "PARTIAL", "MVP", "PRODUCTION"] as const;
type LadderState = (typeof LADDER)[number];

type Grade = "PASS" | "NEAR" | "FAIL";

const GRADE_PRESENTATION: Record<
  Grade,
  { tone: "success" | "warning" | "error"; Icon: typeof CheckCircle2; label: string }
> = {
  PASS: { tone: "success", Icon: CheckCircle2, label: "Au-dessus du seuil" },
  NEAR: { tone: "warning", Icon: AlertTriangle, label: "Proche du seuil" },
  FAIL: { tone: "error", Icon: XCircle, label: "Sous le seuil" },
};

function gradeRocAuc(value: number, min: number): Grade {
  if (value >= min) return "PASS";
  if (value >= min - 0.05) return "NEAR";
  return "FAIL";
}
function gradeRmse(value: number, max: number): Grade {
  if (value <= max) return "PASS";
  if (value <= max + 0.05) return "NEAR";
  return "FAIL";
}

export interface CalibrationReviewPanelProps {
  strategyId: string;
  subClusterSlug:
    | "superfan.attribution"
    | "superfan.stickiness"
    | "superfan.crmCapture"
    | "culture.overtonShift"
    | "culture.overtonReadiness"
    | "culture.tarsisBridge"
    | "culture.mcpIngest";
  /** Current lifecycle stage — Accept promotes one rung above this. */
  lifecycleState: LadderState;
  host: "dialog" | "inline";
  /** Required when host="dialog". */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CalibrationReviewPanel(props: CalibrationReviewPanelProps) {
  if (props.host === "dialog") {
    return (
      <Dialog
        open={props.open ?? false}
        onOpenChange={props.onOpenChange ?? (() => {})}
        size="xl"
        title="Revue de calibration — attribution superfans"
        description="L'opérateur garde le jugement statistique. Les valeurs sont affichées contre les seuils déclarés (ADR-0081 §4), pas un badge pass/fail."
      >
        <PanelBody {...props} />
      </Dialog>
    );
  }
  return (
    <div data-density="compact" className="rounded-lg border border-border bg-background/60 p-4">
      <PanelBody {...props} />
    </div>
  );
}

function PanelBody({
  strategyId,
  subClusterSlug,
  lifecycleState,
  host,
  onOpenChange,
}: CalibrationReviewPanelProps) {
  const utils = trpc.useUtils();
  const snapshotsQuery = trpc.campaignTracker.listCalibrationSnapshots.useQuery(
    { strategyId },
    { enabled: !!strategyId },
  );

  const [mode, setMode] = useState<"AUTO" | "MANUAL_COEFFICIENTS">("AUTO");
  const [coeffs, setCoeffs] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [snapshotRef, setSnapshotRef] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ actor: string; from: string; to: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const thresholds = snapshotsQuery.data?.thresholds ?? { rocAucMin: 0.7, rmseMax: 0.3 };
  const featureKeys = snapshotsQuery.data?.featureKeys ?? [];
  const latest = snapshotsQuery.data?.snapshots[0] ?? null;

  const fromIdx = LADDER.indexOf(lifecycleState);
  const nextState = fromIdx >= 0 && fromIdx < LADDER.length - 1 ? LADDER[fromIdx + 1] : null;
  const requiresSnapshot = nextState === "PRODUCTION";

  const runCalibration = trpc.campaignTracker.runAttributionCalibration.useMutation({
    onSuccess: (data) => {
      setActionError(null);
      if (data.snapshotRef) setSnapshotRef(data.snapshotRef);
      void utils.campaignTracker.listCalibrationSnapshots.invalidate({ strategyId });
    },
  });

  const promote = trpc.campaignTracker.promotePivotSubcluster.useMutation({
    onSuccess: (data) => {
      if (data.status === "OK") {
        const out = data.output as { actor?: string; fromState?: string; toState?: string } | null;
        setConfirmation({
          actor: out?.actor ?? "opérateur",
          from: out?.fromState ?? lifecycleState,
          to: out?.toState ?? (nextState ?? ""),
        });
        void utils.campaignTracker.listClusterCapabilities.invalidate();
      } else {
        setActionError(data.reason ?? data.summary ?? "Promotion refusée.");
      }
    },
  });

  const busy = runCalibration.isPending || promote.isPending;

  // Resolve the metric values to display : the just-run mutation result, else the
  // latest persisted snapshot.
  const runOutput = runCalibration.data?.output as
    | { state?: string; snapshot?: { rocAuc?: number; rmse?: number; sampleSize?: number; mode?: string } }
    | null
    | undefined;
  const liveSnap = runOutput?.state === "OK" ? runOutput.snapshot : undefined;
  const rocAuc = liveSnap?.rocAuc ?? latest?.rocAuc ?? null;
  const rmse = liveSnap?.rmse ?? latest?.rmse ?? null;
  const sampleSize = liveSnap?.sampleSize ?? latest?.sampleSize ?? null;
  const metricMode = liveSnap?.mode ?? latest?.mode ?? null;
  const insufficient = runOutput?.state === "INSUFFICIENT_DATA";

  const effectiveSnapshotRef = snapshotRef ?? (latest?.state === "OK" ? latest.emissionId : null);

  function runNow() {
    setConfirmation(null);
    setActionError(null);
    if (mode === "MANUAL_COEFFICIENTS") {
      const operatorCoefficients: Record<string, number> = {};
      for (const k of featureKeys) operatorCoefficients[k] = Number(coeffs[k] ?? "0") || 0;
      runCalibration.mutate({ strategyId, mode, operatorCoefficients });
    } else {
      runCalibration.mutate({ strategyId, mode: "AUTO" });
    }
  }

  function accept() {
    if (!nextState) return;
    setActionError(null);
    const ref = effectiveSnapshotRef ?? undefined;
    if (requiresSnapshot && !ref) {
      setActionError(
        "Promotion PRODUCTION : lancez d'abord une calibration valide (snapshot requis — ADR-0081).",
      );
      return;
    }
    promote.mutate({
      strategyId,
      subClusterSlug,
      fromState: lifecycleState as "STUB" | "PARTIAL" | "MVP",
      toState: nextState as "PARTIAL" | "MVP" | "PRODUCTION",
      calibrationSnapshotRef: ref,
      reason: reason.trim() || `Promotion via revue de calibration (${metricMode ?? mode})`,
    });
  }

  function reject() {
    setConfirmation(null);
    setActionError("Calibration rejetée — aucune promotion appliquée.");
    runCalibration.reset();
    setSnapshotRef(null);
  }

  const stream = useStreamLine(strategyId, busy);

  return (
    <div className="space-y-4 text-sm" data-density="compact">
      {/* Peer tabs — equal status (ADR-0060 / UX-DR13) */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as "AUTO" | "MANUAL_COEFFICIENTS")}>
        <TabsList>
          <TabsTrigger value="AUTO">
            <span className="inline-flex items-center gap-1.5">
              <Cpu className="h-4 w-4" aria-hidden="true" /> Calibration auto
            </span>
          </TabsTrigger>
          <TabsTrigger value="MANUAL_COEFFICIENTS">
            <span className="inline-flex items-center gap-1.5">
              <PencilLine className="h-4 w-4" aria-hidden="true" /> Coefficients manuels
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "MANUAL_COEFFICIENTS" && (
        <div className="space-y-2 rounded-md border border-border bg-surface/40 p-3">
          <p className="text-xs text-foreground-secondary">
            Saisie manuelle des coefficients (pair manuel-first de la régression — FR25). ROC AUC /
            RMSE sont quand même calculés sur le fit manuel.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {featureKeys.map((k) => (
              <label key={k} className="block space-y-1">
                <span className="font-mono text-xs text-foreground-secondary">{k}</span>
                <input
                  type="number"
                  step="0.01"
                  value={coeffs[k] ?? ""}
                  onChange={(e) => setCoeffs((prev) => ({ ...prev, [k]: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={runNow}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-secondary disabled:opacity-50"
      >
        {runCalibration.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="h-4 w-4" aria-hidden="true" />
        )}
        Lancer la calibration ({mode === "AUTO" ? "auto" : "manuelle"})
      </button>

      {/* Metrics-as-data : values vs declared thresholds (UX-DR4) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard
          label="ROC AUC"
          value={rocAuc}
          thresholdLabel={`seuil ≥ ${thresholds.rocAucMin}`}
          grade={rocAuc !== null ? gradeRocAuc(rocAuc, thresholds.rocAucMin) : null}
        />
        <MetricCard
          label="RMSE"
          value={rmse}
          thresholdLabel={`seuil ≤ ${thresholds.rmseMax}`}
          grade={rmse !== null ? gradeRmse(rmse, thresholds.rmseMax) : null}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-foreground-secondary">
        <span>Échantillons : <span className="font-semibold text-foreground">{sampleSize ?? "—"}</span></span>
        <span>Mode : <span className="font-mono text-foreground">{metricMode ?? "—"}</span></span>
        {effectiveSnapshotRef && (
          <span className="inline-flex items-center gap-1">
            Snapshot
            <ProvenancePopover
              source="calibration-snapshot"
              refUrl={`/console/governance/campaign-tracker?snapshot=${effectiveSnapshotRef}`}
            />
          </span>
        )}
      </div>

      {insufficient && (
        <p className="flex items-start gap-2 rounded-md border border-border bg-surface/40 p-2.5 text-xs text-foreground-secondary">
          <MinusCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Données insuffisantes — aucun snapshot produit. La promotion PRODUCTION restera refusée
          tant qu&apos;une calibration valide n&apos;a pas été acceptée (P22-2 / ADR-0046).
        </p>
      )}

      {/* Optional operator rationale */}
      <label className="block space-y-1">
        <span className="text-xs font-medium text-foreground-secondary">
          Note opérateur (rationale de promotion — optionnel)
        </span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder={`Promotion via revue de calibration`}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
        />
      </label>

      {/* SSE progress region (UX-DR17 + NFR3) */}
      <div role="status" aria-live="polite" className="min-h-[1.25rem] text-xs text-foreground-muted">
        {stream}
      </div>

      {actionError && (
        <p className="flex items-start gap-1.5 rounded-md border border-error/40 bg-error/5 p-2.5 text-xs text-error">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {actionError}
        </p>
      )}

      {confirmation && (
        <p className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface/60 p-2.5 text-xs text-foreground">
          <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
          Calibration acceptée par <span className="font-semibold">{confirmation.actor}</span> —{" "}
          <span className="font-mono">{subClusterSlug}</span> promu{" "}
          <span className="font-mono">{confirmation.from} → {confirmation.to}</span>
          {effectiveSnapshotRef && (
            <ProvenancePopover
              source="calibration-snapshot"
              refUrl={`/console/governance/campaign-tracker?snapshot=${effectiveSnapshotRef}`}
              triggerLabel="Voir le snapshot justificatif"
            />
          )}
        </p>
      )}

      {/* Operator judgement : Accept (primary rouge) + Reject (ghost) — UX-DR16 */}
      <FooterSlot host={host}>
        <button
          type="button"
          onClick={reject}
          disabled={busy}
          className="rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground-secondary hover:text-foreground disabled:opacity-50"
        >
          Rejeter
        </button>
        <button
          type="button"
          onClick={accept}
          disabled={busy || !nextState}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {promote.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {nextState ? `Accepter et promouvoir → ${nextState}` : "Déjà en PRODUCTION"}
        </button>
        {host === "dialog" && (
          <button
            type="button"
            onClick={() => onOpenChange?.(false)}
            className="rounded-md px-3 py-2 text-sm text-foreground-secondary hover:text-foreground"
          >
            Fermer
          </button>
        )}
      </FooterSlot>
    </div>
  );
}

function FooterSlot({ host, children }: { host: "dialog" | "inline"; children: ReactNode }) {
  if (host === "dialog") return <DialogFooter>{children}</DialogFooter>;
  return <div className="mt-2 flex items-center justify-end gap-2">{children}</div>;
}

function MetricCard({
  label,
  value,
  thresholdLabel,
  grade,
}: {
  label: string;
  value: number | null;
  thresholdLabel: string;
  grade: Grade | null;
}) {
  const g = grade ? GRADE_PRESENTATION[grade] : null;
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-foreground-secondary">{label}</span>
        <span className="text-[10px] text-foreground-muted">{thresholdLabel}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {value !== null ? value.toFixed(3) : "—"}
        </span>
        {g && (
          <Badge tone={g.tone} className="gap-1">
            <g.Icon className="h-3 w-3" aria-hidden="true" />
            {g.label}
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Live SSE status line. Returns the human-readable progress text for the
 * `aria-live` region ; falls back to a static "en cours" while a mutation is
 * pending even before the first SSE frame lands.
 */
function useStreamLine(strategyId: string, busy: boolean): string {
  const { state, log } = useCalibrationStream(strategyId);
  if (log.length > 0) return log[log.length - 1]!.text;
  if (state.phase === "running") return "Calibration en cours…";
  if (busy) return "Préparation de la calibration…";
  return "";
}
