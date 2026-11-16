import {afterAll, describe, expect, it, vi} from "vitest";
import {randomUUID} from "node:crypto";
import {db} from "@/lib/db";
import {scoreObject} from "@/server/services/advertis-scorer";
import {formatBrandComposite, meanBrandComposite, readCompositeFromVector} from "@/domain/brand-scores";
import * as auditTrail from "@/server/services/audit-trail";
import {isOwnedPostgresTarget} from "../support/owned-postgres-target";
describe.skipIf(!isOwnedPostgresTarget())("CRM composite on disposable PostgreSQL",()=>{
  const users: string[] = [], brands: string[] = [], auditWrites: Promise<unknown>[] = [];
  const log = auditTrail.log;
  afterAll(async()=>{
    try {
      // scoreObject intentionally does not await its audit; drain the real write
      // before deleting this invocation's rows, even after an assertion failed.
      await Promise.allSettled(auditWrites);
      if(users.length) await db.$transaction(async tx=>{
        await tx.auditLog.deleteMany({where:{entityType:"Strategy",entityId:{in:brands}}});
        await tx.scoreSnapshot.deleteMany({where:{strategyId:{in:brands}}});
        await tx.strategy.deleteMany({where:{id:{in:brands}}});
        await tx.user.deleteMany({where:{id:{in:users}}});
      });
    } finally { vi.restoreAllMocks(); await db.$disconnect(); }
  });
  it("preserves SQL NULL until scoring, then reads a real zero calculated by the canonical scorer",async()=>{
    const user=await db.user.create({data:{email:`crm-score-${randomUUID()}@example.invalid`}});
    users.push(user.id);
    const pending=await db.strategy.create({data:{name:"Recette — en attente",userId:user.id}});
    brands.push(pending.id);
    const empty=await db.strategy.create({data:{name:"Recette — aucune fondation recevable",userId:user.id}});
    brands.push(empty.id);
    vi.spyOn(auditTrail,"log").mockImplementation(entry=>{const writing=log(entry);auditWrites.push(writing);return writing;});
    const produced=await scoreObject("strategy",empty.id);
    const [before,after]=await Promise.all([pending,empty].map(s=>db.strategy.findUniqueOrThrow({where:{id:s.id},select:{advertis_vector:true}})));
    expect(before!.advertis_vector).toBeNull();
    expect(produced.composite).toBe(0);
    expect(formatBrandComposite(readCompositeFromVector(before!.advertis_vector))).toBe("Non évalué");
    expect(formatBrandComposite(readCompositeFromVector(after!.advertis_vector))).toBe("0/200");
    expect(meanBrandComposite([before!.advertis_vector,after!.advertis_vector])).toBe(0);
  });
});
