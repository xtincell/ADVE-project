/** Customer conversations reuse the sales dossier; the STI remains seller-side. */
import { createHash, randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { db } from '@/lib/db';
import type {Prisma} from '@prisma/client';
import { salesStateSchema, type SalesActor } from './commercial';
import {encryptTokenPayload,decryptTokenPayload} from '@/server/services/oauth-integrations';
const hash = (value:string) => createHash('sha256').update(value).digest('hex');
export async function issueCustomerAccess(dealId:string,actor?:SalesActor):Promise<{path:string}> {
  return db.$transaction(tx=>issueCustomerAccessIn(tx,dealId,actor));
}
/** Same private conversation, prepared atomically with its authorised dossier. */
export async function issueCustomerAccessIn(client:Prisma.TransactionClient,dealId:string,actor?:SalesActor):Promise<{path:string}> {
  const deal=await client.deal.findUniqueOrThrow({where:{id:dealId}});
  if(deal.customerAccessTokenEncrypted&&deal.customerAccessTokenHash){const {token}=decryptTokenPayload<{token:string}>(deal.customerAccessTokenEncrypted);return {path:`/sales/${token}`};}
  if(actor){const {assertSalesEffectIn}=await import('./outbound-authority');await assertSalesEffectIn(client,deal,actor);}
  const token=randomBytes(32).toString('hex');
  const saved=await client.deal.updateMany({where:{id:dealId,customerAccessTokenEncrypted:null},data:{customerAccessTokenHash:hash(token),customerAccessTokenEncrypted:encryptTokenPayload({token})}});
  if(saved.count!==1)return issueCustomerAccessIn(client,dealId,actor);
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
  const informationOnly=Boolean(state.mandate?.informationOnly);
  const brand=await db.strategy.findUnique({where:{id:deal.sellerStrategyId!},select:{name:true}});
  const publicSession=await db.salesPublicSession.findUnique({where:{dealId:deal.id},select:{entryId:true,entry:{select:{config:true}}}});
  let publicBrandName:string|null=null;
  if(publicSession){
    const creation=await db.cRMActivity.findFirst({where:{dealId:deal.id,activityType:'DEAL_CREATED',metadata:{path:['publicEntryId'],equals:publicSession.entryId}},orderBy:{performedAt:'asc'},select:{metadata:true}});
    const frozen=(creation?.metadata as {publicBrandName?:unknown}|null)?.publicBrandName;
    const current=(publicSession.entry.config as {publicBrandName?:unknown}|null)?.publicBrandName;
    publicBrandName=typeof frozen==='string'&&frozen.trim()?frozen:typeof current==='string'&&current.trim()?current:'Équipe commerciale';
  }
  const inbound=await db.crmMessage.findMany({where:{salesDealId:deal.id,direction:'IN'},orderBy:[{createdAt:'desc'},{id:'desc'}],take:200,select:{id:true,body:true,createdAt:true,channel:true}});
  const outbound=await db.cRMActivity.findMany({where:{dealId:deal.id,activityType:{in:['SALES_WEB_SENT','SALES_EMAIL_SENT']}},orderBy:[{performedAt:'desc'},{id:'desc'}],take:200,select:{id:true,metadata:true,performedAt:true}});
  const awaitingReply=inbound[0]&&(!outbound[0]||inbound[0].createdAt>outbound[0].performedAt);
  const replyRun=awaitingReply?await db.salesRun.findUnique({where:{requestId:`inbound:${inbound[0]!.id}`},select:{status:true}}):null;
  const replyStatus: 'UP_TO_DATE'|'QUEUED'|'PROCESSING'|'TEAM_REVIEW'|'HUMAN_REPLY'=!awaitingReply?'UP_TO_DATE':
    !state.mandate?.sellerId.startsWith('mcp:')?'HUMAN_REPLY':replyRun?.status==='RUNNING'?'PROCESSING':replyRun?.status==='QUEUED'?'QUEUED':'TEAM_REVIEW';
  const payment=deal.paymentReference?await db.intakePayment.findUnique({where:{reference:deal.paymentReference},select:{reference:true,status:true,amount:true,currency:true,tierKey:true,intakeToken:true,paidAt:true}}):null;
  const {paymentMajorAmount}=await import('./payments');
  const customerPayment=!informationOnly&&payment?.tierKey==='SALES_COLLECTION'&&payment.intakeToken===`sales-deal:${deal.id}`?{reference:payment.reference,status:payment.status,amount:paymentMajorAmount(payment),currency:payment.currency,beneficiary:state.mandate?.beneficiary??'',paidAt:payment.paidAt}:null;
  return {informationOnly,payment:customerPayment,brand:publicBrandName??brand?.name??'Équipe commerciale',sellerMode:state.mandate?.sellerId.startsWith('mcp:')?'AI' as const:'HUMAN' as const,replyStatus,state:state.node,offer:state.mandate&&!informationOnly?{name:state.mandate.offerName,terms:state.mandate.terms,amount:state.mandate.amount,currency:state.mandate.currency,paymentInstructions:state.mandate.paymentInstructions}:null,
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
  if(deal.sellerStrategyId&&!actor.id.startsWith('mcp:')){const {assertHumanSalesActive}=await import('./fleet');await assertHumanSalesActive(deal.sellerStrategyId,actor.id);}
  const state=salesStateSchema.parse(deal.commercial??{});const mandate=state.mandate;
  if(!mandate||mandate.sellerId!==actor.id||!mandate.channels.includes('WEB')||new Date(mandate.expiresAt)<=new Date()||state.contactStopped||state.node==='STOPPED'||!deal.customerAccessTokenHash)throw new TRPCError({code:'FORBIDDEN',message:'Cette conversation ne fait pas partie des conditions de vente autorisées.'});
  const fingerprint=hash(JSON.stringify(input));
  const {reserveSalesOutbound}=await import('./outbound-authority');
  return (await reserveSalesOutbound(dealId,actor,{requestId:input.requestId,fingerprint,channel:'WEB',body:input.text})).receipt;
}
