"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function portalForRole(role: string | undefined): string {
  switch (role) {
    case "ADMIN":
    case "OPERATOR":
      return "/console";
    case "FOUNDER":
    case "BRAND":
    case "CLIENT_RETAINER":
    case "CLIENT_STATIC":
      return "/cockpit";
    case "AGENCY":
      return "/agency";
    case "CREATOR":
    case "FREELANCE":
      return "/creator";
    case "USER":
    default:
      // Nouveau compte ou role non spécialisé → hub des portails accessibles
      // (cockpit + creator par défaut). Cf. src/proxy.ts COCKPIT_ROLES/CREATOR_ROLES.
      return "/portals";
  }
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

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

      // Si callbackUrl fourni (deep link), on respecte. Sinon, redirect
      // role-based vers le portail correspondant.
      let target = callbackUrl;
      if (!target) {
        const session = await getSession();
        target = portalForRole(session?.user?.role);
      }
      router.push(target);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez reessayer.");
      setLoading(false);
    }
  }

  function handleGoogle() {
    // OAuth = redirection plein écran ; NextAuth gère le retour vers callbackUrl.
    // Le portail final est résolu par role côté /portals si pas de deep link.
    void signIn("google", { callbackUrl: callbackUrl ?? "/portals" });
  }

  return (
    <div className="flex flex-col items-center">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logos/lafusee-logo.png" alt="" aria-hidden="true" className="h-9 w-auto" />
          <h1 className="text-2xl font-bold text-foreground">La Fusée<span className="text-accent">.</span></h1>
        </div>
        <p className="text-sm text-foreground-muted">
          Industry OS — De la poussière à l&apos;étoile
        </p>
      </div>

      {/* Login Form */}
      <div className="w-full rounded-xl border border-border-subtle bg-surface-raised/50 p-6 shadow-xl">
        <h2 className="mb-6 text-center text-lg font-semibold text-foreground">
          Connexion
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-error/50 bg-error/10 px-4 py-3 text-sm text-error">
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
              className="w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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
              <Link href="/forgot-password" className="text-xs text-accent hover:text-accent-hover">
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
              className="w-full rounded-lg border border-border bg-surface-card px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-surface-card" />
              <span className="text-xs uppercase tracking-wide text-foreground-muted">ou</span>
              <div className="h-px flex-1 bg-surface-card" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.52 12.27c0-.82-.07-1.6-.2-2.36H12v4.46h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.72z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.78-3.79H1.27v3.09A12 12 0 0 0 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.3a7.18 7.18 0 0 1 0-4.6V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.09A7.2 7.2 0 0 1 12 4.77z"
                />
              </svg>
              Continuer avec Google
            </button>
          </>
        )}
      </div>

      {/* Register link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-foreground-secondary">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-accent hover:text-accent-hover">
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
