/** Customer conversations reuse the sales dossier; the STI remains seller-side. */
import { createHash, randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { db } from '@/lib/db';
import { salesStateSchema, type SalesActor } from './commercial';
import {encryptTokenPayload,decryptTokenPayload} from '@/server/services/oauth-integrations';
const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export async function issueCustomerAccess(dealId:string):Promise<{path:string}> {
  const deal=await db.deal.findUniqueOrThrow({where:{id:dealId}});
  if(deal.customerAccessTokenEncrypted&&deal.customerAccessTokenHash){const {token}=decryptTokenPayload<{token:string}>(deal.customerAccessTokenEncrypted);return {path:`/sales/${token}`};}
  const token=randomBytes(32).toString('hex');
  const saved=await db.deal.updateMany({where:{id:dealId,customerAccessTokenEncrypted:null},data:{customerAccessTokenHash:hash(token),customerAccessTokenEncrypted:encryptTokenPayload({token})}});
  if(saved.count!==1)return issueCustomerAccess(dealId);
  return {path:`/sales/${token}`};
}
export async function resolveCustomerDeal(token:string) {
  if(!/^[a-f0-9]{64}$/.test(token)) throw new TRPCError({code:'NOT_FOUND',message:'Conversation indisponible.'});
  const deal=await db.deal.findUnique({where:{customerAccessTokenHash:hash(token)}});
  if(!deal?.sellerStrategyId) throw new TRPCError({code:'NOT_FOUND',message:'Conversation indisponible.'});
  return deal;
}
export async function customerConversation(token:string) {
  const deal=await resolveCustomerDeal(token);
  const state=salesStateSchema.parse(deal.commercial??{});
  const brand=await db.strategy.findUnique({where:{id:deal.sellerStrategyId!},select:{name:true}});
  const inbound=await db.crmMessage.findMany({where:{salesDealId:deal.id,direction:'IN'},orderBy:{createdAt:'asc'},take:200,select:{id:true,body:true,createdAt:true,channel:true}});
  const outbound=await db.cRMActivity.findMany({where:{dealId:deal.id,activityType:{in:['SALES_WEB_SENT','SALES_EMAIL_SENT']}},orderBy:{performedAt:'asc'},take:200,select:{id:true,metadata:true,performedAt:true}});
  return {brand:brand?.name??'Équipe commerciale',state:state.node,offer:state.mandate?{name:state.mandate.offerName,terms:state.mandate.terms,amount:state.mandate.amount,currency:state.mandate.currency,paymentInstructions:state.mandate.paymentInstructions}:null,
    stopped:!!state.contactStopped,messages:[...inbound.map(m=>({id:m.id,role:'customer' as const,body:m.body,at:m.createdAt})),...outbound.map(m=>({id:m.id,role:'seller' as const,body:String((m.metadata as {body?:string}|null)?.body??''),at:m.performedAt}))].sort((a,b)=>a.at.getTime()-b.at.getTime())};
}
export async function receiveCustomerMessage(token:string,input:{body:string;requestId:string}) {
  const deal=await resolveCustomerDeal(token);
  const previous=await db.crmMessage.findFirst({where:{salesDealId:deal.id,providerRef:`web:${input.requestId}`}});
  if(previous){if(previous.body!==input.body)throw new TRPCError({code:'CONFLICT',message:'Référence utilisée pour un autre message.'});return {received:true};}
  const count=await db.crmMessage.count({where:{salesDealId:deal.id,direction:'IN',createdAt:{gte:new Date(Date.now()-60000)}}});
  if(count>=10) throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'Veuillez patienter avant un nouvel envoi.'});
  const {recordInboundSalesMessage}=await import('./fleet');
  await recordInboundSalesMessage({dealId:deal.id,channel:'WEB',body:input.body,externalId:`web:${input.requestId}`});
  return {received:true};
}
export async function sendSalesWebMessage(dealId:string,actor:SalesActor,input:{requestId:string;text:string}) {
  const deal=await db.deal.findUniqueOrThrow({where:{id:dealId}});
  const state=salesStateSchema.parse(deal.commercial??{});const mandate=state.mandate;
  if(!mandate||mandate.sellerId!==actor.id||!mandate.channels.includes('WEB')||new Date(mandate.expiresAt)<=new Date()||state.contactStopped||state.node==='STOPPED'||!deal.customerAccessTokenHash)throw new TRPCError({code:'FORBIDDEN',message:'Conversation web hors mandat.'});
  const fingerprint=hash(JSON.stringify(input));
  const replay=await db.cRMActivity.findUnique({where:{id:input.requestId}});
  if(replay){if(replay.dealId!==dealId||replay.performedBy!==actor.id||(replay.metadata as {fingerprint?:string})?.fingerprint!==fingerprint)throw new TRPCError({code:'CONFLICT',message:'Référence de message déjà utilisée.'});return replay;}
  return db.cRMActivity.create({data:{id:input.requestId,dealId,performedBy:actor.id,activityType:'SALES_WEB_SENT',description:'Réponse au client',metadata:{fingerprint,body:input.text,channel:'WEB'}}});
}
