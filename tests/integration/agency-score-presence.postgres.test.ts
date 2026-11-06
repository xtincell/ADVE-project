import {describe, expect, it} from "vitest";
import {randomUUID} from "node:crypto";
import {db} from "@/lib/db";
import {scoreObject} from "@/server/services/advertis-scorer";
import {formatBrandComposite, meanBrandComposite, readCompositeFromVector} from "@/domain/brand-scores";
const endpoint=new URL(process.env.DATABASE_URL ?? "postgresql://localhost/stub");
describe.skipIf(!["localhost","127.0.0.1"].includes(endpoint.hostname)||endpoint.pathname!=="/shinkiro_verify")("CRM composite on disposable PostgreSQL",()=>{
  it("preserves SQL NULL until scoring, then reads a real zero calculated by the canonical scorer",async()=>{
    const user=await db.user.create({data:{email:`crm-score-${randomUUID()}@example.invalid`}});
    const pending=await db.strategy.create({data:{name:"Recette — en attente",userId:user.id}});
    const empty=await db.strategy.create({data:{name:"Recette — aucune fondation recevable",userId:user.id}});
    const produced=await scoreObject("strategy",empty.id);
    const [before,after]=await Promise.all([pending,empty].map(s=>db.strategy.findUniqueOrThrow({where:{id:s.id},select:{advertis_vector:true}})));
    expect(before!.advertis_vector).toBeNull();
    expect(produced.composite).toBe(0);
    expect(formatBrandComposite(readCompositeFromVector(before!.advertis_vector))).toBe("Non évalué");
    expect(formatBrandComposite(readCompositeFromVector(after!.advertis_vector))).toBe("0/200");
    expect(meanBrandComposite([before!.advertis_vector,after!.advertis_vector])).toBe(0);
  });
});
