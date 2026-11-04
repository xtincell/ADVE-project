/** Implementation of the existing pricing-strategy-advisor / devis-generator.
 * Prices come from the current catalogue or the existing monetization resolver.
 * A range is not a unit price. Neither the customer nor the LLM supplies amounts.
 */
import { createHash } from "node:crypto";
import { computeQuoteTotals } from "@/server/services/mission-quote";
import {
  commercialCatalogueTermsSchema,
  commercialAuthorizedOffersSchema,
  commercialPricingDocumentSchema,
  commercialQuoteDocumentSchema,
  commercialQuoteRequestSchema,
  commercialTierMappingSchema,
  type CommercialPriceItem,
  type CommercialPricingDocument,
  type CommercialQuoteDocument,
} from "./commercial-offer-schemas";

type Blob = Record<string, unknown>;
export const COMMERCIAL_INPUT_FIELDS = ["tier_mapping", "catalogue_terms", "country_code", "quote_request", "owner_authorized_offer_ids"] as const;
const BILLING_NOTE = "Montants séparés par devise et période. Un abonnement mensuel n’est pas additionné à une prestation ponctuelle. Ce document ne prouve ni vente, ni paiement, ni livraison.";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const obj = (value: unknown): Blob => value && typeof value === "object" && !Array.isArray(value) ? value as Blob : {};
const nonempty = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

function json(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return undefined; }
}

/** Parse an exact documented amount, never a range, 'from', historic prose or estimate. */
function exactAmount(value: unknown): { amount: number; marker: string | null } | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? { amount: value, marker: null } : null;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^((?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d+)(?:[.,]\d{1,2})?)\s*(XOF|XAF|FCFA|EUR|USD|GBP|NGN|MAD|€|\$)?(?:\s*\/(?:mois|month|an|year))?$/i);
  if (!match) return null;
  const amount = Number(match[1]!.replace(/[ \u00a0\u202f]/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? { amount, marker: match[2]?.toUpperCase() ?? null } : null;
}

function markerMatches(marker: string | null, currency: string): boolean {
  if (!marker) return true;
  if (marker === "FCFA") return currency === "XOF" || currency === "XAF";
  if (marker === "€") return currency === "EUR";
  // '$' alone does not establish which dollar currency the source means.
  if (marker === "$") return false;
  return marker === currency;
}

/** Pure CALC adapter. Only prepared, schema-checked price items can enter this math path. */
export function pricingStrategyCalculator(context: Blob): Blob {
  const parsed = commercialPricingDocumentSchema.safeParse(json(context.pricing_strategy));
  if (parsed.success) return { pricing_strategy: parsed.data };
  return { pricing_strategy: {
    schemaVersion: 1, status: "NEEDS_INPUT", countryCode: null, items: [],
    gaps: ["Chargez les prix documentés du catalogue avec le Conseiller Stratégie de Pricing."], note: BILLING_NOTE,
  } satisfies CommercialPricingDocument };
}

/** Strict quantities × sourced prices; the totals helper is shared with MissionQuote. */
export function devisGeneratorCalculator(context: Blob): Blob {
  const pricing = commercialPricingDocumentSchema.safeParse(json(context.pricing_strategy));
  const request = commercialQuoteRequestSchema.safeParse(json(context.quote_request));
  const gaps: string[] = [];
  if (!pricing.success) gaps.push("La grille de prix documentée est absente ou invalide.");
  else gaps.push(...pricing.data.gaps);
  if (!request.success) gaps.push("Précisez les offres et leurs quantités ; aucune ligne ou quantité n’est choisie à votre place.");
  const selected = request.success ? request.data : null;
  const items = pricing.success ? pricing.data.items : [];
  const lines: CommercialQuoteDocument["lines"] = [];
  for (const selection of selected?.lines ?? []) {
    const item = items.find(candidate => candidate.offerId === selection.offerId);
    if (!item) { gaps.push(`Offre inconnue du catalogue : ${selection.offerId}.`); continue; }
    gaps.push(...item.gaps.map(gap => `${item.offerName} : ${gap}`));
    const lineTotal = item.unitPrice === null ? null
      : computeQuoteTotals([{ label: item.offerName, qty: selection.quantity, unitPrice: item.unitPrice }], 0).subtotal;
    lines.push({ ...item, quantity: selection.quantity, lineTotal });
  }
  const groups: CommercialQuoteDocument["groups"] = [];
  for (const line of lines) {
    if (line.unitPrice === null || !line.currency || !line.billing) continue;
    if (groups.some(group => group.currency === line.currency && group.billing === line.billing)) continue;
    const members = lines.filter(item => item.currency === line.currency && item.billing === line.billing && item.unitPrice !== null);
    const taxTreatment = selected?.taxTreatment ?? (selected?.taxRatePct !== undefined ? "EXCLUDED" : "UNSPECIFIED");
    const taxRatePct = taxTreatment === "EXCLUDED" ? selected?.taxRatePct ?? null : null;
    const totals = computeQuoteTotals(members.map(item => ({ label: item.offerName, qty: item.quantity, unitPrice: item.unitPrice! })), taxRatePct ?? 0);
    groups.push({ currency: line.currency, billing: line.billing, subtotal: totals.subtotal, taxTreatment,
      taxRatePct, tax: taxRatePct === null ? null : totals.taxAmount,
      total: taxTreatment === "INCLUDED_IN_PRICE" ? totals.subtotal : taxRatePct === null ? null : totals.total });
  }
  if (selected && !selected.client) gaps.push("Le nom du client reste à compléter avant émission du devis.");
  if (selected && !selected.scope?.length) gaps.push("Le périmètre de la prestation reste à préciser.");
  if (selected && selected.exclusions === undefined) gaps.push("Précisez les exclusions, même si aucune exclusion ne s’applique.");
  if (selected && !selected.conditions?.length && !lines.some(line => line.conditions.length)) gaps.push("Les conditions de vente restent à préciser.");
  if (selected && !selected.validUntil) gaps.push("La date de validité du devis reste à préciser.");
  if (selected && selected.taxTreatment !== "INCLUDED_IN_PRICE" && selected.taxRatePct === undefined) gaps.push("Le traitement des taxes reste à préciser ; aucun taux nul n’est supposé.");
  if (lines.length === 0 && !gaps.length) gaps.push("Aucune ligne de devis disponible.");
  const sources = [...new Map(lines.flatMap(line => line.sources).map(source => [`${source.kind}:${source.reference}:${source.contentHash}`, source])).values()];
  if (selected) sources.push({ kind: "OWNER_INPUT", reference: "quote_request", contentHash: hash(selected) });
  const conditions = [...new Set([...(selected?.conditions ?? []), ...lines.flatMap(line => line.conditions)])];
  const document: CommercialQuoteDocument = { schemaVersion: 1,
    status: gaps.length ? "NEEDS_INPUT" : "READY", client: selected?.client ?? null, lines, groups,
    conditions, scope: selected?.scope ?? [], exclusions: selected?.exclusions ?? [], validUntil: selected?.validUntil ?? null,
    sources, gaps: [...new Set(gaps)], note: `${BILLING_NOTE}${selected?.taxTreatment === "INCLUDED_IN_PRICE" ? " Prix finaux approuvés, taxes incluses sans ventilation ; aucun taux ni montant de TVA n’est inventé." : ""}` };
  return { devis: commercialQuoteDocumentSchema.parse(document) };
}

/** One DB-backed source projection for standalone tools, OFFRE-V and the seller. */
export async function composeCommercialPricing(strategyId: string, input: Record<string, string> = {}): Promise<Blob> {
  const { db } = await import("@/lib/db");
  const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: {
    id: true, countryCode: true, pillars: { where: { key: "v" }, select: { content: true, currentVersion: true } },
  } });
  const pillar = strategy?.pillars[0];
  const catalogueRaw = obj(pillar?.content).produitsCatalogue;
  const catalogue = Array.isArray(catalogueRaw) ? catalogueRaw.map(obj) : [];
  const gaps: string[] = [];
  if (!strategy) gaps.push("Le dossier de marque est introuvable.");
  if (!catalogue.length) gaps.push("Le catalogue de produits et services est vide.");
  const mapping = commercialTierMappingSchema.safeParse(json(input.tier_mapping) ?? {});
  const terms = commercialCatalogueTermsSchema.safeParse(json(input.catalogue_terms) ?? {});
  const authorized = commercialAuthorizedOffersSchema.safeParse(json(input.owner_authorized_offer_ids) ?? []);
  if (!mapping.success) gaps.push("La correspondance entre offres et tarifs du moteur est invalide.");
  if (!terms.success) gaps.push("La devise, la période ou la source des conditions tarifaires est invalide.");
  if (!authorized.success || (input.owner_authorized_offer_ids && json(input.owner_authorized_offer_ids) === undefined)) gaps.push("La liste d’offres autorisées doit contenir leurs identifiants exacts.");
  // A malformed supplied JSON must not silently become an empty valid mapping.
  if (input.tier_mapping && json(input.tier_mapping) === undefined) gaps.push("La correspondance tarifaire doit être un objet JSON valide.");
  if (input.catalogue_terms && json(input.catalogue_terms) === undefined) gaps.push("Les conditions tarifaires doivent être un objet JSON valide.");
  const countryCode = nonempty(input.country_code) ?? strategy?.countryCode ?? null;
  const { lookupCountry } = await import("@/server/services/country-registry");
  const country = countryCode && /^[a-z]{2}$/i.test(countryCode) ? await lookupCountry(countryCode) : null;
  const exactCountry = country && country.code.toUpperCase() === countryCode?.toUpperCase() && !country.isFictional ? country : null;
  const items: CommercialPriceItem[] = [];
  const ids = catalogue.map(product => nonempty(product.id));
  for (const [index, product] of catalogue.entries()) {
    const offerId = nonempty(product.id) ?? `catalogue-index-${index}`;
    const offerName = nonempty(product.nom) ?? offerId;
    const itemGaps: string[] = [];
    if (!nonempty(product.id)) itemGaps.push("L’offre doit avoir un identifiant stable dans le catalogue.");
    if (ids.filter(id => id === offerId).length > 1) itemGaps.push("L’identifiant est utilisé par plusieurs offres du catalogue.");
    const catalogueSource = { kind: "CATALOGUE" as const, reference: `strategy:${strategyId}:v.produitsCatalogue[${index}]`,
      contentHash: hash(product), ...(pillar ? { version: pillar.currentVersion } : {}) };
    const item: CommercialPriceItem = { offerId, offerName, status: "NEEDS_INPUT", unitPrice: null, currency: null, billing: null,
      conditions: nonempty(product.conditionsTarifaires) ? [String(product.conditionsTarifaires).trim()] : [],
      availability: nonempty(product.disponibilite), sources: [catalogueSource], gaps: itemGaps };
    const tierKey = mapping.success ? mapping.data[offerId] : undefined;
    const ownerTerms = terms.success ? terms.data[offerId] : undefined;
    if (tierKey) {
      if (!exactCountry) itemGaps.push("Choisissez un pays reconnu pour calculer le prix local ; aucun pays de remplacement n’est utilisé.");
      else {
        const { resolvePrice } = await import("@/server/services/monetization/compute-price");
        const resolved = await resolvePrice(tierKey, exactCountry.code);
        item.unitPrice = resolved.amount;
        item.currency = resolved.currencyCode;
        item.billing = resolved.billing;
        item.sources.push({ kind: "MONETIZATION", reference: `monetization.getPrice:${tierKey}:${exactCountry.code}`, contentHash: hash({ resolved, country: exactCountry }),
          details: { tierKey, countryCode: exactCountry.code, resolved: { ...resolved }, country: { ...exactCountry } } });
        item.sources.push({ kind: "OWNER_INPUT", reference: "tier_mapping", contentHash: hash({ offerId, tierKey }) });
        if (ownerTerms && (ownerTerms.currency !== item.currency || ownerTerms.billing !== item.billing)) itemGaps.push("La devise ou la période approuvée ne correspond pas au résultat du moteur tarifaire.");
      }
    } else {
      const price = exactAmount(product.prix);
      if (!price) itemGaps.push("Le catalogue ne donne pas de prix unitaire exact ; une fourchette ou un prix sur devis n’est pas un montant facturable.");
      else item.unitPrice = price.amount;
      if (!ownerTerms) itemGaps.push("Précisez la devise et la période approuvées, avec leur source ; aucune période n’est déduite du texte.");
      else {
        item.currency = ownerTerms.currency;
        item.billing = ownerTerms.billing;
        if (price && !markerMatches(price.marker, ownerTerms.currency)) itemGaps.push("La devise approuvée contredit le prix documenté du catalogue.");
      }
    }
    if (ownerTerms) {
      item.conditions.push(...(ownerTerms.conditions ?? []));
      item.sources.push({ kind: "OWNER_INPUT", reference: ownerTerms.sourceRef, contentHash: hash(ownerTerms) });
    }
    const ownerAuthorized = authorized.success && authorized.data.includes(offerId);
    if (ownerAuthorized) item.sources.push({ kind: "OWNER_INPUT", reference: "owner_authorized_offer_ids", contentHash: hash([offerId]),
      details: { note: "Préparation explicitement autorisée par le propriétaire ; la disponibilité ADVE source reste inchangée." } });
    if (item.availability === "PENDING" && !ownerAuthorized) itemGaps.push("La disponibilité de l’offre est encore à confirmer ; ce prix ne vaut pas autorisation de mise en vente.");
    if (item.conditions.some(condition => /^HISTORIQUE\s*[—:-]/i.test(condition))) itemGaps.push("Les conditions sont historiques ; aucune offre actuelle n’est confirmée par cette référence.");
    item.status = itemGaps.length ? "NEEDS_INPUT" : "PRICED";
    items.push(item);
  }
  for (const offerId of Object.keys(mapping.success ? mapping.data : {})) if (!items.some(item => item.offerId === offerId)) gaps.push(`La correspondance tarifaire référence une offre absente : ${offerId}.`);
  for (const offerId of Object.keys(terms.success ? terms.data : {})) if (!items.some(item => item.offerId === offerId)) gaps.push(`Les conditions tarifaires référencent une offre absente : ${offerId}.`);
  for (const offerId of authorized.success ? authorized.data : []) if (!items.some(item => item.offerId === offerId)) gaps.push(`L’autorisation référence une offre absente : ${offerId}.`);
  const document: CommercialPricingDocument = { schemaVersion: 1,
    status: gaps.length || items.some(item => item.status === "NEEDS_INPUT") ? "NEEDS_INPUT" : "READY",
    countryCode: exactCountry?.code ?? null, items, gaps, note: BILLING_NOTE };
  return { pricing_strategy: commercialPricingDocumentSchema.parse(document) };
}

export async function composeCommercialQuote(strategyId: string, input: Record<string, string> = {}): Promise<Blob> {
  const pricing = await composeCommercialPricing(strategyId, input);
  const output = devisGeneratorCalculator({ ...pricing, quote_request: input.quote_request });
  const document = output.devis as CommercialQuoteDocument;
  const pricingDocument = pricing.pricing_strategy as CommercialPricingDocument;
  if (pricingDocument.gaps.length) {
    document.gaps.push(...pricingDocument.gaps);
    document.gaps = [...new Set(document.gaps)];
    document.status = "NEEDS_INPUT";
  }
  return { devis: commercialQuoteDocumentSchema.parse(document) };
}

/** The existing document forge receives readable text, never a JSON object.
 * Formatting only: amounts, periods and conditions are copied from the READY
 * quotation. No total, tax, currency conversion or commercial promise is added.
 */
export function formatCommercialQuoteBrief(value: unknown): string | null {
  const parsed = commercialQuoteDocumentSchema.safeParse(value);
  if (!parsed.success) return null;
  const quote = parsed.data;
  if (quote.status !== "READY" || quote.gaps.length || !quote.client?.name.trim() || !quote.lines.length || !quote.groups.length ||
    quote.lines.some(line => line.status !== "PRICED" || line.unitPrice === null || line.lineTotal === null || !line.currency || !line.billing) ||
    quote.groups.some(group => group.total === null || group.taxTreatment === "UNSPECIFIED")) return null;
  const text = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/[\\`*_{}[\]()#|]/g, "\\$&").replace(/\r?\n/g, " / ");
  const money = (amount: number, currency: string) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  const period = (billing: string) => billing === "MONTHLY" ? "par mois" : billing === "YEARLY" ? "par an" : "prestation ponctuelle";
  const list = (values: string[]) => values.length ? values.map(item => `- ${text(item)}`).join("\n") : "Aucun service supplémentaire indiqué.";
  const validUntil = quote.validUntil && !Number.isNaN(new Date(quote.validUntil).getTime())
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }).format(new Date(quote.validUntil)) + " UTC"
    : quote.validUntil ?? "Non renseignée";
  const lines = quote.lines.map(line => `| ${text(line.offerName)} | ${line.quantity} | ${period(line.billing!)} | ${money(line.unitPrice!, line.currency!)} | ${money(line.lineTotal!, line.currency!)} |`).join("\n");
  const groups = quote.groups.map(group => [
    `### ${group.currency} — ${period(group.billing)}`,
    `${group.taxTreatment === "INCLUDED_IN_PRICE" ? "Montant final" : "Sous-total hors taxes"} : **${money(group.subtotal, group.currency)}**`,
    group.taxTreatment === "INCLUDED_IN_PRICE" ? "Taxes incluses dans le prix final, sans ventilation. Aucun taux ou montant distinct de taxe n’est renseigné."
      : `Taxes (${group.taxRatePct} %) : ${group.tax === null ? "Non renseignées" : money(group.tax, group.currency)}`,
    `**Total à payer : ${money(group.total!, group.currency)} — ${period(group.billing)}**`,
  ].join("\n\n")).join("\n\n");
  const sources = [...new Set(quote.sources.map(source => source.kind === "CATALOGUE"
    ? `Catalogue de marque${source.version !== undefined ? `, version ${source.version}` : ""}`
    : source.kind === "MONETIZATION" ? "Tarif du pays choisi" : "Conditions approuvées"))];
  return ["# Proposition commerciale", `**Client :** ${text(quote.client.name)}`, `**Valable jusqu’au :** ${text(validUntil)}`,
    "## Prestations", ["| Prestation | Quantité | Période | Prix unitaire | Montant de ligne |", "| --- | ---: | --- | ---: | ---: |", lines].join("\n"),
    "## Montants à payer", groups, "Les devises et périodes sont présentées séparément ; aucun total global ne les additionne.",
    "## Prestations prévues", list(quote.scope), "## Services non inclus", quote.exclusions.length ? list(quote.exclusions) : "Aucune exclusion supplémentaire indiquée.",
    "## Conditions de vente", list(quote.conditions), "## Sources", list(sources),
    "Cette proposition ne constitue pas un reçu de paiement ou de livraison."].join("\n\n");
}
