/**
 * Best-effort capture helpers for Oracle errors. Wraps `error-vault.capture`
 * with the OracleError-aware shape (governor, remediation, recoverable in
 * context). Never throws — capture failure must not break the pipeline (cf.
 * recursion guard in error-vault.capture).
 *
 * Used by:
 *   - `governed-procedure` (top-level wrapper for all governed mutations)
 *   - `enrich-oracle` section-level circuit breakers (per-framework, per-section
 *     failures that must NOT abort the rest of the pipeline)
 */

import { OracleError, toOracleError, type OracleErrorCode } from "./error-codes";

export async function captureOracleErrorPublic(
  err: unknown,
  meta: {
    intentId?: string;
    strategyId?: string;
    trpcProcedure?: string;
    extraContext?: Record<string, unknown>;
  },
): Promise<OracleErrorCode> {
  const oracleErr = err instanceof OracleError ? err : toOracleError(err);
  try {
    const { capture } = await import("@/server/services/error-vault");
    await capture({
      source: "SERVER",
      severity: oracleErr.entry.recoverable ? "WARN" : "ERROR",
      code: oracleErr.code,
      message: oracleErr.message,
      stack: oracleErr.stack,
      intentId: meta.intentId,
      strategyId: meta.strategyId,
      trpcProcedure: meta.trpcProcedure,
      context: {
        governor: oracleErr.entry.governor,
        remediation: oracleErr.entry.hint,
        recoverable: oracleErr.entry.recoverable,
        ...oracleErr.context,
        ...(meta.extraContext ?? {}),
      },
    });
  } catch {
    // swallow — recursion guard
  }
  return oracleErr.code;
}
