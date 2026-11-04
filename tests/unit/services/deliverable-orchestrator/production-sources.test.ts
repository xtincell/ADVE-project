import { beforeEach, describe, expect, it, vi } from "vitest";
import { productionPins, materialHandoffBlock, type ProductionPin } from "@/domain/production-sources";
import { listProductionPassagesInText } from "@/domain/production-passages";

const storage = vi.hoisted(() => ({
  findMany: vi.fn(), findFirst: vi.fn(), proposals: vi.fn(), campaign: vi.fn(), emission: vi.fn(),
  source: vi.fn(), original: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  intentEmissionEvent:{findFirst:async()=>null},
  brandAsset: { findMany:storage.findMany, findFirst:storage.findFirst },
  strategy:{findUnique:async()=>({status:"ACTIVE",manipulationMix:{primary:"entertainer"}})},pillar:{findMany:async()=>[]},
  creativeProposal:{findMany:storage.proposals}, campaign:{findFirst:storage.campaign},
  intentEmission:{findFirst:storage.emission},
} }));
vi.mock("@/server/services/ingestion-pipeline/source-usage", async(importOriginal) => ({
  ...await importOriginal<object>(), resolveBrandSource: storage.source,
}));
vi.mock("@/server/services/brand-vault/original",()=>({readAssetOriginal:storage.original}));

import { resolveProductionSources, getCurrentProductionPreview, requireReviewedManifest, listProductionPassages } from "@/server/services/deliverable-orchestrator/production-sources";
import { productionSourceInput } from "@/server/services/deliverable-orchestrator/production-prompt";

const pin: ProductionPin = {role:"COPY",assetId:"copy",version:4};
const base = { id:"copy", strategyId:"spawt",name:"Copy octobre",version:4,state:"CANDIDATE",kind:"SOCIAL_COPY", content:"Ça vaut le détour !",metadata:{},campaignId:null,staleAt:null,fileUrl:null,mimeType:null,sourceAssetVersionId:null };
beforeEach(()=>{
  vi.clearAllMocks();
  storage.findMany.mockImplementation(async ({where}) => where.strategyId==="spawt"?[base]:[]);
  storage.findFirst.mockImplementation(async ({where}) => where.strategyId==="spawt"?base:null);
  storage.proposals.mockResolvedValue([]); storage.emission.mockResolvedValue(null); storage.campaign.mockResolvedValue(null);
});

describe("Production — sources relues", ()=>{
  it("rouvre le même aperçu après le transport JSON d’un post sans passages sélectionnés", async () => {
    const initial = await resolveProductionSources("spawt", [{...pin, sections: undefined}]);
    const reopened = await resolveProductionSources("spawt", [pin]);
    expect(() => requireReviewedManifest(JSON.parse(JSON.stringify(initial)), reopened)).not.toThrow();
  });
  it("exige une direction artistique explicite ou issue de D pour le brief du planning",async()=>{
    const calendarBrief={assetId:"brief",version:1,name:"Duel",fingerprint:"c".repeat(64),text:"Duel historique",platform:"Instagram",format:"Post",theme:null,angle:null,family:null,mode:"NEW" as const,hasArtDirection:false};
    const bare=await resolveProductionSources("spawt",[]);
    expect(materialHandoffBlock({...bare,calendarBrief})).toMatch(/direction artistique/);
    const directed=await resolveProductionSources("spawt",[{...pin,role:"ART_DIRECTION"}]);
    expect(materialHandoffBlock({...directed,calendarBrief})).toBeNull();
  });
  it("conserve le texte exact, la révision et le statut candidat sans promouvoir l’actif",async()=>{
    const manifest = await resolveProductionSources("spawt",[pin]);
    expect(manifest.sources[0]).toMatchObject({...pin,text:"Ça vaut le détour !",state:"CANDIDATE",transport:"TEXT"});
    expect(productionSourceInput(manifest)).toContain("Ça vaut le détour !");
    expect(productionSourceInput(manifest)).toContain("Copie retenue (exacte)");
    expect(storage.findMany).toHaveBeenCalledWith({where:{strategyId:"spawt",id:{in:["copy"]}}});
  });
  it("rejette les sources étrangères, historiques, périmées ou d’une autre campagne", async()=>{
    await expect(resolveProductionSources("autre",[pin])).rejects.toThrow(/inaccessible/);
    await expect(listProductionPassages("autre","copy",4)).rejects.toThrow(/inaccessible/);
    for (const changed of [{state:"ARCHIVED"},{state:"SUPERSEDED"},{staleAt:new Date(0)},{version:5},{campaignId:"autre"},{metadata:{_sourceClassification:{status:"ARCHIVED"}}}]) {
      storage.findMany.mockResolvedValueOnce([{...base,...changed}]);
      await expect(resolveProductionSources("spawt",[pin])).rejects.toThrow();
    }
  });
  it("révoquer ou corriger le document source interdit de relire l’aperçu même avec le même ID d’actif", async()=>{
    storage.findMany.mockResolvedValue([{...base,content:null,metadata:{sourceDataSourceId:"source",sourceContentHash:"a".repeat(64)}}]);
    storage.source.mockResolvedValue({source:{rawContent:"DA officielle",rawData:null},contentHash:"a".repeat(64)});
    const sourceManifest = await resolveProductionSources("spawt",[pin]);
    expect(sourceManifest.sources[0]).toMatchObject({text:"DA officielle",documentId:"source"});
    storage.emission.mockResolvedValue({payload:{pins:[pin],targetKind:"KV_VISUAL"},result:{output:{status:"PREVIEW",previewIntentId:"preview",sourceManifest}}});
    expect((await getCurrentProductionPreview("spawt","preview")).sourceManifest).toEqual(sourceManifest);
    storage.source.mockResolvedValueOnce({source:{rawContent:"DA corrigée",rawData:null},contentHash:"b".repeat(64)});
    await expect(getCurrentProductionPreview("spawt","preview")).rejects.toThrow(/corrigé/);
    storage.source.mockRejectedValueOnce(new Error("Accès retiré"));
    await expect(getCurrentProductionPreview("spawt","preview")).rejects.toThrow(/retiré/);
    expect(storage.emission).toHaveBeenCalledWith(expect.objectContaining({where:{id:"preview",strategyId:"spawt",intentKind:"COMPOSE_DELIVERABLE",status:"OK"}}));
  });
  it("distingue une référence d'un fichier à incorporer ; un titre seul ne remplace jamais la DA ou la copy", async()=>{
    const picture={...base,kind:"KV_VISUAL",name:"image.png",content:null,mimeType:"image/png"};
    storage.findMany.mockResolvedValue([picture]);
    await expect(resolveProductionSources("spawt",[pin])).rejects.toThrow(/Aucun texte/);
    const reference=await resolveProductionSources("spawt",[{...pin,role:"REFERENCE"}]);
    expect(materialHandoffBlock(reference)).toBeNull();
    expect(reference.sources[0]?.transport).toBe("IDENTITY_ONLY");
    const material=await resolveProductionSources("spawt",[{...pin,role:"MATERIAL"}]);
    expect(materialHandoffBlock(material)).toMatch(/Incorporation non raccordée/);
    expect(storage.original).not.toHaveBeenCalled();
  });
  it("autorise un seul master SVG précis et continue de refuser les autres matériaux",async()=>{
    const artwork={photoLayerId:"photo",photoPolicy:"GENERATED_CANDIDATE" as const};
    const svg={...base,mimeType:"image/svg+xml",content:null,metadata:{original:{state:"STORED",contentHash:"f".repeat(64)}}};
    storage.findMany.mockResolvedValue([svg]); const p={...pin,role:"MATERIAL" as const,artwork};
    const manifest=await resolveProductionSources("spawt",[p]);
    expect(manifest.productionArtwork).toEqual({assetId:pin.assetId,version:pin.version,originalHash:"f".repeat(64),...artwork});
    expect(materialHandoffBlock(manifest)).toBeNull();
    expect(materialHandoffBlock({...manifest,productionArtwork:undefined})).toMatch(/Incorporation/);
    expect(productionPins.safeParse([{...p,role:"REFERENCE"}]).success).toBe(false);
    expect(productionPins.safeParse([p,{...p,assetId:"second"}]).success).toBe(false);
    storage.findMany.mockResolvedValue([{...svg,mimeType:"image/png"}]);await expect(resolveProductionSources("spawt",[p])).rejects.toThrow(/master SVG/);
  });
  it("vérifie la conservation de l'original texte avant utilisation, au lieu d'utiliser son nom",async()=>{
    storage.findMany.mockResolvedValue([{...base,content:null,name:"copy.txt",mimeType:"text/plain",metadata:{original:{state:"STORED",contentHash:"a".repeat(64)}}}]);
    storage.original.mockResolvedValue({bytes:Buffer.from("La légende exacte\n#spawt"),receipt:{contentHash:"a".repeat(64)}});
    expect((await resolveProductionSources("spawt",[pin])).sources[0]?.text).toBe("La légende exacte\n#spawt");
    storage.original.mockResolvedValueOnce({bytes:Buffer.from("autre"),receipt:{contentHash:"b".repeat(64)}});
    await expect(resolveProductionSources("spawt",[pin])).rejects.toThrow(/diffère/);
  });
  it("refuse les doublons et les changements depuis l'aperçu, y compris ceux d'une proposition validée", async()=>{
    expect(productionPins.safeParse([pin,{...pin,role:"REFERENCE"}]).success).toBe(false);
    expect(productionPins.safeParse([pin,{...pin,assetId:"copy-2"}]).success).toBe(false);
    const proposal={id:"p",routeKey:"TARGET",updatedAt:new Date(0),direction:{bigIdea:"Voice"}};
    storage.proposals.mockResolvedValue([proposal]);
    const first=await resolveProductionSources("spawt",[pin]);
    expect(first.creativeProposal?.id).toBe("p");
    storage.proposals.mockResolvedValue([{...proposal,direction:{bigIdea:"Autre piste"}}]);
    const second=await resolveProductionSources("spawt",[pin]);
    expect(()=>requireReviewedManifest(first,second)).toThrow(/changé/);
    storage.proposals.mockResolvedValue([proposal, {...proposal,id:"q"}]);
    await expect(resolveProductionSources("spawt",[pin])).rejects.toThrow(/Plusieurs/);
  });
  it("retient le passage exact d'une pièce longue et refuse de le substituer après édition", async()=>{
    const copy = "# Chapitre\n\nPhrase A.\n\n# Offre\n\nPhrase B.";
    const chapters = listProductionPassagesInText(copy);
    const picked=chapters.find(s=>s.text.includes("Phrase B."))!;
    storage.findMany.mockResolvedValue([{...base,content:copy}]);
    const excerpt = await resolveProductionSources("spawt",[{...pin,sections:[picked.key]}]);
    expect(excerpt.sources[0]?.text).toBe(picked.text);
    storage.findMany.mockResolvedValueOnce([{...base,content:copy.replace("Phrase B.","Nouvelle proposition B.")}]);
    await expect(resolveProductionSources("spawt",[{...pin,sections:[picked.key]}])).rejects.toThrow();
  });
});
