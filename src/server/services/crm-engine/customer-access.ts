/** The existing private conversation capability, shared without importing views. */
import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function resolveCustomerDeal(token:string) {
  if(!/^[a-f0-9]{64}$/.test(token)) throw new TRPCError({code:'NOT_FOUND',message:'Conversation indisponible.'});
  const deal=await db.deal.findUnique({where:{customerAccessTokenHash:hash(token)}});
  if(!deal?.sellerStrategyId) throw new TRPCError({code:'NOT_FOUND',message:'Conversation indisponible.'});
  return deal;
}
