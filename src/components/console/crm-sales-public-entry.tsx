"use client";

import { useState } from "react";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { saveSalesPublicEntryInput, type SaveSalesPublicEntryInput } from "@/server/services/crm-engine/public-entry-contract";
import { CrmSalesMandateFields, readSalesPricingFields, salesTaxLabel, type SalesCatalogueOffer, type SalesPrincipalOption } from "./crm-sales-mandate-fields";

type Entry = Omit<SaveSalesPublicEntryInput, "expectedRevision" | "collectionAttested"> & { revision: number; publicId: string };
type Props = {
  strategyId: string;
  brandName: string;
  representative: { id: string; name: string; status: string };
  catalogue: SalesCatalogueOffer[];
  offerVersion: string;
  principals: SalesPrincipalOption[];
  defaultPrincipalId?: string;
  canManage: boolean;
};
const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";
const date = (value: string) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function PublicEntryForm({ strategyId, brandName, representative, catalogue, offerVersion, principals, defaultPrincipalId, initial, onClose, save }: Props & { initial: Entry | null; onClose: () => void; save: (input: SaveSalesPublicEntryInput) => Promise<void> }) {
  const [offers, setOffers] = useState(initial?.offers.map((offer, index) => ({ key: index, id: offer.offerId, collect: Boolean(offer.collection) })) ?? [{ key: 0, id: "", collect: false }]);
  const [informationOnly, setInformationOnly] = useState(initial?.informationOnly ?? false);
  const [nextKey, setNextKey] = useState(offers.length);
  const [review, setReview] = useState<SaveSalesPublicEntryInput | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

  return <div className="space-y-4">
    <form aria-label="Préparer l’entrée publique de marque" className={review ? "hidden" : "space-y-5"} onSubmit={event => {
      event.preventDefault(); setError("");
      const form = new FormData(event.currentTarget);
      try {
        const contactName = read(form, "humanContactName"), contactNumber = read(form, "humanContactWhatsapp");
        if (Boolean(contactName) !== Boolean(contactNumber)) throw new Error("Renseignez le nom et le numéro du contact WhatsApp, ou laissez les deux champs vides.");
        if (contactNumber && !/^\+?[\d ()-]+$/.test(contactNumber)) throw new Error("Renseignez le numéro WhatsApp avec son indicatif pays, sans lien ni texte.");
        const parsed = saveSalesPublicEntryInput.parse({
          strategyId, expectedRevision: initial?.revision ?? 0, representativeId: representative.id, enabled: form.get("enabled") === "on",
          informationOnly,
          publicBrandName: read(form, "publicBrandName"), welcome: read(form, "welcome"), market: read(form, "market"),
          maxConversationsPerDay: Number(read(form, "daily")), maxConversationsPerHour: Number(read(form, "hourly")),
          collectionAttested: !informationOnly && form.get("collectionAttested") === "on",
          ...(contactName || contactNumber ? { humanContact: { name: contactName, whatsapp: contactNumber.replace(/\D/g, "") } } : {}),
          offers: offers.map(item => {
            const offer = catalogue.find(candidate => candidate.id === item.id);
            if (!offer) throw new Error("Choisissez une offre du catalogue pour chaque sujet publié.");
            const prefix = `offer:${item.key}:`;
            const tree = read(form, prefix + "tree");
            return { offerId: item.id, offerVersion, offerName: offer.nom,
              ...(!informationOnly ? { ...readSalesPricingFields(form, prefix), beneficiary: read(form, prefix + "beneficiary"), paymentInstructions: read(form, prefix + "payment") } : { currency: read(form, prefix + "currency") }),
              terms: read(form, prefix + "terms"),
              deliveryOwnerId: read(form, prefix + "delivery"), expiresAt: new Date(read(form, prefix + "expiry")).toISOString(),
              ...(tree ? { conversationTree: JSON.parse(tree) } : {}),
              ...(!informationOnly && item.collect ? { collection: { mode: "MANUAL", destinationRef: read(form, prefix + "destinationRef"), financeOwnerId: read(form, prefix + "financeOwner") } } : {}),
            };
          }),
        });
        setReview(parsed); setUncertain(false);
      } catch (cause) {
        const issues = (cause as { issues?: { message: string }[] }).issues;
        setError(issues ? issues.map(issue => issue.message).join(" ") : (cause as Error).message || "Vérifiez les offres et les dates avant de continuer.");
      }
    }}>
      <fieldset className="space-y-3"><legend className="mb-3 font-medium">Ce que le vendeur peut faire</legend>
        <label className="flex items-start gap-2 text-sm"><input type="radio" name="public-purpose" checked={informationOnly} onChange={() => setInformationOnly(true)} />Répondre aux questions</label>
        <label className="flex items-start gap-2 text-sm"><input type="radio" name="public-purpose" checked={!informationOnly} onChange={() => setInformationOnly(false)} />Proposer des offres</label>
        {informationOnly && <p className="text-sm text-foreground-muted">Le vendeur renseigne les visiteurs. L’équipe doit confirmer les prestations et les conditions avant toute souscription.</p>}
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Accueil des visiteurs</legend>
        <label>Nom affiché publiquement<input className={field} name="publicBrandName" required maxLength={120} defaultValue={initial?.publicBrandName ?? brandName} /></label>
        <label>Marché concerné<input className={field} name="market" required maxLength={200} defaultValue={initial?.market} placeholder="Ex. Restaurateurs · Abidjan" /></label>
        <label className="sm:col-span-2">Message d’accueil public<textarea className={field} name="welcome" required rows={3} maxLength={600} defaultValue={initial?.welcome ?? `Bienvenue chez ${brandName}. Décrivez votre besoin ; notre équipe vous accompagne.`} /></label>
        <p className="text-xs text-foreground-muted sm:col-span-2">Seuls ce nom, cet accueil et les informations approuvées ci-dessous sont exposés. Le visiteur crée sa conversation privée sans compte ; ses messages rejoignent {representative.name}.</p>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Contact WhatsApp proposé aux clients (facultatif)</legend>
        <label>Nom de la personne à contacter<input className={field} name="humanContactName" maxLength={100} defaultValue={initial?.humanContact?.name} /></label>
        <label>Numéro WhatsApp avec indicatif pays<input className={field} name="humanContactWhatsapp" type="tel" maxLength={30} defaultValue={initial?.humanContact?.whatsapp} placeholder="Ex. +237 6…" /></label>
        <p className="text-xs text-foreground-muted sm:col-span-2">Ce nom et ce numéro seront visibles par les visiteurs de cette marque. Renseignez les deux champs ou laissez-les vides. Le client choisit d’ouvrir WhatsApp ; ses messages et son lien privé ne sont pas copiés.</p>
      </fieldset>
      <fieldset className="space-y-4"><legend className="mb-3 font-medium">{informationOnly ? "Sujets disponibles" : "Offres autorisées"} · {offers.length}/10</legend>
        {offers.map((item, index) => {
          const old = initial?.offers.find(offer => offer.offerId === item.id);
          const prefix = `offer:${item.key}:`;
          return <fieldset key={item.key} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"><legend className="px-1 text-sm">Sujet {index + 1}</legend>
            <CrmSalesMandateFields catalogue={catalogue} offerId={item.id} onOfferChange={id => setOffers(current => current.map(offer => offer.key === item.key ? { ...offer, id } : offer))} offerVersion={offerVersion} principals={principals} defaultPrincipalId={defaultPrincipalId} showSeller={false} namePrefix={prefix} webOnly informationOnly={informationOnly} initialValues={old} />
            {!informationOnly && <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={item.collect} onChange={event => setOffers(current => current.map(offer => offer.key === item.key ? { ...offer, collect: event.target.checked } : offer))} />Permettre au vendeur de demander le paiement</label>}
            {!informationOnly && (item.collect ? <>
              <label>Compte ou numéro où recevoir le paiement<input className={field} name={prefix + "destinationRef"} required maxLength={4000} defaultValue={old?.collection?.destinationRef} /></label>
              <label>Personne qui vérifie le paiement<select className={field} name={prefix + "financeOwner"} defaultValue={old?.collection?.financeOwnerId ?? defaultPrincipalId} required>{principals.filter(person => !person.id.startsWith("mcp:")).map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
            </> : <p className="text-xs text-foreground-muted sm:col-span-2">Paiement à configurer. Le vendeur peut comprendre le besoin et présenter l’offre ; il ne peut pas encore demander le paiement.</p>)}
            {offers.length > 1 && <button type="button" className="justify-self-start text-sm underline sm:col-span-2" onClick={() => setOffers(current => current.filter(offer => offer.key !== item.key))}>Retirer ce sujet</button>}
          </fieldset>;
        })}
        <button type="button" className={button} disabled={offers.length >= 10} onClick={() => { setOffers(current => [...current, { key: nextKey, id: "", collect: false }]); setNextKey(nextKey + 1); }}>{informationOnly ? "Ajouter un sujet" : "Ajouter une offre"}</button>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 font-medium">Capacité d’accueil</legend>
        <label>Nouvelles conversations maximum par jour<input className={field} name="daily" type="number" min={1} max={100} required defaultValue={initial?.maxConversationsPerDay ?? 10} /></label>
        <label>Nouvelles conversations maximum par heure<input className={field} name="hourly" type="number" min={1} max={30} required defaultValue={initial?.maxConversationsPerHour ?? 5} /></label>
        <p className="text-xs text-foreground-muted sm:col-span-2">Les limites du vendeur continuent de s’appliquer. Cette entrée n’autorise aucun email ni aucune prospection sortante.</p>
        {!informationOnly && offers.some(offer => offer.collect) && <label className="flex items-start gap-2 text-sm sm:col-span-2"><input className="mt-1" name="collectionAttested" type="checkbox" required />Je confirme les entreprises bénéficiaires, les comptes et les instructions de paiement que je publie.</label>}
        <label className="flex items-start gap-2 text-sm sm:col-span-2"><input className="mt-1" name="enabled" type="checkbox" defaultChecked={initial?.enabled ?? true} />Ouvrir cette entrée aux nouveaux visiteurs</label>
      </fieldset>
      <div className="flex flex-wrap gap-2"><button className={`${button} bg-primary text-primary-foreground`}>Vérifier avant publication</button><button type="button" className={button} onClick={onClose}>Annuler</button></div>
    </form>
    {review && <form aria-label="Approuver l’entrée publique de marque" className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setPending(true); setError("");
      try { await save(review); onClose(); }
      catch (cause) { const code = (cause as { data?: { code?: string } }).data?.code; setUncertain(!code || ["TIMEOUT", "INTERNAL_SERVER_ERROR"].includes(code)); setError((cause as Error).message); }
      finally { setPending(false); }
    }}>
      <h4 className="font-medium">Vérifier l’accueil public de {review.publicBrandName}</h4>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-foreground-muted">Ce que le vendeur peut faire</dt><dd>{review.informationOnly ? "Répondre aux questions" : "Proposer des offres"}</dd></div>
        <div><dt className="text-foreground-muted">Vendeur</dt><dd>{representative.name}</dd></div><div><dt className="text-foreground-muted">Marché</dt><dd>{review.market}</dd></div>
        {review.humanContact && <div className="sm:col-span-2"><dt className="text-foreground-muted">Contact WhatsApp publié</dt><dd>{review.humanContact.name} · +{review.humanContact.whatsapp}</dd></div>}
        <div className="sm:col-span-2"><dt className="text-foreground-muted">Accueil publié</dt><dd className="whitespace-pre-wrap break-words">{review.welcome}</dd></div>
        <div><dt className="text-foreground-muted">État après publication</dt><dd>{review.enabled ? "Ouvert aux nouveaux visiteurs" : "Fermé aux nouveaux visiteurs"}</dd></div><div><dt className="text-foreground-muted">Capacité</dt><dd>{review.maxConversationsPerHour} par heure, {review.maxConversationsPerDay} par jour</dd></div>
      </dl>
      <ol className="space-y-3">{review.offers.map(offer => <li key={offer.offerId} className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">{offer.offerName}{!review.informationOnly && !offer.pricingRule && typeof offer.amount === "number" && offer.currency ? ` · ${new Intl.NumberFormat("fr-FR", { style: "currency", currency: offer.currency }).format(offer.amount)}` : ""}</p>{!review.informationOnly && offer.pricingRule && <p className="mt-2 text-foreground-muted">Tarif calculé selon le pays · {offer.pricingRule.countryCodes.join(", ")} · {offer.pricingRule.maxQuantity ?? 1} unité{(offer.pricingRule.maxQuantity ?? 1) > 1 ? "s" : ""} maximum</p>}{!review.informationOnly && <p className="mt-2 text-foreground-muted">{salesTaxLabel(offer)}</p>}<p className="mt-2 whitespace-pre-wrap break-words">{offer.terms}</p>{offer.exclusions?.length ? <p className="mt-2 whitespace-pre-wrap break-words">Non inclus : {offer.exclusions.join(" ; ")}</p> : null}<p className="mt-2 text-foreground-muted">Catalogue {offer.offerVersion} · valide jusqu’au {date(offer.expiresAt)}</p>{!review.informationOnly && <p className="mt-2">{offer.collection ? `Paiement à ${offer.beneficiary} · ${offer.collection.destinationRef}` : "Paiement à configurer"}</p>}</li>)}</ol>
      {review.informationOnly && <p className="text-sm text-foreground-muted">L’équipe doit confirmer les prestations et les conditions avant toute souscription.</p>}
      <p className="text-sm text-foreground-muted">Le visiteur ouvre son propre dossier. Chaque conversation garde les conditions autorisées au moment de son ouverture.</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" required disabled={pending} />J’autorise la publication de cet accueil et ces {review.informationOnly ? "informations" : "offres"}, et leur traitement par ce vendeur.</label>
      {uncertain && <p role="status" className="text-sm text-foreground-muted">La publication n’est pas confirmée. Relisez l’entrée existante avant une nouvelle modification ; les conditions préparées sont conservées ici.</p>}
      <div className="flex flex-wrap gap-2"><button className={`${button} bg-primary text-primary-foreground`} disabled={pending}>{pending ? "Publication…" : uncertain ? "Vérifier cette publication" : "Publier l’entrée"}</button><button type="button" className={button} disabled={pending || uncertain} onClick={() => setReview(null)}>Modifier</button></div>
    </form>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}

export function CrmSalesPublicEntry(props: Props) {
  const { strategyId, representative, canManage } = props;
  const [editing, setEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.crm.getSalesPublicEntry.useQuery({ strategyId }, { refetchInterval: 10000 });
  const mutation = trpc.crm.saveSalesPublicEntry.useMutation();
  const entry = (query.data?.entry ?? null) as Entry | null;
  const available = Boolean(query.data?.available);
  const path = entry ? `/talk/${entry.publicId}` : null;
  const belongsToSelected = !entry || entry.representativeId === representative.id;

  async function save(input: SaveSalesPublicEntryInput) {
    // A lost publication response is reconciled against the owned snapshot before any retry.
    const current = await utils.crm.getSalesPublicEntry.fetch({ strategyId });
    if (current.entry && current.entry.revision !== input.expectedRevision) {
      const { publicId: _publicId, revision: _revision, ...snapshot } = current.entry;
      const actual = saveSalesPublicEntryInput.parse({ ...snapshot, expectedRevision: input.expectedRevision });
      if (JSON.stringify(actual) !== JSON.stringify(saveSalesPublicEntryInput.parse(input))) throw new Error("L’accueil a changé. Fermez cette préparation puis relisez sa version actuelle avant de modifier les conditions.");
      await utils.crm.invalidate(); return;
    }
    await mutation.mutateAsync(input); await utils.crm.invalidate();
  }
  return <section aria-label="Entrée publique de marque" className="space-y-4 border-t border-border pt-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="flex items-center gap-2 font-medium"><MessageCircle aria-hidden className="h-4 w-4" />Accueil commercial public</h4><p className="mt-1 max-w-xl text-sm text-foreground-muted">Un lien permanent à mettre sur votre site, vos profils ou un QR. Chaque visiteur démarre sa propre conversation avec votre équipe.</p></div>{canManage && !editing && <button type="button" className={button} disabled={representative.status !== "ACTIVE" || !props.catalogue.some(offer => offer.id)} onClick={() => { setEditingEntry(entry ? structuredClone(entry) : null); setEditing(true); setError(""); }}>{entry ? "Modifier l’accueil" : "Préparer l’accueil public"}</button>}</div>
    {entry && !editing && <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
      <p className="font-medium">{entry.publicBrandName} · {entry.enabled && available ? "Ouvert aux nouveaux visiteurs" : "Fermé aux nouveaux visiteurs"}</p>
      <p>{entry.informationOnly ? "Répondre aux questions" : "Proposer des offres"}</p>
      {entry.enabled && !available && <p role="status" className="text-foreground-muted">{query.data?.readinessReason ?? "Vérifiez le vendeur et la validité des offres avant d’accueillir de nouveaux visiteurs."}</p>}
      {!belongsToSelected && <p className="text-foreground-muted">L’entrée actuelle est affectée à un autre vendeur de cette marque. Une nouvelle publication peut la confier à {representative.name}.</p>}
      <p className="whitespace-pre-wrap break-words">{entry.welcome}</p>
      {entry.humanContact && <p>Contact WhatsApp : {entry.humanContact.name} · +{entry.humanContact.whatsapp}</p>}
      <p className="text-foreground-muted">{entry.offers.length} {entry.informationOnly ? "sujet" : "offre"}{entry.offers.length > 1 ? "s" : ""} · {entry.maxConversationsPerHour} nouvelles conversations par heure, {entry.maxConversationsPerDay} par jour</p>
      {!entry.informationOnly && entry.offers.some(offer => !offer.collection) && <p className="text-foreground-muted">Paiement à configurer pour {entry.offers.filter(offer => !offer.collection).map(offer => offer.offerName).join(", ")}. Les conversations et propositions restent possibles.</p>}
      {path && <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={async () => { try { await navigator.clipboard.writeText(new URL(path, window.location.origin).href); setCopied(true); } catch { setError("Ouvrez l’accueil pour copier son adresse depuis votre navigateur."); } }}><Copy aria-hidden className="h-4 w-4" />{copied ? "Lien copié" : "Copier le lien public"}</button><a className={button} href={path} target="_blank" rel="noreferrer"><ExternalLink aria-hidden className="h-4 w-4" />Ouvrir l’accueil</a>
        {canManage && <button type="button" className={button} disabled={mutation.isPending} onClick={async () => { setError(""); try { await save(saveSalesPublicEntryInput.parse({ strategyId, expectedRevision: entry.revision, representativeId: entry.representativeId, enabled: !entry.enabled, informationOnly: entry.informationOnly ?? false, publicBrandName: entry.publicBrandName, welcome: entry.welcome, market: entry.market, maxConversationsPerDay: entry.maxConversationsPerDay, maxConversationsPerHour: entry.maxConversationsPerHour, offers: entry.offers, humanContact: entry.humanContact, collectionAttested: Boolean(entry.offers.some(offer => offer.collection)) })); } catch (cause) { setError((cause as Error).message); } }}>{entry.enabled ? "Fermer aux nouveaux visiteurs" : "Rouvrir l’accueil"}</button>}
      </div>}
    </div>}
    {!entry && !editing && !query.isLoading && <p className="text-sm text-foreground-muted">Aucune entrée publique configurée pour cette marque.</p>}
    {!canManage && <p className="text-sm text-foreground-muted">Le propriétaire de la marque ou un administrateur configure et publie cet accueil.</p>}
    {editing && <PublicEntryForm key={editingEntry?.revision ?? 0} {...props} initial={editingEntry} save={save} onClose={() => setEditing(false)} />}
    {(error || query.error) && <p role="alert" className="text-sm text-error">{error || query.error?.message}</p>}
  </section>;
}
