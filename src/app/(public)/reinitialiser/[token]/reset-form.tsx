"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/forms";
import { resetPasswordAction } from "./actions";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.[0]) return null;
  return <p className="text-sm font-medium text-coral-deep">{errors[0]}</p>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    resetPasswordAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      {state?.formError ? (
        <p
          role="alert"
          className="rounded-sm border border-coral/30 bg-coral/8 px-4 py-3 text-sm font-medium text-coral-deep"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          required
          aria-invalid={state?.fieldErrors?.password ? true : undefined}
        />
        <FieldError errors={state?.fieldErrors?.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={state?.fieldErrors?.confirm ? true : undefined}
        />
        <FieldError errors={state?.fieldErrors?.confirm} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Réinitialisation…" : "Définir ce mot de passe"}
      </Button>
    </form>
  );
}
