import Link from "next/link";

/**
 * Not-found boundary for the public shared Oracle route — rendered when
 * `resolveShareToken` returns null (the token matches no strategy). Public
 * surface: no "se connecter" CTA, just a clean explanation.
 */
export default function SharedStrategyNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="text-center">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-zinc-800 px-4 py-1.5">
          <span className="text-sm font-semibold text-zinc-400">404</span>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-white">
          Document introuvable
        </h1>
        <p className="mb-8 max-w-md text-sm text-zinc-500">
          Ce lien de partage n&apos;est plus valide ou la proposition a été
          supprimée. Demandez un nouveau lien à votre interlocuteur.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
