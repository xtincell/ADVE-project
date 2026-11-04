/** Private immutable quotation. No generation, repricing or customer identity discovery. */
export const dynamic='force-dynamic';
import {customerProposalDocument} from '@/server/services/crm-engine/customer';
import {formatCommercialQuoteBrief} from '@/server/services/artemis/tools/commercial-offer';

const headers={
 'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer',
 'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};
const escape=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const billing=(period:string)=>period==='MONTHLY'?'par mois':period==='YEARLY'?'par an':'ponctuel';
const money=(amount:number,currency:string)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency,maximumFractionDigits:2}).format(amount);
const date=(value:string|undefined)=>value?new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC':'Non renseignée';
const list=(items:string[])=>items.length?`<ul>${items.map(item=>`<li>${escape(item)}</li>`).join('')}</ul>`:'<p>Aucune exclusion supplémentaire indiquée.</p>';

export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){
 try{
  const token=(await params).token;
  const {brand,proposal,document}=await customerProposalDocument(token);
  if(new URL(request.url).searchParams.get('format')==='md'){
   const markdown=formatCommercialQuoteBrief(document);
   if(!markdown)throw new Error('Proposition indisponible.');
   return new Response(markdown,{headers:{...headers,'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':`attachment; filename="proposition-${proposal.id}.md"`}});
  }
  const groups=document.groups.map(group=>`<section class="totals"><h3>${escape(group.currency)} · ${escape(billing(group.billing))}</h3>
   <p>${group.taxTreatment==='INCLUDED_IN_PRICE'?'Montant final, taxes incluses sans ventilation':'Sous-total hors taxes'} : <strong>${escape(money(group.subtotal,group.currency))}</strong></p>
   ${group.taxTreatment==='INCLUDED_IN_PRICE'?'<p>Taxes incluses dans le prix final. Aucun taux ni montant de taxe distinct n’est renseigné.</p>':`<p>Taxes (${escape(group.taxRatePct)} %) : ${escape(money(group.tax!,group.currency))}</p>`}
   <p class="total">Total à payer : ${escape(money(group.total!,group.currency))} · ${escape(billing(group.billing))}</p></section>`).join('');
  const sources=[...new Set(document.sources.map(source=>source.kind==='CATALOGUE'?`Catalogue de marque${source.version!==undefined?`, version ${source.version}`:''}`:source.kind==='MONETIZATION'?'Tarif du pays choisi':'Conditions approuvées'))].map(source=>`<li>${escape(source)}</li>`).join('');
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Proposition commerciale · ${escape(brand)}</title>
  <style>body{font:16px/1.55 system-ui,sans-serif;color:#182124;background:#eef1ef;margin:0}main{max-width:920px;margin:36px auto;padding:40px;background:white;border-radius:12px}h1,h2,h3{line-height:1.2}h1{font-size:32px}h2{font-size:21px;margin-top:30px}h3{font-size:17px}a{color:inherit}p{margin:8px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;vertical-align:top;padding:12px 8px;border-bottom:1px solid #ccd5d0}th{font-size:13px}td.amount,th.amount{text-align:right;white-space:nowrap}.totals{margin:24px 0;padding:18px;background:#f3f6f4;border-radius:8px}.total{font-weight:700;font-size:19px}.meta{font-size:12px;color:#4d5d54;overflow-wrap:anywhere}li{margin:6px 0}@media(max-width:650px){main{margin:0;padding:22px;border-radius:0}table{font-size:12px}th,td{padding:9px 4px;overflow-wrap:anywhere}}@media print{body{background:white}main{margin:0;max-width:none;padding:0;border-radius:0}.screen-only{display:none}h2,h3{break-after:avoid}tr,.totals{break-inside:avoid}a{text-decoration:none}@page{margin:18mm}}</style></head><body><main>
  <nav class="screen-only"><a href="/sales/${escape(token)}">Revenir à la conversation</a> · Imprimable depuis le menu de votre navigateur</nav>
  <p>${escape(brand)}</p><h1>Proposition commerciale — ${escape(proposal.offerName)}</h1>
  <p class="meta">Référence : ${escape(proposal.id)}<br>Préparée le : ${escape(date(proposal.preparedAt))}<br>Présentée le : ${escape(date(proposal.presentedAt))}<br>Catalogue de marque, version ${escape(proposal.sourceVersion)}</p>
  <p><strong>Client :</strong> ${escape(document.client?.name)}</p><p><strong>Valable jusqu’au :</strong> ${escape(date(document.validUntil??undefined))}</p>
  <table><thead><tr><th>Prestation</th><th>Quantité</th><th>Période</th><th class="amount">Prix unitaire</th><th class="amount">Montant de ligne</th></tr></thead><tbody>${document.lines.map(line=>`<tr><td>${escape(line.offerName)}</td><td>${escape(line.quantity)}</td><td>${escape(billing(line.billing!))}</td><td class="amount">${escape(money(line.unitPrice!,line.currency!))}</td><td class="amount">${escape(money(line.lineTotal!,line.currency!))}</td></tr>`).join('')}</tbody></table>
  ${groups}<h2>Prestations prévues</h2>${list(document.scope)}<h2>Services non inclus</h2>${list(document.exclusions)}<h2>Conditions de vente</h2>${list(document.conditions)}
  <p>La confirmation est à transmettre depuis votre conversation privée. Cette proposition ne constitue pas un reçu de paiement ou de livraison.</p>
  <h2>Sources</h2><ul class="meta">${sources}</ul></main></body></html>`;
  return new Response(html,{headers});
 }catch{return new Response('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Devis indisponible</title><p>Devis indisponible.</p></html>',{status:404,headers});}
}
