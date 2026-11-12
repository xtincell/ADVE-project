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
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Alert } from "@/components/primitives/alert";

type RtisKey = "R" | "T" | "I" | "S";

interface RecalculateRtisButtonProps {
  strategyId: string;
  pillarKey: RtisKey;
  canRecalculate?: boolean;
  onComplete?: () => void;
}

const PILLAR_LABELS: Record<RtisKey, string> = {
  R: "Diagnostic des risques",
  T: "Repères du marché",
  I: "Potentiel",
  S: "Stratégie",
};

function refusalMessage(error: string | undefined, pillarKey: RtisKey): string {
  const raw = error ?? "";
  if (raw.includes("readiness/RTIS_CASCADE") || raw.includes("ReadinessVetoError")) {
    return "Fondations incomplètes — renseignez d’abord votre identité, votre positionnement, votre offre et votre engagement.";
  }
  if (raw.includes("SYNTHESIS_CHOICE_REQUIRED")) return "Retenez d’abord vos actions dans le catalogue, puis recalculez le plan.";
  if (raw.includes("VERSION_CONFLICT")) return "Les sources ont changé. Rechargez la marque, vérifiez vos choix, puis relancez le calcul.";
  if (raw.includes("LOCKED")) return "Le plan est verrouillé. Faites revoir son verrouillage avant de relancer le calcul.";
  if (raw.includes("FIELD_PROVENANCE_REFUSED")) return "Une décision humaine protège ces informations. Faites-la revoir avant de relancer le calcul.";
  if (/FORBIDDEN|lecture seule/i.test(raw)) return "Votre accès à cette marque ne permet pas ce recalcul.";
  return pillarKey === "S" ? "Le plan n’a pas pu être sauvegardé. Rechargez la marque avant de réessayer."
    : `${PILLAR_LABELS[pillarKey]} n’a pas pu être actualisé. Rechargez la marque avant de réessayer.`;
}

export function RecalculateRtisButton({
  strategyId,
  pillarKey,
  canRecalculate = false,
  onComplete,
}: RecalculateRtisButtonProps) {
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const actualize = trpc.pillar.actualize.useMutation({
    onSuccess: (result) => {
      // `result` is ActualizeResult from mestor/rtis-cascade.ts
      const updated = (result as { updated?: boolean })?.updated;
      const error = (result as { error?: string })?.error;
      if (error || updated !== true) {
        setFeedback({
          kind: "err",
          msg: refusalMessage(error, pillarKey),
        });
        return;
      }
      setFeedback({
        kind: "ok",
        msg: pillarKey === "S" ? "Plan recalculé et sauvegardé — proposition à relire."
          : `${PILLAR_LABELS[pillarKey]} actualisé — proposition à relire.`,
      });
      onComplete?.();
    },
    onError: (err) => {
      setFeedback({ kind: "err", msg: refusalMessage(err.message, pillarKey) });
    },
  });

  function handleClick() {
    if (!canRecalculate || actualize.isPending) return;
    setFeedback(null);
    actualize.mutate({ strategyId, key: pillarKey });
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="subtle"
        size="sm"
        loading={actualize.isPending}
        onClick={handleClick}
        disabled={!canRecalculate}
        title={!canRecalculate ? "Recalcul indisponible avec votre accès ou le verrouillage actuel." : pillarKey === "S" ? "Calculer et sauvegarder le plan depuis vos choix conservés, sans génération assistée." : `Actualiser ${PILLAR_LABELS[pillarKey]} depuis vos fondations et les informations disponibles.`}
      >
        {!actualize.isPending ? <RefreshCw className="h-3.5 w-3.5" /> : null}
        {pillarKey === "S" ? "Recalculer le plan" : `Actualiser ${PILLAR_LABELS[pillarKey]}`}
      </Button>
      {feedback ? (
        <Alert tone={feedback.kind === "ok" ? "success" : "error"}>{feedback.msg}</Alert>
      ) : null}
    </div>
  );
}
