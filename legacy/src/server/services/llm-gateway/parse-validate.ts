/**
 * LLM Output Validation — Parse + Zod safeParse en un seul appel
 *
 * Ce module est le verrou anti-drift au point de réception des sorties LLM :
 * AVANT toute persistance en base, on garantit que la donnée respecte le
 * schéma Zod attendu. Mode "prune" (default) drop les feuilles invalides et
 * conserve le reste ; mode "strict" throw au premier écart.
 *
 * Cf. ADR-0063 — "Strict LLM Output Validation at System Boundaries".
 *
 * Le bug d'origine (cf. CatalogueParCanalCard rectangles vides) provenait
 * d'items LLM persistés sans `action` malgré `PotentialActionSchema.action:
 * z.string().min(1)`. Cause : `extractJSON(text) as Record<string, unknown>`
 * = cast TypeScript, pas validation runtime. Ce helper bouche le trou.
 */
import { z, type ZodIssue, type ZodType } from "zod";
import { extractJSON } from "./index";

export interface LLMValidationResult<T> {
  data: T;
  warnings: string[];
  droppedPaths: string[];
  partial: boolean;
}

export class LLMValidationError extends Error {
  override readonly name = "LLMValidationError";
  constructor(
    message: string,
    public readonly issues: readonly ZodIssue[],
    public readonly raw: unknown,
  ) {
    super(message);
  }
}

export interface ParseAndValidateOptions {
  /** Logging context (e.g. "protocole-innovation"). Prefix all warnings. */
  context?: string;
  /**
   * - "prune"  (default) : drop the invalid leaf paths, keep the rest. Lossy
   *                        but resilient — best for partial LLM outputs.
   * - "strict" : throw LLMValidationError at first failure. Use when the
   *              downstream consumer requires full schema compliance.
   */
  mode?: "prune" | "strict";
  /** Optional callback to surface warnings to a logger / Signal / Sentry. */
  onWarning?: (warning: { context: string; path: string; message: string }) => void;
}

/**
 * Parse the JSON inside a raw LLM text response and validate it against `schema`.
 *
 * The function performs two stages:
 *   1. Structural extraction via `extractJSON` (markdown fences, balanced braces).
 *   2. Zod safeParse against `schema`. If validation fails in "prune" mode, the
 *      function walks the issues deepest-first, removes the offending paths,
 *      and re-parses. If pruning still does not produce a valid result, it
 *      falls back to `schema.partial()` for top-level ZodObjects.
 *
 * Throws:
 *   - The error from `extractJSON` if the text contains no parseable JSON.
 *   - `LLMValidationError` in strict mode at the first violation.
 *   - `LLMValidationError` in prune mode if even partial recovery fails.
 */
export function parseAndValidateLLM<T>(
  text: string,
  schema: ZodType<T>,
  opts: ParseAndValidateOptions = {},
): LLMValidationResult<T> {
  const mode = opts.mode ?? "prune";
  const ctx = opts.context ?? "llm";

  const raw = extractJSON(text);

  const first = schema.safeParse(raw);
  if (first.success) {
    return { data: first.data, warnings: [], droppedPaths: [], partial: false };
  }

  if (mode === "strict") {
    throw new LLMValidationError(
      `[${ctx}] LLM output failed schema validation (${first.error.issues.length} issues): ${summarizeIssues(first.error.issues)}`,
      first.error.issues,
      raw,
    );
  }

  // Prune mode — drop offending paths and re-parse
  const sortedIssues = [...first.error.issues].sort(compareIssuesDeepestFirst);
  let pruned: unknown = deepClone(raw);
  const warnings: string[] = [];
  const droppedPaths: string[] = [];

  for (const issue of sortedIssues) {
    // Zod issue.path can technically include symbols (PropertyKey); filter to
    // the string/number subset removeAtPath understands.
    const safePath = issue.path.filter((p): p is string | number => typeof p === "string" || typeof p === "number");
    const pathStr = safePath.length > 0 ? safePath.join(".") : "<root>";
    pruned = removeAtPath(pruned, safePath);
    droppedPaths.push(pathStr);
    const warning = `[${ctx}] dropped ${pathStr}: ${issue.message}`;
    warnings.push(warning);
    opts.onWarning?.({ context: ctx, path: pathStr, message: issue.message });
  }

  const second = schema.safeParse(pruned);
  if (second.success) {
    return { data: second.data, warnings, droppedPaths, partial: true };
  }

  // Last resort: fall back to .partial() for top-level ZodObject schemas.
  // `.partial()` throws on schemas with `.refine()` / `.transform()` — guard it.
  if (schema instanceof z.ZodObject) {
    try {
      const partialSchema = (schema as z.ZodObject<z.ZodRawShape>).partial();
      const third = partialSchema.safeParse(pruned);
      if (third.success) {
        const fallbackWarning = `[${ctx}] fallback to partial schema (some required fields missing after prune)`;
        warnings.push(fallbackWarning);
        return { data: third.data as T, warnings, droppedPaths, partial: true };
      }
    } catch {
      // .partial() unsupported on this schema (refine/transform/effect chain) — fall through to throw.
    }
  }

  throw new LLMValidationError(
    `[${ctx}] LLM output unrecoverable after pruning ${droppedPaths.length} paths: ${summarizeIssues(second.error.issues)}`,
    second.error.issues,
    raw,
  );
}

// ── Internals ───────────────────────────────────────────────────────────

function summarizeIssues(issues: readonly ZodIssue[]): string {
  return issues
    .slice(0, 3)
    .map((i) => `${i.path.map((p) => String(p)).join(".") || "<root>"}: ${i.message}`)
    .join(" | ") + (issues.length > 3 ? ` (+${issues.length - 3} more)` : "");
}

/**
 * Sort issues so that:
 *   1. Deeper paths come first (we drop leaves before parents).
 *   2. Within equal depth, larger numeric indices come first (so splice() on
 *      an array does not shift the indices of remaining issues).
 */
function compareIssuesDeepestFirst(a: ZodIssue, b: ZodIssue): number {
  if (a.path.length !== b.path.length) return b.path.length - a.path.length;
  for (let i = a.path.length - 1; i >= 0; i--) {
    const ai = a.path[i];
    const bi = b.path[i];
    if (typeof ai === "number" && typeof bi === "number" && ai !== bi) {
      return bi - ai;
    }
  }
  return 0;
}

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Return a new value with the given path removed. Pure — does not mutate.
 *
 * Critical heuristic: when the path traverses an array index, the WHOLE array
 * element is dropped (not just the offending leaf field). Reason: if the LLM
 * produced `{ items: [{ action: "" }] }` with `action: z.string().min(1)`, the
 * Zod issue path is `items.0.action` — but the ITEM is the unit of validity,
 * not the field. Removing only `action` would leave `items[0] = {}` and the
 * re-parse would still fail (action missing). Dropping the element at index 0
 * yields `items: []`, which the parent schema accepts.
 *
 * For non-array paths (pure object traversal), the leaf key is removed.
 */
function removeAtPath(value: unknown, path: readonly (string | number)[]): unknown {
  if (path.length === 0) return undefined;
  if (value === null || typeof value !== "object") return value;

  const head = path[0];

  if (Array.isArray(value)) {
    const idx = typeof head === "number" ? head : Number(head);
    if (!Number.isInteger(idx) || idx < 0 || idx >= value.length) return value;
    // Drop the entire element regardless of remaining path depth.
    const copy = [...value];
    copy.splice(idx, 1);
    return copy;
  }

  const record = value as Record<string, unknown>;
  const key = String(head);
  if (!(key in record)) return value;

  const tail = path.slice(1);
  if (tail.length === 0) {
    const copy = { ...record };
    delete copy[key];
    return copy;
  }
  return { ...record, [key]: removeAtPath(record[key], tail) };
}
