import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 ring-1 ring-error/50">
          <svg
            className="h-8 w-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">Acces refuse</h1>
        <p className="mb-8 text-sm text-foreground-secondary">
          Vous n&apos;avez pas les permissions necessaires pour acceder a cette
          page. Contactez votre administrateur si vous pensez qu&apos;il
          s&apos;agit d&apos;une erreur.
        </p>

        {/* Available portals */}
        <div className="mb-6 rounded-xl border border-border-subtle bg-surface-raised/50 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Aller ailleurs
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/portals"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-accent/50 hover:bg-card hover:text-foreground"
            >
              Hub des portails (mes accès)
            </Link>
            <Link
              href="/cockpit"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-accent/50 hover:bg-card hover:text-foreground"
            >
              Cockpit — Brand OS
            </Link>
            <Link
              href="/creator"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-accent/50 hover:bg-card hover:text-foreground"
            >
              Creator — Espace Createur
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-accent/50 hover:bg-card hover:text-foreground"
            >
              ← Landing La Fusée
            </Link>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent-hover"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Retour a la connexion
        </Link>
      </div>
    </div>
  );
}
