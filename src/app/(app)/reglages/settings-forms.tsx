"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/forms";
import { changeEmailAction, changePasswordAction, updateNameAction } from "./actions";

/**
 * Formulaires des réglages du compte (WP-022) — trois formulaires
 * indépendants (nom / email / mot de passe), chacun avec son propre état.
 * Le succès redirige vers /reglages?ok=… (bannière rendue côté serveur).
 */

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.[0]) return null;
  return (
    <p className="text-sm font-medium text-coral" role="alert">
      {errors[0]}
    </p>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-sm border border-coral/40 bg-coral/10 px-4 py-3 text-sm font-medium text-coral"
    >
      {message}
    </p>
  );
}

function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-sand">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-smoke-2">{hint}</p> : null}
      <FieldError errors={errors} />
    </div>
  );
}

export function UpdateNameForm({ currentName }: { currentName: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateNameAction, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state?.formError} />
      <Field id="reglages-name" label="Nom affiché" errors={state?.fieldErrors?.name}>
        <Input
          id="reglages-name"
          name="name"
          type="text"
          defaultValue={currentName ?? ""}
          placeholder="Votre nom"
          autoComplete="name"
          required
          aria-invalid={state?.fieldErrors?.name ? true : undefined}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le nom"}
      </Button>
    </form>
  );
}

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changeEmailAction, null);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state?.formError} />
      <Field
        id="reglages-email"
        label="Nouvel email"
        hint={`Email actuel : ${currentEmail}`}
        errors={state?.fieldErrors?.email}
      >
        <Input
          id="reglages-email"
          name="email"
          type="email"
          placeholder="nouveau@exemple.com"
          autoComplete="email"
          required
          aria-invalid={state?.fieldErrors?.email ? true : undefined}
        />
      </Field>
      <Field
        id="reglages-email-password"
        label="Mot de passe actuel"
        hint="L'email est votre clé de connexion — on re-vérifie que c'est bien vous."
        errors={state?.fieldErrors?.currentPassword}
      >
        <Input
          id="reglages-email-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.fieldErrors?.currentPassword ? true : undefined}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Vérification…" : "Changer l'email"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError message={state?.formError} />
      <Field
        id="reglages-current-password"
        label="Mot de passe actuel"
        errors={state?.fieldErrors?.currentPassword}
      >
        <Input
          id="reglages-current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.fieldErrors?.currentPassword ? true : undefined}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="reglages-new-password"
          label="Nouveau mot de passe"
          hint="8 caractères minimum."
          errors={state?.fieldErrors?.newPassword}
        >
          <Input
            id="reglages-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={state?.fieldErrors?.newPassword ? true : undefined}
          />
        </Field>
        <Field
          id="reglages-confirm-password"
          label="Confirmation"
          errors={state?.fieldErrors?.confirm}
        >
          <Input
            id="reglages-confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={state?.fieldErrors?.confirm ? true : undefined}
          />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Changer le mot de passe"}
      </Button>
    </form>
  );
}
