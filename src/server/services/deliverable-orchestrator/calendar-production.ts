/** Planning → briefs de contenu. Seul le calendrier Glory stocké fait autorité.
 * Une date recalculée ou un brief candidat ne constitue jamais une publication approuvée. */
import { db } from "@/lib/db";
import { Prisma, type BrandAsset } from "@prisma/client";
import { brandVoiceFromPillarD, deriveDatedPosts, parseContentCalendar, parseLaunchTimeline, type ContentPost } from "@/lib/types/launch-calendar";
import { createBrandAsset } from "@/server/services/brand-vault/engine";
import { buildCreativeDirectionContext } from "@/server/services/creative-direction/context";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { calendarPreparation, type CalendarPreparation, type CalendarView } from "@/domain/calendar-production";
import { calendarBriefSource } from "@/domain/calendar-brief-source";
import { productionPins, type ProductionPin } from "@/domain/production-pin";
import { productionArtwork, type ProductionArtwork } from "@/domain/production-artwork";
import { isUsableGeneration } from "@/domain/generation-result";

import { ACTIVE_CALENDAR_TOOL, HISTORICAL_CALENDAR_TOOL, CALENDAR_TOOLS, calendarPosts, linkUniqueSourcePost } from "@/domain/calendar-editions";

const FORMAT="calendar-post-brief/v1";
const record=(v:unknown):Record<string,unknown>=>v && typeof v==="object" && !Array.isArray(v)?v as Record<string,unknown>:{};
const fingerprint=(v:unknown)=>sourceFingerprint({rawData:v});
const string=(v:unknown)=>typeof v==="string" && v.trim()?v:null;
const usable=(a:Pick<BrandAsset,"state"|"staleAt">)=>!["SUPERSEDED","ARCHIVED","REJECTED"].includes(a.state)&&(!a.staleAt || a.staleAt>new Date());
type Origin="STORED"|"PROJECTED";
type Line={key:string,post:ContentPost,origin:Origin,family:string|null,action:string|null,artwork?:ProductionArtwork,sourcePins?:ProductionPin[]};
const treatments=[
  "Faire comprendre le sujet à travers son exemple le plus concret et sourcé.",
  "Privilégier la décision du lecteur : montrer comment il peut vérifier ou utiliser cette information.",
  "Donner la priorité à la voix identifiée dans les sources ; sans citation autorisée, privilégier un récit sans citation.",
  "Adopter une construction graphique comparative entre éléments documentés ; ne pas inventer une alternative.",
] as const;
export async function resolveCalendarView(view:CalendarView, client: Prisma.TransactionClient = db) {
  const {strategyId}=view;
  const [strategy,output,timeline,d,archives]=await Promise.all([
    client.strategy.findUnique({where:{id:strategyId},select:{status:true,operatorId:true}}),
    client.gloryOutput.findFirst({where:{strategyId,...(view.editionId ? {id:view.editionId,toolSlug:{in:CALENDAR_TOOLS}} : {toolSlug:ACTIVE_CALENDAR_TOOL})},orderBy:[{createdAt:"desc"},{id:"desc"}]}),
    client.gloryOutput.findFirst({where:{strategyId,toolSlug:"launch-timeline-planner"},orderBy:[{createdAt:"desc"},{id:"desc"}],select:{output:true}}),
    client.pillar.findUnique({where:{strategyId_key:{strategyId,key:"d"}},select:{content:true}}),
    client.gloryOutput.findMany({where:{strategyId,toolSlug:HISTORICAL_CALENDAR_TOOL},select:{output:true}}),
  ]);
  if(!strategy || ["ARCHIVED","DELETED"].includes(strategy.status))throw new Error("Marque indisponible.");
  const calendar=output && isUsableGeneration(output.output) ? parseContentCalendar(output.output):null;
  if(!calendar || !output)return {calendarVersion:null,sourceId:null,sourceUpdatedAt:null,lines:[] as Line[]};
  const rawPosts=record(output.output).posts;
  const raw=Array.isArray(rawPosts)?rawPosts.filter(x=>string(record(x).date)): [];
  const shouldProject=(view.projectDates===true || !calendar.posts.length) && Object.keys(calendar.cadenceParCanal).length>0;
  const anchor=view.startDate ?? parseLaunchTimeline(timeline?.output)?.anchorJ1 ?? output.createdAt.toISOString().slice(0,10);
  const posts=shouldProject?deriveDatedPosts(calendar,anchor,view.weeks??4,brandVoiceFromPillarD(d?.content)):calendar.posts;
  const origin:Origin=shouldProject?"PROJECTED":"STORED";
  const documentaryPosts = output.toolSlug===ACTIVE_CALENDAR_TOOL ? archives.flatMap(item=>calendarPosts(item.output)) : [];
  const lines=posts.map((post,index)=>{
    const fields=record(!shouldProject && raw[index]);
    const family=string(fields.creativeFamily) ?? string(fields.family);
    const action=string(fields.actionId) ?? string(fields.action);
    const linked=!shouldProject && !fields.productionArtwork && !fields.productionSources ? linkUniqueSourcePost(raw,index,documentaryPosts) : null;
    const rawMaster=fields.productionArtwork ?? linked?.productionArtwork;
    const pins=fields.productionSources ?? linked?.productionSources;
    const master={...(rawMaster===undefined?{}:{artwork:productionArtwork.parse(rawMaster)}),...(pins===undefined?{}:{sourcePins:productionPins.parse(pins)})};
    return {key:fingerprint({id:output.id,index,post,origin,family,action,...master}),post,family,action,origin,...master};
  });
  return {calendarVersion:fingerprint({id:output.id,hash:fingerprint(output.output),rows:lines.map(l=>l.key)}),sourceId:output.id,sourceUpdatedAt:output.updatedAt,brandOperatorId:strategy.operatorId,lines};
}
type MaterialVersionRef={id:string;url:string;status:"FILE_STORED"|"FILE_ARCHIVED"|"PROVIDER_ONLY";kind:string;createdAt:string};
type GenerationReceipt={previewIntentId:string|null,dispatchIntentId:string|null,status:string,message:string,briefOutputId:string|null,generativeTaskId:string|null,materialStatus:string|null,materialVersions:MaterialVersionRef[]};
export const emptyReceipt=(status:string,message:string):GenerationReceipt=>({status,message,previewIntentId:null,dispatchIntentId:null,briefOutputId:null,generativeTaskId:null,materialStatus:null,materialVersions:[]});
export function generationReceipt(value:unknown):GenerationReceipt|null {
  const o=record(value);
  return typeof o.status==="string" ? {...emptyReceipt(o.status,string(o.message)??""), previewIntentId:string(o.previewIntentId),dispatchIntentId:string(o.dispatchIntentId),briefOutputId:string(o.briefOutputId),generativeTaskId:string(o.generativeTaskId),materialStatus:string(o.materialStatus)}:null;
}
type BriefSummary=Pick<BrandAsset,"id"|"version"|"batchIndex"|"name"|"metadata">;
function briefCard(a:BriefSummary & Partial<Pick<BrandAsset,"content">>) {
  return {assetId:a.id,version:a.version,variant:a.batchIndex+1,name:a.name,...(a.content===undefined?{}:{fingerprint:fingerprint(a.content)}),generation:generationReceipt(record(a.metadata).generation)};
}
export async function calendarProductionRows(view:CalendarView){
  const c=await resolveCalendarView(view);
  const briefs=c.sourceId?await db.brandAsset.findMany({where:{strategyId:view.strategyId,sourceGloryOutputId:c.sourceId,format:FORMAT,metadata:{path:["calendarVersion"],equals:c.calendarVersion}},select:{id:true,name:true,version:true,batchIndex:true,metadata:true,state:true,staleAt:true},orderBy:[{batchIndex:"asc"},{version:"desc"}]}):[];
  const receipts=await readGenerationReceipts(view.strategyId,briefs);
  return {calendarVersion:c.calendarVersion,rows:c.lines.map(l=>{
    const versions=briefs.filter(a=>record(a.metadata).key===l.key && record(a.metadata).calendarVersion===c.calendarVersion);
    const card=(a:typeof versions[number])=>({...briefCard(a),generation:receipts.get(a.id)??null});
    return {key:l.key,post:l.post,origin:l.origin,briefs:versions.filter(usable).map(a=>({...card(a),
      history:versions.filter(previous=>previous.batchIndex===a.batchIndex && previous.state==="SUPERSEDED" && previous.version<a.version).map(card),
    }))};
  })};
}
export async function prepareCalendarBriefRows(raw:CalendarPreparation,operatorId:string,intentId?:string) {
  if(!intentId)throw new Error("Préparation sans reçu d’intention.");
  const v=calendarPreparation.parse(raw);
  const c=await resolveCalendarView(v);
  if(!c.sourceId || c.calendarVersion!==v.calendarVersion)throw new Error("Le calendrier a changé. Rouvrez le planning avant de préparer les briefs.");
  const rows=[];
  for(const key of v.postKeys){
    const line=c.lines.find(l=>l.key===key);
    if(!line){rows.push({key,briefs:[],error:"Cette ligne ne figure plus dans la version choisie."});continue;}
    try {
      const target={platform:line.post.platform,format:line.post.format??undefined,theme:line.post.theme??undefined,angle:line.post.angle??undefined,family:line.family??undefined, mode:v.correction?"REVISION" as const:"NEW" as const};
      const doctrine=await buildCreativeDirectionContext({strategyId:v.strategyId,target});
      const direction=doctrine?.context??null, directionHash=fingerprint(direction);
      const revisedHash=target.mode==="REVISION" ? directionHash:fingerprint((await buildCreativeDirectionContext({strategyId:v.strategyId,target:{...target,mode:"REVISION"}}))?.context??null);
      const briefs=await db.$transaction(async tx=>{
        const locked=await tx.$queryRaw<Array<{id:string,updatedAt:Date}>>`SELECT id, "updatedAt" FROM "GloryOutput" WHERE id=${c.sourceId} AND "strategyId"=${v.strategyId} FOR UPDATE`;
        if(!locked[0] || locked[0].updatedAt.getTime()!==c.sourceUpdatedAt?.getTime())throw new Error("Le calendrier a été corrigé. Rouvrez le planning.");
        const batchId="plan:"+fingerprint({strategy:v.strategyId,calendar:c.calendarVersion,key});
        const all=await tx.brandAsset.findMany({where:{strategyId:v.strategyId,batchId,format:FORMAT},orderBy:{version:"desc"}});
        const request=v.newProposal??v.correction;
        const parent=request ? all.find(a=>a.id===request.assetId && a.version===request.version) : null;
        if(request && !parent)throw new Error("La piste à corriger n’appartient pas à cette ligne ou à cette version.");
        if(parent && !usable(parent)){
          const child=all.find(a=>a.id===parent.supersededById && usable(a) &&
            (v.newProposal ? record(record(a.content).newProposal).instruction===v.newProposal.instruction && record(record(a.content).newProposal).fromBriefId===parent.id : record(a.content).correction===v.correction?.instruction));
          if(child && (!v.correction?.photoPolicy || record(record(child.content).artwork).photoPolicy===v.correction.photoPolicy))return [briefCard(child)];
          throw new Error("La piste a changé. Relisez sa dernière version.");
        }
        if(v.newProposal && (parent?.state!=="CANDIDATE" || !line.artwork))throw new Error("Choisissez un brief candidat associé à un master versionné pour ouvrir une nouvelle piste.");
        if(!parent && all.some(a=>a.batchSize<v.optionsPerPost && usable(a))) await tx.brandAsset.updateMany({where:{strategyId:v.strategyId,batchId,state:"CANDIDATE",batchSize:{lt:v.optionsPerPost}},data:{batchSize:v.optionsPerPost}});
        const cards=[];
        for(const index of parent ? [parent.batchIndex] : Array.from({length:v.optionsPerPost},(_,i)=>i)){
          const existing=all.find(a=>a.batchIndex===index);
          if(existing && !parent){
            if(!usable(existing))throw new Error("Cette piste a été archivée ou refusée.");
            const m=record(existing.metadata);
            if(m.directionHash!==(m.mode==="REVISION"?revisedHash:directionHash))throw new Error("La DA a changé : révisez cette piste avant génération.");
            cards.push(briefCard(existing));continue;
          }
          // A revision of an option inherits the sources actually chosen for that
          // option. The editable copy itself remains on the recorded calendar line.
          let sourcePins=line.sourcePins;
          if(!sourcePins && parent) {
            const previous=record(parent.content).sourcePins;
            if(previous)sourcePins=productionPins.parse(previous);
            else {
              const generation=record(record(parent.metadata).generation);
              if(typeof generation.previewIntentId==="string"){
                const reviewed=await tx.intentEmission.findFirst({where:{id:generation.previewIntentId,strategyId:v.strategyId,intentKind:"COMPOSE_DELIVERABLE",status:"OK"},select:{payload:true,result:true}});
                const saved=record(record(reviewed?.result).output);
                if(saved.status==="PREVIEW" && record(record(saved.sourceManifest).calendarBrief).assetId===parent.id)
                  sourcePins=productionPins.parse(record(reviewed?.payload).pins??[]);
              }
            }
          }
          if(v.correction?.photoPolicy && !line.artwork)throw new Error("Aucun master versionné n’est associé à cette ligne.");
          const inheritedMaster=parent ? productionArtwork.safeParse(record(parent.content).artwork):null;
          const proposal=v.newProposal ? {intentId,fromBriefId:parent!.id,fromVersion:parent!.version,instruction:v.newProposal.instruction} : (parent?record(parent.content).newProposal:undefined);
          const artwork=line.artwork && {...line.artwork,photoPolicy:v.newProposal ? "GENERATED_CANDIDATE" : v.correction?.photoPolicy ?? (inheritedMaster?.success ? inheritedMaster.data.photoPolicy:line.artwork.photoPolicy)};
          const content={schema:FORMAT,calendarVersion:c.calendarVersion,origin:line.origin,post:line.post,action:line.action,family:line.family,
            ...(artwork?{artwork}:{}),...(sourcePins?.length?{sourcePins}:{}),...(proposal?{newProposal:proposal}:{}),variant:index+1,treatment:treatments[index],direction,correction:v.correction?.instruction??null,
            ...(parent && v.correction?{previous:{assetId:parent.id,version:parent.version},correctionHistory:[...(Array.isArray(record(parent.content).correctionHistory)?record(parent.content).correctionHistory as string[]:[]),v.correction!.instruction]}:{}),
          };
          if(JSON.stringify(content).length>32000)throw new Error("Le brief dépasse la capacité du moteur. Affinez les règles de DA avant de le produire.");
          const metadata={calendarVersion:c.calendarVersion,key,editionId:v.editionId??null,startDate:v.startDate??null,weeks:v.weeks??4,projectDates:v.projectDates===true,directionHash,mode:target.mode,preparedByUserId:operatorId};
          const asset=await createBrandAsset({strategyId:v.strategyId,operatorId:c.brandOperatorId??null,name:(line.post.theme??line.post.angle??"Publication")+" · "+line.post.platform+" · piste "+(index+1),format:FORMAT,kind:"CREATIVE_BRIEF",content,state:"CANDIDATE",
            batchId,batchSize:parent?.batchSize??v.optionsPerPost,batchIndex:index,sourceGloryOutputId:c.sourceId!,sourceIntentId:intentId,metadata},tx);
          const next=parent?await tx.brandAsset.update({where:{id:asset.id},data:{version:parent.version+1,parentBrandAssetId:parent.id}}):asset;
          if(parent)await tx.brandAsset.update({where:{id:parent.id},data:{state:"SUPERSEDED",supersededAt:new Date(),supersededById:next.id,supersededReason:v.newProposal?"Nouvelle proposition photographique indépendante du master historique":"Correction ciblée d’un brief de production"}});
          cards.push(briefCard(next));
        } return cards;
      });
      rows.push({key,briefs,error:null});
    }catch(e){rows.push({key,briefs:[],error:e instanceof Error?e.message:"Préparation impossible."});}
  }
  return {rows};
}
export async function readCalendarBriefSource(strategyId:string,id:string,version:number, client: Prisma.TransactionClient = db){
  const a=await client.brandAsset.findFirst({where:{strategyId,id,version,format:FORMAT,kind:"CREATIVE_BRIEF"}});
  if(!a || !usable(a) || !a.sourceIntentId)throw new Error("La version de ce brief n’est plus disponible. Rouvrez le planning.");
  const m=record(a.metadata), content=record(a.content);
  const proof=await client.intentEmission.findFirst({where:{id:a.sourceIntentId,strategyId,intentKind:"COMPOSE_DELIVERABLE",status:"OK"},select:{payload:true,result:true}});
  const command=record(record(proof?.payload).calendarPreparation), produced=record(record(proof?.result).output).rows;
  const sealed=Array.isArray(produced) && produced.some(item=>{
    const row=record(item);return row.key===m.key && Array.isArray(row.briefs) && row.briefs.some(item=>{
      const brief=record(item);return brief.assetId===id && brief.version===version && brief.fingerprint===fingerprint(content);
    });
  });
  if(!sealed || !Array.isArray(command.postKeys)||!command.postKeys.includes(m.key)||command.calendarVersion!==m.calendarVersion)
    throw new Error("Le brief n’a pas de reçu de préparation correspondant à la ligne du planning.");
  const c=await resolveCalendarView({strategyId,editionId:string(m.editionId)??undefined,startDate:string(m.startDate)??undefined,weeks:Number(m.weeks)||4,projectDates:m.projectDates===true}, client);
  const line=c.lines.find(l=>l.key===m.key);
  if(!line||c.calendarVersion!==m.calendarVersion)throw new Error("Le calendrier a changé : relisez la ligne avant génération.");
  const {platform,format,theme,angle}=line.post;
  const mode=m.mode==="REVISION"?"REVISION":"NEW";
  const doctrine=await buildCreativeDirectionContext({strategyId,target:{platform,format:format??undefined,theme:theme??undefined,angle:angle??undefined,family:line.family??undefined,mode}}, client);
  if(fingerprint(doctrine?.context??null)!==m.directionHash)throw new Error("La doctrine de la marque a changé : révisez la piste.");
  const master=content.artwork ? productionArtwork.parse(content.artwork) : undefined;
  if(master && (!line.artwork || master.assetId!==line.artwork.assetId || master.version!==line.artwork.version || master.originalHash!==line.artwork.originalHash || master.photoLayerId!==line.artwork.photoLayerId))throw new Error("La source du montage a changé. Relisez sa version au planning.");
  if(master?.photoPolicy==="GENERATED_CANDIDATE" && line.artwork?.photoPolicy==="LOCKED_MASTER"){
    const proposal=record(content.newProposal);
    const intentId=string(proposal.intentId);
    const issuer=intentId && await client.intentEmission.findFirst({where:{id:intentId,strategyId,intentKind:"COMPOSE_DELIVERABLE",status:"OK"},select:{payload:true,result:true}});
    const prep=record(record(issuer&&issuer.payload).calendarPreparation), asked=record(prep.newProposal);
    const results=record(record(issuer&&issuer.result).output).rows;
    const issued=Array.isArray(results)&&results.some(row=>record(row).key===m.key && Array.isArray(record(row).briefs) && (record(row).briefs as unknown[]).some(b=>record(b).variant===content.variant));
    if(!intentId || !issued || prep.calendarVersion!==m.calendarVersion || asked.assetId!==proposal.fromBriefId || asked.version!==proposal.fromVersion || !string(asked.instruction) || asked.instruction!==proposal.instruction)throw new Error("La photo du master ne peut être remplacée sans une demande distincte de nouvelle proposition.");
  }
  const text=JSON.stringify(content);
  return calendarBriefSource.parse({assetId:id,version,name:a.name,fingerprint:fingerprint(content),text,platform,format,theme,angle,family:line.family,mode,...(master?{artwork:master}:{}),
    ...(content.sourcePins?{sourcePins:productionPins.parse(content.sourcePins)}:{}),
    hasArtDirection:Boolean(doctrine?.context.family || doctrine?.context.rules.length)});
}

async function readGenerationReceipts(strategyId:string,assets:Pick<BrandAsset,"id"|"metadata">[]){
  const result=new Map<string,GenerationReceipt>();
  for(const a of assets){const rec=generationReceipt(record(a.metadata).generation);if(rec)result.set(a.id,rec);}
  const ids=[...result.values()].flatMap(s=>s.dispatchIntentId?[s.dispatchIntentId]:[]);
  if(!ids.length)return result;
  const runs=await db.intentEmission.findMany({where:{id:{in:ids},strategyId,intentKind:"COMPOSE_DELIVERABLE"},select:{id:true,status:true,result:true}});
  const taskIds=runs.flatMap(r=>{const id=string(record(record(r.result).output).generativeTaskId);return id?[id]:[];});
  // Provider failure after the task was reserved still belongs to this option,
  // even when the dispatcher did not return a successful output envelope.
  const failedAssets=[...result].filter(([,r])=>runs.find(run=>run.id===r.dispatchIntentId)?.status==="FAILED").map(([id])=>id);
  const tasks=taskIds.length||failedAssets.length?await db.generativeTask.findMany({where:{strategyId,OR:[{id:{in:taskIds}},{sourceBrandAssetId:{in:failedAssets}}]},select:{id:true,sourceBrandAssetId:true,status:true,versions:{where:{strategyId},orderBy:[{createdAt:"asc"},{id:"asc"}],select:{id:true,kind:true,createdAt:true,fileSizeBytes:true,cdnUrl:true,metadata:true}}}}):[];
  // Never download provider URLs just to open the planning. The two positive receipts
  // are different: image bytes still stored here, or a previously confirmed archive PUT.
  const observedTaskIds=tasks.map(t=>t.id);
  const inline=observedTaskIds.length?await db.$queryRaw<Array<{id:string}>>`SELECT id FROM "AssetVersion"
    WHERE "strategyId"=${strategyId} AND "generativeTaskId" IN (${Prisma.join(observedTaskIds)}) AND length(url)>60
    AND (url LIKE 'data:image/png;base64,iVBORw0KGgo%' OR url LIKE 'data:image/jpeg;base64,/9j/%' OR url LIKE 'data:image/webp;base64,UklGR%')`:[];
  const storedIds=new Set(inline.map(v=>v.id));
  for(const [optionId,rec] of result){
    const run=runs.find(r=>r.id===rec.dispatchIntentId);
    if(!run)continue;
    const res=record(run.result),out=record(res.output);
    rec.briefOutputId=string(out.briefOutputId);rec.generativeTaskId=string(out.generativeTaskId);
    const linked=tasks.filter(t=>t.sourceBrandAssetId===optionId);
    const task=tasks.find(t=>t.id===rec.generativeTaskId) ?? (run.status==="FAILED" && linked.length===1?linked[0]:undefined);
    if(task)rec.generativeTaskId=task.id;
    rec.materialStatus=task?.status??string(out.materialStatus);
    rec.materialVersions=(task?.versions??[]).map(v=>{
      const archived=Boolean(v.cdnUrl && (v.fileSizeBytes??0)>0 && /^[a-f0-9]{64}$/.test(String(record(v.metadata).archiveHash)));
      return {id:v.id,url:"/api/production/image/"+encodeURIComponent(v.id),kind:v.kind,createdAt:v.createdAt.toISOString(),
        status:storedIds.has(v.id)?"FILE_STORED":archived?"FILE_ARCHIVED":"PROVIDER_ONLY"};
    });
    const fileStatus=rec.materialVersions.some(v=>v.status==="FILE_STORED")?"FILE_STORED":rec.materialVersions.some(v=>v.status==="FILE_ARCHIVED")?"FILE_ARCHIVED":"AWAITING_FILE";
    rec.status=run.status==="OK"?(task?task.status!=="COMPLETED"?task.status:fileStatus:rec.materialStatus??"BRIEF_PRODUCED"):run.status;
    rec.message=rec.status==="AWAITING_FILE"?"Le moteur a terminé ; aucun fichier conservé n’a été vérifié.":rec.status==="FILE_STORED"?"Fichier image conservé, à relire.":rec.status==="FILE_ARCHIVED"?"Fichier archivé avec empreinte ; relecture requise.":string(res.summary)??rec.message;
  }return result;
}
export async function produceCalendarBrief(v:import("zod").z.infer<typeof import("@/domain/calendar-production").calendarProductionLaunch>,operatorId:string):Promise<GenerationReceipt>{
  const existing=async()=>{
    const asset=await db.brandAsset.findFirst({where:{id:v.assetId,version:v.version,format:FORMAT,strategyId:v.strategyId}});
    if(!asset || !usable(asset))throw new Error("Ce brief n'est plus disponible. Relisez sa version active.");
    return (await readGenerationReceipts(v.strategyId,[asset])).get(asset.id)??null;
  };
  const receipt=await existing();if(receipt)return receipt;
  const {emitIntent}=await import("@/server/services/mestor/intents");
  const input={kind:"COMPOSE_DELIVERABLE" as const,strategyId:v.strategyId,operatorId,targetKind:"KV_VISUAL",calendarBrief:{assetId:v.assetId,version:v.version},pins:v.pins,creativeProposalId:v.creativeProposalId};
  const preview=await emitIntent({...input,previewOnly:true},{caller:"planning.prepare-option",operatorId});
  const o=record(preview.output),previewIntentId=string(o.previewIntentId);
  if(preview.status!=="OK"||!previewIntentId)return emptyReceipt(preview.status,preview.summary);
  const requirements=Array.isArray(o.missingPreconditions)?o.missingPreconditions.map(String):[];
  const block=string(o.materialBlock)??(requirements.length?"Préparation de la marque requise : "+requirements.join(", "):null);
  if(block)return {...emptyReceipt("BLOCKED",block),previewIntentId};
  const dispatched=await emitIntent({...input,previewOnly:false,previewIntentId},{caller:"planning.assign-option",operatorId});
  return (await existing()) ?? {...emptyReceipt(dispatched.status,dispatched.summary),previewIntentId};
}
