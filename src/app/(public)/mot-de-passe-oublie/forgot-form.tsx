"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/forms";
import { requestResetAction } from "./actions";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    requestResetAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.formError ? (
        <p
          role="alert"
          className="rounded-sm border border-coral/30 bg-coral/8 px-4 py-3 text-sm font-medium text-coral-deep"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email du compte</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
          aria-invalid={state?.fieldErrors?.email ? true : undefined}
        />
        {state?.fieldErrors?.email?.[0] ? (
          <p className="text-sm font-medium text-coral-deep">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Demander la réinitialisation"}
      </Button>
    </form>
  );
}
