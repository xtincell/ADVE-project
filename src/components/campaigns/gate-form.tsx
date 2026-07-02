"use client";

import { useActionState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { FormState } from "@/lib/forms";

/**
 * Formulaire-bouton d'une GATE du pipeline (lancer la production, transformer
 * en brief, valider, livrer…) : l'id de l'entité voyage en champ caché, la
 * décision d'accès reste 100 % serveur (tenancy + gate domaine). Pattern
 * SubscribeButton (WP-007) généralisé.
 */
export type GateFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Champs cachés (ids d'entité) portés par la soumission. */
  hidden: Record<string, string>;
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  /** Aide affichée sous le bouton (ex. pourquoi la gate est fermée). */
  hint?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

export function GateForm({
  action,
  hidden,
  label,
  pendingLabel,
  disabled,
  hint,
  variant,
  size = "sm",
  className,
}: GateFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className={className}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
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
