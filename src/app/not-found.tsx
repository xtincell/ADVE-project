import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="text-center">
        {/* 404 badge */}
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-zinc-800 px-4 py-1.5">
          <span className="text-sm font-semibold text-zinc-400">404</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-white">Page introuvable</h1>
        <p className="mb-8 max-w-md text-sm text-zinc-500">
          La page que vous recherchez n&apos;existe pas ou a ete deplacee.
          Verifiez l&apos;URL ou retournez a l&apos;accueil.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
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
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
