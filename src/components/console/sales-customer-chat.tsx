"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageCircle, Send } from "lucide-react";
import { cva } from "class-variance-authority";
import { MarkdownContent } from "@/components/shared/markdown-content";
import type { SalesProposal } from "@/server/services/crm-engine/offer-contract";

type Conversation = {
  payment?: null | { reference: string; status: string; amount: number; currency: string; beneficiary: string; paidAt: string | null };
  brand: string;
  sellerMode?: "AI" | "HUMAN";
  informationOnly?: boolean;
  replyStatus?: "UP_TO_DATE" | "QUEUED" | "PROCESSING" | "TEAM_REVIEW" | "HUMAN_REPLY";
  state: string;
  proposal?: (SalesProposal & { documentUrl: string }) | null;
  offer: null | { name: string; terms: string; amount: number; currency: string; paymentInstructions: string };
  messages: Array<{ id: string; role: "customer" | "seller"; body: string; at: string }>;
  stopped: boolean;
};
type CustomerMessage = { body: string; requestId: string; proposalId?: string };
const billingLabel = (billing?: SalesProposal["billing"]) => billing === "MONTHLY" ? "par mois" : billing === "YEARLY" ? "par an" : billing === "ONE_TIME" ? "paiement unique" : "";
const money = (amount: number, currency: string) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
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
  const [pending, setPending] = useState<CustomerMessage | null>(null);
  const [confirmedProposalId, setConfirmedProposalId] = useState<string | null>(null);
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

  async function send(confirmation?: CustomerMessage) {
    const message = pending ?? confirmation ?? { body: body.trim(), requestId: crypto.randomUUID() };
    if (!message.body || busy) return;
    setBusy(true); setError(""); setPending(message);
    try {
      const response = await fetch(`/api/sales/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
      if (!response.ok) {
        if ([400, 403, 404, 409, 413, 415].includes(response.status)) {
          setPending(null); void load().catch(() => {});
          throw Error(message.proposalId ? "Cette proposition ne peut pas être confirmée. Relisez la conversation avant de poursuivre." : "Ce message n’a pas pu être envoyé. Vérifiez-le avant de réessayer.");
        }
        throw Error("Envoi non confirmé. Réessayez pour vérifier le même message.");
      }
      if (message.proposalId) setConfirmedProposalId(message.proposalId);
      setPending(null); if (!message.proposalId) setBody(""); followLatest.current = true; await load();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const proposal = data?.proposal;
  const shownOffer = proposal ? { name: proposal.offerName, ...proposal } : data?.offer?.currency !== "XXX" ? data?.offer : null;
  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center gap-3 border-b border-border py-5 sm:py-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised"><MessageCircle aria-hidden className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0"><h1 className="break-words font-display text-xl font-semibold sm:text-2xl">{data?.brand ?? "Équipe commerciale"}</h1><p className="mt-1 text-xs text-foreground-muted">{data?.sellerMode === "AI" ? "Assistant commercial IA · reprise possible par l’équipe" : "Votre conversation privée avec l’équipe"}</p></div>
      </header>
      <div className="flex-1 space-y-6 py-6 sm:py-8">
        {data?.informationOnly && <p className="max-w-prose text-sm leading-relaxed text-foreground-muted">L’équipe doit confirmer les prestations et les conditions avant toute souscription.</p>}
        {data && !data.informationOnly && shownOffer && ["PROPOSAL", "OBJECTION", "ACCEPTED", "PAID", "DELIVERED"].includes(data.state) && <details className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5" open>
          <summary className="cursor-pointer font-medium">{shownOffer.name} · {money(shownOffer.amount, shownOffer.currency)}{proposal ? ` · ${billingLabel(proposal.billing)}` : ""}</summary>
          <div className="mt-4 space-y-3 text-sm"><p className="whitespace-pre-wrap break-words">{shownOffer.terms}</p>
            {proposal && <>
              <p>Montant total à payer : {money(proposal.amount, proposal.currency)} · {billingLabel(proposal.billing)}</p>
              <p>Quantité : {proposal.quantity} · Pays : {proposal.countryCode}</p>
              {proposal.scope.length > 0 && <div><p className="font-medium">Ce qui est prévu</p><ul className="list-disc space-y-1 pl-5">{proposal.scope.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
              {proposal.exclusions.length > 0 && <div><p className="font-medium">Ce qui reste à part</p><ul className="list-disc space-y-1 pl-5">{proposal.exclusions.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
              <p className="break-all text-xs text-foreground-muted">Référence : {proposal.id}</p>
              {proposal.documentUrl === `/api/sales/${token}/proposal` && <a className="inline-flex min-h-10 items-center text-sm font-medium underline" href={proposal.documentUrl} target="_blank" rel="noreferrer">Ouvrir le devis</a>}
              {!data.stopped && data.state === "PROPOSAL" && confirmedProposalId !== proposal.id && <div><button type="button" disabled={busy || Boolean(pending)} onClick={() => void send({ requestId: crypto.randomUUID(), proposalId: proposal.id, body: `Je confirme la proposition ${proposal.id} : ${proposal.offerName}, quantité ${proposal.quantity}, montant total ${money(proposal.amount, proposal.currency)} (${proposal.currency}) ${billingLabel(proposal.billing)}. J’accepte les conditions de la proposition ${proposal.id} affichée ci-dessus.` })} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Confirmer cette proposition</button></div>}
              {confirmedProposalId === proposal.id && <p role="status" className="text-foreground-muted">Votre confirmation a été transmise à l’équipe.</p>}
            </>}
            {["ACCEPTED", "PAID", "DELIVERED"].includes(data.state) && data.offer && <p className="whitespace-pre-wrap break-words">{data.offer.paymentInstructions}</p>}
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
