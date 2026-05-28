/**
 * Phase 23 — Superfan attribution : type backbone (pattern P22-2).
 *
 * **Layer 4** — Services. Imports allowed : `zod` only (this file is type-only ;
 * the Story 4.2 runtime `runAttribution` will add Prisma / domain imports when
 * it lands in the same file).
 *
 * Pattern P22-2 (ADR-0081 §2). The type-level enforcement of the
 * no-magic-fallback invariant (ADR-0046) for the superfan-attribution mechanic :
 * "no measurement" is structurally distinct from "measured zero" — the
 * discriminated union forbids a `null` / `undefined` / silent `0` return on
 * sparse input.
 *
 * # The two states
 *
 * - `OK` — the regression (or the operator-supplied coefficients) produced a
 *   defendable measurement. `score` carries the continuous attribution metric,
 *   `lineage` carries the observed Ambassador → Evangelist transitions that
 *   justify the score, `snapshotRef` points at the `RUN_ATTRIBUTION_CALIBRATION`
 *   `IntentEmission.id` that persists the model snapshot (P22-6).
 *
 * - `INSUFFICIENT_DATA` — the input window holds fewer than
 *   `minSamplesRequired` transitions ; the model cannot produce a defendable
 *   score. The branch carries the explicit `minSamplesRequired` /
 *   `samplesAvailable` so the operator UI can render an honest "10 of 30
 *   transitions observed ; need 20 more" empty state (UX-DR10) without
 *   substituting a fabricated zero.
 *
 * **Neither `null` nor `undefined` is a permitted return.** The type-only test
 * at [tests/unit/services/campaign-tracker/superfan-attribution.types.test.ts]
 * asserts this structurally. Story 4.8 will activate the HARD anti-drift test
 * `phase22-no-silent-zero.test.ts` for this file's scope (covering
 * `superfan-attribution.ts` + `superfan-economy.ts`).
 *
 * # Devotion ladder divergence (deliberate per ADR-0081 §2)
 *
 * The canonical 6-rung Devotion Ladder lives at [src/domain/devotion-ladder.ts]
 * and uses French uppercase identifiers :
 *
 *     SPECTATEUR < INTERESSE < PARTICIPANT < ENGAGE < AMBASSADEUR < EVANGELISTE
 *
 * The Phase 23 attribution-layer transitions deliberately use a 4-rung English
 * subset (ADR-0081 §2 spec verbatim) :
 *
 *     Curious < Convinced < Ambassador < Evangelist
 *
 * Why two alphabets : the canonical ladder is a general devotion classification
 * (used by `cultIndex`, `pillarE`, `devotion-pyramid`, etc.) ; the attribution
 * alphabet tracks **the transitions that produce measurable superfan
 * accumulation** (the regression input). Mapping between the two — when the
 * regression sources data from the canonical 6-rung — is Story 4.2 scope, not
 * Story 4.1.
 *
 * # Coexistence with legacy `SuperfanAttributionResult` (Phase 19 Cluster C)
 *
 * The Phase 19 heuristic `SuperfanAttributionResult` lives at
 * [src/server/services/campaign-tracker/types.ts:201] and is consumed by
 * `recomputeSuperfanAttribution` in `superfan-economy.ts`. The two shapes
 * intentionally coexist on `main` :
 *
 *   - `SuperfanAttributionResult` — Phase 19 LTV heuristic, French rungs,
 *     populated `byAction` breakdown, `degradationCodes` array.
 *   - `AttributionResult` (this file) — Phase 23 calibration, English rungs,
 *     discriminated `INSUFFICIENT_DATA` branch, `snapshotRef` for IntentEmission
 *     reproducibility (P22-6).
 *
 * Story 4.3 extends the Phase 19 path with `ConnectorResult<T>` consumption ;
 * Story 4.5 + Epic 6 Story 6.1 wire the Phase 23 path through `runAttribution`
 * (added in Story 4.2 — see TODO at end of file). Unification deferred
 * post-Phase 23.
 *
 * # Example consumer pattern (P22-2 canonical)
 *
 *     const result = await runAttribution({ campaignIds: ["camp-123"] });
 *     switch (result.state) {
 *       case "OK":
 *         return renderScore(result.score, result.lineage, result.snapshotRef);
 *       case "INSUFFICIENT_DATA":
 *         return renderEmptyState({
 *           cause: `${result.samplesAvailable} of ${result.minSamplesRequired} transitions observed`,
 *           unlock: "Need more devotion transitions in window",
 *         });
 *     }
 *
 * # Anti-pattern (banned by HARD test in Story 4.8)
 *
 *     const result = await runAttribution({ campaignIds: ["camp-123"] });
 *     const score = result.score ?? 0;          // ← silent zero on sparse input
 *     return renderScore(score);                 // ← fabricated downstream
 *
 * The discriminated union forbids `result.score` access without state
 * narrowing — the anti-pattern fails `tsc` (`Property 'score' does not exist on
 * type '{ state: "INSUFFICIENT_DATA"; ... }'`).
 *
 * Cf. ADR-0081 (calibration methodology), ADR-0046 (no-magic-fallback root),
 * ADR-0002 (Layer 4 boundary), Story 1.3 (`ConnectorResult<T>` precedent).
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────
// Section 1 — Devotion-ladder transition alphabet (ADR-0081 §2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * The 3 rungs from which an evangelist-producing transition may start.
 * Strict subset of the attribution alphabet — `Evangelist` is the terminal
 * rung and cannot appear as `transitionFrom`.
 */
export const EVANGELIST_TRANSITION_FROM_RUNGS = ["Curious", "Convinced", "Ambassador"] as const;

/**
 * The 2 rungs an evangelist-producing transition may end at — `Ambassador`
 * (mid-ladder progression) or `Evangelist` (terminal apex).
 */
export const EVANGELIST_TRANSITION_TO_RUNGS = ["Ambassador", "Evangelist"] as const;

export type EvangelistTransitionFromRung = (typeof EVANGELIST_TRANSITION_FROM_RUNGS)[number];
export type EvangelistTransitionToRung = (typeof EVANGELIST_TRANSITION_TO_RUNGS)[number];

/**
 * A single observed Ambassador-or-Evangelist-producing transition attributed
 * to a `Campaign`. Populated by Story 4.4 from the observed devotion ladder
 * movements in the regression input window.
 *
 * Fields are `readonly` (consistent with the surrounding `types.ts` campaign-
 * tracker DTO convention — line 18 onward).
 */
export type EvangelistTransition = {
  readonly campaignId: string;
  readonly transitionFrom: EvangelistTransitionFromRung;
  readonly transitionTo: EvangelistTransitionToRung;
  /** ISO 8601 timestamp when the transition was observed. */
  readonly observedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Section 2 — `AttributionResult` discriminated union (pattern P22-2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * ADR-0081 §2 default : `minSamplesRequired = 30` transitions. Sub-30 returns
 * `INSUFFICIENT_DATA`. Exposed as a literal `30` (via `as const`) so downstream
 * consumers see the exact value at the type level.
 *
 * Story 4.2 will consume this default in `runAttribution` ; Story 4.5 may
 * override it per operator coefficient mode.
 */
export const MIN_SAMPLES_REQUIRED_DEFAULT = 30 as const;

/**
 * The canonical attribution-measurement result. **Every** Phase 23 consumer
 * of attribution output returns this shape — `runAttribution` (Story 4.2),
 * the `RUN_ATTRIBUTION_CALIBRATION` handler (Epic 6 Story 6.1), the manual
 * coefficient mode (Story 4.5), the Console operator view (Story 4.6), and the
 * Cockpit lineage view (Story 4.7).
 *
 * By construction, the `score` / `lineage` / `snapshotRef` fields are
 * **forbidden** on the `INSUFFICIENT_DATA` arm — the type system rejects
 * accessing them without a state check.
 */
export type AttributionResult =
  | {
      readonly state: "OK";
      /** Continuous attribution metric. Interpretation per ADR-0081. */
      readonly score: number;
      /** Observed transitions that justify the score (Story 4.4 populates). */
      readonly lineage: readonly EvangelistTransition[];
      /**
       * Hash-chained reference to the `RUN_ATTRIBUTION_CALIBRATION`
       * `IntentEmission.id` that persists the model snapshot (P22-6). Epic 6
       * Story 6.1 emits ; this story declares the contract.
       */
      readonly snapshotRef: string;
    }
  | {
      readonly state: "INSUFFICIENT_DATA";
      /** Threshold the regression requires (default `MIN_SAMPLES_REQUIRED_DEFAULT = 30`). */
      readonly minSamplesRequired: number;
      /** How many transitions the input window actually carries. */
      readonly samplesAvailable: number;
    };

// ─────────────────────────────────────────────────────────────────────────
// Section 3 — Type guards (narrow the union for downstream consumers)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Type guard : `result.state === "OK"`. Narrows the union so callers can
 * access `result.score` / `result.lineage` / `result.snapshotRef` without a
 * `case`-statement.
 */
export function isAttributionOk(
  result: AttributionResult,
): result is Extract<AttributionResult, { state: "OK" }> {
  return result.state === "OK";
}

/**
 * Type guard : `result.state === "INSUFFICIENT_DATA"`. Narrows the union so
 * callers can access `result.minSamplesRequired` / `result.samplesAvailable`
 * without a `case`-statement.
 */
export function isAttributionInsufficient(
  result: AttributionResult,
): result is Extract<AttributionResult, { state: "INSUFFICIENT_DATA" }> {
  return result.state === "INSUFFICIENT_DATA";
}

// ─────────────────────────────────────────────────────────────────────────
// Section 4 — Zod schemas (boundary validation)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Runtime validator for `EvangelistTransition`. Used at tRPC procedure
 * boundaries (Story 4.6 / 4.7) and at `IntentEmission` payload validation
 * (Epic 6 Story 6.1).
 */
export const evangelistTransitionSchema = z.object({
  campaignId: z.string().min(1),
  transitionFrom: z.enum(EVANGELIST_TRANSITION_FROM_RUNGS),
  transitionTo: z.enum(EVANGELIST_TRANSITION_TO_RUNGS),
  observedAt: z.string().min(1),
});

/**
 * Runtime validator for `AttributionResult`. Mirrors the type union exactly —
 * no extra fields, no loose typing.
 *
 * Used at tRPC procedure return-shape validation (Story 4.6 / 4.7) and at
 * `IntentEmission` payload persistence (Epic 6 Story 6.1).
 */
export const attributionResultSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("OK"),
    score: z.number(),
    lineage: z.array(evangelistTransitionSchema).readonly(),
    snapshotRef: z.string().min(1),
  }),
  z.object({
    state: z.literal("INSUFFICIENT_DATA"),
    minSamplesRequired: z.number().int().nonnegative(),
    samplesAvailable: z.number().int().nonnegative(),
  }),
]);

// ─────────────────────────────────────────────────────────────────────────
// Section 5 — Pure-TS logistic regression + ROC AUC + RMSE (ADR-0081 §1)
// ─────────────────────────────────────────────────────────────────────────
//
// Per ADR-0081 §1 : pure TS, **no new npm dep**. Total stats footprint
// targets ~70-100 LOC across regression + ROC AUC + RMSE. Story 4.2 ships
// the runtime ; Story 4.4 will populate `lineage` from observed transitions ;
// Story 4.5 + Epic 6 Story 6.1 wire the operator-coefficient + IntentEmission-
// snapshot paths through the same `runAttribution` entry point.

/**
 * The feature keys consumed by the logistic regression — declared as a
 * canonical `as const` array so the operator-coefficient `Record<string,
 * number>` (Story 4.5) and the Console manual form (Epic 6 Story 6.5) share
 * a single source of truth for the coefficient names.
 *
 * Feature interpretation (3 dims) :
 *   - `intercept`           — always 1 (logistic-regression bias term)
 *   - `bigIdeaCoherence`    — `CampaignAction.bigIdeaCoherenceScore` (0..1)
 *                             ; default 0.5 if null (centered prior)
 *   - `normalizedBudget`    — `CampaignAction.budget / 1_000_000`, clipped
 *                             to [0, 1] (FCFA budgets above 1M land in the
 *                             saturated region) ; default 0 if null
 *
 * The 3-feature envelope is deliberate per ADR-0081 §1 ("~70-100 LOC") —
 * adding more features without an ADR-followup invites over-fitting on the
 * small samples typical of MVP campaigns.
 */
export const ATTRIBUTION_FEATURE_KEYS = [
  "intercept",
  "bigIdeaCoherence",
  "normalizedBudget",
] as const;

export type AttributionFeatureKey = (typeof ATTRIBUTION_FEATURE_KEYS)[number];

/**
 * The decoupled-from-Prisma input shape for the pure scoring path. The IO
 * function `runAttribution` materialises this from `CampaignAction` rows ; the
 * pure helper `scoreFromActions` consumes it directly, which is what the
 * unit tests target.
 */
export type AttributionInputAction = {
  readonly campaignActionId: string;
  readonly campaignId: string;
  readonly bigIdeaCoherenceScore: number | null;
  readonly budget: number | null;
  readonly devotionTransitionsObserved: unknown;
  /**
   * ISO 8601 observation time for the action's transitions. Sourced from
   * `CampaignAction.updatedAt` by `runAttribution`. Used by `extractLineage`
   * (Story 4.4) to stamp each `EvangelistTransition.observedAt`. Optional —
   * Story 4.2 callers that only exercise the regression don't need it ; when
   * absent, `extractLineage` falls back to a single per-call timestamp.
   */
  readonly observedAt?: string;
};

/**
 * Sigmoid σ(x) = 1 / (1 + exp(-x)). Clipped at ±50 to avoid `exp` overflow
 * on extreme inputs (the gradient is effectively zero outside ±15 anyway).
 */
export function sigmoid(x: number): number {
  if (x >= 50) return 1;
  if (x <= -50) return 0;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Extract the feature vector from an action. The dimensions correspond to
 * `ATTRIBUTION_FEATURE_KEYS` in order.
 */
export function extractFeatures(action: AttributionInputAction): number[] {
  const bigIdea = action.bigIdeaCoherenceScore ?? 0.5;
  const rawBudget = action.budget ?? 0;
  const normalizedBudget = Math.min(1, Math.max(0, rawBudget / 1_000_000));
  return [1, bigIdea, normalizedBudget];
}

/**
 * Extract the binary label : 1 if the action's `devotionTransitionsObserved`
 * contains at least one transition where `to === "EVANGELISTE"` (canonical
 * French rung — the source-of-truth ladder in `domain/devotion-ladder.ts`).
 * Otherwise 0.
 *
 * The mapping French canonical (`EVANGELISTE`) → English attribution
 * alphabet (`Evangelist`) is implicit here ; Story 4.4 will surface the
 * Ambassador / Evangelist transitions in the `lineage` field via an explicit
 * rung mapper. For Story 4.2 the binary label is sufficient.
 */
export function extractLabel(action: AttributionInputAction): number {
  const raw = action.devotionTransitionsObserved;
  if (!Array.isArray(raw)) return 0;
  for (const t of raw) {
    if (typeof t !== "object" || t === null) continue;
    const to = (t as Record<string, unknown>).to;
    if (to === "EVANGELISTE" || to === "Evangelist") return 1;
  }
  return 0;
}

/**
 * The signal sample count : how many actions in the input window carry
 * **either** a populated `bigIdeaCoherenceScore` **or** a non-empty
 * `devotionTransitionsObserved`. An action with all-null signals is not a
 * "sample" for regression purposes — it carries no information.
 */
export function countSamplesAvailable(actions: readonly AttributionInputAction[]): number {
  let count = 0;
  for (const a of actions) {
    if (a.bigIdeaCoherenceScore !== null) {
      count += 1;
      continue;
    }
    if (Array.isArray(a.devotionTransitionsObserved) && a.devotionTransitionsObserved.length > 0) {
      count += 1;
    }
  }
  return count;
}

/**
 * Fits a logistic regression `P(y=1 | x) = σ(β · x)` by simple batch gradient
 * descent on cross-entropy loss.
 *
 * @param X      Feature matrix : `[n samples][d features]`.
 * @param y      Binary labels : `[n samples]` of 0 or 1.
 * @param opts   `learningRate` (default 0.1), `iterations` (default 500).
 *
 * @returns The fitted coefficients `[d features]`. Length matches `X[0].length`.
 *
 * The optimiser is deliberately simple (no momentum, no regularisation, no
 * line-search) — ADR-0081 §1 envelope. If convergence proves insufficient
 * in production, ADR-followup may add L2 or Adam.
 */
export function fitLogisticRegression(
  X: readonly (readonly number[])[],
  y: readonly number[],
  opts: { learningRate?: number; iterations?: number } = {},
): number[] {
  const n = X.length;
  if (n === 0) return [];
  const d = X[0]!.length;
  const lr = opts.learningRate ?? 0.1;
  const iter = opts.iterations ?? 500;
  const beta = new Array<number>(d).fill(0);
  for (let it = 0; it < iter; it += 1) {
    const grad = new Array<number>(d).fill(0);
    for (let i = 0; i < n; i += 1) {
      const xi = X[i]!;
      let z = 0;
      for (let j = 0; j < d; j += 1) z += beta[j]! * xi[j]!;
      const pred = sigmoid(z);
      const err = pred - y[i]!;
      for (let j = 0; j < d; j += 1) grad[j]! += err * xi[j]!;
    }
    for (let j = 0; j < d; j += 1) beta[j]! -= (lr * grad[j]!) / n;
  }
  return beta;
}

/**
 * ROC AUC via the Mann-Whitney U statistic — equivalent to the trapezoidal
 * integration of the TPR-vs-FPR curve, but computable in O(n log n) without
 * iterating thresholds. Robust to score ties (averaged ranks).
 *
 * Returns `0.5` (uninformative baseline) when either class is absent — there
 * is no "perfect" or "inverted" classifier without two classes to separate.
 */
export function computeRocAuc(predicted: readonly number[], observed: readonly number[]): number {
  const n = predicted.length;
  if (n === 0 || observed.length !== n) return 0.5;
  const pos = observed.filter((y) => y === 1).length;
  const neg = n - pos;
  if (pos === 0 || neg === 0) return 0.5;
  // Sort by predicted score ascending, then assign average ranks.
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => predicted[a]! - predicted[b]!);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && predicted[idx[j + 1]!]! === predicted[idx[i]!]!) j += 1;
    const avgRank = (i + j) / 2 + 1; // ranks are 1-indexed
    for (let k = i; k <= j; k += 1) ranks[idx[k]!] = avgRank;
    i = j + 1;
  }
  let rankSumPos = 0;
  for (let k = 0; k < n; k += 1) if (observed[k] === 1) rankSumPos += ranks[k]!;
  // AUC = (Σ ranks of positives − pos·(pos+1)/2) / (pos · neg)
  return (rankSumPos - (pos * (pos + 1)) / 2) / (pos * neg);
}

/**
 * RMSE between predicted probabilities and observed 0/1 labels.
 */
export function computeRmse(predicted: readonly number[], observed: readonly number[]): number {
  const n = predicted.length;
  if (n === 0 || observed.length !== n) return 0;
  let sumSq = 0;
  for (let i = 0; i < n; i += 1) {
    const err = predicted[i]! - observed[i]!;
    sumSq += err * err;
  }
  return Math.sqrt(sumSq / n);
}

// ─────────────────────────────────────────────────────────────────────────
// Section 5b — Lineage extraction (Story 4.4) — devotion-ladder → EvangelistTransition
// ─────────────────────────────────────────────────────────────────────────
//
// The repo carries several devotion-rung vocabularies (the canonical 6-rung
// French `SPECTATEUR…EVANGELISTE` in domain/devotion-ladder.ts ; the legacy
// 5-rung `APPRENTI|PRATIQUANT|INITIE|FIDELE|EVANGELISTE` referenced on
// `CampaignAction.devotionRungTargeted` ; the Phase 19 `superfan-economy.ts`
// `INITIE|FIDELE|EVANGELISTE`). `CampaignAction.devotionTransitionsObserved`
// stores free-form `{ from, to, count }` records keyed by any of these.
//
// `extractLineage` is the tolerant mapper from those vocabularies onto the
// Phase 23 4-rung English attribution alphabet (ADR-0081 §2). It only emits
// transitions that END at `Ambassador` or `Evangelist` — i.e. the
// superfan-producing transitions the lineage is meant to evidence. A
// transition ending at a lower rung (e.g. INITIE → FIDELE) is dropped : it is
// real engagement but not an Ambassador/Evangelist event.

/** Tolerant alias map → `EvangelistTransitionToRung` (the 2 superfan-producing targets). */
function normalizeToRung(raw: string): EvangelistTransitionToRung | null {
  switch (raw.trim().toUpperCase()) {
    case "EVANGELISTE":
    case "EVANGELIST":
    case "ÉVANGÉLISTE":
      return "Evangelist";
    case "AMBASSADEUR":
    case "AMBASSADOR":
      return "Ambassador";
    default:
      return null;
  }
}

/** Tolerant alias map → `EvangelistTransitionFromRung` (the 3 valid origins). */
function normalizeFromRung(raw: string): EvangelistTransitionFromRung | null {
  switch (raw.trim().toUpperCase()) {
    case "AMBASSADEUR":
    case "AMBASSADOR":
      return "Ambassador";
    case "ENGAGE":
    case "ENGAGÉ":
    case "FIDELE":
    case "FIDÈLE":
    case "PARTICIPANT":
    case "PRATIQUANT":
    case "CONVINCED":
      return "Convinced";
    case "SPECTATEUR":
    case "INTERESSE":
    case "INTÉRESSÉ":
    case "INITIE":
    case "INITIÉ":
    case "APPRENTI":
    case "CURIOUS":
      return "Curious";
    // EVANGELISTE is terminal — cannot be a `transitionFrom`.
    default:
      return null;
  }
}

const ATTRIBUTION_RUNG_ORDER: Readonly<Record<string, number>> = {
  Curious: 0,
  Convinced: 1,
  Ambassador: 2,
  Evangelist: 3,
};

/**
 * Extracts the `EvangelistTransition[]` lineage from a set of actions
 * (Story 4.4). For each action's `devotionTransitionsObserved` record, maps
 * the `{ from, to, count }` triple onto the attribution alphabet and expands
 * by `count` so `lineage.filter(t => t.transitionTo === "Evangelist").length`
 * equals the observed evangelist count (AC #2).
 *
 * Inclusion rule : both `from` and `to` must normalize to valid attribution
 * rungs, `to` must be `Ambassador` or `Evangelist`, and the transition must
 * be **monotonic upward** (from-position < to-position) — a downward or
 * lateral record is malformed telemetry and dropped.
 *
 * `observedAt` is stamped from `action.observedAt` ; absent actions fall back
 * to a single per-call timestamp (`fallbackObservedAt`) so the function stays
 * deterministic per invocation.
 */
export function extractLineage(
  actions: readonly AttributionInputAction[],
  fallbackObservedAt: string,
): EvangelistTransition[] {
  const lineage: EvangelistTransition[] = [];
  for (const action of actions) {
    const raw = action.devotionTransitionsObserved;
    if (!Array.isArray(raw)) continue;
    const observedAt = action.observedAt ?? fallbackObservedAt;
    for (const t of raw) {
      if (typeof t !== "object" || t === null) continue;
      const obj = t as Record<string, unknown>;
      if (typeof obj.from !== "string" || typeof obj.to !== "string") continue;
      const count = typeof obj.count === "number" && obj.count > 0 ? Math.floor(obj.count) : 0;
      if (count === 0) continue;
      const transitionFrom = normalizeFromRung(obj.from);
      const transitionTo = normalizeToRung(obj.to);
      if (transitionFrom === null || transitionTo === null) continue;
      if (ATTRIBUTION_RUNG_ORDER[transitionFrom]! >= ATTRIBUTION_RUNG_ORDER[transitionTo]!) continue;
      for (let i = 0; i < count; i += 1) {
        lineage.push({
          campaignId: action.campaignId,
          transitionFrom,
          transitionTo,
          observedAt,
        });
      }
    }
  }
  return lineage;
}

/**
 * Internal evaluation payload carried alongside the `OK` result. Stored on
 * the `RUN_ATTRIBUTION_CALIBRATION` `IntentEmission.payload` by the Epic 6
 * Story 6.1 handler so the Console `CalibrationReviewPanel` (Epic 6 Story 6.4)
 * can surface the ROC AUC / RMSE values against declared thresholds.
 *
 * Not part of `AttributionResult` itself — the calibration handler wraps it.
 */
export type AttributionEvaluation = {
  readonly coefficients: Readonly<Record<AttributionFeatureKey, number>>;
  readonly rocAuc: number;
  readonly rmse: number;
  readonly sampleSize: number;
  readonly mode: "ALGORITHMIC" | "MANUAL_COEFFICIENTS";
};

/**
 * Pure scoring function — decoupled from Prisma. Consumes the materialised
 * `AttributionInputAction[]` and returns the discriminated `AttributionResult`
 * + the internal `AttributionEvaluation` for the calibration handler.
 *
 * Story 4.2 ships this as the regression core. Story 4.4 will enrich the
 * `lineage` field of `OK` results ; for now `lineage: []`. Story 4.5 +
 * Epic 6 Story 6.1 wire the manual-coefficient mode + IntentEmission-snapshot
 * persistence through this same function (the `coefficients` / `snapshotRef`
 * inputs already support the manual-first peer path).
 */
export function scoreFromActions(
  actions: readonly AttributionInputAction[],
  opts: {
    coefficients?: Record<string, number>;
    snapshotRef: string;
    minSamplesRequired?: number;
    /**
     * Timestamp stamped on lineage entries whose action carries no
     * `observedAt`. Passed by `runAttribution` (= now) ; defaults to a
     * single per-call `new Date()` when absent so unit tests can omit it.
     */
    observedAtFallback?: string;
  },
): { result: AttributionResult; evaluation: AttributionEvaluation | null } {
  const minSamplesRequired = opts.minSamplesRequired ?? MIN_SAMPLES_REQUIRED_DEFAULT;
  const samplesAvailable = countSamplesAvailable(actions);
  if (samplesAvailable < minSamplesRequired) {
    return {
      result: { state: "INSUFFICIENT_DATA", minSamplesRequired, samplesAvailable },
      evaluation: null,
    };
  }
  const X = actions.map((a) => extractFeatures(a));
  const y = actions.map((a) => extractLabel(a));
  let beta: number[];
  let mode: "ALGORITHMIC" | "MANUAL_COEFFICIENTS";
  if (opts.coefficients) {
    beta = ATTRIBUTION_FEATURE_KEYS.map((k) => opts.coefficients![k] ?? 0);
    mode = "MANUAL_COEFFICIENTS";
  } else {
    beta = fitLogisticRegression(X, y);
    mode = "ALGORITHMIC";
  }
  const predicted = X.map((xi) => sigmoid(xi.reduce((acc, v, j) => acc + v * beta[j]!, 0)));
  const rocAuc = computeRocAuc(predicted, y);
  const rmse = computeRmse(predicted, y);
  // Aggregate score = mean predicted probability across actions ("what
  // fraction of actions does the model predict produced an Evangelist?").
  const score = predicted.reduce((acc, p) => acc + p, 0) / predicted.length;
  const coefficients = Object.fromEntries(
    ATTRIBUTION_FEATURE_KEYS.map((k, j) => [k, beta[j]!]),
  ) as Record<AttributionFeatureKey, number>;
  // Story 4.4 : populate lineage from observed devotion transitions. The
  // fallback timestamp is used only for actions missing `observedAt` ; it is
  // captured once per call so the function stays deterministic per invocation.
  const fallbackObservedAt = opts.observedAtFallback ?? new Date().toISOString();
  const lineage = extractLineage(actions, fallbackObservedAt);
  return {
    result: {
      state: "OK",
      score,
      lineage,
      snapshotRef: opts.snapshotRef,
    },
    evaluation: { coefficients, rocAuc, rmse, sampleSize: actions.length, mode },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Section 6 — `runAttribution` (IO ; queries Prisma)
// ─────────────────────────────────────────────────────────────────────────

/**
 * The Phase 23 superfan-attribution entry point. Reads the input
 * `CampaignAction` rows, runs the pure scoring path, returns the
 * `AttributionResult`.
 *
 * The returned `snapshotRef` is a transient UUID — Epic 6 Story 6.1
 * `RUN_ATTRIBUTION_CALIBRATION` handler will wrap this call and persist
 * the canonical IntentEmission-backed snapshot (P22-6, ADR-0081 §3).
 * Standalone callers can use the result for ad-hoc audit but should not
 * cite the transient `snapshotRef` to clients.
 *
 * The returned `lineage` is `[]` after Story 4.2 ; Story 4.4 will populate
 * it from `devotionTransitionsObserved`.
 */
export async function runAttribution(input: {
  campaignIds: string[];
  coefficients?: Record<string, number>;
}): Promise<AttributionResult> {
  if (input.campaignIds.length === 0) {
    return { state: "INSUFFICIENT_DATA", minSamplesRequired: MIN_SAMPLES_REQUIRED_DEFAULT, samplesAvailable: 0 };
  }
  const { db } = await import("@/lib/db");
  const rows = await db.campaignAction.findMany({
    where: { campaignId: { in: input.campaignIds } },
    select: {
      id: true,
      campaignId: true,
      bigIdeaCoherenceScore: true,
      budget: true,
      devotionTransitionsObserved: true,
      updatedAt: true,
    },
  });
  const actions: AttributionInputAction[] = rows.map((r) => ({
    campaignActionId: r.id,
    campaignId: r.campaignId,
    bigIdeaCoherenceScore: r.bigIdeaCoherenceScore,
    budget: r.budget,
    devotionTransitionsObserved: r.devotionTransitionsObserved,
    observedAt: r.updatedAt.toISOString(),
  }));
  const snapshotRef = generateTransientSnapshotRef();
  const { result } = scoreFromActions(actions, {
    coefficients: input.coefficients,
    snapshotRef,
    observedAtFallback: new Date().toISOString(),
  });
  return result;
}

/**
 * Generates a transient `snapshotRef` for standalone `runAttribution` calls.
 * Epic 6 Story 6.1 calibration handler overrides with the canonical
 * `IntentEmission.id` of the `RUN_ATTRIBUTION_CALIBRATION` emission.
 */
function generateTransientSnapshotRef(): string {
  // `globalThis.crypto.randomUUID` is available in Node ≥ 19 (the project's
  // runtime envelope). Wrapped to be explicit about the transient nature.
  return `transient-${globalThis.crypto.randomUUID()}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Section 7 — Manual coefficient-entry mode (Story 4.5 — FR25 peer to FR6)
// ─────────────────────────────────────────────────────────────────────────
//
// Manual-first parity (ADR-0060) : operator judgement is an equal-status path
// to the gradient-descent fit. The operator enters coefficients directly ;
// `scoreFromActions`/`runAttribution` skip the descent and use them as-is
// (already supported since Story 4.2 via the `coefficients` opt). This section
// adds (a) the canonical Zod schema the Epic 6 Story 6.5 UI form derives from —
// it EQUALS the runtime `coefficients` shape, not a parallel schema ; and
// (b) the persistence helpers that store coefficients on the brand
// (`Campaign.attributionCoefficients`, Story 1.6 additive field).
//
// Downstream readers cannot distinguish "ran the regression and got these"
// from "operator entered these" except via the `IntentEmission.payload.source`
// discriminator (Epic 6 Story 6.1) / the `AttributionEvaluation.mode` field
// (`"ALGORITHMIC" | "MANUAL_COEFFICIENTS"`). The `AttributionResult.OK` shape
// is identical for both paths — that identity IS the parity.

/**
 * Canonical Zod validator for operator-entered attribution coefficients.
 *
 * **Equals the runtime `coefficients` shape — not a parallel schema** (FR25 /
 * ADR-0060). The runtime (`scoreFromActions`) consumes
 * `coefficients[k] ?? 0` for each `k` in `ATTRIBUTION_FEATURE_KEYS`, so a
 * partial record keyed by the feature alphabet IS the shape. Missing keys
 * default to 0 at the runtime — the schema therefore allows partial entry.
 *
 * The Epic 6 Story 6.5 Console manual-coefficient form derives its fields
 * from `ATTRIBUTION_FEATURE_KEYS` + validates submissions with this schema —
 * one source of truth, no schema duplication.
 */
const ATTRIBUTION_FEATURE_KEY_SET: ReadonlySet<string> = new Set(ATTRIBUTION_FEATURE_KEYS);

export const attributionCoefficientsSchema = z
  .record(z.string(), z.number().finite())
  .refine((rec) => Object.keys(rec).every((k) => ATTRIBUTION_FEATURE_KEY_SET.has(k)), {
    message: "coefficient keys must be a subset of ATTRIBUTION_FEATURE_KEYS",
  });

export type AttributionCoefficients = z.infer<typeof attributionCoefficientsSchema>;

/**
 * Discriminated result for `persistAttributionCoefficients` — keeps the
 * consumer boundary throw-free (consistent with the Story 4.3 façade pattern).
 */
export type PersistCoefficientsResult =
  | { readonly state: "OK"; readonly campaignId: string; readonly coefficients: AttributionCoefficients }
  | { readonly state: "REJECTED"; readonly reason: "CAMPAIGN_NOT_FOUND" | "TENANT_MISMATCH" | "INVALID_COEFFICIENTS" };

/**
 * Persist operator-entered coefficients onto `Campaign.attributionCoefficients`
 * (Story 1.6 additive field). Validates with `attributionCoefficientsSchema`
 * first ; tenant-guards via `strategyId`. Returns a discriminated result —
 * never throws across the boundary.
 *
 * The Epic 6 Story 6.5 form + the `RUN_ATTRIBUTION_CALIBRATION` handler
 * (mode `MANUAL_COEFFICIENTS`) call this to store the operator's judgement
 * on the brand before invoking `runAttribution` with the same coefficients.
 */
export async function persistAttributionCoefficients(input: {
  strategyId: string;
  campaignId: string;
  coefficients: Record<string, number>;
}): Promise<PersistCoefficientsResult> {
  const parsed = attributionCoefficientsSchema.safeParse(input.coefficients);
  if (!parsed.success) {
    return { state: "REJECTED", reason: "INVALID_COEFFICIENTS" };
  }
  const { db } = await import("@/lib/db");
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, strategyId: true },
  });
  if (!campaign) return { state: "REJECTED", reason: "CAMPAIGN_NOT_FOUND" };
  if (campaign.strategyId !== input.strategyId) {
    return { state: "REJECTED", reason: "TENANT_MISMATCH" };
  }
  await db.campaign.update({
    where: { id: input.campaignId },
    data: { attributionCoefficients: parsed.data },
  });
  return { state: "OK", campaignId: input.campaignId, coefficients: parsed.data };
}

/**
 * Load previously-persisted operator coefficients from
 * `Campaign.attributionCoefficients`. Returns `null` when none are stored or
 * the stored value fails validation (defensive — a malformed JSON blob must
 * not silently feed garbage into the regression). The Epic 6 calibration
 * handler uses this to pre-fill the manual-coefficient form + to re-run a
 * brand's last-accepted manual calibration.
 */
export async function loadAttributionCoefficients(
  campaignId: string,
): Promise<AttributionCoefficients | null> {
  const { db } = await import("@/lib/db");
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { attributionCoefficients: true },
  });
  const raw = campaign?.attributionCoefficients;
  if (raw === null || raw === undefined) return null;
  const parsed = attributionCoefficientsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Section 8 — Tenant-scoped lineage view resolver (Story 4.6 / 4.7)
// ─────────────────────────────────────────────────────────────────────────
//
// The single read entry-point consumed by both the Console operator view
// (Story 4.6, `getAttributionLineage` tRPC query) and the Cockpit founder
// view (Story 4.7, `getFounderAttributionLineage` — same service function
// behind a paid-tier gate). It tenant-guards the campaign against the calling
// strategy BEFORE running attribution, then returns a discriminated view DTO.
//
// Throw-free at the boundary (Phase 23 P22-1/P22-2 convention) : a campaign
// that does not belong to the strategy returns a `TENANT_MISMATCH` arm rather
// than throwing — the UI renders an honest "not your campaign" state without
// a 500. The `evangelistCount` is derived from `lineage` (no `?? 0` fold —
// `.filter().length` is exact ; the empty lineage yields 0 *measured*, never a
// fabricated zero, because the `INSUFFICIENT_DATA` arm structurally precedes it).

/**
 * The view DTO returned to the tRPC layer. Carries `campaignId` so the UI can
 * label the panel, and on the `OK` arm a pre-computed `evangelistCount`
 * (= `lineage.filter(t => t.transitionTo === "Evangelist").length`, FR8) so the
 * client renders the KPI without re-deriving it.
 *
 * The `score` / `snapshotRef` are surfaced for the operator (Console, Story
 * 4.6) who must be able to defend the number ; the founder view (Story 4.7)
 * deliberately renders only the lineage + count, not the raw regression score.
 */
export type AttributionLineageView =
  | {
      readonly state: "OK";
      readonly campaignId: string;
      readonly score: number;
      readonly evangelistCount: number;
      readonly lineage: readonly EvangelistTransition[];
      readonly snapshotRef: string;
    }
  | {
      readonly state: "INSUFFICIENT_DATA";
      readonly campaignId: string;
      readonly minSamplesRequired: number;
      readonly samplesAvailable: number;
    }
  | { readonly state: "TENANT_MISMATCH"; readonly campaignId: string };

/**
 * Resolve the attribution lineage for one campaign, tenant-scoped to
 * `strategyId`. The campaign must belong to the strategy — otherwise
 * `TENANT_MISMATCH` (no leak of cross-tenant attribution).
 *
 * Delegates the measurement to `runAttribution` (Story 4.2) once ownership is
 * verified ; the by-`campaignId` query inside `runAttribution` is safe because
 * we have already proven the campaign belongs to the caller's strategy.
 */
export async function getAttributionLineage(input: {
  strategyId: string;
  campaignId: string;
}): Promise<AttributionLineageView> {
  const { db } = await import("@/lib/db");
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, strategyId: true },
  });
  if (!campaign || campaign.strategyId !== input.strategyId) {
    return { state: "TENANT_MISMATCH", campaignId: input.campaignId };
  }
  const result = await runAttribution({ campaignIds: [input.campaignId] });
  if (result.state === "INSUFFICIENT_DATA") {
    return {
      state: "INSUFFICIENT_DATA",
      campaignId: input.campaignId,
      minSamplesRequired: result.minSamplesRequired,
      samplesAvailable: result.samplesAvailable,
    };
  }
  const evangelistCount = result.lineage.filter((t) => t.transitionTo === "Evangelist").length;
  return {
    state: "OK",
    campaignId: input.campaignId,
    score: result.score,
    evangelistCount,
    lineage: result.lineage,
    snapshotRef: result.snapshotRef,
  };
}
