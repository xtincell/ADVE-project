export const dynamic='force-dynamic';
import {timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {decryptTokenPayload} from '@/server/services/oauth-integrations';
import {wakeConfirmedSalesPayments,wakeDueSalesActions} from '@/server/services/crm-engine/events';
export async function GET(request:Request){
 const secret=process.env.SALES_WORKER_TOKEN;const provided=request.headers.get('authorization')??'';
 if(!secret||Buffer.byteLength(provided)!==Buffer.byteLength(`Bearer ${secret}`)||!timingSafeEqual(Buffer.from(provided),Buffer.from(`Bearer ${secret}`)))return NextResponse.json({error:'Unauthorized'},{status:401});
 const profiles=await db.salesRepresentative.findMany({where:{status:'ACTIVE'}});
 const ready=[];
 for(const profile of profiles){
  await wakeDueSalesActions(profile.id);
  if(profile.mode!=='AI')continue;
  if(!profile.mcpKeyId||!profile.encryptedApiKey)continue;
  const key=await db.mcpApiKey.findUnique({where:{id:profile.mcpKeyId},select:{isActive:true,expiresAt:true,scopeStrategyId:true,scopeKind:true}});
  if(!key?.isActive||key.scopeKind!=='BRAND'||key.scopeStrategyId!==profile.strategyId||(key.expiresAt&&key.expiresAt<=new Date()))continue;
  await wakeConfirmedSalesPayments(profile.id);
  const {apiKey}=decryptTokenPayload<{apiKey:string}>(profile.encryptedApiKey);
  ready.push({id:profile.id,strategyId:profile.strategyId,apiKey,maxTurns:profile.maxTurns,dailyTokenBudget:profile.dailyTokenBudget,maxTokens:profile.maxTokens});
 }
 await db.salesRepresentative.updateMany({where:{id:{in:ready.map(p=>p.id)},status:'ACTIVE'},data:{lastWorkerSeenAt:new Date()}});
 return NextResponse.json({profiles:ready},{headers:{'Cache-Control':'no-store'}});
}
