"use client";

import { useActionState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/**
 * Formulaire-bouton générique pour une server action sans champ (dériver
 * RTIS, composer l'Oracle…) : état pending + erreur FR retournée par
 * l'action. Succès = state null → la page revalidée reflète la mutation.
 */
export type ActionFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  /** Aide affichée sous le bouton (ex. pourquoi il est désactivé). */
  hint?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

export function ActionForm({
  action,
  label,
  pendingLabel,
  disabled,
  hint,
  variant,
  size,
  className,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      <Button type="submit" variant={variant} size={size} disabled={disabled || pending}>
        {pending ? pendingLabel : label}
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
