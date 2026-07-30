"use client";

/**
 * F1 async (fix prod 2026-07-19) — suivi client du traitement asynchrone d'un
 * intake. Les procédures processShort/processIngest/processIngestPlus rendent
 * la main immédiatement ({ status: "PROCESSING" }) ; ce hook sonde getByToken
 * (4 s) jusqu'à l'état TERMINAL réel lu en base — jamais de faux succès,
 * jamais de sondage infini : le serveur garantit la transition (COMPLETED par
 * le diagnostic, FAILED sinon, garde paresseuse 10 min côté getByToken).
 *
 * Cas réseau-coupé : si la requête n'a jamais atteint le serveur, la row est
 * restée IN_PROGRESS — aucun traitement ne tourne, on le dit tout de suite
 * (outcome FAILED "timeout") au lieu de sonder pour rien.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";

export type IntakeWatchOutcome =
  | { status: "COMPLETED" }
  | { status: "FAILED"; reason: string };

export function useIntakeProcessingWatch(
  token: string,
  onTerminal: (outcome: IntakeWatchOutcome) => void,
) {
  const utils = trpc.useUtils();
  const [watching, setWatching] = useState(false);
  // Étape RÉELLE en cours, lue en base (2026-07-30). Le traitement dure ~4 min
  // mesurées : sans elle l'écran ne peut afficher qu'un libellé générique ou —
  // ce qu'il faisait — une progression simulée. `null` = jalon pas encore posé
  // (ou row legacy) → l'appelant retombe sur le libellé générique, jamais sur
  // une étape inventée.
  const [stage, setStage] = useState<string | null>(null);
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;

  useEffect(() => {
    if (!watching) return;
    let cancelled = false;

    const finish = (outcome: IntakeWatchOutcome) => {
      if (cancelled) return;
      setWatching(false);
      onTerminalRef.current(outcome);
    };

    const tick = async () => {
      try {
        const latest = await utils.quickIntake.getByToken.fetch({ token }, { staleTime: 0 });
        if (cancelled || !latest) return;
        setStage((latest as { processingStage?: string | null }).processingStage ?? null);
        if (latest.status === "COMPLETED" || latest.status === "CONVERTED") {
          finish({ status: "COMPLETED" });
        } else if (latest.status === "FAILED") {
          finish({ status: "FAILED", reason: latest.failureReason ?? "internal" });
        } else if (latest.status === "IN_PROGRESS") {
          // Rien ne tourne (la réservation PROCESSING précède toujours l'ack) :
          // la requête de lancement s'est perdue en route — retry honnête.
          finish({ status: "FAILED", reason: "timeout" });
        }
        // PROCESSING → on continue de sonder.
      } catch {
        // Réseau instable — nouvelle tentative au tick suivant.
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [watching, token, utils]);

  return {
    watching,
    /** Jalon réel courant (`started` | `footprint` | `extracted` | `scored` | `narrative`), null si inconnu. */
    stage,
    startWatching: useCallback(() => {
      setStage(null);
      setWatching(true);
    }, []),
  };
}

/**
 * Les jalons dans l'ordre réel d'exécution de `complete()` — sert à afficher
 * une progression HONNÊTE (part mesurée du chemin), jamais une animation
 * calée sur une durée devinée.
 */
export const INTAKE_STAGES = ["started", "footprint", "extracted", "scored", "narrative"] as const;

/** Clé i18n du libellé d'un jalon ; libellé générique si inconnu/absent. */
export function intakeStageKey(stage: string | null): string {
  return stage && (INTAKE_STAGES as readonly string[]).includes(stage)
    ? `intakeProcessing.stage.${stage}`
    : "intakeProcessing.stage.generic";
}

/**
 * Progression en % : position du jalon dans la séquence, PLAFONNÉE à 90 %
 * tant que l'état terminal n'est pas lu — jamais un faux 100 % (même
 * doctrine que le `ScanProgress` du /scorer).
 */
export function intakeStageProgress(stage: string | null): number {
  const i = stage ? (INTAKE_STAGES as readonly string[]).indexOf(stage) : -1;
  if (i < 0) return 5;
  return Math.min(90, Math.round(((i + 1) / INTAKE_STAGES.length) * 100));
}

/** Mappe une failureReason serveur vers sa clé i18n client (défaut : internal). */
export function failureReasonKey(reason: string): string {
  return ["extraction", "llm_unavailable", "internal", "timeout"].includes(reason)
    ? `intakeProcessing.failed.${reason}`
    : "intakeProcessing.failed.internal";
}
