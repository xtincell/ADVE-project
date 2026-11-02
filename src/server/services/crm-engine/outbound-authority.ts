/** One transaction serializes the brand's finite outreach allowance and receipt. */
import { TRPCError } from '@trpc/server';
import type { Deal, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { salesStateSchema, type SalesActor } from './commercial';
import { datedSalesRequestId, validateDatedSalesRunIn } from './scheduling';
const deny=(message:string):never=>{throw new TRPCError({code:'PRECONDITION_FAILED',message});};
/** Confirmation time is the contact; reservation time is only the legacy fallback. */
function contactAt(row:{performedAt:Date;metadata:unknown}) {
 const confirmedAt=(row.metadata as {confirmedAt?:unknown}|null)?.confirmedAt;
 const confirmed=typeof confirmedAt==='string'?new Date(confirmedAt):null;
 return confirmed&&Number.isFinite(confirmed.getTime())&&confirmed>=row.performedAt?confirmed:row.performedAt;
}
export async function assertSalesEffectIn(tx:Prisma.TransactionClient,deal:Deal,actor:SalesActor) {
 if(!actor.salesRunId)return;
 const run=await tx.salesRun.findUnique({where:{id:actor.salesRunId},include:{representative:true}});
 if(!run||run.status!=='RUNNING'||run.dealId!==deal.id||!run.claimedAt||run.claimedAt.getTime()<Date.now()-15*60000||run.representative.status!=='ACTIVE'||actor.id!==`mcp:${run.representative.mcpKeyId}`)deny('Mission commerciale expirée ou suspendue.');
 const validity=await validateDatedSalesRunIn(tx,run!);
 if(!validity.allowed||validity.internalOnly)deny(validity.reason??'Cette revue est interne : aucun effet commercial autorisé.');
}
/** Runs inside the same locked transaction as a receipt/reservation. */
async function checkOutboundIn(tx:Prisma.TransactionClient,deal:Deal,actor:SalesActor,channel:'WEB'|'EMAIL') {
 const state=salesStateSchema.parse(deal.commercial??{}),mandate=state.mandate,now=new Date();
 if(!mandate||!deal.sellerStrategyId||mandate.sellerId!==actor.id||!mandate.channels.includes(channel)||new Date(mandate.expiresAt)<=now||state.contactStopped||state.node==='STOPPED')deny('Envoi hors mandat actif.');
 if(actor.id.startsWith('mcp:')) {
  const profile=await tx.salesRepresentative.findUnique({where:{mcpKeyId:actor.id.slice(4)},select:{status:true}});
  if(profile&&profile.status!=='ACTIVE')deny('Commercial suspendu.');
 } else {
  const profile=await tx.salesRepresentative.findFirst({where:{strategyId:deal.sellerStrategyId!,humanUserId:actor.id},select:{status:true}});
  if(profile&&profile.status!=='ACTIVE')deny('Commercial suspendu.');
 }
 await assertSalesEffectIn(tx,deal,actor);
 const identities:Prisma.DealWhereInput[]=[{id:deal.id}];
 if(deal.contactEmail)identities.push({contactEmail:{equals:deal.contactEmail,mode:'insensitive'}});
 if(deal.contactPhone)identities.push({contactPhone:deal.contactPhone});
 // Historical/UI formatting must not turn the same phone into a new contact.
 const normalizedPhone=deal.contactPhone?.replace(/[^\d+]/g,'');
 if(normalizedPhone) {
  const matches=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "Deal" WHERE "sellerStrategyId"=${deal.sellerStrategyId} AND regexp_replace("contactPhone", '[^0-9+]', '', 'g')=${normalizedPhone}`;
  if(matches.length)identities.push({id:{in:matches.map(row=>row.id)}});
 }
 const sameContact=await tx.deal.findMany({where:{sellerStrategyId:deal.sellerStrategyId,OR:identities},select:{id:true,commercial:true}});
 if(sameContact.some(row=>{const s=salesStateSchema.safeParse(row.commercial);return s.success&&(s.data.contactStopped||s.data.node==='STOPPED');}))deny('Contact arrêté pour cette marque.');
 const ids=sameContact.map(row=>row.id);
 if(await tx.cRMActivity.findFirst({where:{dealId:{in:ids},activityType:{in:['SALES_EMAIL_PENDING','SALES_EMAIL_UNCERTAIN']}},select:{id:true}})||await tx.salesRun.findFirst({where:{dealId:{in:ids},status:'AMBIGUOUS'},select:{id:true}}))deny('Une tentative attend sa réconciliation ; aucun nouvel envoi.');
 const policy=mandate!.outreachPolicy;
 if(!policy)return;
 const contacts=await tx.cRMActivity.findMany({where:{dealId:{in:ids},activityType:{in:['SALES_WEB_SENT','SALES_EMAIL_SENT']}},select:{dealId:true,performedAt:true,metadata:true}});
 const latest=(rows:typeof contacts)=>rows.reduce<Date|null>((at,row)=>!at||contactAt(row)>at?contactAt(row):at,null);
 const last=latest(contacts.filter(row=>row.dealId===deal.id));
 const reply=await tx.crmMessage.findFirst({where:{salesDealId:deal.id,direction:'IN',status:'RECEIVED',...(last?{createdAt:{gt:last}}:{})},orderBy:{createdAt:'desc'},select:{id:true}});
 // A real reply and agreed fulfillment are distinct from cold outreach.
 if(reply||['ACCEPTED','PAID','DELIVERED'].includes(state.node))return;
 if(new Date(policy.firstContactAt)>now)deny('La première prise de contact n’est pas encore autorisée.');
 const latestContact=latest(contacts);
 if(latestContact&&latestContact.getTime()+policy.minIntervalHours*3600000>now.getTime())deny('Intervalle minimal de ce contact dans la marque non atteint.');
 // A repeat needs the exact approved, due plan, not a fresh UUID.
 if(last) {
  if(state.nextPlan?.purpose!=='FOLLOW_UP')deny('Une nouvelle sollicitation exige la reprise datée approuvée.');
  if(actor.id.startsWith('mcp:')) {
   if(!actor.salesRequestId?.startsWith('deadline:'))deny('Une nouvelle sollicitation exige la reprise datée approuvée.');
  } else {
   // A person operates the same approved STI date, without inventing a worker lease.
   const holder=await tx.salesRepresentative.findFirst({where:{strategyId:deal.sellerStrategyId!,humanUserId:actor.id,status:'ACTIVE'},select:{id:true}});
   if(!holder)deny('Le titulaire humain actif doit être identifié avant cette reprise.');
   const validity=await validateDatedSalesRunIn(tx,{requestId:datedSalesRequestId(deal.id,state.nextPlan!.id),dealId:deal.id,representativeId:holder!.id},now);
   if(!validity.allowed||validity.internalOnly)deny(validity.reason??'La reprise humaine doit suivre une échéance commerciale approuvée.');
  }
 }
 const portfolio=mandate!.portfolioAuthorizationId;
 const members=portfolio?await tx.deal.findMany({where:{sellerStrategyId:deal.sellerStrategyId,commercial:{path:['mandate','portfolioAuthorizationId'],equals:portfolio}},select:{id:true}}):[{id:deal.id}];
 const reservations=await tx.cRMActivity.findMany({where:{dealId:{in:members.map(row=>row.id)},metadata:{path:['proactive'],equals:true},activityType:{in:['SALES_WEB_SENT','SALES_EMAIL_SENT','SALES_EMAIL_PENDING','SALES_EMAIL_UNCERTAIN']}},select:{activityType:true,performedAt:true,metadata:true}});
 const used=reservations.filter(row=>(row.activityType.endsWith('_SENT')?contactAt(row):row.performedAt).getTime()>=now.getTime()-86400000).length;
 if(used>=policy.dailyOutboundLimit)deny('Limite du portefeuille sur 24 heures atteinte.');
 return true;
}
export async function reserveSalesOutbound(dealId:string,actor:SalesActor,input:{requestId:string;fingerprint:string;channel:'WEB'|'EMAIL';body:string;subject?:string}) {
 return db.$transaction(async tx=>{
  const first=await tx.deal.findUniqueOrThrow({where:{id:dealId}});
  // Serialize every cohort/contact in this brand without changing brand data.
  if(first.sellerStrategyId)await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${first.sellerStrategyId} FOR UPDATE`;
  const existing=await tx.cRMActivity.findUnique({where:{id:input.requestId}});
  if(existing){if(existing.dealId!==dealId||existing.performedBy!==actor.id||(existing.metadata as {fingerprint?:string}|null)?.fingerprint!==input.fingerprint)throw new TRPCError({code:'CONFLICT',message:'Référence d’envoi déjà utilisée.'});return {receipt:existing,replay:true};}
  const deal=await tx.deal.findUniqueOrThrow({where:{id:dealId}});
  if(input.channel==='WEB'&&!deal.customerAccessTokenHash)deny('Conversation privée absente.');
  const state=salesStateSchema.parse(deal.commercial??{});
  if(input.channel==='EMAIL'&&(!state.mandate?.outboundEmailEnabled||!deal.contactEmail))deny('Destinataire ou mandat email absent.');
  const proactive=await checkOutboundIn(tx,deal,actor,input.channel);
  const receipt=await tx.cRMActivity.create({data:{id:input.requestId,dealId,performedBy:actor.id,activityType:input.channel==='WEB'?'SALES_WEB_SENT':'SALES_EMAIL_PENDING',description:input.subject??'Réponse au client',metadata:{fingerprint:input.fingerprint,body:input.body,channel:input.channel,proactive:!!proactive,...(deal.contactEmail?{to:deal.contactEmail}:{})}}});
  return {receipt,replay:false};
 });
}
