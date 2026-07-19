"use client";

/**
 * Capture newsletter Argos (Phase A état-final, boucle AUDIENCE) — le seul
 * canal d'audience possédé en propre (ni Meta ni Google). v1 = capture
 * honnête : consentement explicite, CrmContact taggé `argos-newsletter`,
 * aucun envoi automatique encore (la cadence éditoriale d'abord).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function NewsletterCapture({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const subscribe = trpc.argos.subscribeNewsletter.useMutation({ onSuccess: () => setDone(true) });

  if (done) {
    return (
      <p className="text-sm" role="status" style={{ color: "var(--color-foreground-secondary)" }}>
        C&apos;est noté — vous recevrez les prochains dossiers et mouvements du classement.
      </p>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) subscribe.mutate({ email, source });
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="votre@email.com"
        aria-label="Votre email pour la newsletter"
        className="min-w-[220px] flex-1 rounded-md border px-3 py-2 text-sm"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-foreground)" }}
      />
      <button
        type="submit"
        disabled={subscribe.isPending}
        className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
        style={{ background: "var(--color-accent)", color: "var(--color-accent-foreground, #fff)" }}
      >
        {subscribe.isPending ? "…" : "Recevoir les dossiers"}
      </button>
      {subscribe.error ? (
        <span className="text-xs" style={{ color: "var(--color-foreground-muted)" }}>{subscribe.error.message}</span>
      ) : null}
    </form>
  );
}
