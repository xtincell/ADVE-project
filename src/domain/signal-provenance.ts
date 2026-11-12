/** Inputs to an inference are context, not proof that its prediction occurred. */
export type SignalInputKind = "COLLECTED" | "INFERRED" | "UNSPECIFIED";

export interface SignalInputSnapshot {
  id?: string;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl?: string;
  collectedAt: string;
  kind: SignalInputKind;
}

export interface SignalBrandContextSnapshot {
  sector: string;
  market: string;
  brandIdentity: string;
  positioning: string;
  products: string;
  riskFactors: string;
  countryContext: string;
  brandHealthContext: string;
}

export interface WeakSignalProvenance {
  schema: "weak-signal-provenance-v1";
  producer: "seshat.tarsis.weak-signal-analyzer";
  kind: "INFERRED";
  generatedAt: string;
  /** All supplied inputs; individual hypotheses must not claim these as proof. */
  inputSignals: SignalInputSnapshot[];
  /** Exact bounded and sanitised input text actually submitted to the model. */
  inputText: string;
  brandContext: SignalBrandContextSnapshot;
}

/** A preserved link is never guessed from a title or accepted from model output. */
export function signalSourceUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password ? value : undefined;
  } catch { return undefined; }
}
