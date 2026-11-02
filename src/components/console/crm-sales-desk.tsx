"use client";

import { useState } from "react";
import { CrmSalesTreeEditor } from "./crm-sales-tree-editor";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { conversationTreeSchema, salesStateSchema, type SalesStep } from "@/server/services/crm-engine/commercial";

const channels = ["PHONE", "EMAIL", "WHATSAPP", "SMS", "WEB", "SOCIAL", "IN_PERSON"] as const;
const channelNames = ["Téléphone", "Email", "WhatsApp", "SMS", "Chat web", "Réseau social", "Face à face"];
const stateNames: Record<string, string> = { DISCOVERY: "À qualifier", QUALIFIED: "Acheteur qualifié", PARTNER: "Partenariat", AUDIENCE: "Public à informer", PROPOSAL: "Offre présentée", OBJECTION: "Objection à traiter", ACCEPTED: "Accord obtenu", PAID: "Règlement confirmé", DELIVERED: "Prestation remise", STOPPED: "Contact arrêté" };
const fieldClass = "w-full rounded border border-border bg-background px-3 py-2 text-sm";

export function CrmSalesDesk() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const brands = trpc.strategy.list.useQuery({});
  const deals = trpc.crm.listDeals.useQuery({ limit: 500 });
  const [selected, setSelected] = useState("");
  const [brandId, setBrandId] = useState("");
  const [channel, setChannel] = useState<(typeof channels)[number]>("PHONE");
  const [error, setError] = useState("");
  const [decision, setDecision] = useState("");
  const [customerLink, setCustomerLink] = useState<{ dealId: string; url: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingReply, setPendingReply] = useState<{ dealId: string; requestId: string; channel: "WEB" | "EMAIL"; body: string; subject?: string } | null>(null);
  const detail = trpc.crm.getDeal.useQuery({ id: selected }, { enabled: Boolean(selected) });
  const history = trpc.crm.listActivities.useQuery({ dealId: selected }, { enabled: Boolean(selected) });
  const create = trpc.crm.createDeal.useMutation();
  const update = trpc.crm.updateDeal.useMutation();
  const deal = detail.data;
  const state = salesStateSchema.safeParse(deal?.commercial ?? {});
  const sale = state.success ? state.data : null;
  const sellerBrandId = deal?.sellerStrategyId ?? brandId;
  const roster = trpc.crm.listSalesRepresentatives.useQuery({ strategyId: sellerBrandId }, { enabled: Boolean(sellerBrandId) });
  const people = trpc.crm.salesRosterOptions.useQuery({ strategyId: sellerBrandId }, { enabled: Boolean(sellerBrandId) });
  const inbound = trpc.crm.recordInboundSalesMessage.useMutation();
  const access = trpc.crm.createSalesCustomerAccess.useMutation();
  const reply = trpc.crm.sendSalesCustomerMessage.useMutation();
  const customerMessages = trpc.crm.listSalesMessages.useQuery({ dealId: selected }, { enabled: Boolean(selected), refetchInterval: 5000 });
  const principalOptions = [
    { id: session?.user.id ?? "", label: `Moi · ${session?.user.name ?? session?.user.email ?? "Responsable"}` },
    ...(roster.data?.map(person => ({ id: person.principalId ?? "", label: `${person.name} · ${person.mode === "AI" ? "IA" : "humain"}${person.status !== "ACTIVE" ? " · en préparation / pause" : ""}` })) ?? []),
    ...(people.data?.users.filter(person => person.id !== session?.user.id).map(person => ({ id: person.id, label: person.name ?? person.email ?? "Membre de l’équipe" })) ?? []),
  ].filter((person, index, all) => person.id && all.findIndex(item => item.id === person.id) === index);
  const brand = brands.data?.find(item => item.id === sellerBrandId);
  const pillar = brand?.pillars.find(item => item.key === "v");
  const catalogue = (pillar?.content as { produitsCatalogue?: { id?: string; nom: string; prix?: number; conditionsTarifaires?: string }[] } | undefined)?.produitsCatalogue ?? [];
  const [offerId, setOfferId] = useState("");
  const offer = catalogue.find(item => item.id === offerId);
  const admin = session?.user.role === "ADMIN";

  async function refresh() {
    await Promise.all([utils.crm.invalidate(), utils.strategy.list.invalidate()]);
  }
  async function act(command: SalesStep["command"]) {
    if (!deal) return;
    setError("");
    try {
      await update.mutateAsync({ dealId: deal.id, salesStep: {
        requestId: crypto.randomUUID(), expectedRevision: deal.revision, channel, command,
      } });
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
  }
  function input(form: FormData, key: string) { return String(form.get(key) ?? "").trim(); }

  return (
    <section className="space-y-4 rounded-xl border border-border p-5">
      <h2 className="text-lg font-semibold">Poste commercial</h2>
      <p className="text-sm text-foreground-muted">Choisir une affaire, préparer le prochain échange et retrouver ses engagements.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Affaire
          <select className={fieldClass} value={selected} onChange={event => setSelected(event.target.value)}>
            <option value="">Créer une affaire</option>
            {deals.data?.map(item => <option key={item.id} value={item.id}>{item.companyName} · {item.contactName}</option>)}
          </select>
        </label>
        <label>Point de contact
          <select className={fieldClass} value={channel} onChange={event => setChannel(event.target.value as typeof channel)}>
            {channels.map((item, index) => <option key={item} value={item}>{channelNames[index]}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-foreground-muted">{channel === "WEB" ? "Conversation privée : les messages du client restent dans ce dossier." : channel === "EMAIL" ? "Email : envoi depuis le dossier si le mandat et l’adresse de marque le permettent. Consignez les réponses reçues dans votre messagerie ou invitez le client dans la conversation privée." : "Échange réalisé par votre équipe sur ce point de contact. Consignez la réponse reçue pour que le vendeur puisse poursuivre le même dossier."}</p>
      {!selected && (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={async event => {
          event.preventDefault(); const form = new FormData(event.currentTarget); setError("");
          try {
            const id = await create.mutateAsync({
              sellerStrategyId: brandId, contactName: input(form, "name"), companyName: input(form, "company"),
              contactEmail: input(form, "email") || undefined, contactPhone: input(form, "phone") || undefined,
              source: "SALES_DESK",
            });
            setSelected(id); await refresh();
          } catch (cause) { setError((cause as Error).message); }
        }}>
          <label>Marque vendeuse<select className={fieldClass} required value={brandId} onChange={event => setBrandId(event.target.value)}>
            <option value="">Choisir une marque</option>
            {brands.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label>Entreprise acheteuse<input className={fieldClass} name="company" required /></label>
          <label>Interlocuteur<input className={fieldClass} name="name" required /></label>
          <label>Téléphone<input className={fieldClass} name="phone" type="tel" /></label>
          <label>Email<input className={fieldClass} name="email" type="email" /></label>
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={create.isPending}>Ouvrir le dossier</button>
        </form>
      )}
      {deal && sale && (
        <div className="space-y-4">
          <p>{brand?.name ?? "Marque à rattacher"} → {deal.companyName} · {stateNames[sale.node] ?? sale.node}</p>
          <p className="font-medium">{sale.nextAction ?? "Faire approuver le mandat et l’offre."}</p>
          {sale.nextDeadline && <p>Prochaine échéance {new Date(sale.nextDeadline).toLocaleString("fr-FR")}</p>}
          {sale.mandate && <div className="space-y-1 text-sm">
            <p>{sale.mandate.offerName} · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: sale.mandate.currency }).format(sale.mandate.amount)}</p>
            <p>{sale.mandate.terms}</p>
            <p>Mandat valable jusqu’au {new Date(sale.mandate.expiresAt).toLocaleString("fr-FR")}</p>
          </div>}
          {!deal.sellerStrategyId && <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <p>Cette affaire historique ne désigne pas encore de marque vendeuse. Préparez une affaire de vente pour lui confier une offre et un vendeur.</p>
            <button type="button" className="rounded border border-border px-3 py-2" onClick={() => { setSelected(""); setDecision(""); }}>Préparer une affaire de vente</button>
          </div>}
          {admin && deal.sellerStrategyId && sale.node === "DISCOVERY" && (
            <details>
              <summary>Approuver le mandat de vente</summary>
              <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={event => {
                event.preventDefault(); const form = new FormData(event.currentTarget);
                if (!offer || !pillar) return;
                let conversationTree;
                try {
                  const source = input(form, "tree");
                  conversationTree = source ? conversationTreeSchema.parse(JSON.parse(source)) : undefined;
                } catch { setError("Vérifier les étapes et les réponses de l’arbre."); return; }
                void act({ type: "MANDATE", mandate: {
                  outboundEmailEnabled: form.get("outboundEmail") === "on",
                  conversationTree, intakePaymentReference: input(form, "paymentRef") || undefined,
                  offerId, offerName: offer.nom, offerVersion: String(pillar.currentVersion),
                  amount: Number(input(form, "amount")), currency: input(form, "currency"),
                  terms: input(form, "terms"), beneficiary: input(form, "beneficiary"),
                  sellerId: input(form, "seller"), deliveryOwnerId: input(form, "delivery"),
                  paymentInstructions: input(form, "payment"), expiresAt: new Date(input(form, "expiry")).toISOString(), channels: form.getAll("channels") as (typeof channels)[number][],
                } });
              }}>
                <label>Offre du catalogue<select className={fieldClass} value={offerId} onChange={event => setOfferId(event.target.value)} required>
                  <option value="">Choisir</option>{catalogue.filter(item => item.id).map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
                </select></label>
                <fieldset className="sm:col-span-2"><legend>Points de contact autorisés</legend>
                  <div className="flex flex-wrap gap-3">{channels.map((item, index) => <label key={item} className="flex gap-2">
                    <input type="checkbox" name="channels" value={item} defaultChecked={item === channel} />{channelNames[index]}
                  </label>)}</div>
                </fieldset>
                <label>Prix autorisé<input className={fieldClass} name="amount" type="number" min="0" step="0.01" required /></label>
                <label>Devise<input className={fieldClass} name="currency" pattern="[A-Z]{3}" placeholder="XOF" required /></label>
                <label>Validité<input className={fieldClass} name="expiry" type="datetime-local" required /></label>
                <label>Conditions et résultat promis<textarea className={fieldClass} name="terms" defaultValue={offer?.conditionsTarifaires} required /></label>
                <label>Entité bénéficiaire<input className={fieldClass} name="beneficiary" required /></label>
                <label>Vendeur titulaire<select className={fieldClass} name="seller" defaultValue={session?.user.id} required>{principalOptions.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
                <label>Responsable de remise<select className={fieldClass} name="delivery" defaultValue={session?.user.id} required>{principalOptions.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
                <label>Instructions de règlement<textarea className={fieldClass} name="payment" required /></label>
                <label className="flex gap-2"><input type="checkbox" name="outboundEmail" />Autoriser l’envoi au contact email de cette affaire</label>
                <label>Référence du paiement La Fusée, si applicable<input className={fieldClass} name="paymentRef" /></label>
                <details className="sm:col-span-2"><summary>Arbre de conversation approuvé</summary>
                  <CrmSalesTreeEditor />
                </details>
                <button className="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={update.isPending}>Approuver ces conditions</button>
              </form>
            </details>
          )}
          {sale.mandate?.conversationTree && (
            <form className="space-y-3" onSubmit={event => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              void act({ type: "BRANCH", choiceId: input(form, "choice"), evidence: input(form, "response") });
            }}>
              <label>Réponse observée<select className={fieldClass} name="choice" required>
                {sale.mandate.conversationTree.nodes.find(node => node.id === sale.treeNodeId)?.choices.map(choice =>
                  <option key={choice.id} value={choice.id}>{choice.label}</option>)}
              </select></label>
              <label>Réponse du client ou référence<textarea className={fieldClass} name="response" required /></label>
              <button className="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={update.isPending}>Poursuivre la conversation</button>
            </form>
          )}
          {sale.mandate && sale.node !== "STOPPED" && (
            <form className="space-y-3" onSubmit={event => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              const type = input(form, "decision");
              const evidence = input(form, "evidence");
              switch (type) {
                case "BUYER": case "PARTNER": case "AUDIENCE": void act({ type: "QUALIFY", role: type, need: evidence }); break;
                case "PROPOSE": void act({ type }); break;
                case "OBJECTION": case "ACCEPT": case "STOP": void act({ type, evidence }); break;
                case "PAYMENT": void act({ type, evidence, amount: Number(input(form, "amount")), currency: input(form, "currency") }); break;
                case "HANDOVER": void act({ type, sellerId: input(form, "handoverSeller") }); break;
                case "DELIVER": void act({ type, evidence, nextAction: input(form, "nextAction"), nextDeadline: new Date(input(form, "nextDeadline")).toISOString() }); break;
              }
            }}>
              <label>Décision<select className={fieldClass} name="decision" onChange={event => setDecision(event.target.value)}>
                {(!sale.mandate.conversationTree && ["DISCOVERY", "QUALIFIED"].includes(sale.node)) && <>
                  <option value="BUYER">Qualifier un acheteur</option>
                  <option value="PARTNER">Orienter un partenaire</option>
                  <option value="AUDIENCE">Orienter le public</option>
                </>}
                {(!sale.mandate.conversationTree && ["QUALIFIED", "OBJECTION"].includes(sale.node)) && <option value="PROPOSE">Présenter l’offre</option>}
                {(!sale.mandate.conversationTree && ["PROPOSAL", "OBJECTION"].includes(sale.node)) && <option value="OBJECTION">Consigner une objection</option>}
                {(!sale.mandate.conversationTree && sale.node === "PROPOSAL") && <option value="ACCEPT">Consigner l’accord explicite</option>}
                {admin && sale.node === "ACCEPTED" && <option value="PAYMENT">Rapprocher un règlement</option>}
                {sale.node === "PAID" && <option value="DELIVER">Attester la remise</option>}
                <option value="STOP">Arrêter le contact</option>
                {admin && !sale.contactStopped && <option value="HANDOVER">Transférer le dossier</option>}
              </select></label>
              <label>Observation ou référence de preuve<textarea className={fieldClass} name="evidence" /></label>
              {decision === "HANDOVER" && <label>Reprendre avec<select className={fieldClass} name="handoverSeller" required>{principalOptions.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>}
              {admin && sale.node === "ACCEPTED" && <div className="grid gap-3 sm:grid-cols-2">
                <label>Montant effectivement reçu<input className={fieldClass} name="amount" type="number" step="0.01" min="0" /></label>
                <label>Devise reçue<input className={fieldClass} name="currency" /></label>
              </div>}
              {sale.node === "PAID" && <>
                <label>Prochaine action<input className={fieldClass} name="nextAction" required /></label>
                <label>Prochaine échéance<input className={fieldClass} name="nextDeadline" type="datetime-local" required /></label>
              </>}
              <button className="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={update.isPending}>Enregistrer la décision</button>
            </form>
          )}
          {deal.sellerStrategyId && sale.mandate && <section className="space-y-3 rounded-lg border border-border p-4" aria-label="Conversation client">
            <h3 className="font-medium">Conversation avec le client</h3>
            <p className="text-sm text-foreground-muted">Le client échange normalement dans un espace privé de la marque. Le vendeur retrouve ses réponses dans cette affaire.</p>
            <button type="button" className="rounded border border-border px-3 py-2 text-sm" disabled={access.isPending} onClick={async () => {
              setError(""); setLinkCopied(false); setCustomerLink(null);
              try { const result = await access.mutateAsync({ dealId: deal.id }); setCustomerLink({ dealId: deal.id, url: window.location.origin + result.path }); }
              catch (cause) { setError((cause as Error).message); }
            }}>Obtenir le lien client</button>
            {customerLink?.dealId === deal.id && <div className="space-y-2">
              <label className="block text-sm">Lien privé à transmettre à l’interlocuteur<input className={fieldClass} aria-label="Lien de conversation client" readOnly value={customerLink.url} onFocus={event => event.currentTarget.select()} /></label>
              <button type="button" className="rounded border border-border px-3 py-2 text-sm" onClick={async () => {
                try { await navigator.clipboard.writeText(customerLink.url); setLinkCopied(true); }
                catch { setError("Sélectionnez le lien pour le copier manuellement."); }
              }}>{linkCopied ? "Lien copié" : "Copier le lien"}</button>
            </div>}
            <ol className="max-h-80 space-y-3 overflow-y-auto" aria-live="polite">{customerMessages.data?.map(message => <li key={message.id} className="space-y-1 border-t border-border pt-3 text-sm">
              <p className="text-xs text-foreground-muted">{message.direction === "IN" ? "Client" : "Équipe commerciale"} · {message.channel} · {message.status === "SENT" ? "envoyé" : message.status === "RECEIVED" ? "reçu" : message.status === "DRAFT" ? "brouillon" : message.status === "FAILED" ? "échec d’envoi" : "envoi à vérifier"} · {new Date(message.createdAt).toLocaleString("fr-FR")}</p>
              {message.subject && <p className="font-medium">{message.subject}</p>}<p className="whitespace-pre-wrap break-words">{message.body}</p>
            </li>)}</ol>
            {customerMessages.error && <p role="alert" className="text-sm text-error">{customerMessages.error.message}</p>}
            {!customerMessages.isLoading && !customerMessages.error && !customerMessages.data?.length && <p className="text-sm text-foreground-muted">Aucun échange reçu dans cette affaire.</p>}
            {sale.mandate.sellerId !== session?.user.id && <div className="space-y-2 border-t border-border pt-3 text-sm">
              <p>Le vendeur titulaire répond au client. Pour répondre vous-même, reprenez d’abord l’affaire.</p>
              {admin && <button type="button" className="rounded border border-border px-3 py-2" disabled={update.isPending} onClick={() => session?.user.id && void act({ type: "HANDOVER", sellerId: session.user.id })}>Reprendre la main</button>}
            </div>}
            <form className="space-y-3 border-t border-border pt-3" onSubmit={async event => {
              event.preventDefault(); const form = new FormData(event.currentTarget); const target = event.currentTarget; setError("");
              const request = pendingReply?.dealId === deal.id ? pendingReply : { dealId: deal.id, requestId: crypto.randomUUID(), channel: input(form, "replyChannel") as "WEB" | "EMAIL", body: input(form, "replyBody"), subject: input(form, "replySubject") || undefined };
              setPendingReply(request);
              try {
                const receipt = await reply.mutateAsync(request);
                if (receipt.status === "SENT") { setPendingReply(null); target.reset(); }
                else setError("L’envoi n’est pas confirmé. Vérifiez le même envoi avant de rédiger une nouvelle réponse.");
                await refresh();
              } catch (cause) {
                const code = (cause as { data?: { code?: string } }).data?.code;
                if (code && !["TIMEOUT", "INTERNAL_SERVER_ERROR"].includes(code)) setPendingReply(null);
                setError((cause as Error).message);
              }
            }}>
              <label className="block">Répondre sur<select name="replyChannel" className={fieldClass} disabled={pendingReply?.dealId === deal.id}>
                {sale.mandate.channels.includes("WEB") && <option value="WEB">Conversation privée de l’affaire</option>}
                {sale.mandate.channels.includes("EMAIL") && sale.mandate.outboundEmailEnabled && deal.contactEmail && <option value="EMAIL">Email du client</option>}
              </select></label>
              <label className="block">Objet, pour un email<input className={fieldClass} name="replySubject" maxLength={200} disabled={pendingReply?.dealId === deal.id} /></label>
              <label className="block">Votre réponse<textarea className={fieldClass} name="replyBody" rows={3} required maxLength={20000} disabled={pendingReply?.dealId === deal.id} /></label>
              <button className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50" disabled={reply.isPending || sale.mandate.sellerId !== session?.user.id || !!sale.contactStopped || !sale.mandate.channels.some(item => item === "WEB" || (item === "EMAIL" && sale.mandate?.outboundEmailEnabled && deal.contactEmail))}>{pendingReply?.dealId === deal.id ? "Vérifier le même envoi" : "Envoyer au client"}</button>
              {!sale.mandate.channels.some(item => item === "WEB" || (item === "EMAIL" && sale.mandate?.outboundEmailEnabled && deal.contactEmail)) && <p className="text-sm text-foreground-muted">Aucun canal d’envoi direct n’est autorisé dans ce mandat. Vous pouvez consigner les échanges réalisés sur les autres points de contact.</p>}
            </form>
          </section>}
          <details className="rounded-lg border border-border p-3"><summary>Consigner une réponse du client</summary>
            <p className="mt-2 text-sm text-foreground-muted">Pour un appel, une rencontre ou un message reçu hors de la conversation de l’affaire. Le vendeur actif reprend cette réponse dans son dossier.</p>
            <form className="mt-3 space-y-3" onSubmit={async event => {
              event.preventDefault(); const form = new FormData(event.currentTarget); const target = event.currentTarget; setError("");
              try { await inbound.mutateAsync({ dealId: deal.id, channel, body: input(form, "body"), subject: input(form, "subject") || undefined, externalId: crypto.randomUUID() }); target.reset(); await refresh(); }
              catch (cause) { setError((cause as Error).message); }
            }}>
              <label className="block">Objet, si utile<input name="subject" className={fieldClass} maxLength={200} /></label>
              <label className="block">Réponse effectivement reçue<textarea name="body" className={fieldClass} required rows={3} maxLength={20000} /></label>
              <button className="rounded bg-primary px-4 py-2 text-primary-foreground" disabled={inbound.isPending}>Enregistrer la réponse</button>
            </form>
          </details>
          <details><summary>Historique de l’affaire</summary>
            <ol className="mt-2 space-y-2">{history.data?.map(item => <li key={item.id} className="text-sm">{new Date(item.performedAt).toLocaleString("fr-FR")} · {item.description}</li>)}</ol>
          </details>
        </div>
      )}
      {(error || detail.error || deals.error) && <p role="alert" className="text-error">{error || detail.error?.message || deals.error?.message}</p>}
    </section>
  );
}
