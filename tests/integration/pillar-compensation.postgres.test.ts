/** Targeted undo, real gateway/spine, isolated PostgreSQL only. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { Prisma } from "@prisma/client";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { rollback as rollbackVersion } from "@/server/services/pillar-versioning";
import { db } from "@/lib/db";
import { writePillarAndScore } from "@/server/services/pillar-gateway";
import { rollbackPillar } from "@/server/services/pillar-gateway/rollback";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { governanceRouter } from "@/server/trpc/routers/governance";
import { tools } from "@/server/mcp/advertis";
const brands:string[]=[],users:string[]=[],operators:string[]=[];
let owner:string, stranger:string, localOperator:string;
beforeAll(async()=>{
 const u=new URL(process.env.DATABASE_URL!);expect(["127.0.0.1","localhost"]).toContain(u.hostname);expect(u.pathname).toBe("/shinkiro_verify");
 for(const name of ["local","foreign"]){const op=await db.operator.create({data:{name:"Undo "+name,slug:"undo-"+randomUUID(),status:"ACTIVE",licenseType:"TRIAL",licensedAt:new Date(),licenseExpiry:new Date(Date.now()+86400000)}});operators.push(op.id);const user=await db.user.create({data:{email:"undo-"+randomUUID()+"@example.invalid",operatorId:op.id}});users.push(user.id);}
 [owner,stranger]=users as [string,string];localOperator=operators[0]!;
});
afterAll(async()=>{
 const where={strategyId:{in:brands}};
 await db.recommendation.deleteMany({where});await db.brandSourceUse.deleteMany({where});await db.brandDataSource.deleteMany({where});await db.scoreSnapshot.deleteMany({where});await db.intentEmission.deleteMany({where});await db.costDecision.deleteMany({where});await db.signal.deleteMany({where});await db.pillar.deleteMany({where});await db.strategy.deleteMany({where:{id:{in:brands}}});await db.user.deleteMany({where:{id:{in:users}}});await db.operator.deleteMany({where:{id:{in:operators}}});await db.$disconnect();
});
async function fixture(){const s=await db.strategy.create({data:{name:"Undo synthetic",userId:owner,operatorId:localOperator}});brands.push(s.id);const p=await db.pillar.create({data:{strategyId:s.id,key:"v",content:{promesseDeValeur:"Avant",salesChannel:"DIRECT",_fieldProvenance:{promesseDeValeur:"INFERRED",salesChannel:"HUMAN"}},fieldCertainty:{promesseDeValeur:"INFERRED"},confidence:0.4,validationStatus:"AI_PROPOSED"}});return {s,p};}
async function emission(strategyId:string,kind="WRITE_PILLAR",payload:Record<string,unknown>={}){return openEmission({kind,strategyId,caller:"fixture:undo",payload:{strategyId,key:"v",...payload}});}
async function change(f:Awaited<ReturnType<typeof fixture>>,path:string,value:unknown){const current=await db.pillar.findUniqueOrThrow({where:{id:f.p.id}});const id=await emission(f.s.id);const r=await writePillarAndScore({strategyId:f.s.id,pillarKey:"v",operation:{type:"SET_FIELDS",fields:[{path,value}]},author:{system:path==="salesChannel"?"OPERATOR":"MESTOR",userId:owner,intentId:id,reason:"Synthetic decision"},options:{expectedVersion:current.currentVersion,skipValidation:true}});expect(r.success).toBe(true);expect(r.newContent[path]).toEqual(value);await closeEmission({intentId:id,status:"OK",result:r});return id;}
async function undo(f:Awaited<ReturnType<typeof fixture>>,id:string){const intentId=await emission(f.s.id,"ROLLBACK_PILLAR",{compensatedFrom:id});const result=await rollbackPillar({strategyId:f.s.id,pillarKey:"v",compensatedFrom:id,operatorId:owner,reason:"Synthetic undo",intentId} as Parameters<typeof rollbackPillar>[0]);await closeEmission({intentId,status:result.restored?"OK":"FAILED",result});return {result,intentId};}
async function source(f: Awaited<ReturnType<typeof fixture>>) {
 const row=await db.brandDataSource.create({data:{strategyId:f.s.id,sourceType:"MANUAL_INPUT",rawContent:"Synthetic document",certainty:"DECLARED",processingStatus:"EXTRACTED"}});
 return {row,receipt:{sourceId:row.id,contentHash:sourceFingerprint(row)}};
}
async function sourced(f:Awaited<ReturnType<typeof fixture>>,receipt:{sourceId:string;contentHash:string}) {
 const id=await emission(f.s.id);
 const r=await writePillarAndScore({strategyId:f.s.id,pillarKey:"v",operation:{type:"SET_FIELDS",fields:[{path:"promesseDeValeur",value:"Documentary proposal"}]},author:{system:"MESTOR",userId:owner,intentId:id,reason:"Synthetic source"},options:{expectedVersion:1,skipValidation:true,sourceReceipts:[receipt]}});
 expect(r.success).toBe(true);await closeEmission({intentId:id,status:"OK",result:r});return id;
}
async function waitForSourceLock() {
 for(let i=0;i<50;i++) {
  const rows=await db.$queryRaw<Array<{pid:number}>>`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%BrandDataSource%FOR UPDATE%'`;
  if(rows.length)return;await new Promise(r=>setTimeout(r,100));
 }
 throw new Error("Restoration never reached the documentary write fence");
}
function caller(userId=owner){return governanceRouter.createCaller({db,headers:undefined,session:{user:{id:userId,role:"USER"},expires:new Date(Date.now()+60000).toISOString()}});}
describe("targeted pillar compensation",()=>{
 it("keeps an independent later decision and its human origin",async()=>{const f=await fixture();const a=await change(f,"promesseDeValeur","Propose");await change(f,"salesChannel","HYBRID");const r=await undo(f,a);expect(r.result.restored).toBe(true);const p=await db.pillar.findUniqueOrThrow({where:{id:f.p.id}});expect(p.content).toMatchObject({promesseDeValeur:"Avant",salesChannel:"HYBRID",_fieldProvenance:{promesseDeValeur:"INFERRED",salesChannel:"HUMAN"}});expect(p.fieldCertainty).toEqual(f.p.fieldCertainty);expect(p.currentVersion).toBe(4);});
 it("refuses a later conflicting value without another archive",async()=>{const f=await fixture();const a=await change(f,"promesseDeValeur","Propose");await change(f,"promesseDeValeur","Decision ulterieure");const r=await undo(f,a);expect(r.result.restored).toBe(false);expect(r.result.reason).toMatch(/CONFLICT/);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(3);expect(await db.pillarVersion.count({where:{pillarId:f.p.id}})).toBe(2);});
 it("retries once without a second effect and links the undo archive",async()=>{const f=await fixture();const a=await change(f,"promesseDeValeur","Propose");const first=await undo(f,a);expect(first.result.restored).toBe(true);const second=await undo(f,a);expect(second.result.restored).toBe(true);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(3);const versions=await db.pillarVersion.findMany({where:{pillarId:f.p.id},orderBy:{version:"asc"}});expect(versions).toHaveLength(2);expect(versions[1]!.intentId).toBe(first.intentId);});
 it("can compensate the compensation without inventing a new human declaration",async()=>{const f=await fixture();const a=await change(f,"promesseDeValeur","Propose");const first=await undo(f,a);const second=await undo(f,first.intentId);expect(second.result.restored).toBe(true);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).content).toMatchObject({promesseDeValeur:"Propose",_fieldProvenance:{promesseDeValeur:"INFERRED"}});});
 it("rejects a historic archive without a checkpoint",async()=>{const f=await fixture();const a=await emission(f.s.id);await db.pillarVersion.create({data:{pillarId:f.p.id,version:0,content:{promesseDeValeur:"Legacy"},intentId:a}});const r=await undo(f,a);expect(r.result.restored).toBe(false);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(1);});
 it("rejects an ambiguous intent instead of selecting its first sub-write",async()=>{const f=await fixture();const a=await change(f,"promesseDeValeur","Propose");const v=await db.pillarVersion.findFirstOrThrow({where:{pillarId:f.p.id}});await db.pillarVersion.create({data:{pillarId:f.p.id,version:1,content:v.content!,intentId:a}});const r=await undo(f,a);expect(r.result.restored).toBe(false);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(2);});
 it("refuses a foreign operator on the actual compensate procedure",async()=>{const f=await fixture();const a=await change(f,"promesseDeValeur","Propose");await expect(caller(stranger).compensate({originalIntentId:a,reason:"Foreign caller"})).rejects.toMatchObject({code:"FORBIDDEN"});expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(2);});
 it("keeps the actual emission id from the source-bound MCP amendment",async()=>{const f=await fixture();await db.user.update({where:{id:owner},data:{role:"ADMIN"}});const tool=tools.find(t=>t.name==="amendPillar")!;const r:any=await tool.handler({strategyId:f.s.id,pillarKey:"V",field:"promesseDeValeur",proposedValue:"MCP propose",mode:"PATCH_DIRECT",reason:"Synthetic authored amendment",expectedVersion:1,__auth:{scopeKind:"BRAND",scopeStrategyId:f.s.id,userId:owner}});expect(r.ok).toBe(true);const v=await db.pillarVersion.findFirstOrThrow({where:{pillarId:f.p.id}});expect(v.intentId).toBeTruthy();const e=await db.intentEmission.findUniqueOrThrow({where:{id:v.intentId!}});expect(e).toMatchObject({intentKind:"OPERATOR_AMEND_PILLAR",strategyId:f.s.id,status:"OK"});await db.user.update({where:{id:owner},data:{role:"USER"}});});
 it("restores the latest validation, confidence, certainty and stale date exactly",async()=>{
  const f=await fixture(), stale=new Date("2026-10-01T12:00:00.000Z");
  await db.pillar.update({where:{id:f.p.id},data:{validationStatus:"VALIDATED",confidence:null,staleAt:stale,fieldCertainty:Prisma.DbNull}});
  const a=await change(f,"promesseDeValeur","Proposal");expect((await undo(f,a)).result.restored).toBe(true);
  expect(await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).toMatchObject({validationStatus:"VALIDATED",confidence:null,staleAt:stale,fieldCertainty:null,sources:null});
 });
 it("removes a newly attached receipt when it has no later use",async()=>{
  const f=await fixture(),doc=await source(f);const a=await sourced(f,doc.receipt);
  expect((await undo(f,a)).result.restored).toBe(true);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).sources).toBeNull();
 });
 it("retains a newly attached receipt used by an independent later decision",async()=>{
  const f=await fixture(),doc=await source(f);const a=await sourced(f,doc.receipt);await change(f,"salesChannel","HYBRID");
  expect((await undo(f,a)).result.restored).toBe(true);expect(await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).toMatchObject({sources:[doc.receipt],content:{promesseDeValeur:"Avant",salesChannel:"HYBRID"}});
 });
 it("refuses an inherited receipt whose source was corrected",async()=>{
  const f=await fixture(),doc=await source(f);await db.pillar.update({where:{id:f.p.id},data:{sources:[doc.receipt]}});
  const a=await change(f,"promesseDeValeur","Proposal");await db.brandDataSource.update({where:{id:doc.row.id},data:{rawContent:"Corrected"}});
  const r=await undo(f,a);expect(r.result.restored).toBe(false);expect(r.result.reason).toContain("SOURCE_CHANGED");expect(await db.pillarVersion.count({where:{pillarId:f.p.id}})).toBe(1);
 });
 it("refuses a shared receipt after its grant is revoked",async()=>{
  const sourceBrand=await fixture(),f=await fixture(),doc=await source(sourceBrand);
  await db.brandSourceUse.create({data:{sourceId:doc.row.id,strategyId:f.s.id,operatorId:localOperator,createdById:owner,updatedById:owner}});
  await db.pillar.update({where:{id:f.p.id},data:{sources:[doc.receipt]}});const a=await change(f,"promesseDeValeur","Proposal");
  await db.brandSourceUse.update({where:{sourceId_strategyId:{sourceId:doc.row.id,strategyId:f.s.id}},data:{revokedAt:new Date()}});
  const r=await undo(f,a);expect(r.result.restored).toBe(false);expect(r.result.reason).toContain("SOURCE_UNAVAILABLE");
 });
 it("rejects historical unversioned receipts without normalizing them into evidence",async()=>{
  const f=await fixture();await db.pillar.update({where:{id:f.p.id},data:{sources:[{sourceId:"legacy"}]}});const a=await change(f,"promesseDeValeur","Proposal");
  const r=await undo(f,a);expect(r.result.restored).toBe(false);expect(r.result.reason).toContain("RESTORE_SOURCE_RECEIPT_UNAVAILABLE");
 });
 it("has one effect under concurrent compensation and then permits a no-effect retry",async()=>{
  const f=await fixture(),a=await change(f,"promesseDeValeur","Proposal");const results=await Promise.all([undo(f,a),undo(f,a)]);
  expect(results.some(r=>r.result.restored)).toBe(true);expect((await undo(f,a)).result.restored).toBe(true);
  expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(3);expect(await db.pillarVersion.count({where:{pillarId:f.p.id}})).toBe(2);
 });
 it("refuses a real change between preparing compensation and acquiring its write lock",async()=>{
  const f=await fixture(),doc=await source(f);await db.pillar.update({where:{id:f.p.id},data:{sources:[doc.receipt]}});const a=await change(f,"promesseDeValeur","Proposal");let pending:ReturnType<typeof undo>;
  await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id=${doc.row.id} FOR UPDATE`;
   pending=undo(f,a);await waitForSourceLock();await tx.pillar.update({where:{id:f.p.id},data:{content:{...((await tx.pillar.findUniqueOrThrow({where:{id:f.p.id}})).content as object),salesChannel:"RACE"},currentVersion:{increment:1}}});
  });
  const r=await pending!;expect(r.result.restored).toBe(false);expect(r.result.reason).toContain("PILLAR_VERSION_CONFLICT");expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).content).toMatchObject({salesChannel:"RACE",promesseDeValeur:"Proposal"});
 });
 it("rechecks authority after a concurrent tenant transfer",async()=>{
  const f=await fixture(),doc=await source(f);await db.pillar.update({where:{id:f.p.id},data:{sources:[doc.receipt]}});const a=await change(f,"promesseDeValeur","Proposal");let pending:ReturnType<typeof undo>;
  await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id=${doc.row.id} FOR UPDATE`;pending=undo(f,a);await waitForSourceLock();await tx.strategy.update({where:{id:f.s.id},data:{operatorId:operators[1],userId:stranger}});});
  const r=await pending!;expect(r.result.restored).toBe(false);expect(r.result.reason).toContain("RESTORE_ACCESS_REFUSED");expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(2);
 });
 it("routes the history action through the same compensation and refuses foreign archives",async()=>{
  const f=await fixture(),other=await fixture(),a=await change(f,"promesseDeValeur","Proposal");const archive=await db.pillarVersion.findFirstOrThrow({where:{pillarId:f.p.id,intentId:a}});
  const id=await emission(f.s.id,"LEGACY_PILLAR_ROLLBACK_VERSION");expect((await rollbackVersion(f.p.id,archive.id,owner,id)).success).toBe(true);expect((await rollbackVersion(f.p.id,archive.id,owner,id)).noOp).toBe(true);
  const foreign=await emission(other.s.id,"LEGACY_PILLAR_ROLLBACK_VERSION");await expect(rollbackVersion(other.p.id,archive.id,owner,foreign)).rejects.toThrow("RESTORE_ARCHIVE_UNAVAILABLE");
 });
 it("executes the actual authorized compensate procedure and compensates its own result",async()=>{
  const f=await fixture();await db.user.update({where:{id:owner},data:{role:"ADMIN"}});
  try{const tool=tools.find(t=>t.name==="amendPillar")!;const r:any=await tool.handler({strategyId:f.s.id,pillarKey:"V",field:"promesseDeValeur",proposedValue:"MCP proposal",mode:"PATCH_DIRECT",reason:"Synthetic authored amendment",expectedVersion:1,__auth:{scopeKind:"BRAND",scopeStrategyId:f.s.id,userId:owner}});expect(r.ok).toBe(true);
   const v=await db.pillarVersion.findFirstOrThrow({where:{pillarId:f.p.id}});const first=await caller().compensate({originalIntentId:v.intentId!,reason:"Synthetic operator undo"});expect(first.executed).toBe(true);const undone=await db.pillarVersion.findUniqueOrThrow({where:{pillarId_compensatedFrom:{pillarId:f.p.id,compensatedFrom:v.intentId!}}});expect(undone.intentId).toBeTruthy();
   const second=await caller().compensate({originalIntentId:undone.intentId!,reason:"Synthetic inverse undo"});expect(second.executed).toBe(true);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).content).toMatchObject({promesseDeValeur:"MCP proposal",_fieldProvenance:{promesseDeValeur:"INFERRED"}});
  }finally{await db.user.update({where:{id:owner},data:{role:"USER"}});}
 });

 it("does not compensate the same write twice through history and intent entry points",async()=>{
  const f=await fixture(),a=await change(f,"promesseDeValeur","Proposal");const archive=await db.pillarVersion.findFirstOrThrow({where:{pillarId:f.p.id,intentId:a}});
  expect((await undo(f,a)).result.restored).toBe(true);const id=await emission(f.s.id,"LEGACY_PILLAR_ROLLBACK_VERSION");
  expect((await rollbackVersion(f.p.id,archive.id,owner,id)).noOp).toBe(true);expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).currentVersion).toBe(3);
  const other=await fixture(),b=await change(other,"promesseDeValeur","Proposal");const target=await db.pillarVersion.findFirstOrThrow({where:{pillarId:other.p.id,intentId:b}});
  const manual=await emission(other.s.id,"LEGACY_PILLAR_ROLLBACK_VERSION");await rollbackVersion(other.p.id,target.id,owner,manual);
  expect((await undo(other,b)).result.alreadyRecorded).toBe(true);expect((await db.pillar.findUniqueOrThrow({where:{id:other.p.id}})).currentVersion).toBe(3);
 });

 it("can compensate the governed history action through the existing journal",async()=>{
  const f=await fixture(),a=await change(f,"promesseDeValeur","Proposal");const archive=await db.pillarVersion.findFirstOrThrow({where:{pillarId:f.p.id,intentId:a}});
  const id=await emission(f.s.id,"LEGACY_PILLAR_ROLLBACK_VERSION");const r=await rollbackVersion(f.p.id,archive.id,owner,id);await closeEmission({intentId:id,status:"OK",result:r});
  expect((await caller().compensate({originalIntentId:id,reason:"Synthetic inverse history"})).executed).toBe(true);
  expect((await db.pillar.findUniqueOrThrow({where:{id:f.p.id}})).content).toMatchObject({promesseDeValeur:"Proposal",_fieldProvenance:{promesseDeValeur:"INFERRED"}});
 });

});
