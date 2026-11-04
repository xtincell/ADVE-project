"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageCircle, Send } from "lucide-react";
import { cva } from "class-variance-authority";
import { MarkdownContent } from "@/components/shared/markdown-content";
import type { SalesProposal } from "@/server/services/crm-engine/offer-contract";
import { SalesHumanContactLink, type SalesHumanContact } from "./public-sales-entry";

type Conversation = {
  payment?: null | { reference: string; status: string; amount: number; currency: string; beneficiary: string; paidAt: string | null; provider?: string; paymentUrl?: string | null };
  checkout?: { available: boolean; provider: "CINETPAY"; beneficiary: string; requiresEmail: boolean; reason?: string };
  diagnostic?: { required: boolean; linked: boolean; canLink: boolean; companyName: string | null; preparation?: "NOT_STARTED" | "PREPARING" | "READY" | "NEEDS_REVIEW" } | null;
  brand: string;
  sellerMode?: "AI" | "HUMAN";
  informationOnly?: boolean;
  humanContact?: SalesHumanContact | null;
  deliveryDocument?: { activityId: string; url: string } | null;
  replyStatus?: "UP_TO_DATE" | "QUEUED" | "PROCESSING" | "TEAM_REVIEW" | "HUMAN_REPLY";
  state: string;
  proposal?: (SalesProposal & { documentUrl: string }) | null;
  offer: null | { name: string; terms: string; amount: number; currency: string; paymentInstructions: string };
  messages: Array<{ id: string; role: "customer" | "seller"; body: string; at: string }>;
  stopped: boolean;
  closed?: boolean;
};
type CustomerMessage = { body: string; requestId: string; proposalId?: string; deliveryActivityId?: string };
type CheckoutRequest = { requestId: string; proposalId: string; email: string };
const billingLabel = (billing?: SalesProposal["billing"]) => billing === "MONTHLY" ? "par mois" : billing === "YEARLY" ? "par an" : billing === "ONE_TIME" ? "paiement unique" : "";
const money = (amount: number, currency: string) => new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
function navigableDocumentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try { const parsed = new URL(value); return ["https:", "http:"].includes(parsed.protocol) && !parsed.username && !parsed.password ? value : null; }
  catch { return null; }
}
export function salesCheckoutUrl(value: unknown, localHost = false): string | null {
  if (typeof value !== "string" || value !== value.trim() || value.includes("#")) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.port && !parsed.hash &&
      (parsed.hostname === "secure.cinetpay.co" || (localHost && parsed.hostname === "secure.cinetpay.net")) ? value : null;
  } catch { return null; }
}
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

function SalesDiagnosticLink({ token, value, reload }: { token: string; value: NonNullable<Conversation["diagnostic"]>; reload: () => Promise<void> }) {
  const [intakeToken, setIntakeToken] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ requestId: string; intakeToken: string; email: string; consent: true } | null>(null);
  if (value.linked) return <section className="space-y-2 rounded-xl border border-border bg-surface-raised p-4 text-sm" aria-label="Diagnostic associé"><p>{value.companyName ? `Diagnostic associé : ${value.companyName}.` : "Votre diagnostic est associé à cette demande."}</p>{value.preparation === "PREPARING" && <p role="status">Actualisation du rapport en cours.</p>}{value.preparation === "NEEDS_REVIEW" && <p role="status">L’équipe doit vérifier la préparation du rapport.</p>}</section>;
  return <section aria-label="Associer mon diagnostic" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4 text-sm">
    <h2 className="font-medium">Associer mon diagnostic</h2>
    <p>Le rapport sera préparé à partir du diagnostic de votre marque. Associez-le à cette demande avant de payer.</p>
    {value.canLink ? <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setError("");
      if (!pending && (!intakeToken.trim() || !email.trim() || !consent)) { setError("Renseignez le lien du diagnostic, votre email et votre autorisation avant de continuer."); return; }
      const request = pending ?? { requestId: crypto.randomUUID(), intakeToken: intakeToken.trim(), email: email.trim(), consent: true as const }; setPending(request); setBusy(true);
      try {
        const response = await fetch(`/api/sales/${token}/diagnostic`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
        if (!response.ok) {
          if ([400, 403, 404, 409, 412, 413, 415, 422].includes(response.status)) { setPending(null); throw Error("Ce diagnostic n’a pas pu être associé. Vérifiez le lien et l’email utilisés pour le diagnostic."); }
          throw Error("L’association n’est pas confirmée. Vérifiez le même envoi avant de poursuivre.");
        }
        await reload(); setPending(null);
      } catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={busy || Boolean(pending)} className="space-y-3">
        <label className="block">Lien du résultat du diagnostic<input className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" value={intakeToken} onChange={event => setIntakeToken(event.target.value)} autoComplete="off" spellCheck={false} maxLength={2048} placeholder="Collez le lien du résultat ou son code" required /></label>
        <label className="block">Email utilisé pour le diagnostic<input className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" maxLength={254} required /></label>
        <label className="flex items-start gap-2"><input className="mt-1" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />J’autorise l’utilisation de ce diagnostic pour préparer et me remettre le rapport commandé.</label>
      </fieldset>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50" disabled={busy}>{busy ? "Association…" : pending ? "Vérifier le même envoi" : "Associer mon diagnostic"}</button>
    </form> : <p>L’équipe doit vérifier cette demande avant l’association du diagnostic.</p>}
    <p>Vous n’avez pas encore de diagnostic ? <a className="inline-flex min-h-10 items-center font-medium underline" href="/intake" target="_blank" rel="noreferrer">Faire mon diagnostic</a> puis revenez ici avec le lien du résultat.</p>
    {error && <p role="alert" className="text-error">{error}</p>}
  </section>;
}

/** The public welcome and each private dossier keep the same conversation shell. */
export function SalesCustomerChat({ token }: { token: string }) {
  const [data, setData] = useState<Conversation | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CustomerMessage | null>(null);
  const [confirmedProposalId, setConfirmedProposalId] = useState<string | null>(null);
  const [confirmedDeliveryId, setConfirmedDeliveryId] = useState<string | null>(null);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [pendingCheckout, setPendingCheckout] = useState<CheckoutRequest | null>(null);
  const [checkoutLink, setCheckoutLink] = useState<{ url: string; reference: string; proposalId: string } | null>(null);
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
          throw Error(message.deliveryActivityId ? "Ce document ne peut plus être confirmé. Relisez la conversation avant de poursuivre." : message.proposalId ? "Cette proposition ne peut pas être confirmée. Relisez la conversation avant de poursuivre." : "Ce message n’a pas pu être envoyé. Vérifiez-le avant de réessayer.");
        }
        throw Error("Envoi non confirmé. Réessayez pour vérifier le même message.");
      }
      if (message.proposalId) setConfirmedProposalId(message.proposalId);
      if (message.deliveryActivityId) setConfirmedDeliveryId(message.deliveryActivityId);
      setPending(null); if (!message.proposalId && !message.deliveryActivityId) setBody(""); followLatest.current = true; await load();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  const proposal = data && !data.informationOnly && ["PROPOSAL", "OBJECTION", "ACCEPTED", "PAID", "DELIVERED"].includes(data.state) ? data.proposal : null;
  const shownOffer = proposal ? { name: proposal.offerName, ...proposal } : data?.offer?.currency !== "XXX" ? data?.offer : null;
  const deliveredDocumentUrl = data && ["PAID", "DELIVERED"].includes(data.state) ? navigableDocumentUrl(data.deliveryDocument?.url) : null;
  const localHost = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const canCheckout = Boolean(data && !data.informationOnly && data.state === "ACCEPTED" && proposal && data.checkout?.available && data.checkout.provider === "CINETPAY" && data.payment?.status !== "PAID" && !(data.diagnostic?.required && !data.diagnostic.linked));
  const cachedCheckout = checkoutLink?.proposalId === proposal?.id && data?.payment?.status !== "FAILED" && (!data?.payment || data.payment.reference === checkoutLink?.reference) ? checkoutLink?.url : null;
  const resumeCheckout = canCheckout ? cachedCheckout ?? (data?.payment?.provider === "CINETPAY" && data.payment.status === "PENDING" ? salesCheckoutUrl(data.payment.paymentUrl, localHost) : null) : null;
  async function pay() {
    if (!canCheckout || !proposal || !data?.checkout || checkoutBusy) return;
    const request = pendingCheckout ?? { requestId: crypto.randomUUID(), proposalId: proposal.id, email: data.checkout.requiresEmail ? receiptEmail.trim() : "" };
    setPendingCheckout(request); setCheckoutBusy(true); setCheckoutError("");
    try {
      const response = await fetch(`/api/sales/${token}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      if (!response.ok) {
        if ([400, 403, 404, 409, 412, 413, 415, 422].includes(response.status)) { setPendingCheckout(null); void load().catch(() => {}); throw Error("Vérifiez l’adresse email et les conditions de la proposition avant de réessayer."); }
        throw Error("La demande de paiement n’est pas confirmée. Vérifiez la même demande avant de poursuivre.");
      }
      const result = await response.json() as { paymentUrl?: unknown; reference?: unknown; status?: unknown; provider?: unknown; beneficiary?: unknown; amount?: unknown; currency?: unknown };
      if (result.provider !== "CINETPAY" || typeof result.reference !== "string" || !result.reference || result.amount !== proposal.amount || result.currency !== proposal.currency || result.beneficiary !== data.checkout.beneficiary) throw Error("La demande de paiement ne correspond pas à la proposition. Vérifiez la même demande ou contactez l’équipe.");
      if (result.status === "PAID") { await load(); setPendingCheckout(null); return; }
      if (result.status === "FAILED") { setPendingCheckout(null); void load().catch(() => {}); throw Error("Le paiement n’a pas abouti. Relisez son état avant de réessayer."); }
      const url = result.status === "PENDING" ? salesCheckoutUrl(result.paymentUrl, localHost) : null;
      if (!url) throw Error("Le lien de paiement n’est pas confirmé. Vérifiez la même demande ou contactez l’équipe.");
      setCheckoutLink({ url, reference: result.reference, proposalId: proposal.id }); setPendingCheckout(null); window.open(url, "_self", "noreferrer");
    } catch (cause) { setCheckoutError((cause as Error).message); }
    finally { setCheckoutBusy(false); }
  }
  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center gap-3 border-b border-border py-5 sm:py-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised"><MessageCircle aria-hidden className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0"><h1 className="break-words font-display text-xl font-semibold sm:text-2xl">{data?.brand ?? "Équipe commerciale"}</h1><p className="mt-1 text-xs text-foreground-muted">{data?.sellerMode === "AI" ? "Assistant commercial IA · reprise possible par l’équipe" : "Votre conversation privée avec l’équipe"}</p></div>
      </header>
      <div className="flex-1 space-y-6 py-6 sm:py-8">
        {data?.informationOnly && <p className="max-w-prose text-sm leading-relaxed text-foreground-muted">L’équipe doit confirmer les prestations et les conditions avant toute souscription.</p>}
        {data?.diagnostic?.required && <SalesDiagnosticLink token={token} value={data.diagnostic} reload={load} />}
        {data && !data.informationOnly && shownOffer && ["PROPOSAL", "OBJECTION", "ACCEPTED", "PAID", "DELIVERED"].includes(data.state) && <details className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5" open>
          <summary className="cursor-pointer font-medium">{shownOffer.name} · {money(shownOffer.amount, shownOffer.currency)}{proposal ? ` · ${billingLabel(proposal.billing)}` : ""}</summary>
          <div className="mt-4 space-y-3 text-sm"><p className="whitespace-pre-wrap break-words">{shownOffer.terms}</p>
            {proposal && <>
              <p>Montant total à payer : {money(proposal.amount, proposal.currency)} · {billingLabel(proposal.billing)}</p>
              <p>Quantité : {proposal.quantity} · Pays : {proposal.countryCode}</p>
              {proposal.scope.length > 0 && <div><p className="font-medium">Ce qui est prévu</p><ul className="list-disc space-y-1 pl-5">{proposal.scope.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
              {proposal.exclusions.length > 0 && <div><p className="font-medium">Ce qui reste à part</p><ul className="list-disc space-y-1 pl-5">{proposal.exclusions.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
              <p className="break-all text-xs text-foreground-muted">Référence : {proposal.id}</p>
              {proposal.documentUrl === `/api/sales/${token}/proposal` && <div className="flex flex-wrap gap-x-5 gap-y-2"><a className="inline-flex min-h-10 items-center text-sm font-medium underline" href={proposal.documentUrl} target="_blank" rel="noreferrer">Ouvrir le devis</a><a className="inline-flex min-h-10 items-center text-sm font-medium underline" href={`${proposal.documentUrl}?format=md`} download>Télécharger le devis en Markdown</a></div>}
              {!data.stopped && data.state === "PROPOSAL" && confirmedProposalId !== proposal.id && <div><button type="button" disabled={busy || Boolean(pending)} onClick={() => void send({ requestId: crypto.randomUUID(), proposalId: proposal.id, body: `Je confirme la proposition ${proposal.id} : ${proposal.offerName}, quantité ${proposal.quantity}, montant total ${money(proposal.amount, proposal.currency)} (${proposal.currency}) ${billingLabel(proposal.billing)}. J’accepte les conditions de la proposition ${proposal.id} affichée ci-dessus.` })} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Confirmer cette proposition</button></div>}
              {confirmedProposalId === proposal.id && <p role="status" className="text-foreground-muted">Votre confirmation a été transmise à l’équipe.</p>}
            </>}
            {["ACCEPTED", "PAID", "DELIVERED"].includes(data.state) && data.offer && <p className="whitespace-pre-wrap break-words">{data.offer.paymentInstructions}</p>}
            {data.payment && <section className="space-y-2 border-t border-border pt-3" aria-label="Paiement de l’affaire" aria-live="polite">
              <p>Référence du paiement : <strong className="break-all">{data.payment.reference}</strong></p><p>Bénéficiaire : {data.payment.beneficiary}</p>
              <p>{data.payment.status === "PAID" ? data.payment.provider === "CINETPAY" ? "Paiement confirmé." : "Paiement vérifié par l’équipe." : data.payment.status === "FAILED" ? "Le paiement n’est pas confirmé. Demandez à votre interlocuteur." : data.payment.provider === "CINETPAY" ? "Vérification du paiement en cours." : "L’équipe doit encore vérifier le paiement."}</p>
            </section>}
            {canCheckout && <section className="space-y-3 border-t border-border pt-3" aria-label="Payer la proposition">
              <p>Vous réglez {money(proposal!.amount, proposal!.currency)} à {data.checkout!.beneficiary}.</p>
              {resumeCheckout ? <a className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={resumeCheckout} rel="noreferrer">Continuer le paiement sur CinetPay</a> : <form className="space-y-3" onSubmit={event => { event.preventDefault(); void pay(); }}>
                {data.checkout?.requiresEmail && <label className="block">Email pour le reçu<input type="email" autoComplete="email" value={receiptEmail} onChange={event => setReceiptEmail(event.target.value)} maxLength={254} required disabled={checkoutBusy || Boolean(pendingCheckout)} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60" /></label>}
                <button type="submit" disabled={checkoutBusy} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{checkoutBusy ? "Préparation du paiement…" : pendingCheckout ? "Vérifier la même demande" : "Payer cette proposition"}</button>
              </form>}
            </section>}
            {checkoutError && data.payment?.status !== "PAID" && <p role="alert" className="text-error">{checkoutError}</p>}
            {!canCheckout && data.state === "ACCEPTED" && data.payment?.status !== "PAID" && data.checkout?.reason && <p className="text-foreground-muted">{data.checkout.reason}</p>}
            {deliveredDocumentUrl && data.deliveryDocument && <div className="space-y-3"><a className="inline-flex min-h-11 items-center text-sm font-medium underline" href={deliveredDocumentUrl} target="_blank" rel="noreferrer">Ouvrir votre document</a>
              {data.state === "PAID" && !data.stopped && !data.closed && confirmedDeliveryId !== data.deliveryDocument.activityId && <div><button type="button" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50" disabled={busy || Boolean(pending)} onClick={() => void send({ requestId: crypto.randomUUID(), deliveryActivityId: data.deliveryDocument!.activityId, body: "Je confirme avoir reçu le document remis dans cette conversation." })}>J’ai bien reçu ce document</button></div>}
              {confirmedDeliveryId === data.deliveryDocument.activityId && <p role="status">Votre confirmation de réception a été transmise à l’équipe.</p>}
            </div>}
          </div>
        </details>}
        {data?.humanContact && <SalesHumanContactLink contact={data.humanContact} brand={data.brand} proposalReference={proposal?.id} />}
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
