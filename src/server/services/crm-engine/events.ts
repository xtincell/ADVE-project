/** Wake sales from independently confirmed receipts; never create a payment or infer settlement. */
import {db} from '@/lib/db';
import {salesStateSchema} from './commercial';
import {queueRun} from './fleet';
export async function wakeConfirmedSalesPayments(profileId:string){
 const profile=await db.salesRepresentative.findUnique({where:{id:profileId}});
 if(profile?.status!=='ACTIVE'||profile.mode!=='AI'||!profile.mcpKeyId)return;
 const deals=await db.deal.findMany({where:{sellerStrategyId:profile.strategyId,paymentReference:{not:null},AND:[{commercial:{path:['mandate','sellerId'],equals:`mcp:${profile.mcpKeyId}`}},{commercial:{path:['node'],string_starts_with:'A'}}]},take:100});
 for(const deal of deals){
  const state=salesStateSchema.safeParse(deal.commercial);if(!state.success||state.data.node!=='ACCEPTED'||!deal.paymentReference)continue;
  const payment=await db.intakePayment.findUnique({where:{reference:deal.paymentReference},select:{status:true,paidAt:true,amount:true,currency:true}});
  if(payment?.status!=='PAID'||!payment.paidAt||payment.amount!==state.data.mandate?.amount||payment.currency!==state.data.mandate.currency)continue;
  await queueRun(profile.id,{requestId:`payment:${deal.paymentReference}`,dealId:deal.id,instruction:'Un règlement indépendant a été confirmé pour cette affaire. Relire le dossier, synchroniser uniquement sa référence native, informer le client puis transmettre à la livraison prévue au mandat. Une remise reste conditionnée à sa preuve réelle.'});
 }
}
