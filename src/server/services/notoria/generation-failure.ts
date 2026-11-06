/** Safe diagnostics shared by the generator and its article receipt. Never
 * serialize provider payloads: they may contain prompts, credentials or URLs. */
const FAILURES = {
  CONTEXT_TOO_LARGE: { phase: "CONTEXT", error: "Un pilier dépasse la capacité du contexte structuré. La génération n’a pas été lancée." },
  CONTEXT_PREPARATION_FAILED: { phase: "CONTEXT", error: "Le contexte de marque n’a pas pu être préparé." },
  MODEL_CALL_FAILED: { phase: "GENERATION", error: "Le moteur de génération n’a pas retourné de réponse exploitable." },
  INVALID_MODEL_OUTPUT: { phase: "OUTPUT", error: "La réponse du moteur ne respecte pas le format des recommandations." },
} as const;
export type NotoriaFailureCode = keyof typeof FAILURES;

export class NotoriaGenerationFailure extends Error {
  constructor(readonly code: NotoriaFailureCode, cause?: unknown) {
    super(FAILURES[code].error, { cause });
    this.name = "NotoriaGenerationFailure";
  }
}

export function describeNotoriaFailure(reason: unknown, pillarKey: string) {
  const message = reason instanceof Error ? reason.message : "";
  const sizeFailure = message.match(/^PILLAR_CONTEXT_TOO_LARGE: ([ADVERTIS]) /i);
  const code: NotoriaFailureCode = sizeFailure ? "CONTEXT_TOO_LARGE"
    : reason instanceof NotoriaGenerationFailure ? reason.code : "CONTEXT_PREPARATION_FAILED";
  return { pillarKey, code, ...FAILURES[code], ...(sizeFailure ? { sourcePillar: sizeFailure[1]!.toUpperCase() } : {}) };
}

/** Only known codes may cross the receipt/client boundary, including legacy
 * generators whose error strings were not qualified. No arbitrary error echo. */
export function safeNotoriaFailure(input: { pillarKey?: string; code?: string; sourcePillar?: string }) {
  const code: NotoriaFailureCode = input.code && Object.hasOwn(FAILURES, input.code)
    ? input.code as NotoriaFailureCode : "MODEL_CALL_FAILED";
  return {
    pillarKey: /^[ADVERTIS]$/i.test(input.pillarKey ?? "") ? input.pillarKey!.toLowerCase() : "unknown",
    code, ...FAILURES[code],
    ...(/^[ADVERTIS]$/i.test(input.sourcePillar ?? "") ? { sourcePillar: input.sourcePillar!.toUpperCase() } : {}),
  };
}
