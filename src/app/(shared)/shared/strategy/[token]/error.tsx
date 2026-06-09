"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary for the public shared Oracle route.
 *
 * Before this existed, an unhandled throw in `assemblePresentation` (e.g. a
 * Phase-13 section with malformed BrandAsset content) produced a bare crash
 * with no UI. This boundary degrades gracefully and lets the visitor retry.
 */
export default function SharedStrategyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shared-strategy-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-950/50 ring-1 ring-red-800/50">
          <svg
            className="h-8 w-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-white">
          Cette proposition n&apos;a pas pu s&apos;afficher
        </h1>
        <p className="mb-2 text-sm text-zinc-400">
          Une erreur est survenue lors du chargement du document. Réessayez dans
          un instant.
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs text-zinc-600">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
