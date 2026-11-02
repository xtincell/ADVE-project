"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { conversationTreeSchema, salesStateSchema, type SalesStep } from "@/server/services/crm-engine/commercial";

const channels = ["PHONE", "EMAIL", "WHATSAPP", "SMS", "WEB", "SOCIAL", "IN_PERSON"] as const;
const channelNames = ["Téléphone", "Email", "WhatsApp", "SMS", "Chat web", "Réseau social", "Face à face"];
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
  const detail = trpc.crm.getDeal.useQuery({ id: selected }, { enabled: Boolean(selected) });
  const history = trpc.crm.listActivities.useQuery({ dealId: selected }, { enabled: Boolean(selected) });
  const create = trpc.crm.createDeal.useMutation();
  const update = trpc.crm.updateDeal.useMutation();
  const deal = detail.data;
  const state = salesStateSchema.safeParse(deal?.commercial ?? {});
  const sale = state.success ? state.data : null;
  const brand = brands.data?.find(item => item.id === (deal?.sellerStrategyId ?? brandId));
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
          <p>{brand?.name ?? "Marque à rattacher"} → {deal.companyName} · {sale.node}</p>
          <p className="font-medium">{sale.nextAction ?? "Faire approuver le mandat et l’offre."}</p>
          {sale.nextDeadline && <p>Prochaine échéance {new Date(sale.nextDeadline).toLocaleString("fr-FR")}</p>}
          {sale.mandate && <div className="space-y-1 text-sm">
            <p>{sale.mandate.offerName} · {new Intl.NumberFormat("fr-FR", { style: "currency", currency: sale.mandate.currency }).format(sale.mandate.amount)}</p>
            <p>{sale.mandate.terms}</p>
            <p>Mandat valable jusqu’au {new Date(sale.mandate.expiresAt).toLocaleString("fr-FR")}</p>
          </div>}
          {admin && sale.node === "DISCOVERY" && (
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
                <label>Identifiant du titulaire<input className={fieldClass} name="seller" defaultValue={session?.user.id} required /></label>
                <label>Identifiant du responsable de remise<input className={fieldClass} name="delivery" defaultValue={session?.user.id} required /></label>
                <label>Instructions de règlement<textarea className={fieldClass} name="payment" required /></label>
                <label>Référence du paiement La Fusée, si applicable<input className={fieldClass} name="paymentRef" /></label>
                <details className="sm:col-span-2"><summary>Arbre de conversation approuvé</summary>
                  <p className="text-sm text-foreground-muted">Étapes, questions et réponses propres à la marque. Le titulaire retrouve cet arbre sur chaque canal.</p>
                  <textarea aria-label="Arbre de conversation" name="tree" className={fieldClass} rows={8} />
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
                case "HANDOVER": void act({ type, sellerId: evidence }); break;
                case "DELIVER": void act({ type, evidence, nextAction: input(form, "nextAction"), nextDeadline: new Date(input(form, "nextDeadline")).toISOString() }); break;
              }
            }}>
              <label>Décision<select className={fieldClass} name="decision">
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
                {sale.node !== "STOPPED" && <option value="STOP">Arrêter le contact</option>}
                {admin && !sale.contactStopped && sale.node !== "STOPPED" && <option value="HANDOVER">Transférer le dossier</option>}
              </select></label>
              <label>Observation, référence de preuve ou identifiant de reprise<textarea className={fieldClass} name="evidence" /></label>
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
          <details><summary>Historique de l’affaire</summary>
            <ol className="mt-2 space-y-2">{history.data?.map(item => <li key={item.id} className="text-sm">{new Date(item.performedAt).toLocaleString("fr-FR")} · {item.description}</li>)}</ol>
          </details>
        </div>
      )}
      {(error || detail.error || deals.error) && <p role="alert" className="text-error">{error || detail.error?.message || deals.error?.message}</p>}
    </section>
  );
}
