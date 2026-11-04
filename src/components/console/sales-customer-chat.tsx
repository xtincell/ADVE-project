"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageCircle, Send } from "lucide-react";
import { cva } from "class-variance-authority";
import { MarkdownContent } from "@/components/shared/markdown-content";

type Conversation = {
  payment?: null | { reference: string; status: string; amount: number; currency: string; beneficiary: string; paidAt: string | null };
  brand: string;
  sellerMode?: "AI" | "HUMAN";
  informationOnly?: boolean;
  replyStatus?: "UP_TO_DATE" | "QUEUED" | "PROCESSING" | "TEAM_REVIEW" | "HUMAN_REPLY";
  state: string;
  offer: null | { name: string; terms: string; amount: number; currency: string; paymentInstructions: string };
  messages: Array<{ id: string; role: "customer" | "seller"; body: string; at: string }>;
  stopped: boolean;
};
const messageClass = cva("max-w-prose rounded-xl border border-border p-4 sm:p-5", {
  variants: { role: {
    customer: "ml-6 rounded-br-sm bg-muted/40 sm:ml-12",
    seller: "mr-6 rounded-tl-sm bg-surface-raised sm:mr-12",
  } },
});
const replyStatusText = {
  QUEUED: "Votre message est reçu et attend une réponse.",
  PROCESSING: "Votre interlocuteur prépare sa réponse.",
  TEAM_REVIEW: "Votre message est reçu. L’équipe peut reprendre cet échange.",
  HUMAN_REPLY: "Votre message est transmis à l’équipe.",
};

/** The public welcome and each private dossier keep the same conversation shell. */
export function SalesCustomerChat({ token }: { token: string }) {
  const [data, setData] = useState<Conversation | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ body: string; requestId: string } | null>(null);
  const followLatest = useRef(true);
  const latest = useRef<HTMLDivElement>(null);
  const lastMessageId = data?.messages.at(-1)?.id;
  const load = useCallback(async () => {
    const response = await fetch(`/api/sales/${token}`, { cache: "no-store" });
    if (!response.ok) throw Error("Cette conversation est indisponible.");
    setData(await response.json() as Conversation);
  }, [token]);
  useEffect(() => {
    void load().catch(cause => setError(cause.message));
    const timer = setInterval(() => { void load().catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    const trackPosition = () => { followLatest.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160; };
    window.addEventListener("scroll", trackPosition, { passive: true });
    return () => window.removeEventListener("scroll", trackPosition);
  }, []);
  useEffect(() => {
    if (!lastMessageId || !followLatest.current) return;
    const frame = requestAnimationFrame(() => latest.current?.scrollIntoView?.({ block: "end", behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [lastMessageId]);

  async function send() {
    const message = pending ?? { body: body.trim(), requestId: crypto.randomUUID() };
    if (!message.body || busy) return;
    setBusy(true); setError(""); setPending(message);
    try {
      const response = await fetch(`/api/sales/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
      if (!response.ok) throw Error("Envoi non confirmé. Réessayez pour vérifier le même message.");
      setPending(null); setBody(""); followLatest.current = true; await load();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center gap-3 border-b border-border py-5 sm:py-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised"><MessageCircle aria-hidden className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0"><h1 className="break-words font-display text-xl font-semibold sm:text-2xl">{data?.brand ?? "Équipe commerciale"}</h1><p className="mt-1 text-xs text-foreground-muted">{data?.sellerMode === "AI" ? "Assistant commercial IA · reprise possible par l’équipe" : "Votre conversation privée avec l’équipe"}</p></div>
      </header>
      <div className="flex-1 space-y-6 py-6 sm:py-8">
        {data?.informationOnly && <p className="max-w-prose text-sm leading-relaxed text-foreground-muted">L’équipe doit confirmer les prestations et les conditions avant toute souscription.</p>}
        {!data?.informationOnly && data?.offer && ["PROPOSAL", "OBJECTION", "ACCEPTED", "PAID", "DELIVERED"].includes(data.state) && <details className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5" open>
          <summary className="cursor-pointer font-medium">{data.offer.name} · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: data.offer.currency }).format(data.offer.amount)}</summary>
          <div className="mt-4 space-y-3 text-sm"><p className="whitespace-pre-wrap break-words">{data.offer.terms}</p>
            {["ACCEPTED", "PAID", "DELIVERED"].includes(data.state) && <p className="whitespace-pre-wrap break-words">{data.offer.paymentInstructions}</p>}
            {data.payment && <section className="space-y-2 border-t border-border pt-3" aria-label="Paiement de l’affaire">
              <p>Référence du paiement : <strong className="break-all">{data.payment.reference}</strong></p><p>Bénéficiaire : {data.payment.beneficiary}</p>
              <p>{data.payment.status === "PAID" ? "Paiement vérifié par l’équipe." : data.payment.status === "FAILED" ? "Le paiement n’est pas confirmé. Demandez à votre interlocuteur." : "L’équipe doit encore vérifier le paiement."}</p>
            </section>}
          </div>
        </details>}
        {data?.stopped && <p role="status" className="rounded-lg border border-border p-4 text-sm text-foreground-muted">Votre demande d’arrêt est enregistrée. L’équipe ne vous relance plus.</p>}
        <section aria-label="Conversation" aria-live="polite" className="space-y-4">
          {!data && !error && <p role="status" className="text-sm text-foreground-muted">Chargement de votre conversation…</p>}
          {data?.messages.length === 0 && <p className="max-w-prose rounded-xl rounded-tl-sm border border-border bg-surface-raised p-5 text-sm text-foreground-muted">Vous pouvez poser votre première question ici.</p>}
          {data?.messages.map(message => <article key={message.id} className={messageClass({ role: message.role })}>
            <p className="mb-3 text-xs text-foreground-muted">{message.role === "customer" ? "Vous" : data.brand} · {new Date(message.at).toLocaleString("fr-FR")}</p>
            <MarkdownContent className="break-words text-sm leading-relaxed">{message.body}</MarkdownContent>
          </article>)}
        </section>
        {!data?.stopped && data?.replyStatus && data.replyStatus !== "UP_TO_DATE" && <p role="status" className="text-sm leading-relaxed text-foreground-muted">{replyStatusText[data.replyStatus]}</p>}
        <div ref={latest} className="scroll-mb-64" aria-hidden />
      </div>
      <form onSubmit={event => { event.preventDefault(); void send(); }} className="sticky bottom-0 space-y-3 border-t border-border bg-background pb-5 pt-4 sm:pb-6">
        <label htmlFor="sales-message" className="sr-only">Votre message</label>
        <textarea id="sales-message" maxLength={4000} rows={3} placeholder="Votre message…" disabled={busy || Boolean(pending)} value={body} onChange={event => setBody(event.target.value)} className="min-h-28 w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60" />
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-sm text-xs leading-relaxed text-foreground-muted">Gardez ce lien privé pour retrouver votre conversation.</p><button type="submit" disabled={busy || !data || (!pending && !body.trim())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"><Send aria-hidden className="h-4 w-4" />{busy ? "Envoi…" : pending ? "Vérifier l’envoi" : "Envoyer"}</button></div>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </form>
    </div>
  </main>;
}
