"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/forms";
import { loginAction } from "./actions";

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm font-medium text-coral-deep">{errors[0]}</p>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state?.formError ? (
        <p
          role="alert"
          className="rounded-sm border border-coral/30 bg-coral/8 px-4 py-3 text-sm font-medium text-coral-deep"
        >
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          required
          aria-invalid={state?.fieldErrors?.email ? true : undefined}
        />
        <FieldErrors errors={state?.fieldErrors?.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.fieldErrors?.password ? true : undefined}
        />
        <FieldErrors errors={state?.fieldErrors?.password} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
