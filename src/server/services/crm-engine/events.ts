/** Wake sales from independently confirmed receipts; never create a payment or infer settlement. */
import {db} from '@/lib/db';
import {salesStateSchema} from './commercial';
import {queueRun, queueSalesRunIn} from './fleet';
import {approvedCadencePlanIn, datedSalesInstruction, datedSalesRequestId, validateDatedSalesRunIn} from './scheduling';
import {paymentMajorAmount} from './payments';
export async function wakeConfirmedSalesPayments(profileId:string){
 const profile=await db.salesRepresentative.findUnique({where:{id:profileId}});
 if(profile?.status!=='ACTIVE'||profile.mode!=='AI'||!profile.mcpKeyId)return;
 const deals=await db.deal.findMany({where:{sellerStrategyId:profile.strategyId,paymentReference:{not:null},AND:[{commercial:{path:['mandate','sellerId'],equals:`mcp:${profile.mcpKeyId}`}},{commercial:{path:['node'],string_starts_with:'A'}}]},take:100});
 for(const deal of deals){
  const state=salesStateSchema.safeParse(deal.commercial);if(!state.success||state.data.node!=='ACCEPTED'||!deal.paymentReference)continue;
  const payment=await db.intakePayment.findUnique({where:{reference:deal.paymentReference},select:{status:true,paidAt:true,amount:true,currency:true,tierKey:true}});
  if(payment?.status!=='PAID'||!payment.paidAt||paymentMajorAmount(payment)!==state.data.mandate?.amount||payment.currency!==state.data.mandate.currency)continue;
  await queueRun(profile.id,{requestId:`payment:${deal.paymentReference}`,dealId:deal.id,instruction:'Un règlement indépendant a été confirmé pour cette affaire. Relire le dossier, synchroniser uniquement sa référence native, informer le client puis transmettre à la livraison prévue au mandat. Une remise reste conditionnée à sa preuve réelle.'});
 }
}

// A bounded rotating scan avoids starving later deals without a new scheduler or persistent clock.
const scanCursors = new Map<string, string>();
export async function wakeDueSalesActions(profileId: string, now = new Date()) {
 const profile = await db.salesRepresentative.findUnique({where:{id:profileId}});
 if (profile?.status !== 'ACTIVE') return {examined:0, queued:0};
 const principal = profile.mode === 'AI' ? `mcp:${profile.mcpKeyId}` : profile.humanUserId;
 if (!principal) return {examined:0, queued:0};
 const cursor = scanCursors.get(profileId);
 const deals = await db.deal.findMany({where:{sellerStrategyId:profile.strategyId,
  commercial:{path:['mandate','sellerId'],equals:principal}, ...(cursor ? {id:{gt:cursor}} : {})},
  orderBy:{id:'asc'},take:100,select:{id:true}});
 if (deals.length === 100) scanCursors.set(profileId, deals.at(-1)!.id); else scanCursors.delete(profileId);
 let queued = 0;
 for (const row of deals) {
  try {
   const created = await db.$transaction(async tx => {
    const [current, holder] = await Promise.all([
     tx.deal.findUniqueOrThrow({where:{id:row.id}}),tx.salesRepresentative.findUniqueOrThrow({where:{id:profile.id}}),
    ]);
    const parsed = salesStateSchema.safeParse(current.commercial);
    if (!parsed.success || holder.status !== 'ACTIVE') return false;
    let state = parsed.data;
    // An explicit appointment remains authoritative until consumed; a failed/uncertain job never rearms itself.
    const previousRun = state.nextPlan ? await tx.salesRun.findUnique({where:{requestId:datedSalesRequestId(current.id,state.nextPlan.id)},select:{status:true}}) : null;
    const mayAdvance = !state.nextPlan || previousRun?.status === 'DONE';
    if (mayAdvance && state.nextPlan?.purpose !== 'VALUE_REVIEW' && !state.contactStopped && state.node !== 'STOPPED') {
     const cadence = await approvedCadencePlanIn(tx,current,state,now);
     if (cadence && cadence.id !== state.nextPlan?.id) {
      state = {...state,nextPlan:cadence,nextAction:cadence.action,nextDeadline:cadence.dueAt};
      const changed = await tx.deal.updateMany({where:{id:current.id,revision:current.revision},data:{commercial:JSON.parse(JSON.stringify(state)),revision:{increment:1}}});
      if (changed.count !== 1) return false;
     }
    }
    const plan = state.nextPlan;
    if (!plan || new Date(plan.dueAt) > now) return false;
    const requestId = datedSalesRequestId(current.id,plan.id);
    const existing = await tx.salesRun.findUnique({where:{requestId},select:{id:true}});
    if (existing) return false;
    const validity = await validateDatedSalesRunIn(tx,{requestId,dealId:current.id,representativeId:holder.id},now);
    if (!validity.allowed) return false;
    await queueSalesRunIn(tx,holder,{requestId,dealId:current.id,instruction:datedSalesInstruction(plan)});
    return true;
   });
   if (created) queued++;
  } catch(error) {
   // Another poll may win the unique requestId; no duplicate job or transport effect is retried here.
   if ((error as {code?:string}).code !== 'P2002') throw error;
  }
 }
 return {examined:deals.length,queued};
}
