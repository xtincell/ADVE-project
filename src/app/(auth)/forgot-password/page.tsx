"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    forgotMutation.mutate({ email });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
            <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">LaFusee</h1>
        </div>
      </div>

      <div className="w-full rounded-xl border border-border bg-background/50 p-6 shadow-xl">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-950/50 ring-1 ring-green-800/50">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-white">Email envoye</h2>
            <p className="text-sm text-foreground-secondary">
              Si un compte existe avec l&apos;adresse <strong className="text-foreground-secondary">{email}</strong>, vous recevrez un lien de reinitialisation.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent"
            >
              Retour a la connexion
            </Link>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-center text-lg font-semibold text-white">Mot de passe oublie ?</h2>
            <p className="mb-6 text-center text-sm text-foreground-secondary">
              Entrez votre email et nous vous enverrons un lien de reinitialisation.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-error/50 bg-error/50 px-4 py-3 text-sm text-error">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent disabled:opacity-50"
              >
                {forgotMutation.isPending ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-foreground-secondary hover:text-accent">
                Retour a la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center text-foreground-muted">Chargement...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
