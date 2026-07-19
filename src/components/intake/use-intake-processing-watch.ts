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
    startWatching: useCallback(() => setWatching(true), []),
  };
}

/** Mappe une failureReason serveur vers sa clé i18n client (défaut : internal). */
export function failureReasonKey(reason: string): string {
  return ["extraction", "llm_unavailable", "internal", "timeout"].includes(reason)
    ? `intakeProcessing.failed.${reason}`
    : "intakeProcessing.failed.internal";
}
