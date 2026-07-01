"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import type { FormState } from "@/lib/forms";
import { approveSubscriptionAction, rejectSubscriptionAction } from "./actions";

/**
 * Valider / Rejeter une demande de la file — deux formulaires indépendants
 * (id en champ caché), états pending distincts, erreur FR sous la ligne.
 */
export function DecisionButtons({ subscriptionId }: { subscriptionId: string }) {
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    approveSubscriptionAction,
    null,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    rejectSubscriptionAction,
    null,
  );
  const busy = approvePending || rejectPending;
  const error = approveState?.formError ?? rejectState?.formError;

  return (
    <div>
      <div className="flex items-center gap-2">
        <form action={approveAction}>
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-success/12 px-3 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:pointer-events-none disabled:opacity-50"
          >
            <Check className="size-3.5" aria-hidden />
            {approvePending ? "Validation…" : "Valider"}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-coral/12 px-3 text-xs font-bold text-coral-deep transition-colors hover:bg-coral/20 disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden />
            {rejectPending ? "Rejet…" : "Rejeter"}
          </button>
        </form>
      </div>
      {error ? (
        <p className="mt-1.5 max-w-56 text-xs text-coral-deep" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
