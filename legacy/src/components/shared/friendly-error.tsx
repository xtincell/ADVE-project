"use client";

/**
 * <FriendlyError> — affichage d'erreur codée + colorée (M11/M13).
 *   - rouge  = bloquant (tone "error")
 *   - jaune  = non-bloquant / avertissement (tone "warning")
 * Montre le code (VAL-001, GOV-401, DB-503…) + le titre FR + le détail + ce que
 * ça implique. Source : interpretError() (lib/errors/friendly-error.ts).
 */

import { AlertTriangle, AlertCircle } from "lucide-react";
import { interpretError, warningToFriendly, type FriendlyError as FE } from "@/lib/errors/friendly-error";

export function FriendlyError({ error, codeCatalogue }: { error: unknown; codeCatalogue?: Record<string, { fr: string; hint: string }> }) {
  if (!error) return null;
  const fe = interpretError(error, codeCatalogue);
  return <FriendlyErrorBox fe={fe} />;
}

/** Liste d'avertissements non-bloquants (jaune) — ex. IntentResult.warnings. */
export function FriendlyWarnings({ warnings }: { warnings: string[] | null | undefined }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {warnings.map((w, i) => <FriendlyErrorBox key={i} fe={warningToFriendly(w)} />)}
    </div>
  );
}

function FriendlyErrorBox({ fe }: { fe: FE }) {
  const isWarn = fe.tone === "warning";
  const Icon = isWarn ? AlertTriangle : AlertCircle;
  const cls = isWarn
    ? "border-warning/30 bg-warning/10 text-warning"
    : "border-error/30 bg-error/10 text-error";
  return (
    <div role="alert" className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${cls}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold opacity-70">{fe.code}</span>
          <span className="font-semibold">{fe.title}</span>
        </div>
        {fe.detail ? <p className="mt-0.5 text-foreground-secondary">{fe.detail}</p> : null}
        {fe.implication ? <p className="mt-0.5 text-foreground-muted">{fe.implication}</p> : null}
      </div>
    </div>
  );
}
