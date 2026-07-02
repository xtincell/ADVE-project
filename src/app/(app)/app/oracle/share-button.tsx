"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareOracleAction, type ShareOracleState } from "./actions";

const EXPIRY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Bouton « Partager » de l'Oracle : génère un lien public signé (server
 * action auditée) puis l'affiche dans un panneau — URL absolue résolue côté
 * navigateur (le serveur ne connaît pas le host public), copie presse-papiers,
 * et la limite V1 dite en clair : lien valable 30 jours, NON révocable.
 */
export function ShareOracleButton() {
  const [state, formAction, pending] = useActionState<ShareOracleState, FormData>(
    shareOracleAction,
    null,
  );
  const [copied, setCopied] = useState(false);

  // state non-null ⇒ post-interaction, donc côté navigateur : window existe.
  const url =
    state && "path" in state
      ? new URL(state.path, window.location.origin).toString()
      : null;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible : le champ sélectionnable reste la voie de secours.
    }
  }

  return (
    <div className="relative">
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <Share2 aria-hidden />
          {pending ? "Génération…" : "Partager"}
        </Button>
      </form>

      {state && "formError" in state ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[85vw] rounded-lg border border-line bg-ink-2 p-4 shadow-card">
          <p className="text-sm text-coral" role="alert">
            {state.formError}
          </p>
        </div>
      ) : null}

      {url && state && "path" in state ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-96 max-w-[85vw] space-y-3 rounded-lg border border-line bg-ink-2 p-4 text-left shadow-card">
          <p className="text-sm font-semibold text-bone">Lien public généré</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Lien public de l'Oracle"
              className="h-9 w-full min-w-0 rounded-sm border border-line bg-ink px-2.5 font-mono text-xs text-sand outline-none focus:border-coral"
            />
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-smoke-2">
            Lecture seule, sans connexion. Valable jusqu&apos;au{" "}
            <span className="text-sand">{EXPIRY_FORMAT.format(new Date(state.expiresAt))}</span> —{" "}
            <strong className="font-semibold text-sand">non révocable</strong> dans cette version :
            ne le transmettez qu&apos;à des destinataires de confiance. Le lien montre toujours la
            dernière composition de l&apos;Oracle.
          </p>
        </div>
      ) : null}
    </div>
  );
}
