/**
 * OracleSectionFailureModal — Phase 21 F-F (ADR-0073)
 *
 * Modal qui affiche le détail d'erreur d'une section FAILED :
 *   - errorCode (ZOD_VALIDATION_FAILED, RUNNER_FAILED, ...)
 *   - errorMessage (message LLM ou system)
 *   - attempts (nombre de retries effectués)
 *   - durationMs
 *   - zodIssues si présent (depuis Phase 21 F-A LLMStructuredCallError.history)
 *
 * Bouton "Réessayer" émet `oracle.retrySection` (mode RETRY explicite).
 */

"use client";

import { AlertTriangle, RefreshCw, X } from "lucide-react";

export interface OracleSectionFailureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionNumber: string;
  sectionTitle: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  attempts?: number | null;
  durationMs?: number | null;
  zodIssues?: unknown;
  onRetry: () => void;
  retryDisabled?: boolean;
}

export function OracleSectionFailureModal(props: OracleSectionFailureModalProps): React.ReactElement | null {
  const {
    open,
    onOpenChange,
    sectionNumber,
    sectionTitle,
    errorCode,
    errorMessage,
    attempts,
    durationMs,
    zodIssues,
    onRetry,
    retryDisabled,
  } = props;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="oracle-failure-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-error/50 bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-error/30 bg-error/30 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <div>
              <h2 id="oracle-failure-title" className="text-base font-bold text-error">
                §{sectionNumber} {sectionTitle} — Échec de génération
              </h2>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {errorCode ? `Code: ${errorCode}` : "Erreur inconnue"}
                {typeof attempts === "number" && ` · ${attempts} tentative${attempts > 1 ? "s" : ""}`}
                {typeof durationMs === "number" && ` · ${(durationMs / 1000).toFixed(1)}s`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded p-1 text-foreground-muted transition-colors hover:bg-background hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {errorMessage && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Message
              </h3>
              <p className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground-secondary">
                {errorMessage}
              </p>
            </section>
          )}

          {zodIssues != null && (
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Détails Zod
              </h3>
              <pre className="max-h-64 overflow-auto rounded border border-border bg-background px-3 py-2 font-mono text-2xs leading-snug text-foreground-muted">
                {formatZodIssues(zodIssues)}
              </pre>
            </section>
          )}

          {errorCode === "ZOD_VALIDATION_FAILED" && (
            <p className="rounded border border-warning/40 bg-warning/15 px-3 py-2 text-xs text-warning">
              Le LLM n&apos;a pas réussi à produire un payload conforme au schéma Zod après{" "}
              {attempts ?? 3} tentatives. Le retry relancera une nouvelle session avec un prompt
              repropulsé. Si l&apos;échec persiste, vérifier la complétude des piliers ADVE
              amont.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => {
              onRetry();
              onOpenChange(false);
            }}
            disabled={retryDisabled}
            className="flex items-center gap-2 rounded-md bg-error px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-error disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer §{sectionNumber}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatZodIssues(issues: unknown): string {
  if (typeof issues === "string") return issues;
  try {
    return JSON.stringify(issues, null, 2);
  } catch {
    return String(issues);
  }
}
