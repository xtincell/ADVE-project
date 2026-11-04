import {createHash} from "node:crypto";
import {TRPCError} from "@trpc/server";
import type {Prisma,PrismaClient} from "@prisma/client";
import type {z} from "zod";
import {mixDecision,productionModes,suggestMix} from "@/domain/production-mix";
import {canAccessStrategy,getOperatorContext} from "@/server/services/operator-isolation";
import {PILLAR_STORAGE_KEYS} from "@/domain";

async function read(client:Prisma.TransactionClient,id:string,actor:string){
  if(!await canAccessStrategy(id,await getOperatorContext(actor,client),client))throw new TRPCError({code:"FORBIDDEN",message:"Cette marque n’est pas accessible."});
  const strategy=await client.strategy.findUniqueOrThrow({where:{id},select:{name:true,status:true,manipulationMix:true}});
  const pillars=await client.pillar.findMany({where:{strategyId:id,key:{in:[...PILLAR_STORAGE_KEYS]}},select:{key:true,content:true,validationStatus:true}});
  const suggestion=suggestMix(pillars,strategy.manipulationMix);
  const fingerprint=createHash("sha256").update(JSON.stringify({mix:strategy.manipulationMix,evidence:suggestion.evidence})).digest("hex");
  const locked=strategy.status==="ARCHIVED"||strategy.status==="DELETED"||(!!suggestion.previous.version && pillars.some(p=>p.key.toLowerCase()==="s"&&p.validationStatus==="LOCKED"));
  return {name:strategy.name,...suggestion,fingerprint,locked};
}
export const readProductionMix=read;
export async function adoptProductionMix(client:PrismaClient,id:string,actor:string,intentId:string|undefined,decision:z.infer<typeof mixDecision>){
  const choice=mixDecision.parse(decision);
  if(!intentId)throw new TRPCError({code:"PRECONDITION_FAILED",message:"La décision doit être enregistrée dans le journal de la marque."});
  return client.$transaction(async tx=>{
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${id} FOR UPDATE`;
    const current=await read(tx,id,actor);
    if(current.locked)throw new TRPCError({code:"PRECONDITION_FAILED",message:"La marque ou la stratégie est verrouillée."});
    if(current.fingerprint!==choice.expected)throw new TRPCError({code:"CONFLICT",message:"Le mix ou les passages de l’ADVE ont changé. Relisez la proposition actualisée."});
    const weights=Object.fromEntries(productionModes.map(m=>[m,choice.percent[m]/100]));
    const mix={...weights,primary:choice.primary,allowed:productionModes.filter(m=>choice.percent[m]>0),
      review:{status:"HUMAN_REVIEWED",version:current.previous.version+1,actorId:actor,intentId,at:new Date().toISOString(),
        reason:choice.reason,basis:current.basis,evidence:current.evidence,rule:"production-mix/v1",priorFingerprint:current.fingerprint}};
    return tx.strategy.update({where:{id},data:{manipulationMix:mix}});
  });
}
