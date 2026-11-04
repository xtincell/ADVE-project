"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { MarkdownContent } from "@/components/shared/markdown-content";

export type SalesHumanContact = { name: string; whatsapp: string; whatsappUrl: string };
type Entry = {
  publicId: string;
  brandName: string;
  welcome: string;
  available: boolean;
  sellerMode: "AI" | "HUMAN";
  informationOnly?: boolean;
  humanContact?: SalesHumanContact | null;
  offers: Array<{ id: string; name: string; terms?: string; amount?: number; currency?: string }>;
};
type Opening = {
  requestId: string;
  clientSecret: string;
  message: string;
  displayName?: string;
  offerId?: string;
  path?: string;
};

const field = "w-full rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";
const privatePath = (value: unknown): value is string => typeof value === "string" && /^\/sales\/[a-f0-9]{64}$/.test(value);
const storageKey = (publicId: string) => `sales-entry:${publicId}`;

/** The visitor chooses whether to open WhatsApp; no conversation secret or message is copied. */
export function SalesHumanContactLink({ contact, brand, proposalReference }: { contact?: SalesHumanContact | null; brand: string; proposalReference?: string }) {
  if (!contact || !/^\d{8,15}$/.test(contact.whatsapp)) return null;
  const message = `Bonjour ${contact.name}, je vous contacte au sujet de ${brand}.${proposalReference ? `\nRéférence de la proposition : ${proposalReference}.` : ""}`;
  return <a className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">Échanger avec {contact.name} sur WhatsApp</a>;
}

/** Each browser keeps its own opening secret; knowing the public URL or request UUID grants no private access. */
export function PublicSalesEntry({ publicId }: { publicId: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [offerId, setOfferId] = useState("");
  const [pending, setPending] = useState<Opening | null>(null);
  const [resumePath, setResumePath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        const response = await fetch(`/api/sales-entry/${encodeURIComponent(publicId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Cette équipe ne prend pas de nouvelle conversation pour le moment.");
        const data = await response.json() as Entry;
        if (live) { setEntry(data); }
      } catch (cause) { if (live) setLoadError((cause as Error).message); }
      finally { if (live) setLoading(false); }
    }
    try {
      const raw = sessionStorage.getItem(storageKey(publicId));
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Opening>;
        if (privatePath(saved.path)) setResumePath(saved.path);
        else if (typeof saved.requestId === "string" && /^[a-f0-9]{64}$/.test(saved.clientSecret ?? "") && typeof saved.message === "string") {
          setPending(saved as Opening); setMessage(saved.message); setName(saved.displayName ?? "");
        }
      }
    } catch { /* Storage is optional: a first conversation still works in this tab. */ }
    void load();
    return () => { live = false; };
  }, [publicId]);

  async function start() {
    if (busy || (!pending && (!entry?.available || !message.trim()))) return;
    setBusy(true); setError("");
    const request = pending ?? {
      requestId: crypto.randomUUID(),
      clientSecret: Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join(""),
      message: message.trim(),
      ...(name.trim() ? { displayName: name.trim() } : {}),
      ...((entry?.offers.length ?? 0) > 1 && offerId ? { offerId } : {}),
    };
    setPending(request);
    try { sessionStorage.setItem(storageKey(publicId), JSON.stringify(request)); } catch { /* Same in-memory request remains available for retry. */ }
    try {
      const response = await fetch(`/api/sales-entry/${encodeURIComponent(publicId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
      });
      const result = await response.json() as { path?: string; error?: string };
      if ([400, 413, 415].includes(response.status)) {
        setPending(null);
        try { sessionStorage.removeItem(storageKey(publicId)); } catch { /* The rejected request created no conversation. */ }
      }
      if (!response.ok) throw new Error(result.error ?? (response.status === 429 ? "L’équipe a atteint sa capacité d’accueil. Revenez un peu plus tard." : "L’envoi n’est pas confirmé. Vérifiez cet envoi pour retrouver votre échange."));
      if (!privatePath(result.path)) throw new Error("L’envoi n’est pas confirmé. Vérifiez cet envoi pour retrouver votre échange.");
      try { sessionStorage.setItem(storageKey(publicId), JSON.stringify({ path: result.path })); } catch { /* The private link is opened immediately. */ }
      window.location.assign(result.path);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center gap-3 border-b border-border py-5 sm:py-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised"><MessageCircle aria-hidden className="h-5 w-5 text-primary" /></span>
        <div className="min-w-0"><h1 className="break-words font-display text-xl font-semibold sm:text-2xl">{entry?.brandName ?? "Votre interlocuteur commercial"}</h1><p className="mt-1 text-xs text-foreground-muted">{entry?.sellerMode === "AI" ? "Assistant commercial IA · reprise possible par l’équipe" : "Équipe commerciale"}</p></div>
      </header>
      <section className="flex-1 space-y-6 py-8 sm:py-10" aria-label="Début de la conversation" aria-busy={loading}>
        {loading ? <p role="status" className="text-sm text-foreground-muted">Chargement de l’équipe…</p> : entry ? <article className="max-w-prose rounded-xl rounded-tl-sm border border-border bg-surface-raised p-5 sm:p-6" aria-label="Message d’accueil">
          <p className="mb-3 text-xs font-medium text-foreground-muted">{entry.brandName}</p><MarkdownContent>{entry.welcome}</MarkdownContent>
        </article> : <p role="alert" className="max-w-prose rounded-xl border border-border p-5 text-sm leading-relaxed">{loadError}</p>}
        {entry?.informationOnly && <p className="max-w-prose text-sm leading-relaxed text-foreground-muted">L’équipe doit confirmer les prestations et les conditions avant toute souscription.</p>}
        {entry?.humanContact && <SalesHumanContactLink contact={entry.humanContact} brand={entry.brandName} />}
        {resumePath && <div className="space-y-3"><p className="text-sm text-foreground-muted">Votre conversation existe déjà dans cet onglet.</p><a className={button} href={resumePath}><ArrowLeft aria-hidden className="h-4 w-4" />Reprendre ma conversation</a></div>}
      </section>
      {!resumePath && <form className="sticky bottom-0 space-y-3 border-t border-border bg-background pb-5 pt-4 sm:pb-6" aria-label="Démarrer une conversation" onSubmit={event => { event.preventDefault(); void start(); }}>
        {entry && entry.offers.length > 1 && <label htmlFor="sales-public-offer" className="flex flex-wrap items-center gap-3 text-sm"><span className="text-foreground-muted">Votre sujet (facultatif)</span><select id="sales-public-offer" className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={pending?.offerId ?? offerId} onChange={event => setOfferId(event.target.value)} disabled={busy || Boolean(pending)}><option value="">Je ne sais pas encore</option>{entry.offers.map(offer => <option key={offer.id} value={offer.id}>{offer.name}</option>)}</select></label>}
        <label htmlFor="sales-public-message" className="sr-only">Votre premier message</label>
        <textarea id="sales-public-message" className={`${field} min-h-28 resize-y`} rows={3} maxLength={4000} minLength={1} value={message} onChange={event => setMessage(event.target.value)} disabled={busy || Boolean(pending)} placeholder="Votre question, votre besoin ou votre projet…" required />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label htmlFor="sales-public-name" className="min-w-0 flex-1 text-xs text-foreground-muted">Votre prénom (facultatif)<input id="sales-public-name" className="mt-1 block w-full max-w-56 rounded border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" autoComplete="given-name" maxLength={80} value={name} onChange={event => setName(event.target.value)} disabled={busy || Boolean(pending)} /></label>
          <button type="submit" className={button} disabled={busy || loading || (!pending && (!entry?.available || !message.trim()))}><Send aria-hidden className="h-4 w-4" />{busy ? "Ouverture…" : pending ? "Vérifier l’envoi" : "Envoyer"}</button>
        </div>
        {entry && !entry.available && <p role="status" className="text-sm text-foreground-muted">Cette équipe ne prend pas de nouvelle conversation pour le moment. Revenez un peu plus tard.</p>}
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <p className="text-xs leading-relaxed text-foreground-muted">Votre premier message ouvre un espace privé, sans créer de compte. Gardez ensuite le lien de votre conversation.</p>
      </form>}
    </div>
  </main>;
}
