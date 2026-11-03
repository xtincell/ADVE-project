"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { authorizeSalesPortfolioInput, type AuthorizeSalesPortfolioInput, type AuthorizedSalesPortfolio } from "@/server/services/crm-engine/portfolio-contract";
import { CrmSalesMandateFields, salesChannelNames, type SalesCatalogueOffer, type SalesPrincipalOption } from "./crm-sales-mandate-fields";

const field = "mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm";
const button = "rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const date = (value: string) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
const stateNames: Record<string, string> = { DISCOVERY: "À qualifier", QUALIFIED: "Acheteur qualifié", PARTNER: "Partenariat", AUDIENCE: "Public à informer", PROPOSAL: "Offre présentée", OBJECTION: "Objection à traiter", ACCEPTED: "Accord obtenu", PAID: "Règlement confirmé", DELIVERED: "Prestation remise", STOPPED: "Contact arrêté", QUEUED: "À traiter", RUNNING: "En cours", DONE: "Terminée", FAILED: "À reprendre", AMBIGUOUS: "À vérifier" };
type Representative = { id: string; name: string; status: string; mode: string; dailyTokenBudget: number; dailyRunLimit: number; maxTurns: number };
type FormProps = { strategyId: string; representative: Representative; catalogue: SalesCatalogueOffer[]; offerVersion: string; principals: SalesPrincipalOption[]; defaultPrincipalId?: string; authorize: (input: AuthorizeSalesPortfolioInput) => Promise<unknown>; onClose: () => void };

function summary(input: AuthorizeSalesPortfolioInput, principals: SalesPrincipalOption[]) {
  const mandate = input.mandate;
  const person = (id: string) => principals.find(item => item.id === id)?.label ?? "Membre désigné";
  return <div className="space-y-4 text-sm">
    <dl className="grid gap-3 sm:grid-cols-2">
      <div><dt className="text-foreground-muted">Marché et provenance</dt><dd className="break-words">{input.market} · {input.source.label}<br />{input.source.reference}</dd></div>
      <div><dt className="text-foreground-muted">Offre approuvée</dt><dd>{mandate.offerName} · catalogue version {mandate.offerVersion}<br />{new Intl.NumberFormat("fr-FR", { style: "currency", currency: mandate.currency }).format(mandate.amount)}</dd></div>
      <div className="sm:col-span-2"><dt className="text-foreground-muted">Motif autorisant le contact de ces personnes</dt><dd className="whitespace-pre-wrap break-words">{input.source.eligibilityBasis}</dd></div>
      <div className="sm:col-span-2"><dt className="text-foreground-muted">Conditions et résultat promis</dt><dd className="whitespace-pre-wrap break-words">{mandate.terms}</dd></div>
      <div><dt className="text-foreground-muted">Canaux autorisés</dt><dd>{mandate.channels.map(channel => salesChannelNames[channel]).join(", ")}{mandate.outboundEmailEnabled ? " · envoi email autorisé" : " · aucun envoi email autorisé"}</dd></div>
      <div><dt className="text-foreground-muted">Validité</dt><dd>Jusqu’au {date(mandate.expiresAt)}</dd></div>
      <div><dt className="text-foreground-muted">Responsables</dt><dd>Remise : {person(mandate.deliveryOwnerId)}<br />Rapprochement financier : {person(mandate.collection.financeOwnerId)}</dd></div>
      <div><dt className="text-foreground-muted">Bénéficiaire et destination attestée</dt><dd className="whitespace-pre-wrap break-words">{mandate.beneficiary}<br />{mandate.collection.destinationRef}</dd></div>
      <div className="sm:col-span-2"><dt className="text-foreground-muted">Instructions de règlement</dt><dd className="whitespace-pre-wrap break-words">{mandate.paymentInstructions}</dd></div>
      <div className="sm:col-span-2"><dt className="text-foreground-muted">Cadence autorisée</dt><dd>Premier contact : {date(mandate.outreachPolicy.firstContactAt)}.<br />{mandate.outreachPolicy.followUpAfterDays.length ? `Délais successifs entre les reprises : ${mandate.outreachPolicy.followUpAfterDays.map(day => `${day} jour${day > 1 ? "s" : ""}`).join(", puis ")}, depuis le dernier envoi confirmé.` : "Aucune relance automatique autorisée."}<br />{mandate.outreachPolicy.dailyOutboundLimit} sollicitation{mandate.outreachPolicy.dailyOutboundLimit > 1 ? "s" : ""} maximum par 24 h pour ce portefeuille ; au moins {mandate.outreachPolicy.minIntervalHours} h entre deux sollicitations du même contact dans cette marque.</dd></div>
    </dl>
    <div className="overflow-x-auto"><table className="w-full text-left"><caption className="pb-2 text-left font-medium">{input.members.length} contact{input.members.length > 1 ? "s" : ""} explicitement autorisé{input.members.length > 1 ? "s" : ""}</caption><thead><tr className="border-b border-border"><th className="p-2 font-medium">Origine</th><th className="p-2 font-medium">Entreprise et interlocuteur</th><th className="p-2 font-medium">Coordonnées</th></tr></thead><tbody>{input.members.map(member => <tr key={member.originKey} className="border-b border-border last:border-0"><td className="break-words p-2">{member.originKey}</td><td className="p-2">{member.companyName}<br />{member.contactName}</td><td className="break-words p-2">{member.contactEmail}{member.contactEmail && member.contactPhone && <br />}{member.contactPhone}</td></tr>)}</tbody></table></div>
    <details><summary className="cursor-pointer">{mandate.conversationTree ? `Parcours de vente personnalisé · version ${mandate.conversationTree.version}` : "Parcours de vente standard"}</summary>{mandate.conversationTree ? <ol className="mt-2 list-decimal space-y-2 pl-5">{mandate.conversationTree.nodes.map(node => <li key={node.id}><p>{node.prompt}</p><ul className="list-disc pl-4">{node.choices.map(choice => <li key={choice.id}>{choice.label}</li>)}</ul></li>)}</ol> : <p className="mt-2 text-foreground-muted">Qualifier le besoin et le rôle, présenter l’offre, obtenir un accord explicite, demander le règlement puis suivre la remise. Le paiement et la livraison conservent leurs preuves propres.</p>}</details>
  </div>;
}

/** Review is frozen before the one governed authorization; retries reuse exactly that request. */
export function SalesPortfolioAuthorizationForm({ strategyId, representative, catalogue, offerVersion, principals, defaultPrincipalId, authorize, onClose }: FormProps) {
  const [offerId, setOfferId] = useState("");
  const [memberKeys, setMemberKeys] = useState([0]);
  const [nextKey, setNextKey] = useState(1);
  const [review, setReview] = useState<AuthorizeSalesPortfolioInput | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
  return <div className="space-y-4">
    <form className={`space-y-5 ${review ? "hidden" : ""}`} aria-label="Préparer l’autorisation de portefeuille" onSubmit={event => {
      event.preventDefault(); setError("");
      const form = new FormData(event.currentTarget);
      const offer = catalogue.find(item => item.id === offerId);
      if (!offer) { setError("Choisissez une offre du catalogue de cette marque."); return; }
      try {
        const tree = read(form, "tree");
        const followUps = read(form, "followUps");
        const input = authorizeSalesPortfolioInput.parse({ strategyId, representativeId: representative.id, requestId: crypto.randomUUID(), market: read(form, "market"),
          source: { label: read(form, "sourceLabel"), reference: read(form, "sourceReference"), eligibilityBasis: read(form, "eligibilityBasis") },
          mandate: { offerId, offerVersion, offerName: offer.nom, amount: Number(read(form, "amount")), currency: read(form, "currency"), terms: read(form, "terms"), beneficiary: read(form, "beneficiary"), deliveryOwnerId: read(form, "delivery"), paymentInstructions: read(form, "payment"), expiresAt: new Date(read(form, "expiry")).toISOString(), channels: form.getAll("channels"), outboundEmailEnabled: form.get("outboundEmail") === "on", conversationTree: tree ? JSON.parse(tree) : undefined,
            outreachPolicy: { firstContactAt: new Date(read(form, "firstContactAt")).toISOString(), followUpAfterDays: followUps ? followUps.split(",").map(value => Number(value.trim())) : [], dailyOutboundLimit: Number(read(form, "dailyOutboundLimit")), minIntervalHours: Number(read(form, "minIntervalHours")) },
            collection: { mode: "MANUAL", destinationRef: read(form, "destinationRef"), financeOwnerId: read(form, "financeOwner") } }, collectionAttested: true,
          members: memberKeys.map(key => ({ originKey: read(form, `origin:${key}`), companyName: read(form, `company:${key}`), contactName: read(form, `contact:${key}`), contactEmail: read(form, `email:${key}`) || undefined, contactPhone: read(form, `phone:${key}`) || undefined })),
        });
        setReview(input); setUncertain(false);
      } catch (cause) {
        const issues = (cause as { issues?: { message: string; path: PropertyKey[] }[] }).issues;
        setError(issues ? issues.map(issue => issue.message).join(" ") : "Vérifiez les dates et le parcours de vente avant de continuer.");
      }
    }}>
      <p className="text-sm text-foreground-muted">{representative.name} traitera uniquement les personnes nommées ci-dessous, avec les mêmes conditions. Le catalogue propose une base ; vérifiez les conditions avant d’autoriser leur mise en vente.</p>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Offre et engagements communs</legend><CrmSalesMandateFields catalogue={catalogue} offerId={offerId} onOfferChange={setOfferId} offerVersion={offerVersion} principals={principals} defaultPrincipalId={defaultPrincipalId} showSeller={false} />
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input className="mt-1" type="checkbox" name="outboundEmail" />Autoriser ce vendeur à envoyer des emails aux adresses explicitement listées</label>
        <label>Destination précise du règlement<input className={field} name="destinationRef" maxLength={4000} placeholder="Référence de compte ou numéro de collecte de la marque" required /></label>
        <label>Responsable financier<select className={field} name="financeOwner" defaultValue={defaultPrincipalId} required>{principals.filter(person => !person.id.startsWith("mcp:")).map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Origine et droit de contacter</legend>
        <label>Marché concerné<input name="market" className={field} maxLength={200} placeholder="Ex. Restaurants · Abidjan, Côte d’Ivoire" required /></label>
        <label>Nom de la source<input name="sourceLabel" className={field} maxLength={200} placeholder="Ex. Partenaires rencontrés au salon" required /></label>
        <label className="sm:col-span-2">Référence de la source<input name="sourceReference" className={field} maxLength={1000} placeholder="Document, URL ou référence d’import permettant de retrouver l’origine" required /></label>
        <label className="sm:col-span-2">Pourquoi ces personnes peuvent-elles être contactées ?<textarea name="eligibilityBasis" className={field} minLength={8} maxLength={4000} placeholder="Précisez la relation, l’autorisation ou le motif applicable à ces contacts et à ce canal." required /></label>
        <p className="text-xs text-foreground-muted sm:col-span-2">Une inscription newsletter ne vaut pas autorisation de prospection. Cette source et ce motif s’appliquent à chaque ligne ; les refus de contact restent prioritaires.</p>
      </fieldset>
      <fieldset className="space-y-3"><legend className="mb-3 font-medium">Contacts autorisés · {memberKeys.length}/5</legend>
        {memberKeys.map((key, index) => <fieldset key={key} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"><legend className="px-1 text-sm">Contact {index + 1}</legend>
          <label className="sm:col-span-2">Référence du contact dans la source<input name={`origin:${key}`} className={field} maxLength={200} placeholder="Référence stable de ligne, fiche ou opportunité ; distincte de l’email" required /></label>
          <label>Entreprise<input name={`company:${key}`} className={field} maxLength={200} required /></label><label>Interlocuteur<input name={`contact:${key}`} className={field} maxLength={200} required /></label>
          <label>Email<input name={`email:${key}`} className={field} type="email" /></label><label>Téléphone<input name={`phone:${key}`} className={field} type="tel" minLength={3} maxLength={80} /></label>
          <p className="text-xs text-foreground-muted">Au moins une coordonnée propre à cette personne est nécessaire.</p>{memberKeys.length > 1 && <button className="justify-self-start text-sm underline sm:justify-self-end" type="button" onClick={() => setMemberKeys(keys => keys.filter(item => item !== key))}>Retirer ce contact</button>}
        </fieldset>)}
        <button type="button" className={button} disabled={memberKeys.length >= 5} onClick={() => { setMemberKeys(keys => [...keys, nextKey]); setNextKey(nextKey + 1); }}>Ajouter un contact explicite</button>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Cadence et limites</legend>
        <label>Premier contact à partir du<input name="firstContactAt" className={field} type="datetime-local" required /></label>
        <label>Délais successifs entre les reprises, en jours<input name="followUps" className={field} pattern="[0-9 ,]*" placeholder="Facultatif, par exemple : 3, 7, 14" /><span className="mt-1 block text-xs text-foreground-muted">Chaque délai part du dernier envoi confirmé : 3 puis 7 signifie attendre 3 jours, puis 7 jours supplémentaires. Trois reprises maximum, de 1 à 30 jours. Vide : aucune relance automatique.</span></label>
        <label>Sollicitations maximum par 24 h pour ce portefeuille<input name="dailyOutboundLimit" className={field} type="number" min={1} max={10} required /></label>
        <label>Délai minimum pour solliciter le même contact, en heures<input name="minIntervalHours" className={field} type="number" min={1} max={720} required /></label>
        <p className="text-xs text-foreground-muted sm:col-span-2">Heures affichées dans votre fuseau local. Un refus, une réponse reçue ou un envoi incertain interrompt la reprise automatique prévue.</p>
        <p className="text-sm sm:col-span-2">{representative.mode === "AI" ? `Limites actuelles du vendeur : ${representative.dailyRunLimit} missions et ${representative.dailyTokenBudget.toLocaleString("fr-FR")} tokens par jour ; ${representative.maxTurns} étapes maximum par mission.` : "Le vendeur humain reçoit ses missions dans le poste commercial."}</p>
      </fieldset>
      <div className="flex flex-wrap gap-2"><button className={`${button} bg-primary text-primary-foreground`}>Vérifier le périmètre</button><button type="button" className={button} onClick={onClose}>Annuler</button></div>
    </form>
    {review && <form aria-label="Approuver l’autorisation de portefeuille" className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setError(""); setPending(true);
      try { await authorize(review); onClose(); }
      catch (cause) { const code = (cause as { data?: { code?: string } }).data?.code; setUncertain(!code || ["TIMEOUT", "INTERNAL_SERVER_ERROR"].includes(code)); setError((cause as Error).message); }
      finally { setPending(false); }
    }}>
      <h4 className="font-medium">Vérifier avant d’autoriser {representative.name}</h4>
      {summary(review, principals)}
      <p className="text-sm">L’autorisation crée une affaire par contact et confie le premier travail au vendeur. Un nouvel accord de votre part sera nécessaire pour ajouter des contacts ou modifier les conditions.</p>
      <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" required disabled={pending} />J’atteste que le bénéficiaire, la destination et les instructions de règlement ci-dessus sont ceux autorisés par la marque.</label>
      <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" required disabled={pending} />J’autorise ce vendeur à contacter ces personnes selon ce périmètre, ces conditions et cette cadence.</label>
      {uncertain && <p role="status" className="rounded border border-amber-500/30 p-3 text-sm">Le résultat n’est pas confirmé. Vérifiez la même autorisation ; la demande et ses contacts sont conservés sans en créer une seconde.</p>}
      <div className="flex flex-wrap gap-2"><button className={`${button} bg-primary text-primary-foreground`} disabled={pending}>{pending ? "Vérification en cours…" : uncertain ? "Vérifier cette autorisation" : `Autoriser ${review.members.length} contact${review.members.length > 1 ? "s" : ""} et démarrer`}</button><button type="button" className={button} disabled={pending || uncertain} onClick={() => { setReview(null); setError(""); }}>Modifier le périmètre</button></div>
    </form>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}

function PortfolioReceipt({ item, principals }: { item: AuthorizedSalesPortfolio; principals: SalesPrincipalOption[] }) {
  const receipt = item.receipt;
  return <article className="space-y-3 border-t border-border pt-4">
    <div className="flex flex-wrap justify-between gap-2 text-sm"><h4 className="font-medium">{receipt.mandate.offerName} · {receipt.members.length} contact{receipt.members.length > 1 ? "s" : ""}</h4><span className="text-foreground-muted">Autorisé le {date(receipt.authorizedAt)}</span></div>
    <ol className="space-y-2">{receipt.members.map(member => { const outcome = item.outcomes.find(row => row.dealId === member.dealId); return <li key={member.dealId} className="grid gap-1 text-sm sm:grid-cols-2"><div><p className="font-medium">{member.companyName} · {member.contactName}</p><p className="text-xs text-foreground-muted">{member.originKey}</p></div><div><p>{outcome?.contactStopped ? "Contact arrêté" : stateNames[outcome?.node ?? ""] ?? "Affaire créée"}{outcome?.runStatus ? ` · ${stateNames[outcome.runStatus] ?? outcome.runStatus}` : ""}</p><p className="text-foreground-muted">{outcome?.nextAction ?? "Consulter l’affaire dans le poste commercial."}</p>{outcome?.nextDeadline && <p className="text-xs text-foreground-muted">Échéance : {date(outcome.nextDeadline)}</p>}</div></li>; })}</ol>
    <details><summary className="cursor-pointer text-sm underline">Relire le périmètre approuvé</summary><div className="mt-3">{summary({ strategyId: receipt.strategyId, representativeId: receipt.representativeId, requestId: receipt.requestId, market: receipt.market, source: receipt.source, mandate: { ...receipt.mandate, outreachPolicy: receipt.mandate.outreachPolicy!, collection: receipt.mandate.collection! }, collectionAttested: true, members: receipt.members }, principals)}</div></details>
  </article>;
}

export function CrmSalesPortfolio({ strategyId, representative, catalogue, offerVersion, principals, defaultPrincipalId, canManage }: Omit<FormProps, "authorize" | "onClose"> & { canManage: boolean }) {
  const [creating, setCreating] = useState(false);
  const utils = trpc.useUtils();
  const list = trpc.crm.listAuthorizedSalesPortfolios.useQuery({ strategyId, representativeId: representative.id }, { refetchInterval: 10000 });
  const authorize = trpc.crm.authorizeSalesPortfolio.useMutation();
  return <section aria-label="Portefeuilles de vente autorisés" className="space-y-4 border-t border-border pt-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-medium">Autoriser un portefeuille</h4><p className="mt-1 max-w-xl text-sm text-foreground-muted">Une seule approbation pour cinq contacts explicites maximum ; le vendeur poursuit ensuite chaque affaire selon le même mandat.</p></div>{canManage && !creating && <button type="button" className={button} disabled={representative.status !== "ACTIVE" || !catalogue.some(offer => offer.id)} onClick={() => setCreating(true)}>Préparer une autorisation</button>}</div>
    {!canManage && <p className="text-sm text-foreground-muted">Le propriétaire de la marque ou un administrateur approuve le périmètre de prospection.</p>}
    {canManage && representative.status !== "ACTIVE" && <p className="text-sm text-foreground-muted">Activez le vendeur avant de lui autoriser de nouveaux contacts.</p>}
    {!catalogue.some(offer => offer.id) && <p className="text-sm text-foreground-muted">Le catalogue de la marque doit contenir une offre identifiée avant de préparer une autorisation.</p>}
    {creating && <SalesPortfolioAuthorizationForm strategyId={strategyId} representative={representative} catalogue={catalogue} offerVersion={offerVersion} principals={principals} defaultPrincipalId={defaultPrincipalId} onClose={() => setCreating(false)} authorize={async input => { await authorize.mutateAsync(input); await utils.crm.invalidate(); }} />}
    {list.isLoading && <p className="text-sm text-foreground-muted">Chargement des autorisations…</p>}
    {list.error && <p role="alert" className="text-sm text-error">{list.error.message}</p>}
    {list.data?.map(item => <PortfolioReceipt key={item.receipt.requestId} item={item} principals={principals} />)}
    {!list.isLoading && !list.data?.length && <p className="text-sm text-foreground-muted">Aucun portefeuille n’a encore été autorisé pour ce vendeur.</p>}
  </section>;
}
