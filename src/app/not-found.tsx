import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        {/* 404 badge */}
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-background px-4 py-1.5">
          <span className="text-sm font-semibold text-foreground-secondary">404</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-white">Page introuvable</h1>
        <p className="mb-8 max-w-md text-sm text-foreground-muted">
          La page que vous recherchez n&apos;existe pas ou a ete deplacee.
          Verifiez l&apos;URL ou retournez a l&apos;accueil.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Retour a l&apos;accueil
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:border-border-strong hover:bg-background hover:text-white"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
