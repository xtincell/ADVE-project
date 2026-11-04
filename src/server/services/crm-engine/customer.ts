/** Customer conversations reuse the sales dossier; the STI remains seller-side. */
import { createHash, randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { db } from '@/lib/db';
import type {Prisma} from '@prisma/client';
import { z } from 'zod';
import { salesStateSchema, type SalesActor, type SalesState } from './commercial';
import { commercialQuoteOutputSchema } from '../artemis/tools/commercial-offer-schemas';
import { serialSalesTransaction } from './transaction';
import { projectPublicSalesHumanContact } from './public-entry-contract';
import {encryptTokenPayload,decryptTokenPayload,getPublicBaseUrl} from '@/server/services/oauth-integrations';
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
async function customerPublicIdentity(deal:{id:string;sellerStrategyId:string|null}) {
  const brand=await db.strategy.findUnique({where:{id:deal.sellerStrategyId!},select:{name:true}});
  const publicSession=await db.salesPublicSession.findUnique({where:{dealId:deal.id},select:{entryId:true,entry:{select:{config:true}}}});
  let publicBrandName:string|null=null;
  let humanContact:ReturnType<typeof projectPublicSalesHumanContact>=null;
  if(publicSession){
    const creation=await db.cRMActivity.findFirst({where:{dealId:deal.id,activityType:'DEAL_CREATED',metadata:{path:['publicEntryId'],equals:publicSession.entryId}},orderBy:{performedAt:'asc'},select:{metadata:true}});
    const frozen=(creation?.metadata as {publicBrandName?:unknown}|null)?.publicBrandName;
    const current=(publicSession.entry.config as {publicBrandName?:unknown}|null)?.publicBrandName;
    publicBrandName=typeof frozen==='string'&&frozen.trim()?frozen:typeof current==='string'&&current.trim()?current:'Équipe commerciale';
    // Old sessions without an explicit frozen approval receive no new contact
    // from a later configuration or a platform-wide WhatsApp setting.
    humanContact=projectPublicSalesHumanContact((creation?.metadata as {humanContact?:unknown}|null)?.humanContact);
  }
  return {brand:publicBrandName??brand?.name??'Équipe commerciale',humanContact};
}
/** Preparation alone does not present a quotation or authorize its publication. */
function visibleCustomerProposal(state:SalesState) {
  const proposal=state.proposal,mandate=state.mandate;
  return !mandate?.informationOnly&&proposal&&proposal.presentedAt&&
    ['PROPOSAL','OBJECTION','ACCEPTED','PAID','DELIVERED'].includes(state.node)&&
    proposal.offerId===mandate?.offerId&&proposal.amount===mandate.amount&&proposal.currency===mandate.currency
    ?proposal:null;
}
/** Reads only the stored GloryOutput tied to this exact private dossier. */
export async function customerProposalDocument(token:string) {
  const deal=await resolveCustomerDeal(token);
  const state=salesStateSchema.parse(deal.commercial??{}),proposal=visibleCustomerProposal(state);
  if(!proposal)throw new TRPCError({code:'NOT_FOUND',message:'Devis indisponible.'});
  const output=await db.gloryOutput.findFirst({where:{id:proposal.gloryOutputId,strategyId:deal.sellerStrategyId!,toolSlug:'devis-generator'},select:{output:true}});
  const parsed=commercialQuoteOutputSchema.safeParse(output?.output);
  const document=parsed.success?parsed.data.devis:null;
  const group=document?.groups[0],line=document?.lines[0];
  if(!document||document.status!=='READY'||document.groups.length!==1||document.lines.length!==1||
    !group||!line||group.total!==proposal.amount||group.currency!==proposal.currency||group.billing!==proposal.billing||
    line.offerId!==proposal.offerId||line.unitPrice!==proposal.unitPrice||line.quantity!==proposal.quantity||
    line.currency!==group.currency||line.billing!==group.billing||line.lineTotal!==group.subtotal||
    (proposal.taxTreatment!==undefined&&proposal.taxTreatment!==group.taxTreatment)||
    (proposal.subtotal!==undefined&&proposal.subtotal!==group.subtotal)||
    (proposal.taxRatePct!==undefined&&proposal.taxRatePct!==group.taxRatePct)||
    (proposal.taxAmount!==undefined&&proposal.taxAmount!==group.tax)||
    !document.sources.some(source=>source.kind==='CATALOGUE'&&String(source.version)===proposal.sourceVersion)){
    throw new TRPCError({code:'NOT_FOUND',message:'Devis indisponible.'});
  }
  const {brand}=await customerPublicIdentity(deal);
  return {brand,proposal,document};
}
/** Validate the recorded artifact only. Descriptions and model messages are not sources. */
export function canonicalSalesArtifactUrl(value:unknown,baseUrl?:string):string|null{
  if(typeof value!=='string'||!value||value.length>4000||/[\s\\<>"']/u.test(value))return null;
  if(value.startsWith('//')||(!value.startsWith('/')&&!/^https?:\/\//i.test(value)))return null;
  try{
    const rawPath=value.startsWith('/')?value.split(/[?#]/)[0]!:value.match(/^https?:\/\/[^/?#]+([^?#]*)/i)?.[1]??'/';
    if(rawPath.split('/').some(segment=>['.','..'].includes(decodeURIComponent(segment))||/[\\\u0000-\u0020]/u.test(decodeURIComponent(segment))))return null;
    const base=baseUrl??getPublicBaseUrl(new Request(process.env.NEXTAUTH_URL??process.env.NEXT_PUBLIC_APP_URL??'https://powerupgraders.com'));
    const parsed=new URL(value,base);
    if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)return null;
    return value.startsWith('/')?parsed.toString():value;
  }catch{return null;}
}
export async function resolveSalesDeliveryDocument(client:Pick<Prisma.TransactionClient,'strategy'|'cRMActivity'>,
  deal:{id:string;sellerStrategyId:string|null},state:SalesState,baseUrl?:string,activityId?:string){
  if(!deal.sellerStrategyId||!state.mandate||!['PAID','DELIVERED'].includes(state.node))return null;
  const activity=await client.cRMActivity.findFirst({where:{dealId:deal.id,activityType:'SALES_DELIVERY_READY'},orderBy:[{performedAt:'desc'},{id:'desc'}]});
  if(!activity||(activityId&&activity.id!==activityId))return null;
  const brand=await client.strategy.findUnique({where:{id:deal.sellerStrategyId},select:{userId:true}});
  if(!activity.performedBy||![brand?.userId,state.mandate.deliveryOwnerId].includes(activity.performedBy))return null;
  const url=canonicalSalesArtifactUrl((activity.metadata as {artifact?:unknown}|null)?.artifact,baseUrl);
  return url?{activityId:activity.id,url}:null;
}
export async function customerConversation(token:string,baseUrl?:string) {
  const deal=await resolveCustomerDeal(token);
  const state=salesStateSchema.parse(deal.commercial??{});
  const informationOnly=Boolean(state.mandate?.informationOnly);
  const {brand,humanContact}=await customerPublicIdentity(deal);
  const proposal=visibleCustomerProposal(state);
  const inbound=await db.crmMessage.findMany({where:{salesDealId:deal.id,direction:'IN'},orderBy:[{createdAt:'desc'},{id:'desc'}],take:200,select:{id:true,body:true,createdAt:true,channel:true}});
  const outbound=await db.cRMActivity.findMany({where:{dealId:deal.id,activityType:{in:['SALES_WEB_SENT','SALES_EMAIL_SENT']}},orderBy:[{performedAt:'desc'},{id:'desc'}],take:200,select:{id:true,metadata:true,performedAt:true}});
  const awaitingReply=inbound[0]&&(!outbound[0]||inbound[0].createdAt>outbound[0].performedAt);
  const replyRun=awaitingReply?await db.salesRun.findUnique({where:{requestId:`inbound:${inbound[0]!.id}`},select:{status:true}}):null;
  const replyStatus: 'UP_TO_DATE'|'QUEUED'|'PROCESSING'|'TEAM_REVIEW'|'HUMAN_REPLY'=!awaitingReply?'UP_TO_DATE':
    !state.mandate?.sellerId.startsWith('mcp:')?'HUMAN_REPLY':replyRun?.status==='RUNNING'?'PROCESSING':replyRun?.status==='QUEUED'?'QUEUED':'TEAM_REVIEW';
  const payment=deal.paymentReference?await db.intakePayment.findUnique({where:{reference:deal.paymentReference},select:{reference:true,status:true,amount:true,currency:true,tierKey:true,intakeToken:true,paidAt:true}}):null;
  const {paymentMajorAmount}=await import('./payments');
  const customerPayment=!informationOnly&&payment?.tierKey==='SALES_COLLECTION'&&payment.intakeToken===`sales-deal:${deal.id}`?{reference:payment.reference,status:payment.status,amount:paymentMajorAmount(payment),currency:payment.currency,beneficiary:state.mandate?.beneficiary??'',paidAt:payment.paidAt}:null;
  const visibleOffer=state.mandate&&!informationOnly&&(!state.mandate.pricingRule||proposal)&&(!state.proposal||proposal)
    ?{name:proposal?.offerName??state.mandate.offerName,terms:proposal?.terms??state.mandate.terms,amount:proposal?.amount??state.mandate.amount,currency:proposal?.currency??state.mandate.currency,paymentInstructions:state.mandate.paymentInstructions}:null;
  const deliveryDocument=await resolveSalesDeliveryDocument(db,deal,state,baseUrl);
  return {informationOnly,payment:customerPayment,brand,humanContact,sellerMode:state.mandate?.sellerId.startsWith('mcp:')?'AI' as const:'HUMAN' as const,replyStatus,state:state.node,
    deliveryDocument,offer:visibleOffer,proposal:proposal?{...proposal,documentUrl:`/api/sales/${token}/proposal`}:null,
    stopped:!!state.contactStopped,messages:[...inbound.map(m=>({id:m.id,role:'customer' as const,body:m.body,at:m.createdAt})),...outbound.map(m=>({id:m.id,role:'seller' as const,body:String((m.metadata as {body?:string}|null)?.body??''),at:m.performedAt}))].sort((a,b)=>a.at.getTime()-b.at.getTime())};
}
export const customerSalesMessageSchema=z.object({body:z.string().trim().min(1).max(4000),requestId:z.string().uuid(),proposalId:z.string().uuid().optional()}).strict();
export async function receiveCustomerMessage(token:string,raw:z.input<typeof customerSalesMessageSchema>) {
  const input=customerSalesMessageSchema.parse(raw),resolved=await resolveCustomerDeal(token);
  return serialSalesTransaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Deal" WHERE id=${resolved.id} FOR UPDATE`;
    const deal=await tx.deal.findUniqueOrThrow({where:{id:resolved.id}});
    if(deal.customerAccessTokenHash!==hash(token))throw new TRPCError({code:'NOT_FOUND',message:'Conversation indisponible.'});
    const previous=await tx.crmMessage.findFirst({where:{salesDealId:deal.id,providerRef:`web:${input.requestId}`,direction:'IN'}});
    if(previous){
      const acceptance=await tx.cRMActivity.findUnique({where:{id:`sales-proposal-acceptance:${previous.id}`}});
      const prior=acceptance?.metadata as {proposalId?:string}|null;
      if(previous.body!==input.body||(prior?.proposalId??null)!==(input.proposalId??null))throw new TRPCError({code:'CONFLICT',message:'Référence utilisée pour un autre message.'});
      return {received:true};
    }
    const state=salesStateSchema.parse(deal.commercial??{}),proposal=visibleCustomerProposal(state);
    if(input.proposalId&&(!proposal||proposal.id!==input.proposalId||state.node!=='PROPOSAL'||state.contactStopped||new Date(state.mandate!.expiresAt)<=new Date())){
      throw new TRPCError({code:'CONFLICT',message:'Cette proposition a changé ou ne peut plus être confirmée. Relisez la conversation.'});
    }
    const count=await tx.crmMessage.count({where:{salesDealId:deal.id,direction:'IN',createdAt:{gte:new Date(Date.now()-60000)}}});
    if(count>=10)throw new TRPCError({code:'TOO_MANY_REQUESTS',message:'Veuillez patienter avant un nouvel envoi.'});
    const {recordInboundSalesMessageIn}=await import('./fleet');
    const {message}=await recordInboundSalesMessageIn(tx,{dealId:deal.id,channel:'WEB',body:input.body,externalId:`web:${input.requestId}`});
    if(input.proposalId&&proposal)await tx.cRMActivity.create({data:{id:`sales-proposal-acceptance:${message.id}`,dealId:deal.id,
      activityType:'SALES_CUSTOMER_PROPOSAL_ACCEPTANCE',description:'Le client a transmis son accord sur cette proposition ; le vendeur doit le traiter.',
      metadata:{proposalId:proposal.id,customerMessageId:message.id,requestId:input.requestId,bodyFingerprint:hash(input.body),gloryOutputId:proposal.gloryOutputId,sourceVersion:proposal.sourceVersion}}});
    return {received:true};
  });
}
export async function sendSalesWebMessage(dealId:string,actor:SalesActor,input:{requestId:string;text:string;deliveryActivityId?:string}) {
  const fingerprint=hash(JSON.stringify(input));
  const previous=await db.cRMActivity.findUnique({where:{id:input.requestId}});
  if(previous){
    if(previous.dealId!==dealId||previous.performedBy!==actor.id||(previous.metadata as {fingerprint?:string}|null)?.fingerprint!==fingerprint)throw new TRPCError({code:'CONFLICT',message:'Référence d’envoi déjà utilisée.'});
    return previous;
  }
  const deal=await db.deal.findUniqueOrThrow({where:{id:dealId}});
  if(deal.sellerStrategyId&&!actor.id.startsWith('mcp:')){const {assertHumanSalesActive}=await import('./fleet');await assertHumanSalesActive(deal.sellerStrategyId,actor.id);}
  const state=salesStateSchema.parse(deal.commercial??{});const mandate=state.mandate;
  if(!mandate||mandate.sellerId!==actor.id||!mandate.channels.includes('WEB')||new Date(mandate.expiresAt)<=new Date()||state.contactStopped||state.node==='STOPPED'||!deal.customerAccessTokenHash)throw new TRPCError({code:'FORBIDDEN',message:'Cette conversation ne fait pas partie des conditions de vente autorisées.'});
  let body=input.text;
  if(input.deliveryActivityId!==undefined){
    if(!input.deliveryActivityId.trim()||input.deliveryActivityId.length>200||/(?:[a-z][a-z0-9+.-]*:\/\/|www\.|(?:^|[\s(<])\/(?!\/)\S)/i.test(input.text))throw new TRPCError({code:'PRECONDITION_FAILED',message:'Rédigez votre message sans lien ; le document approuvé sera joint automatiquement.'});
    const document=await resolveSalesDeliveryDocument(db,deal,state,undefined,input.deliveryActivityId);
    if(!document)throw new TRPCError({code:'PRECONDITION_FAILED',message:'Référencez le document approuvé de cette affaire après vérification du paiement.'});
    body+=`\n\n[Ouvrir votre document](<${document.url}>)`;
  }else if(['PAID','DELIVERED'].includes(state.node)){
    const urls=[...input.text.matchAll(/https?:\/\/[^\s<>"\]]+|(?:^|[\s(<])(\/(?!\/)[^\s<>"\]]+)/gi)].map(match=>(match[1]??match[0]).trim().replace(/[).,;]+$/g,''));
    const documentLinks=urls.filter(url=>/\.(?:pdf|docx?|xlsx?|pptx?|zip|md|html?)(?:[?#]|$)|\/sales-receipts\//i.test(url));
    if(documentLinks.length){
      const document=await resolveSalesDeliveryDocument(db,deal,state);
      if(!document||documentLinks.some(url=>canonicalSalesArtifactUrl(url)!==document.url))throw new TRPCError({code:'PRECONDITION_FAILED',message:'Utilisez la référence du document approuvé ; un lien de livraison recopié ne peut pas être inventé ou modifié.'});
    }
  }
  const {reserveSalesOutbound}=await import('./outbound-authority');
  return (await reserveSalesOutbound(dealId,actor,{requestId:input.requestId,fingerprint,channel:'WEB',body})).receipt;
}
