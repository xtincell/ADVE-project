"use client";

/**
 * RecalculateRtisButton — RTIS pillars are derived from ADVE; they are never
 * amended manually. This button re-runs the inference on the SPECIFIC pillar
 * being viewed (not the full RTIS chain), so the user gets parity with
 * ADVE's per-pilier "Enrichir" UX.
 *
 * - R/T/I/S → `pillar.actualize` (single pillar) — délègue à
 *   `mestor.actualizePillar(strategyId, key)` qui applique la cascade
 *   d'inférence dédiée à ce pilier (R = analyse(ADVE), T = market intelligence
 *   ADVE+R, I = catalogue ADVE+R+T, S = synthèse ADVE+R+T+I).
 *
 * Le bouton "Tout recalculer" (full cascade) reste disponible côté Notoria
 * dans le menu "Avancé" (`pipelineMutation` + `Relancer le pipeline complet`).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type RtisKey = "R" | "T" | "I" | "S";

interface RecalculateRtisButtonProps {
  strategyId: string;
  pillarKey: RtisKey;
  onComplete?: () => void;
}

const PILLAR_LABELS: Record<RtisKey, string> = {
  R: "Risk",
  T: "Track",
  I: "Potentiel",
  S: "Stratégie",
};

export function RecalculateRtisButton({
  strategyId,
  pillarKey,
  onComplete,
}: RecalculateRtisButtonProps) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const actualize = trpc.pillar.actualize.useMutation({
    onSuccess: (result) => {
      // `result` is ActualizeResult from mestor/rtis-cascade.ts
      const updated = (result as { updated?: boolean })?.updated;
      const error = (result as { error?: string })?.error;
      if (error || updated === false) {
        setFeedback({
          kind: "err",
          msg: error ?? `${PILLAR_LABELS[pillarKey]} n'a pas pu être actualisé.`,
        });
        return;
      }
      const stage = (result as { maturityStage?: string })?.maturityStage;
      const pct = (result as { maturityCompletionPct?: number })?.maturityCompletionPct;
      const stageInfo = stage ? ` · stage ${stage}${pct !== undefined ? ` ${Math.round(pct)}%` : ""}` : "";
      setFeedback({
        kind: "ok",
        msg: `${PILLAR_LABELS[pillarKey]} actualisé${stageInfo}.`,
      });
      onComplete?.();
    },
    onError: (err) => {
      // ADR-0030 Axe 3 — gate RTIS_CASCADE friendly error.
      const raw = err.message ?? "Erreur lors de l'actualisation";
      const friendly = raw.includes("readiness/RTIS_CASCADE") || raw.includes("ReadinessVetoError")
        ? "ADVE pas prêt — A/D/V/E doivent être au moins ENRICHED. Compléter le socle d'abord (page identité/positionnement/offre/engagement)."
        : raw;
      setFeedback({ kind: "err", msg: friendly });
    },
  });

  function handleClick() {
    setFeedback(null);
    actualize.mutate({ strategyId, key: pillarKey });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={actualize.isPending}
        title={pillarKey === "T" ? "Calculer le pilier T sur la base de votre fondation, du diagnostic, de la veille et de vos sources." : `Re-générer ${PILLAR_LABELS[pillarKey]} depuis la fondation${pillarKey !== "R" ? " et les piliers amont" : ""}.`}
        className="flex items-center gap-1.5 rounded-lg bg-sky-600/20 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-600/30 disabled:opacity-50"
      >
        {actualize.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {pillarKey === "T" ? "Calculer le pilier T" : "Recalculer ce pilier"}
      </button>
      {feedback ? (
        <span
          className={`flex items-center gap-1 text-[11px] ${
            feedback.kind === "ok" ? "text-emerald-300" : "text-error"
          }`}
        >
          {feedback.kind === "ok" ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {feedback.msg}
        </span>
      ) : null}
    </div>
  );
}
