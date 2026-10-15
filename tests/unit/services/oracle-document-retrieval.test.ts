import { beforeEach, describe, expect, it, vi } from "vitest";
const harness = vi.hoisted(() => {
  function matches(row: any, where: any = {}): boolean {
    if (where.AND && !(Array.isArray(where.AND) ? where.AND : [where.AND]).every((w: any) => matches(row, w))) return false;
    if (where.OR && !where.OR.some((w: any) => matches(row, w))) return false;
    if (where.NOT && matches(row, where.NOT)) return false;
    return Object.entries(where).every(([key, value]: [string, any]) => {
      if (["AND", "OR", "NOT"].includes(key)) return true;
      if (value === null) return row[key] == null;
      if (typeof value !== "object") return row[key] === value;
      if (value.in) return value.in.includes(row[key]);
      if ("not" in value) return row[key] != null && row[key] !== value.not;
      return true;
    });
  }
  return { matches, nodes: [] as any[], sources: [] as any[], vector: [] as number[], failEmbedding: false, financialCapacity: null as unknown };
});
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: vi.fn(async () => ({ operatorId: "operator-a", businessContext: { offre: "Offre exacte" }, financialCapacity: harness.financialCapacity })) },
  pillar: { findMany: vi.fn(async () => [{ key: "a", content: { nom: "Nom exact" } }]) },
  brandDataSource: { findMany: vi.fn(async () => structuredClone(harness.sources)) },
  brandContextNode: { findMany: vi.fn(async (args: any) => structuredClone(
    harness.nodes.filter((n) => harness.matches(n, args?.where)).slice(0, args?.take ?? 200))) },
} }));
vi.mock("@/server/services/llm-gateway", () => ({ embed: vi.fn(async () => {
  if(harness.failEmbedding) throw new Error("configured provider refused");
  return { embeddings: [harness.vector], model: "fixture-model" };
}) }));
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { getOracleBrandContext, getOracleBrandContextByQuery } from "@/server/services/seshat/context-store/oracle-augment";
const source = { id: "source-a", strategyId: "brand-a", certainty: "DECLARED", rawContent: "Assertion du dirigeant.",
  rawData: null, extractedFields: null, fileName: "note.txt", fileType: "TXT", sourceType: "FILE", processingStatus: "EXTRACTED" };
beforeEach(() => {
  vi.clearAllMocks(); harness.vector=[]; harness.failEmbedding=false; harness.financialCapacity=null;
  harness.sources=[{...source}];
  harness.nodes=[{id:"chunk-a",strategyId:"brand-a",kind:"BRAND_SOURCE",sourceId:source.id,pillarKey:null,field:"chunk_0",embedding:[1,0],embeddedAt:new Date("2026-10-14T00:00:00Z"),embeddingDim:2,embeddingModel:"fixture-model",
    payload:{text:source.rawContent,fileName:source.fileName,sourceType:"FILE",chunkIndex:0,sourceContentHash:sourceFingerprint(source)}}];
});
describe("Oracle and council consume the same current documentary proof", () => {
  it.each([false,true])("carries certainty and fingerprint in source references (vector=%s)", async(vector)=>{
    if(vector)harness.vector=[1,0];
    const result=vector?await getOracleBrandContextByQuery("brand-a","assertion",{includeSources:true}):await getOracleBrandContext("brand-a","a",{includeSources:true});
    expect(result?.sourceReferences?.[0]).toMatchObject({sourceId:source.id,certainty:"DECLARED",contentHash:sourceFingerprint(source)});
    expect(result?.text).toContain("certitude:DECLARED");
    expect(result?.preciseFields).toContainEqual(expect.objectContaining({field:"businessContext",value:{offre:"Offre exacte"}}));
  });
  it.each([false,true])("excludes stale or revoked documentary caches (vector=%s)", async(vector)=>{
    if(vector)harness.vector=[1,0];
    harness.sources=[];
    const result=vector?await getOracleBrandContextByQuery("brand-a","assertion",{includeSources:true}):await getOracleBrandContext("brand-a","a",{includeSources:true});
    expect(result?.sourceReferences??[]).toEqual([]);
    expect(result?.text??"").not.toContain(source.rawContent);
  });
  it("can read the whole-brand precise context and sources without a vector provider or chosen pillar",async()=>{
    const result=await getOracleBrandContextByQuery("brand-a","assertion",{includeSources:true});
    expect(result).not.toBeNull();
    expect(result?.usedVectorSearch).toBe(false);
    expect(result?.sourceReferences?.[0]?.sourceId).toBe(source.id);
    expect(result?.preciseFields).toContainEqual(expect.objectContaining({field:"nom",value:"Nom exact"}));
  });
  it("a refused configured embedding provider keeps the metadata and precise path available",async()=>{
    harness.failEmbedding=true;
    const result=await getOracleBrandContextByQuery("brand-a","assertion",{includeSources:true});
    expect(result?.usedVectorSearch).toBe(false);
    expect(result?.sourceReferences?.[0]?.sourceId).toBe(source.id);
  });
  it.each([false, true])("keeps documentary evidence before a consumer's cutoff without truncating stored precise values (vector=%s)", async (vector) => {
    if (vector) harness.vector = [1, 0];
    const financialCapacity = { note: "Valeur exacte ".repeat(1000) };
    harness.financialCapacity = financialCapacity;
    const result = vector
      ? await getOracleBrandContextByQuery("brand-a", "assertion", { includeSources: true })
      : await getOracleBrandContext("brand-a", "a", { includeSources: true });
    expect(result?.text.slice(0, 4000)).toContain("certitude:DECLARED");
    expect(result?.text.slice(0, 4000)).toContain(source.rawContent);
    expect(result?.preciseFields).toContainEqual(expect.objectContaining({ field: "financialCapacity", value: financialCapacity }));
    expect(result?.text).toContain(financialCapacity.note);
  });
  it.each([false, true])("keeps a current legacy document readable as a citation (vector=%s)", async (vector) => {
    if (vector) harness.vector = [1, 0];
    harness.nodes[0].kind = "SOURCE_CHUNK";
    const result = vector
      ? await getOracleBrandContextByQuery("brand-a", "assertion", { includeSources: true })
      : await getOracleBrandContext("brand-a", "a", { includeSources: true });
    expect(result?.sourceReferences?.[0]).toMatchObject({ sourceId: source.id, certainty: "DECLARED" });
    expect(result?.narrativeBlock).not.toContain(source.rawContent);
  });
});

function addCurrentSource(geometry: "none" | "dimension" | "model" = "none") {
  const fresh={...source,id:"source-current",fileName:"Quiz actuel six questions.txt",rawContent:"Q6 Ton radar mesure directement F, Foule vers Secret."};
  harness.sources.push(fresh);
  harness.nodes.push({...harness.nodes[0],id:"chunk-current",sourceId:fresh.id,
    embedding:geometry==="none"?null:[1,0],embeddedAt:geometry==="none"?null:new Date("2026-10-15T00:00:00Z"),
    embeddingDim:geometry==="none"?null:geometry==="dimension"?3:2,
    embeddingModel:geometry==="none"?null:geometry==="model"?"other-model":"fixture-model",
    payload:{text:fresh.rawContent,fileName:fresh.fileName,sourceType:"FILE",chunkIndex:0,sourceContentHash:sourceFingerprint(fresh)}});
  return fresh;
}
describe("current sources remain eligible without a compatible vector", () => {
  it.each(["none","dimension","model"] as const)("includes the current source when its vector is incompatible (%s)",async(geometry)=>{
    harness.vector=[1,0];const fresh=addCurrentSource(geometry);
    const result=await getOracleBrandContextByQuery("brand-a","Quel rôle joue Q6 Ton radar ?",{includeSources:true});
    const ref=result?.sourceReferences?.find(r=>r.sourceId===fresh.id);
    expect(ref).toMatchObject({sourceId:fresh.id,certainty:"DECLARED",contentHash:sourceFingerprint(fresh)});
    expect(ref?.similarity).toBeUndefined();
    expect(result?.text).toContain(fresh.rawContent);
    expect(result?.usedVectorSearch).toBe(true);
  });
  it.each(["stale","revoked"])("excludes an unavailable non-vector source (%s)",async(reason)=>{
    harness.vector=[1,0];const fresh=addCurrentSource();
    if(reason==="revoked")harness.sources=harness.sources.filter(s=>s.id!==fresh.id);
    else harness.sources.find(s=>s.id===fresh.id)!.rawContent="Version modifiée.";
    const result=await getOracleBrandContextByQuery("brand-a","Q6",{includeSources:true});
    expect(result?.sourceReferences?.some(r=>r.sourceId===fresh.id)).toBe(false);
    expect(result?.text).not.toContain(fresh.rawContent);
  });
  it("does not read a new source from a different brand",async()=>{
    harness.vector=[1,0];const fresh=addCurrentSource();
    harness.nodes.find(n=>n.sourceId===fresh.id)!.strategyId="brand-b";
    const result=await getOracleBrandContextByQuery("brand-a","Q6",{includeSources:true});
    expect(result?.sourceReferences?.some(r=>r.sourceId===fresh.id)).toBe(false);
  });
  it("keeps the current non-vector source within the explicit document limit",async()=>{
    harness.vector=[1,0];const fresh=addCurrentSource();
    const result=await getOracleBrandContextByQuery("brand-a","Q6",{includeSources:true,sourcesLimit:1});
    expect(result?.sourceReferences?.map(r=>r.sourceId)).toEqual([fresh.id]);
  });
  it("does not supply documents when the caller opted out",async()=>{
    harness.vector=[1,0];const fresh=addCurrentSource();
    const result=await getOracleBrandContextByQuery("brand-a","Q6",{includeSources:false});
    expect(result?.sourceReferences).toBeUndefined();
    expect(result?.text).not.toContain(fresh.rawContent);
  });
});
