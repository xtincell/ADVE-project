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
  brandContextNode: { findMany: vi.fn(async (args: any) => {
    let rows = harness.nodes.filter((n) => harness.matches(n, args?.where));
    if (args?.distinct) {
      const seen = new Set<string>();
      rows = rows.filter(n => { const key = JSON.stringify(args.distinct.map((field: string) => n[field]));
        if (seen.has(key)) return false; seen.add(key); return true; });
    }
    return structuredClone(rows.slice(0, args?.take ?? rows.length));
  }) },
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
  it.each([false, true])("supplies separate requested measurements from one source without changing default limits (vector=%s)", async vector => {
    if (vector) harness.vector = [1, 0];
    const texts = [
      'Google : champ « prix par personne » renseigné dans 22 % des 8 000 avis.',
      'TikTok : demandes d’adresse ou d’horaires dans 12 % des 1 200 commentaires.',
      'Indicateur proposé : « prix par personne ». BMC continuité alignée équipe postulats déploiements.',
    ];
    harness.sources[0] = { ...source, fileName: "Étude terrain.docx", rawContent: texts.join("\n") };
    const node = harness.nodes[0];
    harness.nodes = texts.map((text, chunkIndex) => ({ ...node, id: `measurement-${chunkIndex}`,
      payload: { ...node.payload, fileName: "Étude terrain.docx", text, chunkIndex, sourceContentHash: sourceFingerprint(harness.sources[0]) } }));
    const query = 'Étude terrain : Google champ « prix par personne » et TikTok demandes d’adresse ou d’horaires ? Puis situe les BMC continuité et alignée, équipe, postulats, déploiements.';
    const original = structuredClone(harness.sources);
    const result = await getOracleBrandContextByQuery("brand-a", query, { includeSources: true, sourcesLimit: 1, passagesPerSource: 2 });
    expect(result?.sourceReferences?.map(r => r.chunkIndex)).toEqual([0, 1]);
    expect(result?.text).toContain("8 000 avis"); expect(result?.text).toContain("1 200 commentaires");
    const ordinary = await getOracleBrandContextByQuery("brand-a", query, { includeSources: true, sourcesLimit: 1 });
    expect(ordinary?.sourceReferences).toHaveLength(1);
    expect(harness.sources).toEqual(original);
  });
  it.each([false, true])("ranks the local field passage before distant unrelated keywords (vector=%s)", async vector => {
    if (vector) harness.vector = [1, 0];
    const proposal = 'Indicateur proposé : « prix par personne » à vérifier ultérieurement. '
      + "Règles générales sans observation reçue. ".repeat(30)
      + "Étude terrain Google TikTok taux limites BMC continuité alignée équipe observations postulats déploiements. ".repeat(8);
    const factual = 'Google, champ « prix par personne » : 22 % des 8 000 avis. TikTok, demandes pratiques : 12 % de 1 200 commentaires. Limites de cette étude terrain : populations distinctes.';
    harness.sources[0] = { ...source, rawContent: proposal + "\n" + factual };
    const node = harness.nodes[0];
    harness.nodes = [proposal, factual].map((text, chunkIndex) => ({ ...node, id: `local-${chunkIndex}`,
      payload: { ...node.payload, text, chunkIndex, sourceContentHash: sourceFingerprint(harness.sources[0]) } }));
    const result = await getOracleBrandContextByQuery("brand-a", 'Étude terrain Google TikTok taux limites BMC continuité alignée équipe observations postulats déploiements : champ « prix par personne » ?', { includeSources: true, sourcesLimit: 1 });
    expect(result?.sourceReferences?.[0]?.chunkIndex).toBe(1);
    expect(result?.sourceReferences?.[0]?.text).toContain("8 000 avis");
  });
  it.each([false, true])("selects the exact quoted field rather than a dense summary (vector=%s)", async vector => {
    if (vector) harness.vector = [1, 0];
    const summary = "Étude terrain Google TikTok taux limites BMC continuité alignée équipe observations postulats déploiements. ".repeat(15);
    const factual = 'Champ « prix par personne » : 22 % de 8 000 avis. Commentaires : 12 % sur 1 200, échantillon distinct.';
    harness.sources[0] = { ...source, rawContent: summary + "\n" + factual };
    const node = harness.nodes[0];
    harness.nodes = [summary, factual].map((text, chunkIndex) => ({ ...node, id: `quote-${chunkIndex}`,
      payload: { ...node.payload, text, chunkIndex, sourceContentHash: sourceFingerprint(harness.sources[0]) } }));
    const result = await getOracleBrandContextByQuery("brand-a", 'Étude terrain Google TikTok taux limites BMC continuité alignée équipe observations postulats déploiements : champ « prix par personne » ?', { includeSources: true, sourcesLimit: 1 });
    expect(result?.sourceReferences?.[0]?.chunkIndex).toBe(1);
    expect(result?.sourceReferences?.[0]?.text).toContain("8 000 avis");
  });
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

describe("a question survives deterministic documentary retrieval", () => {
  function corpusWithRecentSummary(chunks = 30) {
    const note = { ...source, id: "recent-summary", fileName: "Note de réconciliation.txt",
      rawContent: "BMC, étude terrain : une note de réconciliation, pas les documents originaux. ".repeat(chunks) };
    const bmc = { ...source, id: "previous-bmc", fileName: "BMC — modèle économique.docx",
      rawContent: "BMC proposé : hypothèses économiques à faire valider par l’équipe." };
    const study = { ...source, id: "field-study", fileName: "Étude terrain — observations.docx",
      rawContent: "Étude terrain : échantillons, observations, limites et méthode de comparaison." };
    harness.sources = [note, bmc, study];
    harness.nodes = [
      ...Array.from({ length: chunks }, (_, i) => ({ source: note, index: i })),
      { source: bmc, index: 0 }, { source: study, index: 0 },
    ].map(({ source: doc, index }) => ({ id: `${doc.id}-${index}`, strategyId: "brand-a", kind: "BRAND_SOURCE",
      sourceId: doc.id, payload: { text: doc.rawContent.slice(0, 200), fileName: doc.fileName,
        chunkIndex: index, sourceContentHash: sourceFingerprint(doc) } }));
  }
  it.each([false, true])("retrieves older BMC and study instead of only recent summary chunks (provider refused=%s)", async (refused) => {
    corpusWithRecentSummary(); harness.failEmbedding = refused;
    const result = await getOracleBrandContextByQuery("brand-a", "BMC et étude terrain", { includeSources: true, sourcesLimit: 2 });
    expect(new Set(result?.sourceReferences?.map(r => r.sourceId))).toEqual(new Set(["previous-bmc", "field-study"]));
  });
  it("recognizes a three-letter document name and keeps its original citation", async () => {
    corpusWithRecentSummary();
    const result = await getOracleBrandContextByQuery("brand-a", "BMC", { includeSources: true, sourcesLimit: 1 });
    expect(result?.sourceReferences?.[0]).toMatchObject({ sourceId: "previous-bmc", fileName: "BMC — modèle économique.docx",
      text: harness.sources[1].rawContent });
  });
  it("uses more than one document for an unqueried overview", async () => {
    corpusWithRecentSummary();
    const result = await getOracleBrandContext("brand-a", undefined, { includeSources: true, sourcesLimit: 2 });
    expect(new Set(result?.sourceReferences?.map(r => r.sourceId)).size).toBe(2);
  });
  it("a large table cannot evict other documents from the candidate pool", async () => {
    corpusWithRecentSummary(2100);
    const result = await getOracleBrandContextByQuery("brand-a", "BMC étude terrain", { includeSources: true, sourcesLimit: 2 });
    expect(new Set(result?.sourceReferences?.map(r => r.sourceId))).toEqual(new Set(["previous-bmc", "field-study"]));
  });
});

it("keeps an exact quoted field and its denominator in a bounded original excerpt", async () => {
  const { excerptForQuery } = await import("@/server/services/seshat/context-store/chunker");
  const intro = "Étude terrain Google TikTok taux limites équipe observations postulats déploiements. ".repeat(25);
  const fact = "Le champ « prix par personne » est renseigné dans 22 % des 8 000 avis.";
  const original = intro + "\n" + fact + "\nMéthode de recette, aucun résultat client.";
  const excerpt = excerptForQuery(original, 'Étude terrain Google TikTok taux limites équipe observations postulats déploiements : champ « prix par personne »', 180);
  expect(excerpt).toContain(fact);
  expect(original).toContain(excerpt);
});
