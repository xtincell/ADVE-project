"use client";

import { salesChannel } from "@/server/services/crm-engine/commercial";
import { CrmSalesTreeEditor } from "./crm-sales-tree-editor";

export const salesChannels = salesChannel.options;
export const salesChannelNames: Record<(typeof salesChannels)[number], string> = {
  PHONE: "Téléphone", EMAIL: "Email", WHATSAPP: "WhatsApp", SMS: "SMS", WEB: "Chat web", SOCIAL: "Réseau social", IN_PERSON: "Face à face",
};
export type SalesCatalogueOffer = { id?: string; nom: string; prix?: number; conditionsTarifaires?: string };
export type SalesPrincipalOption = { id: string; label: string };
const field = "w-full rounded border border-border bg-background px-3 py-2 text-sm";

/** The individual desk and the portfolio approve the same offer and commitment fields. */
export function CrmSalesMandateFields({ catalogue, offerId, onOfferChange, offerVersion, principals, defaultPrincipalId, defaultChannel = "EMAIL", showSeller = true }: {
  catalogue: SalesCatalogueOffer[];
  offerId: string;
  onOfferChange: (id: string) => void;
  offerVersion?: string;
  principals: SalesPrincipalOption[];
  defaultPrincipalId?: string;
  defaultChannel?: (typeof salesChannels)[number];
  showSeller?: boolean;
}) {
  const offer = catalogue.find(item => item.id === offerId);
  return <>
    <label>Offre du catalogue<select className={field} value={offerId} onChange={event => onOfferChange(event.target.value)} required>
      <option value="">Choisir</option>{catalogue.filter(item => item.id).map(item => <option key={item.id} value={item.id}>{item.nom}</option>)}
    </select></label>
    <p className="self-end text-xs text-foreground-muted">{offerVersion ? `Catalogue · version ${offerVersion}. ` : ""}Le catalogue prépare les conditions ; votre approbation autorise leur mise en vente.</p>
    <fieldset className="sm:col-span-2"><legend>Points de contact autorisés</legend>
      <div className="mt-2 flex flex-wrap gap-3">{salesChannels.map(item => <label key={item} className="flex gap-2">
        <input type="checkbox" name="channels" value={item} defaultChecked={item === defaultChannel} />{salesChannelNames[item]}
      </label>)}</div>
      <p className="mt-2 text-xs text-foreground-muted">L’email et le chat web peuvent être automatisés si le connecteur de marque ou le lien privé est disponible. Téléphone, WhatsApp, SMS et réseaux sociaux restent pris en charge par un vendeur humain tant que leur connexion n’est pas activée. Le face-à-face reste humain.</p>
    </fieldset>
    <label>Prix autorisé<input key={`price:${offerId}`} className={field} name="amount" type="number" min="0" step="0.01" defaultValue={typeof offer?.prix === "number" && Number.isFinite(offer.prix) ? offer.prix : undefined} required /></label>
    <label>Devise<input className={field} name="currency" pattern="[A-Z]{3}" maxLength={3} placeholder="XOF" required /></label>
    <label>Validité<input className={field} name="expiry" type="datetime-local" required /></label>
    <label>Conditions et résultat promis<textarea key={`terms:${offerId}`} className={field} name="terms" defaultValue={offer?.conditionsTarifaires} maxLength={4000} required /></label>
    <label>Entité bénéficiaire<input className={field} name="beneficiary" maxLength={4000} required /></label>
    {showSeller && <label>Vendeur titulaire<select className={field} name="seller" defaultValue={defaultPrincipalId} required>{principals.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>}
    <label>Responsable de remise<select className={field} name="delivery" defaultValue={defaultPrincipalId} required>{principals.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}</select></label>
    <label className="sm:col-span-2">Instructions de règlement<textarea className={field} name="payment" maxLength={4000} required /></label>
    <details className="sm:col-span-2"><summary className="cursor-pointer">Arbre de conversation approuvé</summary><div className="mt-3"><CrmSalesTreeEditor /></div></details>
  </>;
}
