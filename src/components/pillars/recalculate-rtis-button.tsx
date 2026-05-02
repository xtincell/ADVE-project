"use client";

/**
 * RecalculateRtisButton — RTIS pillars are derived from ADVE; they are
 * never amended manually. This button emits the appropriate ENRICH_*
 * intent so the pillar is regenerated server-side via existing inference.
 *
 * - R: ENRICH_R_FROM_ADVE
 * - T: ENRICH_T_FROM_ADVE_R_SESHAT
 * - I: GENERATE_I_ACTIONS
 * - S: SYNTHESIZE_S
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

export function RecalculateRtisButton({
  strategyId,
  pillarKey,
  onComplete,
}: RecalculateRtisButtonProps) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // V1 uses the existing cascadeRTIS endpoint, which recalculates the full
  // R+T+I+S chain from current ADVE. Per-pillar recalculation (single
  // ENRICH_*) lands in V2 if the operator workflow demands finer control.
  const cascade = trpc.pillar.cascadeRTIS.useMutation({
    onSuccess: () => {
      setFeedback({ kind: "ok", msg: `Cascade RTIS recalculée (depuis ${pillarKey}).` });
      onComplete?.();
    },
    onError: (err) => setFeedback({ kind: "err", msg: err.message }),
  });

  function handleClick() {
    setFeedback(null);
    cascade.mutate({ strategyId });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={cascade.isPending}
        className="flex items-center gap-1.5 rounded-lg bg-sky-600/20 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-600/30 disabled:opacity-50"
      >
        {cascade.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Recalculer ce pilier
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
