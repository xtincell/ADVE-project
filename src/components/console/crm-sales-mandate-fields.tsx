"use client";

import { salesChannel } from "@/server/services/crm-engine/commercial";
import { useEffect, useState, type ComponentProps } from "react";
import { PRICING_TIERS, type PricingTierKey } from "@/server/services/monetization/pricing-tiers";
import { CrmSalesTreeEditor } from "./crm-sales-tree-editor";

export const salesChannels = salesChannel.options;
export const salesChannelNames: Record<(typeof salesChannels)[number], string> = {
  PHONE: "Téléphone", EMAIL: "Email", WHATSAPP: "WhatsApp", SMS: "SMS", WEB: "Chat web", SOCIAL: "Réseau social", IN_PERSON: "Face à face",
};
export type SalesCatalogueOffer = { id?: string; nom: string; prix?: number; conditionsTarifaires?: string };
export type SalesPrincipalOption = { id: string; label: string };
const field = "w-full rounded border border-border bg-background px-3 py-2 text-sm";
type SalesPricingRule = { kind: "MARKET_TIER"; tierKey: PricingTierKey; countryCodes: string[]; maxQuantity?: number };
type SalesBilling = "ONE_TIME" | "MONTHLY" | "YEARLY";
type SalesTaxTreatment = "INCLUDED_IN_PRICE" | "EXCLUDED" | "UNSPECIFIED";
type MandateDefaults = { offerId?: string; amount?: number; currency?: string; billing?: SalesBilling; pricingRule?: SalesPricingRule; taxTreatment?: SalesTaxTreatment; taxRatePct?: number; exclusions?: string[]; expiresAt?: string; terms?: string; beneficiary?: string; deliveryOwnerId?: string; paymentInstructions?: string; conversationTree?: NonNullable<ComponentProps<typeof CrmSalesTreeEditor>>["initialTree"] };
const localDate = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined;

/** The same form fields feed every existing owner approval flow. */
export function readSalesPricingFields(form: FormData, prefix = "") {
  const read = (name: string) => String(form.get(prefix + name) ?? "").trim();
  const source = read("pricingRule");
  const billing = read("billing") as SalesBilling | "";
  const currency = read("currency");
  const amount = read("amount");
  const taxTreatment = read("taxTreatment") as SalesTaxTreatment | "";
  const taxRatePct = read("taxRatePct");
  const exclusions = read("exclusions").split("\n").map(value => value.trim()).filter(Boolean);
  return {
    ...(source ? { pricingRule: JSON.parse(source) as SalesPricingRule } : amount ? { amount: Number(amount) } : {}),
    ...(currency ? { currency } : {}),
    ...(billing ? { billing } : {}),
    ...(taxTreatment ? { taxTreatment } : {}),
    ...(taxTreatment === "EXCLUDED" && taxRatePct ? { taxRatePct: Number(taxRatePct) } : {}),
    ...(exclusions.length ? { exclusions } : {}),
  };
}

export function salesTaxLabel(value: { taxTreatment?: SalesTaxTreatment; taxRatePct?: number }) {
  return value.taxTreatment === "INCLUDED_IN_PRICE" ? "Prix final à payer" : value.taxTreatment === "EXCLUDED" ? `Prix hors taxes${value.taxRatePct !== undefined ? ` · taxe ajoutée : ${value.taxRatePct} %` : " · taux de taxe à préciser"}` : "Taxes à préciser";
}

/** The individual desk and the portfolio approve the same offer and commitment fields. */
export function CrmSalesMandateFields({ catalogue, offerId, onOfferChange, offerVersion, principals, defaultPrincipalId, defaultChannel = "EMAIL", showSeller = true, namePrefix = "", webOnly = false, informationOnly = false, initialValues }: {
  catalogue: SalesCatalogueOffer[];
  offerId: string;
  onOfferChange: (id: string) => void;
  offerVersion?: string;
  principals: SalesPrincipalOption[];
  defaultPrincipalId?: string;
  defaultChannel?: (typeof salesChannels)[number];
  showSeller?: boolean;
  namePrefix?: string;
  webOnly?: boolean;
  informationOnly?: boolean;
  initialValues?: MandateDefaults;
}) {
  const offer = catalogue.find(item => item.id === offerId);
  const initial = initialValues?.offerId === offerId ? initialValues : undefined;
  const [pricingMode, setPricingMode] = useState(initial?.pricingRule ? "MARKET_TIER" : "FIXED");
  const [tierKey, setTierKey] = useState<PricingTierKey | "">(initial?.pricingRule?.tierKey ?? "");
  const [countryCodes, setCountryCodes] = useState(initial?.pricingRule?.countryCodes.join(", ") ?? "");
  const [maxQuantity, setMaxQuantity] = useState(initial?.pricingRule?.maxQuantity ?? 1);
  const [taxTreatment, setTaxTreatment] = useState<SalesTaxTreatment>(initial?.taxTreatment ?? (initial?.pricingRule ? "INCLUDED_IN_PRICE" : "UNSPECIFIED"));
  useEffect(() => {
    setPricingMode(initial?.pricingRule ? "MARKET_TIER" : "FIXED");
    setTierKey(initial?.pricingRule?.tierKey ?? ""); setCountryCodes(initial?.pricingRule?.countryCodes.join(", ") ?? "");
    setMaxQuantity(initial?.pricingRule?.maxQuantity ?? 1);
    setTaxTreatment(initial?.taxTreatment ?? (initial?.pricingRule ? "INCLUDED_IN_PRICE" : "UNSPECIFIED"));
  }, [offerId, initial?.pricingRule, initial?.taxTreatment]);
  const name = (key: string) => namePrefix + key;
  return <>
    <label>Offre du catalogue<select className={field} value={offerId} onChange={event => onOfferChange(event.target.value)} required>
      <option value="">Choisir</option>{catalogue.filter(item => item.id).map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
    </select></label>
    <p className="self-end text-xs text-foreground-muted">{offerVersion ? `Catalogue · version ${offerVersion}. ` : ""}Vérifiez les conditions avant de les confier au vendeur.</p>
    {webOnly ? <p className="text-sm text-foreground-muted sm:col-span-2">Le vendeur répond dans la conversation ouverte par le visiteur.</p> : <fieldset className="sm:col-span-2"><legend>Où le vendeur peut-il répondre ?</legend>
      <div className="mt-2 flex flex-wrap gap-3">{salesChannels.map(item => <label key={item} className="flex gap-2">
        <input type="checkbox" name={name("channels")} value={item} defaultChecked={item === defaultChannel} />{salesChannelNames[item]}
      </label>)}</div>
      <p className="mt-2 text-xs text-foreground-muted">Le vendeur peut utiliser l’email et le chat si vous les avez reliés à la marque. Votre équipe prend en charge les appels, WhatsApp, SMS et réseaux sociaux tant que leur connexion n’est pas prête. Les rencontres se font avec votre équipe.</p>
    </fieldset>}
    {!informationOnly && <>
      <label>Comment fixer le prix ?<select className={field} value={pricingMode} onChange={event => { setPricingMode(event.target.value); setTaxTreatment(initial?.taxTreatment ?? (event.target.value === "MARKET_TIER" ? "INCLUDED_IN_PRICE" : "UNSPECIFIED")); }}><option value="FIXED">Prix fixe</option><option value="MARKET_TIER">Tarif par pays</option></select></label>
      {pricingMode === "MARKET_TIER" ? <>
        <input type="hidden" name={name("pricingRule")} value={JSON.stringify({ kind: "MARKET_TIER", tierKey, countryCodes: countryCodes.split(",").map(value => value.trim().toUpperCase()).filter(Boolean), maxQuantity })} />
        <label>Formule de référence<select className={field} value={tierKey} onChange={event => setTierKey(event.target.value as PricingTierKey)} required><option value="">Choisir une formule</option>{Object.values(PRICING_TIERS).map(tier => <option key={tier.key} value={tier.key}>{tier.label}</option>)}</select></label>
        <label>Pays autorisés<input className={field} value={countryCodes} onChange={event => setCountryCodes(event.target.value.toUpperCase())} placeholder="CI, FR" pattern="[A-Z]{2}( *, *[A-Z]{2})*" required /><span className="mt-1 block text-xs text-foreground-muted">Codes pays séparés par une virgule, par exemple CI pour la Côte d’Ivoire.</span></label>
        <label>Quantité maximum<input className={field} value={maxQuantity} onChange={event => setMaxQuantity(Number(event.target.value))} type="number" min={1} max={100} required /></label>
        <p className="text-sm text-foreground-muted sm:col-span-2">Prix à calculer après le choix du pays. Le vendeur utilisera cette formule et ses tarifs existants ; il ne choisira pas lui-même un montant.</p>
      </> : <>
        <label>Prix à proposer<input key={`${namePrefix}price:${offerId}`} className={field} name={name("amount")} type="number" min="0" step="0.01" defaultValue={initial?.amount ?? (typeof offer?.prix === "number" && Number.isFinite(offer.prix) ? offer.prix : undefined)} required /></label>
        <label>Ce prix correspond à<select key={`${namePrefix}billing:${offerId}`} className={field} name={name("billing")} defaultValue={initial?.billing ?? ""}><option value="">À préciser dans les conditions</option><option value="ONE_TIME">Un paiement unique</option><option value="MONTHLY">Un mois</option><option value="YEARLY">Un an</option></select></label>
      </>}
      <label>Comment les taxes sont-elles prises en compte ?<select className={field} name={name("taxTreatment")} value={taxTreatment} onChange={event => setTaxTreatment(event.target.value as SalesTaxTreatment)}><option value="UNSPECIFIED">À préciser</option><option value="INCLUDED_IN_PRICE">Prix final à payer</option><option value="EXCLUDED">Prix hors taxes</option></select></label>
      {taxTreatment === "EXCLUDED" && <label>Taux de taxe approuvé (%)<input key={`${namePrefix}tax:${offerId}`} className={field} name={name("taxRatePct")} type="number" min={0} max={100} step="0.01" required defaultValue={initial?.taxRatePct} /></label>}
      <label className="sm:col-span-2">Prestations non incluses (facultatif)<textarea key={`${namePrefix}exclusions:${offerId}`} className={field} name={name("exclusions")} defaultValue={initial?.exclusions?.join("\n")} maxLength={4000} placeholder="Une prestation par ligne" /></label>
    </>}
    {!informationOnly && pricingMode === "MARKET_TIER" ? <p className="self-end text-sm text-foreground-muted">Devise calculée selon le pays choisi.</p> : <label>{informationOnly ? "Devise du catalogue" : "Devise"}<input key={`${namePrefix}currency:${offerId}`} className={field} name={name("currency")} pattern="[A-Z]{3}" maxLength={3} placeholder="XOF" defaultValue={initial?.currency} required /></label>}
    <label>Validité<input key={`${namePrefix}expiry:${offerId}`} className={field} name={name("expiry")} type="datetime-local" defaultValue={localDate(initial?.expiresAt)} required /></label>
    <label>{informationOnly ? "Ce que le vendeur peut expliquer" : "Conditions et résultat promis"}<textarea key={`${namePrefix}terms:${offerId}`} className={field} name={name("terms")} defaultValue={initial?.terms ?? offer?.conditionsTarifaires} maxLength={4000} required /></label>
    {!informationOnly && <label>Entreprise qui reçoit le paiement<input key={`${namePrefix}beneficiary:${offerId}`} className={field} name={name("beneficiary")} maxLength={4000} defaultValue={initial?.beneficiary} required /></label>}
    {showSeller && <label>Vendeur chargé de l’affaire<select className={field} name={name("seller")} defaultValue={defaultPrincipalId} required>{principals.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>}
    <label>{informationOnly ? "Responsable du suivi" : "Responsable de la livraison"}<select key={`${namePrefix}delivery:${offerId}`} className={field} name={name("delivery")} defaultValue={initial?.deliveryOwnerId ?? defaultPrincipalId} required>{principals.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
    {!informationOnly && <label className="sm:col-span-2">Comment le client paie<textarea key={`${namePrefix}payment:${offerId}`} className={field} name={name("payment")} maxLength={4000} defaultValue={initial?.paymentInstructions} required /></label>}
    <details key={`${namePrefix}tree:${offerId}`} className="sm:col-span-2"><summary className="cursor-pointer">Questions et réponses du vendeur</summary><div className="mt-3"><CrmSalesTreeEditor name={name("tree")} initialTree={initial?.conversationTree} /></div></details>
  </>;
}
