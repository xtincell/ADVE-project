"use client";

import { salesChannel } from "@/server/services/crm-engine/commercial";
import type { ComponentProps } from "react";
import { CrmSalesTreeEditor } from "./crm-sales-tree-editor";

export const salesChannels = salesChannel.options;
export const salesChannelNames: Record<(typeof salesChannels)[number], string> = {
  PHONE: "Téléphone", EMAIL: "Email", WHATSAPP: "WhatsApp", SMS: "SMS", WEB: "Chat web", SOCIAL: "Réseau social", IN_PERSON: "Face à face",
};
export type SalesCatalogueOffer = { id?: string; nom: string; prix?: number; conditionsTarifaires?: string };
export type SalesPrincipalOption = { id: string; label: string };
const field = "w-full rounded border border-border bg-background px-3 py-2 text-sm";
type MandateDefaults = { offerId?: string; amount?: number; currency?: string; expiresAt?: string; terms?: string; beneficiary?: string; deliveryOwnerId?: string; paymentInstructions?: string; conversationTree?: NonNullable<ComponentProps<typeof CrmSalesTreeEditor>>["initialTree"] };
const localDate = (value?: string) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : undefined;

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
    {!informationOnly && <label>Prix à proposer<input key={`${namePrefix}price:${offerId}`} className={field} name={name("amount")} type="number" min="0" step="0.01" defaultValue={initial?.amount ?? (typeof offer?.prix === "number" && Number.isFinite(offer.prix) ? offer.prix : undefined)} required /></label>}
    <label>{informationOnly ? "Devise du catalogue" : "Devise"}<input key={`${namePrefix}currency:${offerId}`} className={field} name={name("currency")} pattern="[A-Z]{3}" maxLength={3} placeholder="XOF" defaultValue={initial?.currency} required /></label>
    <label>Validité<input key={`${namePrefix}expiry:${offerId}`} className={field} name={name("expiry")} type="datetime-local" defaultValue={localDate(initial?.expiresAt)} required /></label>
    <label>{informationOnly ? "Ce que le vendeur peut expliquer" : "Conditions et résultat promis"}<textarea key={`${namePrefix}terms:${offerId}`} className={field} name={name("terms")} defaultValue={initial?.terms ?? offer?.conditionsTarifaires} maxLength={4000} required /></label>
    {!informationOnly && <label>Entreprise qui reçoit le paiement<input key={`${namePrefix}beneficiary:${offerId}`} className={field} name={name("beneficiary")} maxLength={4000} defaultValue={initial?.beneficiary} required /></label>}
    {showSeller && <label>Vendeur chargé de l’affaire<select className={field} name={name("seller")} defaultValue={defaultPrincipalId} required>{principals.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>}
    <label>{informationOnly ? "Responsable du suivi" : "Responsable de la livraison"}<select key={`${namePrefix}delivery:${offerId}`} className={field} name={name("delivery")} defaultValue={initial?.deliveryOwnerId ?? defaultPrincipalId} required>{principals.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
    {!informationOnly && <label className="sm:col-span-2">Comment le client paie<textarea key={`${namePrefix}payment:${offerId}`} className={field} name={name("payment")} maxLength={4000} defaultValue={initial?.paymentInstructions} required /></label>}
    <details key={`${namePrefix}tree:${offerId}`} className="sm:col-span-2"><summary className="cursor-pointer">Questions et réponses du vendeur</summary><div className="mt-3"><CrmSalesTreeEditor name={name("tree")} initialTree={initial?.conversationTree} /></div></details>
  </>;
}
