"use client";

/**
 * ADR-0155 — Bouton flottant de remontée feedback / bug pour les testeurs.
 * Monté une fois dans `AppShell` → présent sur tous les portails authentifiés.
 * Capture la page + le user-agent automatiquement. DS strict.
 */

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Dialog, Button, Select, Textarea, Text, Badge } from "@/components/primitives";

const KINDS = [
  { value: "BUG", label: "🐞 Un bug" },
  { value: "IDEA", label: "💡 Une idée" },
  { value: "OTHER", label: "📨 Autre retour" },
] as const;

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("BUG");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setDone(true);
      setMessage("");
    },
  });

  function send() {
    if (message.trim().length < 3) return;
    submit.mutate({
      kind,
      message: message.trim(),
      pageUrl: typeof window !== "undefined" ? window.location.pathname + window.location.search : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  }

  function close() {
    setOpen(false);
    // reset après la fermeture pour la prochaine ouverture
    setTimeout(() => { setDone(false); submit.reset(); }, 200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Signaler un bug ou envoyer un retour"
        className="fixed bottom-[calc(var(--mobile-tab-height,0px)+env(safe-area-inset-bottom)+16px)] right-4 z-[var(--z-sticky)] inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-lg transition-colors hover:border-accent md:bottom-6"
      >
        <MessageSquarePlus className="h-4 w-4 text-[color:var(--color-accent)]" aria-hidden />
        <span className="hidden sm:inline">Un souci ? Un retour ?</span>
      </button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())} title="Votre retour nous aide">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Badge tone="success">Envoyé — merci !</Badge>
            <Text className="text-sm text-foreground-secondary">Votre message est bien arrivé. On regarde ça.</Text>
            <Button onClick={close}>Fermer</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Text className="text-sm text-foreground-secondary">
              Décrivez ce qui bloque ou ce que vous aimeriez. La page où vous êtes est jointe automatiquement.
            </Text>
            <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Type de retour">
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
            <Textarea
              placeholder="Décrivez le bug ou votre idée…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
            {submit.error ? <Badge tone="error">{submit.error.message}</Badge> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>Annuler</Button>
              <Button onClick={send} disabled={submit.isPending || message.trim().length < 3}>
                {submit.isPending ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
