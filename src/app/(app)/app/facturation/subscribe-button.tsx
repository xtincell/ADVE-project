"use client";

import { useActionState } from "react";
import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";
import { requestSubscriptionAction } from "./actions";

/**
 * Bouton « Payer via WhatsApp » d'un plan — formulaire à champ caché `plan`
 * (l'ActionForm générique ne porte pas de champ). Succès = state null → la
 * page revalidée affiche le bloc d'instructions de la demande créée.
 */
export type SubscribeButtonProps = {
  plan: "cockpit" | "retainer";
  disabled?: boolean;
  /** Aide affichée sous le bouton (ex. pourquoi il est désactivé). */
  hint?: string;
  variant?: ButtonProps["variant"];
};

export function SubscribeButton({ plan, disabled, hint, variant }: SubscribeButtonProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    requestSubscriptionAction,
    null,
  );

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="plan" value={plan} />
      <Button type="submit" variant={variant} size="md" className="w-full" disabled={disabled || pending}>
        <MessageCircle aria-hidden />
        {pending ? "Demande en cours…" : "Payer via WhatsApp"}
      </Button>
      {hint ? <p className="mt-2 text-xs text-smoke-2">{hint}</p> : null}
      {state?.formError ? (
        <p className="mt-2 text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}
