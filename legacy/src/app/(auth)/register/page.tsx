"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Après inscription, on envoie sur le hub /portals (cockpit + creator
  // accessibles par défaut). Le user choisit le portail qui lui parle.
  const callbackUrl = searchParams.get("callbackUrl") ?? "/portals";

  // Pre-fill email when arriving from intake activation (?email=...)
  const prefillEmail = searchParams.get("email") ?? "";
  const [form, setForm] = useState({
    name: "",
    email: prefillEmail,
    password: "",
    confirmPassword: "",
    companyName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      // Auto-login after successful registration
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        // Registration succeeded but auto-login failed — redirect to login
        router.push("/login");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    },
    onError: (err) => {
      setError(err.message);
      setLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    registerMutation.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
      companyName: form.companyName || undefined,
    });
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="flex flex-col items-center">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-9 w-auto" />
          <h1 className="text-2xl font-bold text-foreground">La Fusée<span className="text-accent">.</span></h1>
        </div>
        <p className="text-sm text-foreground-muted">Industry OS — De la poussière à l&apos;étoile</p>
      </div>

      {/* Register Form */}
      <div className="w-full rounded-xl border border-border-subtle bg-surface-raised/50 p-6 shadow-xl">
        <h2 className="mb-6 text-center text-lg font-semibold text-foreground">Creer un compte</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Nom complet *
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Marie Ndongo"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Email *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="marie@entreprise.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Entreprise / Marque
            </label>
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="MonEntreprise SARL (optionnel)"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Mot de passe *
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 caracteres"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Confirmer le mot de passe *
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Retapez votre mot de passe"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creation en cours..." : "Creer mon compte"}
          </button>
        </form>
      </div>

      {/* Links */}
      <div className="mt-6 text-center">
        <p className="text-sm text-foreground-secondary">
          Deja un compte ?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center text-foreground-muted">Chargement...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
