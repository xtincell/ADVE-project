"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (err) => setError(err.message),
  });

  if (!token) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full rounded-xl border border-border-subtle bg-surface-raised/50 p-6 text-center shadow-xl">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Lien invalide</h2>
          <p className="text-sm text-foreground-secondary">Ce lien de reinitialisation est invalide ou a expire.</p>
          <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-hover">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-full rounded-xl border border-border-subtle bg-surface-raised/50 p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/50">
            <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Mot de passe modifie</h2>
          <p className="text-sm text-foreground-secondary">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    resetMutation.mutate({ token, password });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-9 w-auto" />
          <h1 className="text-2xl font-bold text-foreground">La Fusée<span className="text-accent">.</span></h1>
        </div>
      </div>

      <div className="w-full rounded-xl border border-border-subtle bg-surface-raised/50 p-6 shadow-xl">
        <h2 className="mb-6 text-center text-lg font-semibold text-foreground">Nouveau mot de passe</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 caracteres"
              className="w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
              Confirmer
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le mot de passe"
              className="w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {resetMutation.isPending ? "Modification..." : "Changer le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center text-foreground-muted">Chargement...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
