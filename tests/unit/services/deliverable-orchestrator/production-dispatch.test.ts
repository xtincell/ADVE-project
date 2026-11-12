/** Exercises the real composer, KV producer, template rendering and Glory → Ptah
 * handoff. Only persistence and provider boundaries are substituted. */
import { describe, it, expect, vi, beforeEach } from "vitest";
const h = vi.hoisted(()=>({ asset:vi.fn(), strategy:vi.fn(), preview:vi.fn(), create:vi.fn(), capture:vi.fn(), ptah:vi.fn(), structured:vi.fn(), claim:vi.fn(), event:vi.fn(), calendar:vi.fn() }));
vi.mock("@/server/services/deliverable-orchestrator/calendar-production",()=>({readCalendarBriefSource:h.calendar}));
vi.mock("@/server/services/operator-isolation",()=>({ getOperatorContext:async()=>({}),canAccessStrategy:async()=>true }));
vi.mock("@/lib/db",()=>({db:{
  $transaction:async (go: (tx: unknown)=>Promise<void>)=>go({$queryRaw:async()=>[{id:"preview-id",state:"CANDIDATE",version:2}],intentEmissionEvent:{findFirst:h.event,create:h.claim},brandAsset:{update:async()=>({})}}),
  brandAsset:{findMany:h.asset,findFirst:async(q:{where:{id:string}})=>activeBriefs.find(r=>r.id===q.where.id)},intentEmissionEvent:{create:async()=>({}),findFirst:async()=>null}, strategy:{findUnique:h.strategy,findUniqueOrThrow:h.strategy}, pillar:{findMany:async()=>[{key:"a",content:{}}]},
  creativeProposal:{findMany:async()=>[]}, intentEmission:{findFirst:h.preview,create:h.create,update:async()=>({})},
  gloryOutput:{create:async()=>({id:"generated-brief"})},
}}));
vi.mock("@/server/governance/pillar-readiness",()=>({evaluatePillarReadiness:()=>({gates:{GLORY_SEQUENCE:{ok:true}}})}));
vi.mock("@/server/services/llm-gateway",()=>({callLLM:h.capture}));
vi.mock("@/server/services/utils/llm-structured",async(getOriginal)=>({...await getOriginal<object>(),executeStructuredLLMCall:h.structured}));
vi.mock("@/server/services/mestor/intents",()=>({emitIntent:h.ptah}));
import { composeDeliverable } from "@/server/services/deliverable-orchestrator/composer";
const input={strategyId:"spawt",operatorId:"user",targetKind:"KV_VISUAL",pins:[
  {role:"ART_DIRECTION" as const,assetId:"da-v2",version:2}, {role:"COPY" as const,assetId:"copy-v4",version:4},
]};
const asset = {strategyId:"spawt",state:"CANDIDATE",staleAt:null,campaignId:null,metadata:{},fileUrl:null,mimeType:null,sourceAssetVersionId:null};
// These three intellectual prerequisites are already active and accepted in this fixture.
const activeBriefs=["BIG_IDEA","CHROMATIC_STRATEGY","KV_ART_DIRECTION_BRIEF"].map(kind=>({...asset,id:kind,kind,version:1,name:kind,state:"ACTIVE",content:{direction:`Pièce active - ${kind}`}}));
let correction=false;
beforeEach(()=>{
  vi.clearAllMocks(); correction=false;
  h.strategy.mockResolvedValue({name:"SPAWT",status:"ACTIVE",operatorId:"owner",manipulationMix:{primary:"entertainer"},pillars:[],drivers:[]});
  h.asset.mockImplementation(async (q:{where:{id?:unknown}})=>q.where.id ? [
    {...asset,id:"da-v2",kind:"KV_ART_DIRECTION_BRIEF",name:"DA officielle",version:2,content:correction?"Rouge":"Pêche et bleu nuit."},
    {...asset,id:"copy-v4",kind:"SOCIAL_COPY",name:"Légende retenue",version:4,content:"Réserve $& ta place."}
  ]:activeBriefs);
  const data={prompts:[{prompt:"Un visuel pêche et bleu nuit."}]};
  h.capture.mockResolvedValue({text:JSON.stringify(data),model:"test",provider:"mock"});
  h.structured.mockResolvedValue({data,model:"test",provider:"mock",attempts:1});
  h.event.mockResolvedValue(null); h.claim.mockResolvedValue({id:"recorded"});
  h.create.mockResolvedValue({id:"glory-intent"});
  h.ptah.mockResolvedValue({status:"OK",summary:"reportée",output:{taskId:"trace",status:"DEFERRED"}});
});
async function preview() {
  const first=await composeDeliverable({...input,previewOnly:true,sourceIntentId:"preview-id"});
  h.preview.mockResolvedValue({payload:input,result:{output:first}});
  return first;
}
describe("Source → aperçu → Glory → forge",()=>{
  it("le moteur reçoit le texte et la DA exacts et la tâche différée est identifiable, sans rendu inventé",async()=>{
    const first=await preview();
    expect(first.status).toBe("PREVIEW");
    expect(h.capture).not.toHaveBeenCalled(); expect(h.ptah).not.toHaveBeenCalled();
    const done=await composeDeliverable({...input,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"});
    expect(done).toMatchObject({previewIntentId:"preview-id",briefOutputId:"generated-brief",generativeTaskId:"trace",materialStatus:"DEFERRED"});
    const actual=(h.capture.mock.calls[0]??h.structured.mock.calls[0])?.[0];
    expect(actual?.prompt).toContain("Pêche et bleu nuit."); expect(actual?.prompt).toContain("Réserve $& ta place.");
    expect(actual?.prompt).toContain("Copie retenue (exacte)");
    expect(h.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({spawnedFrom:"launch-id",payload:expect.objectContaining({previewIntentId:"preview-id"})})}));
    expect(h.ptah).toHaveBeenCalledWith(expect.objectContaining({sourceIntentId:"glory-intent",brief:expect.objectContaining({briefText:expect.stringContaining("Un visuel pêche et bleu nuit.")})}),expect.anything());
    expect(h.ptah.mock.calls[0]![0].brief.forgeSpec.parameters.prompt).toContain("Réserve $& ta place.");
  });
  it("les images d’inspiration arrivent à la forge sous forme de références privées versionnées, pas d’octets dans Glory",async()=>{
    const image={...asset,id:"mood",version:4,state:"ACTIVE",kind:"KV_VISUAL",name:"Photo source",mimeType:"image/jpeg",content:null,metadata:{original:{state:"STORED",contentHash:"f".repeat(64)}}};
    h.asset.mockImplementation(async(q:{where:{id?:unknown}})=>q.where.id?[image]:activeBriefs);
    const job={...input,pins:[{assetId:"mood",version:4,role:"REFERENCE" as const}]};
    const first=await composeDeliverable({...job,sourceIntentId:"preview-id",previewOnly:true});
    expect(first.sourceManifest?.sources[0]?.transport).toBe("IMAGE_REFERENCE");
    h.preview.mockResolvedValue({payload:job,result:{output:first}});
    await composeDeliverable({...job,previewIntentId:"preview-id",sourceIntentId:"launch-id",previewOnly:false});
    expect(h.ptah.mock.calls[0]![0].brief.forgeSpec.parameters.productionReferences).toEqual([{assetId:"mood",version:4,originalHash:"f".repeat(64)}]);
    expect(JSON.stringify(h.create.mock.calls)).not.toContain("data:image/");
  });
  it("une piste du calendrier, sa légende et la correction passent réellement à Glory ET au prompt de Ptah",async()=>{
    const text=JSON.stringify({origin:"PROJECTED",post:{caption:"Coucou $& Abidjan"},correction:"Garder la voix du foodie",direction:{version:8,rule:"Logo discret."},treatment:"Vérifier les deux prix"});
    h.calendar.mockResolvedValue({assetId:"brief",version:2,name:"Piste 2",fingerprint:"a".repeat(64),text,platform:"Instagram",format:"Story",angle:"prix",theme:"Cuisine",family:"terrain",mode:"REVISION"});
    const first=await composeDeliverable({...input,calendarBrief:{assetId:"brief",version:2},sourceIntentId:"preview-id",previewOnly:true});
    h.preview.mockResolvedValue({payload:input,result:{output:first}});
    const result=await composeDeliverable({...input,previewIntentId:"preview-id",sourceIntentId:"launch-id",previewOnly:false});
    expect(result.generativeTaskId).toBe("trace");
    const prompt=(h.capture.mock.calls[0]??h.structured.mock.calls[0])?.[0]?.prompt ?? "";
    expect(prompt).toContain("Coucou $& Abidjan");expect(prompt).toContain("Garder la voix du foodie");
    const forge=h.ptah.mock.calls[0]![0];
    expect(forge.sourceBrandAssetId).toBe("brief");
    expect(forge.brief.forgeSpec.parameters).toMatchObject({platform:"Instagram",format:"Story",creativeMode:"REVISION",creativeFamily:"terrain",calendarBriefVersion:2});
    expect(forge.brief.forgeSpec.parameters.prompt).toContain("Garder la voix du foodie");
    expect(forge.brief.briefText).toContain("Logo discret.");
  });
  it("une réécriture en place ou un changement de cible empêche tout nouvel appel",async()=>{
    await preview(); correction=true;
    await expect(composeDeliverable({...input,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"})).rejects.toThrow(/changé/);
    expect(h.create).not.toHaveBeenCalled(); expect(h.ptah).not.toHaveBeenCalled();
    correction=false;
    await expect(composeDeliverable({...input,targetKind:"PITCH",previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"})).rejects.toThrow(/périmètre/);
    expect(h.create).not.toHaveBeenCalled();
  });
  it("un second clic sur le même aperçu ne coûte pas un second appel",async()=>{
    await preview();
    const request={...input,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"};
    await composeDeliverable(request);
    h.event.mockResolvedValueOnce({id:"claimed"});
    await expect(composeDeliverable({...request,sourceIntentId:"another-run"})).rejects.toThrow(/déjà été lancé/);
    expect(h.create).toHaveBeenCalledTimes(1); expect(h.ptah).toHaveBeenCalledTimes(1);
  });
  it("un veto Ptah reste un échec, pas une tâche fictive en attente de clés",async()=>{
    await preview(); h.ptah.mockResolvedValue({status:"VETOED",summary:"Budget insuffisant"});
    await expect(composeDeliverable({...input,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"})).rejects.toThrow(/Budget insuffisant/);
  });
  it("une marque en préparation peut rouvrir le brief, mais les mêmes prérequis bloquent toujours la forge",async()=>{
    h.strategy.mockResolvedValue({status:"ACTIVE",manipulationMix:null});
    const first=await preview();
    expect(first.status).toBe("PREVIEW");
    expect(first.composition.missingPreconditions).toEqual(["MISSING_MANIPULATION_MIX_PRIMARY"]);
    const stopped=await composeDeliverable({...input,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"});
    expect(stopped.status).toBe("MISSING_PRECONDITIONS"); expect(h.create).not.toHaveBeenCalled();
    h.strategy.mockResolvedValue({status:"ARCHIVED"});
    expect((await composeDeliverable({...input,previewOnly:true})).status).toBe("MISSING_PRECONDITIONS");
  });
  it("l’outil cible reçoit ses entrées obligatoires résolues depuis les briefs amont, jamais un champ « non disponible »",async()=>{
    await preview();
    await composeDeliverable({...input,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"});
    const call=h.create.mock.calls.find(c=>c[0]?.data?.intentKind==="INVOKE_GLORY_TOOL");
    const sent=call?.[0].data.payload.input as Record<string,string>;
    expect(sent.concept).toContain("Idée directrice");
    expect(sent.chromatic_strategy).toContain("Palette de couleurs");
    expect(sent.concept).not.toMatch(/non disponible/); expect(sent.chromatic_strategy).not.toMatch(/non disponible/);
  });
  it("une entrée obligatoire introuvable est listée dans l’aperçu puis refusée avant toute réservation ou tout appel",async()=>{
    h.asset.mockImplementation(async (q:{where:{id?:unknown}})=>q.where.id ? [] : [...activeBriefs,{...asset,id:"positionnement",kind:"POSITIONING",version:1,name:"Positionnement",state:"ACTIVE",content:{axe:"Proximité"}}]);
    const job={...input,pins:[],targetKind:"BCG_PORTFOLIO"};
    const first=await composeDeliverable({...job,previewOnly:true,sourceIntentId:"preview-id"});
    expect(first.status).toBe("PREVIEW");
    expect(first.missingInputs).toEqual([{code:"MISSING_REQUIRED_INPUT",field:"business_units",label:expect.any(String),expected:[{from:"BRAND_FILE"}]}]);
    expect(first.summary).toMatch(/fiche de marque/); expect(first.summary).not.toMatch(/\b(Glory|Ptah|Mestor|Artemis|PREVIEW)\b/);
    h.preview.mockResolvedValue({payload:job,result:{output:first}});
    const refused=await composeDeliverable({...job,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"});
    expect(refused.status).toBe("MISSING_INPUTS");
    expect(refused.missingInputs?.[0]).toMatchObject({code:"MISSING_REQUIRED_INPUT",field:"business_units"});
    expect(h.claim).not.toHaveBeenCalled(); expect(h.create).not.toHaveBeenCalled();
    expect(h.structured).not.toHaveBeenCalled(); expect(h.capture).not.toHaveBeenCalled(); expect(h.ptah).not.toHaveBeenCalled();
  });
  it("un document amont sans version active ni préparation possible est signalé dès l’aperçu",async()=>{
    const first=await composeDeliverable({...input,pins:[],targetKind:"PRINT_AD_SPEC",previewOnly:true,sourceIntentId:"preview-id"});
    expect(first.missingInputs).toContainEqual({code:"PREREQUISITE_UNAVAILABLE",kind:"CONCEPT"});
  });
  it("le moteur refuse une entrée déclarée obligatoire et absente avant toute émission ou tout appel",async()=>{
    const { executeTool, MissingToolInputsError } = await import("@/server/services/artemis/tools/engine");
    await expect(executeTool("kv-banana-prompt-generator","spawt",{format:"Story",concept:"  "},{requiredInputs:["concept","chromatic_strategy"]}))
      .rejects.toBeInstanceOf(MissingToolInputsError);
    expect(h.create).not.toHaveBeenCalled(); expect(h.structured).not.toHaveBeenCalled(); expect(h.capture).not.toHaveBeenCalled();
  });
  it("un élément promis au montage bloque avant Glory",async()=>{
    const pins=[{role:"MATERIAL" as const,assetId:"da-v2",version:2}];
    const first=await composeDeliverable({...input,pins,sourceIntentId:"preview-id",previewOnly:true});
    h.preview.mockResolvedValue({payload:{...input,pins},result:{output:first}});
    expect(first.materialBlock).toContain("DA officielle");
    await expect(composeDeliverable({...input,pins,previewOnly:false,previewIntentId:"preview-id",sourceIntentId:"launch-id"})).rejects.toThrow(/Incorporation/);
    expect(h.ptah).not.toHaveBeenCalled(); expect(h.create).not.toHaveBeenCalled();
  });
});
