"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { issueResetLinkAction, type IssueLinkState } from "./actions";

/**
 * File des demandes de réinitialisation (WP-022) — côté client uniquement
 * pour porter l'état « lien émis » : le lien ne transite qu'une fois, dans la
 * réponse de l'action, et n'est jamais relisible (hash seul en base).
 */

export type ResetRequestView = {
  id: string;
  email: string;
  name: string | null;
  requestedAt: string; // pré-formaté serveur
  expiresAt: string; // pré-formaté serveur
  expired: boolean;
};

function IssueLinkRow({ request }: { request: ResetRequestView }) {
  const [state, formAction, pending] = useActionState<IssueLinkState, FormData>(
    issueResetLinkAction,
    null,
  );

  return (
    <li className="rounded-md border border-ink/10 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{request.name ?? "—"}</p>
          <p className="font-mono text-xs text-smoke">{request.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-smoke">
            demandé le <span className="font-mono">{request.requestedAt}</span>
          </span>
          {request.expired && !state?.url ? (
            <Badge variant="outline">Lien initial expiré</Badge>
          ) : null}
          <form action={formAction}>
            <input type="hidden" name="requestId" value={request.id} />
            <button
              type="submit"
              disabled={pending}
              className="h-9 rounded-sm bg-ink px-4 text-sm font-semibold text-bone transition-colors hover:bg-ink-3 disabled:pointer-events-none disabled:opacity-50"
            >
              {pending ? "Émission…" : state?.url ? "Ré-émettre" : "Émettre le lien"}
            </button>
          </form>
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-coral-deep">
          {state.error}
        </p>
      ) : null}

      {state?.url ? (
        <div className="mt-3 rounded-sm border border-gold/50 bg-gold/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-graphite">
            Lien à transmettre à {state.email} (WhatsApp) — expire {state.expiresAt}
          </p>
          <p className="mt-1.5 select-all break-all font-mono text-xs text-ink">{state.url}</p>
          <p className="mt-1.5 text-xs text-smoke">
            Copiez-le maintenant : il ne s&apos;affichera plus (seule son empreinte est en base).
            Ré-émettre invalide ce lien et en crée un nouveau.
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function ResetRequestsSection({ requests }: { requests: ResetRequestView[] }) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <KeyRound className="size-5 text-coral" aria-hidden />
          Réinitialisations de mot de passe en attente
          <Badge variant="coral">{requests.length}</Badge>
        </h2>
        <p className="text-sm text-smoke">
          La Fusée n&apos;envoie pas encore d&apos;email : émettez le lien puis transmettez-le au
          compte par WhatsApp. Un lien dure 1 h, ne sert qu&apos;une fois, et chaque émission est
          tracée au journal d&apos;audit.
        </p>
      </header>
      <ul className="space-y-3">
        {requests.map((request) => (
          <IssueLinkRow key={request.id} request={request} />
        ))}
      </ul>
    </section>
  );
}
