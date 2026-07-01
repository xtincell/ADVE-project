"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copie l'URL ABSOLUE d'un chemin relatif dans le presse-papiers (l'origine
 * est résolue au clic, côté navigateur — le serveur ne connaît pas le host
 * public). Zéro dépendance.
 */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const url = new URL(path, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible (permissions, contexte non sécurisé) :
      // le lien « Ouvrir » à côté reste la voie de secours.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-semibold text-smoke transition-colors hover:bg-ink/5 hover:text-ink"
      title="Copier le lien du résultat"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-success" aria-hidden /> Copié
        </>
      ) : (
        <>
          <Copy className="size-3.5" aria-hidden /> Copier
        </>
      )}
    </button>
  );
}
