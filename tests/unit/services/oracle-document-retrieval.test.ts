import { beforeEach, describe, expect, it, vi } from "vitest";
const harness = vi.hoisted(() => ({ nodes: [] as any[], sources: [] as any[], vector: [] as number[], failEmbedding: false, financialCapacity: null as unknown }));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: vi.fn(async () => ({ operatorId: "operator-a", businessContext: { offre: "Offre exacte" }, financialCapacity: harness.financialCapacity })) },
  pillar: { findMany: vi.fn(async () => [{ key: "a", content: { nom: "Nom exact" } }]) },
  brandDataSource: { findMany: vi.fn(async () => structuredClone(harness.sources)) },
  brandContextNode: { findMany: vi.fn(async (args: any) => structuredClone(harness.nodes.filter((n) =>
    typeof args?.where?.kind === "string" ? n.kind === args.where.kind
      : args?.where?.kind?.in ? args.where.kind.in.includes(n.kind) : true))) },
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
  harness.nodes=[{id:"chunk-a",kind:"BRAND_SOURCE",sourceId:source.id,pillarKey:null,field:"chunk_0",embedding:[1,0],
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
