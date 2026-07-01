/**
 * Intake stream events — emitters canoniques (NEFER session 2026-05-12).
 *
 * Pattern mirror de `oracle-section/stream-events.ts` (Phase 21 F-E / ADR-0072).
 * Wrappers typés autour de `nsp.publish(channel, event)`. **Best-effort** :
 * jamais throw — un échec NSP ne doit pas casser un `complete()` qui a réussi
 * côté DB. Le persistant `QuickIntake.diagnostic` reste la source de vérité ;
 * NSP n'est qu'un aiguillage temps-réel pour l'UI result page.
 *
 * Routing : on publie par `intakeToken` car l'intake est anonyme pré-conversion
 * (pas de userId stable). La page `/intake/[token]/result` subscribe au canal
 * du même token.
 *
 * Les 6 sub-kinds discriminés couvrent :
 *   - intake_started       — complete() démarré
 *   - intake_extracted     — 4 piliers ADVE extraits via LLM + écrits (~10s)
 *   - intake_scored        — composite ADVE /100 calculé (~12s)
 *   - intake_narrative_done — narrative report ADVE+RTIS produit (~50s)
 *   - intake_completed     — brand-level + financial-capacity finalisés (~70s)
 *   - intake_failed        — erreur en cours de route
 *
 * Cf. NEFER.md §3.5 (NSP streaming pour réduire wait perceptual).
 */

import { publish } from "@/server/services/nsp";
import type {
  IntakeStartedEvent,
  IntakeExtractedEvent,
  IntakeScoredEvent,
  IntakeNarrativeDoneEvent,
  IntakeCompletedEvent,
  IntakeFailedEvent,
} from "@/server/services/nsp";

interface BaseEmitArgs {
  /** Channel de subscription côté client. L'intake étant anonyme, on route
   *  par token plutôt que par userId. */
  intakeToken: string;
}

export function emitIntakeStarted(
  args: BaseEmitArgs & Pick<IntakeStartedEvent, "companyName">,
): void {
  bestEffort(() =>
    publish(args.intakeToken, {
      kind: "intake_started",
      intakeToken: args.intakeToken,
      companyName: args.companyName,
      startedAt: new Date().toISOString(),
    }),
  );
}

export function emitIntakeExtracted(
  args: BaseEmitArgs & Pick<IntakeExtractedEvent, "filledPillars" | "durationMs">,
): void {
  bestEffort(() =>
    publish(args.intakeToken, {
      kind: "intake_extracted",
      intakeToken: args.intakeToken,
      filledPillars: args.filledPillars,
      durationMs: args.durationMs,
    }),
  );
}

export function emitIntakeScored(
  args: BaseEmitArgs &
    Pick<IntakeScoredEvent, "compositeScore" | "classification" | "scoresByPillar" | "durationMs">,
): void {
  bestEffort(() =>
    publish(args.intakeToken, {
      kind: "intake_scored",
      intakeToken: args.intakeToken,
      compositeScore: args.compositeScore,
      classification: args.classification,
      scoresByPillar: args.scoresByPillar,
      durationMs: args.durationMs,
    }),
  );
}

export function emitIntakeNarrativeDone(
  args: BaseEmitArgs & Pick<IntakeNarrativeDoneEvent, "hasRtis" | "durationMs">,
): void {
  bestEffort(() =>
    publish(args.intakeToken, {
      kind: "intake_narrative_done",
      intakeToken: args.intakeToken,
      hasRtis: args.hasRtis,
      durationMs: args.durationMs,
    }),
  );
}

export function emitIntakeCompleted(
  args: BaseEmitArgs &
    Pick<
      IntakeCompletedEvent,
      "finalClassification" | "brandLevel" | "strategyId" | "durationMs"
    >,
): void {
  bestEffort(() =>
    publish(args.intakeToken, {
      kind: "intake_completed",
      intakeToken: args.intakeToken,
      finalClassification: args.finalClassification,
      brandLevel: args.brandLevel,
      strategyId: args.strategyId,
      durationMs: args.durationMs,
    }),
  );
}

export function emitIntakeFailed(
  args: BaseEmitArgs & Pick<IntakeFailedEvent, "errorCode" | "errorMessage" | "durationMs">,
): void {
  bestEffort(() =>
    publish(args.intakeToken, {
      kind: "intake_failed",
      intakeToken: args.intakeToken,
      errorCode: args.errorCode,
      errorMessage: args.errorMessage,
      durationMs: args.durationMs,
    }),
  );
}

// ── Internals ────────────────────────────────────────────────────────

function bestEffort(fn: () => void): void {
  try {
    fn();
  } catch (err) {
    if (process.env.DEBUG_INTAKE_STREAM) {
      console.warn(
        `[intake-stream-events] publish failed (silenced):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
