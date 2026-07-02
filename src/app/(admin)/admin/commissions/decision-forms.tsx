"use client";

import { useActionState } from "react";
import { Check, Send, X } from "lucide-react";
import type { FormState } from "@/lib/forms";
import { PAYOUT_METHOD_LABELS, PAYOUT_METHODS } from "@/domain/payout";
import { approvePayoutAction, payPayoutAction, rejectPayoutAction } from "./actions";

/**
 * Décisions de la console commissions (WP-024) — pattern DecisionButtons de
 * /admin/paiements : formulaires indépendants, id en champ caché, états
 * pending distincts, erreur FR sous la ligne.
 */

/** PENDING → Approuver / Écarter. */
export function ApproveRejectButtons({ payoutId }: { payoutId: string }) {
  const [approveState, approveAction, approvePending] = useActionState<FormState, FormData>(
    approvePayoutAction,
    null,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState<FormState, FormData>(
    rejectPayoutAction,
    null,
  );
  const busy = approvePending || rejectPending;
  const error = approveState?.formError ?? rejectState?.formError;

  return (
    <div>
      <div className="flex items-center gap-2">
        <form action={approveAction}>
          <input type="hidden" name="payoutId" value={payoutId} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-success/12 px-3 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:pointer-events-none disabled:opacity-50"
          >
            <Check className="size-3.5" aria-hidden />
            {approvePending ? "Approbation…" : "Approuver"}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="payoutId" value={payoutId} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-coral/12 px-3 text-xs font-bold text-coral-deep transition-colors hover:bg-coral/20 disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden />
            {rejectPending ? "Écartement…" : "Écarter"}
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

/** APPROVED → Payé : rail (momo/manuel) + référence de transaction obligatoire. */
export function PayForm({ payoutId }: { payoutId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(payPayoutAction, null);
  const referenceError = state?.fieldErrors?.reference?.[0];

  return (
    <form action={formAction}>
      <div className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="payoutId" value={payoutId} />
        <select
          name="method"
          defaultValue="momo"
          aria-label="Rail de paiement"
          className="h-8 rounded-sm border border-ink/15 bg-white px-2 text-xs text-ink"
        >
          {PAYOUT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYOUT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
        <input
          name="reference"
          placeholder="Référence transaction"
          required
          minLength={3}
          maxLength={80}
          aria-label="Référence de la transaction"
          aria-invalid={Boolean(referenceError) || undefined}
          className="h-8 w-40 rounded-sm border border-ink/15 bg-white px-2 font-mono text-xs text-ink placeholder:font-sans"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-success/12 px-3 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:pointer-events-none disabled:opacity-50"
        >
          <Send className="size-3.5" aria-hidden />
          {pending ? "Enregistrement…" : "Marquer payé"}
        </button>
      </div>
      {referenceError || state?.formError ? (
        <p className="mt-1.5 max-w-64 text-xs text-coral-deep" role="alert">
          {referenceError ?? state?.formError}
        </p>
      ) : null}
    </form>
  );
}
