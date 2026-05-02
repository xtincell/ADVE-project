"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe invalide.");
        setLoading(false);
        return;
      }

      // Redirect to callback URL or role-based default
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez reessayer.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
            <svg
              className="h-5 w-5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">LaFusee</h1>
        </div>
        <p className="text-sm text-foreground-muted">
          Industry OS — De la Poussiere a l&apos;Etoile
        </p>
      </div>

      {/* Login Form */}
      <div className="w-full rounded-xl border border-border bg-background/50 p-6 shadow-xl">
        <h2 className="mb-6 text-center text-lg font-semibold text-white">
          Connexion
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-error/50 bg-error/50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground-secondary"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground-secondary"
              >
                Mot de passe
              </label>
              <Link href="/forgot-password" className="text-xs text-accent hover:text-accent">
                Mot de passe oublie ?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-white placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
      </div>

      {/* Register link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-foreground-secondary">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent">
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center text-foreground-muted">Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}
