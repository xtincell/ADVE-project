"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/forms";
import { registerAction } from "./actions";

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-sm font-medium text-coral-deep">{errors[0]}</p>;
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    registerAction,
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
        <Label htmlFor="name">Votre nom</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Awa Diop"
          required
          aria-invalid={state?.fieldErrors?.name ? true : undefined}
        />
        <FieldErrors errors={state?.fieldErrors?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brandName">Nom de votre marque</Label>
        <Input
          id="brandName"
          name="brandName"
          placeholder="Ma Marque"
          required
          aria-invalid={state?.fieldErrors?.brandName ? true : undefined}
        />
        <FieldErrors errors={state?.fieldErrors?.brandName} />
      </div>

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
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          required
          minLength={8}
          aria-invalid={state?.fieldErrors?.password ? true : undefined}
        />
        <FieldErrors errors={state?.fieldErrors?.password} />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Création du compte…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
