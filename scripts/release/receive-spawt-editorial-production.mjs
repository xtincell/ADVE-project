/** Run locally with an existing Playwright storage state for the authorized operator.
 * Default is read-only. Each write stage is explicit and targets a single edition. */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseArgs } from "node:util";

const {values} = parseArgs({options:{
  session:{type:"string"},stage:{type:"string",default:"inspect"},edition:{type:"string"},
  format:{type:"string"},option:{type:"string"},direction:{type:"string"},receipt:{type:"string"},origin:{type:"string",default:"https://powerupgraders.com"}
}});
const strategyId="spawt-strategy-001", operatorId="cmq9imnwt0000abab3adjeibi";
const stage=values.stage;
if(!["inspect","prepare","new-photo","produce","verify"].includes(stage))throw Error("Étape inconnue.");
if(!values.session||!values.receipt)throw Error("--session ET --receipt requis. La session doit être celle d’un opérateur déjà connecté.");
const origin=new URL(values.origin);
if(!((origin.origin==="https://powerupgraders.com")||(origin.protocol==="http:"&&["localhost","127.0.0.1"].includes(origin.hostname))))throw Error("Origine refusée.");
if((statSync(values.session).mode & 0o077)!==0)throw Error("Le fichier de session local doit être privé (mode 600).");
const jar=JSON.parse(readFileSync(values.session,"utf8"));
const cookies = jar.url === origin.origin && typeof jar.name === "string" && typeof jar.value === "string"
  ? [{ domain: origin.hostname, name: jar.name, value: jar.value }] : (jar.cookies ?? []);
const cookie=cookies.filter(c=>c.domain.replace(/^\./,"")===origin.hostname && (!c.expires||c.expires<0||c.expires>Date.now()/1000) && /(?:__Secure-)?(?:authjs|next-auth)\.session-token(?:\.\d+)?$/.test(c.name)).map(c=>c.name+"="+c.value).join("; ");
if(!cookie)throw Error("Aucune session autorisée pour cet hôte.");
const report={stage,origin:origin.origin,strategyId,startedAt:new Date().toISOString(),steps:[],writes:[],images:[]};
const checkpoint=()=>writeFileSync(values.receipt,JSON.stringify(report,null,2),{mode:0o600});
function guard(condition,msg){if(!condition)throw Error(msg);}
async function api(path,input,write=false){
  const url=new URL("/api/trpc/"+path,origin);const wire=JSON.stringify({json:input});
  if(!write)url.searchParams.set("input",wire);
  const res=await fetch(url,{method:write?"POST":"GET",redirect:"error",headers:{cookie,"content-type":"application/json"},...(write?{body:wire}:{}),signal:AbortSignal.timeout(write?720000:40000)});
  const body=await res.json();
  guard(res.ok&&body.result,"Requête "+path+" refusée (HTTP "+res.status+", "+(body.error?.json?.data?.code??"absence de résultat")+").");
  return body.result.data?.json;
}
const log=(step,data={})=>{report.steps.push({step,...data});checkpoint();};
async function run(){
  // No operator action is fabricated; the actual production permissions must admit the session.
  const brand=await api("strategy.get",{id:strategyId});
  guard(brand.id===strategyId && brand.operatorId===operatorId,"Le dossier et l’opérateur ne correspondent pas.");
  const mode=brand.manipulationMix?.primary??null;const weights=Object.fromEntries(["peddler","dealer","facilitator","entertainer"].filter(k=>typeof brand.manipulationMix?.[k]==="number").map(k=>[k,brand.manipulationMix[k]]));
  log("marque accessible",{principal:mode,weights});
  const active=await api("glory.launchCalendar",{strategyId});
  const candidate=values.edition ? active.editions?.find(item=>item.id===values.edition) : active.editions?.find(item=>item.label==="Duel du 20 octobre 2026 · Post et Story");
  guard(candidate,"L’édition demandée n’est pas encore disponible pour cette marque.");
  const editionId=candidate.id;const scope={strategyId,editionId};
  const selected=await api("glory.launchCalendar",scope);
  let rows=await api("deliverableOrchestrator.calendarProductionRows",scope);
  const docket=()=>rows.rows.filter(row=>row.origin==="STORED" && row.post.date==="2026-10-20" && row.post.platform?.toLowerCase()==="instagram");
  guard(docket().length===2&&["Post","Story"].every(f=>docket().filter(x=>x.post.format===f).length===1),"Les deux originaux datés ne sont pas déterminés de façon unique.");
  guard(new Set(docket().map(x=>x.post.caption)).size===1 && docket()[0].post.caption,"La légende exacte n’est pas commune aux deux formats.");
  log("sélection du planning",{activeCalendar:active.activeCalendarId,activePosts:active.calendar?.posts?.length??0,editionId,editionLabel:candidate.label,editionPosts:selected.calendar?.posts?.length??0,version:rows.calendarVersion});
  if(stage==="inspect"){report.eligibleForDispatch=Boolean(mode);return;}
  guard(mode,"Mode principal absent. Renseigner le mix depuis les fondations avant toute écriture de recette.");
  if(stage==="prepare"){
    const prep=await api("deliverableOrchestrator.prepareCalendarBriefs",{...scope,calendarVersion:rows.calendarVersion,postKeys:docket().map(p=>p.key),optionsPerPost:2},true);
    guard(prep.rows.every(row=>!row.error&&row.briefs.length===2),"Les quatre briefs n’ont pas tous été reçus.");
    report.writes.push({step:"préparation des briefs",ids:prep.rows.flatMap(row=>row.briefs.map(b=>b.assetId))});checkpoint();
    rows=await api("deliverableOrchestrator.calendarProductionRows",scope);
  }
  const frozen=[];
  for(const post of docket()){
    guard(post.briefs.length===2,"Préparer deux options pour chaque format.");
    for(const b of post.briefs){
      const asset=await api("brandVault.get",{id:b.assetId});
      guard(asset.strategyId===strategyId && asset.version===b.version && asset.sourceGloryOutputId===editionId && asset.metadata?.key===post.key && asset.content?.calendarVersion===rows.calendarVersion,"Brief incohérent.");
      const body=asset.content;
      guard(body?.post?.caption===post.post.caption&&body?.artwork?.originalHash,"La légende ou le master manque dans le brief.");
      frozen.push({format:post.post.format,variant:b.variant,assetId:b.assetId,version:b.version,policy:body.artwork.photoPolicy,originalHash:body.artwork.originalHash,generation:b.generation});
    }
  }
  log("relecture des quatre briefs",{briefs:frozen.map(({generation,...b})=>({...b,status:generation?.status??"PREPARED"}))});
  if(stage==="prepare")return;
  if(stage==="new-photo"){
    const chosen=frozen.find(b=>b.format===values.format&&b.variant===Number(values.option));
    guard(chosen && chosen.variant===1 && values.direction?.trim(),"Une nouvelle photo requiert la piste 1, le format et --direction.");
    const line=docket().find(row=>row.post.format===chosen.format);
    const existing=await api("brandVault.get",{id:chosen.assetId});
    if(existing.content?.newProposal?.instruction===values.direction.trim()){log("proposition déjà préparée",{assetId:chosen.assetId});return;}
    const result=await api("deliverableOrchestrator.prepareCalendarBriefs",{...scope,calendarVersion:rows.calendarVersion,postKeys:[line.key],optionsPerPost:2,newProposal:{assetId:chosen.assetId,version:chosen.version,instruction:values.direction.trim()}},true);
    const replacement=result.rows?.[0]?.briefs?.[0];guard(replacement&&!result.rows[0].error,"La nouvelle proposition n’a pas été reçue.");
    const read=await api("deliverableOrchestrator.getCalendarBrief",{strategyId,assetId:replacement.assetId,version:replacement.version});
    const snap=JSON.parse(read.text);guard(snap.artwork?.photoPolicy==="GENERATED_CANDIDATE" && snap.artwork.originalHash===chosen.originalHash && snap.newProposal?.instruction===values.direction.trim(),"La demande n’est pas scellée sur le bon master.");
    report.writes.push({step:"nouvelle proposition à partir du master",assetId:replacement.assetId,version:replacement.version});return;
  }
  if(stage==="produce"){
    const chosen=frozen.find(b=>b.format===values.format&&b.variant===Number(values.option));
    guard(chosen,"Indiquer --format Post|Story et --option 1|2.");
    if(chosen.variant===1)guard(chosen.policy==="GENERATED_CANDIDATE","Le master historique verrouille la photo : préparer explicitement une nouvelle proposition avec --stage new-photo et --direction avant l’option 1.");
    if(chosen.variant===2&&chosen.policy!=="LOCKED_MASTER"){
      const line=docket().find(row=>row.post.format===chosen.format);
      const prep=await api("deliverableOrchestrator.prepareCalendarBriefs",{...scope,calendarVersion:rows.calendarVersion,postKeys:[line.key],optionsPerPost:1,correction:{assetId:chosen.assetId,version:chosen.version,instruction:"Restituer la photographie incorporée et les calques du master source.",photoPolicy:"LOCKED_MASTER"}},true);
      const revised=prep.rows?.[0]?.briefs?.[0];guard(revised&&!prep.rows[0].error,"La restitution de l’original n’a pas été reçue.");
      Object.assign(chosen,{assetId:revised.assetId,version:revised.version,policy:"LOCKED_MASTER",generation:revised.generation});
      report.writes.push({step:"verrouillage de la seule option 2",assetId:revised.assetId});checkpoint();
    }
    if(!chosen.generation?.dispatchIntentId){
      const result=await api("deliverableOrchestrator.produceCalendarBrief",{strategyId,assetId:chosen.assetId,version:chosen.version},true);
      report.writes.push({step:"génération",format:chosen.format,variant:chosen.variant,briefId:chosen.assetId,taskId:result.generativeTaskId,status:result.status});checkpoint();
    }
    rows=await api("deliverableOrchestrator.calendarProductionRows",scope);
  }
  for(const post of docket())for(const brief of post.briefs){
    const rec=brief.generation;
    if(!rec?.generativeTaskId)continue;
    const task=await api("ptah.getForge",{taskId:rec.generativeTaskId});
    guard(task?.strategyId===strategyId&&task.sourceBrandAssetId===brief.assetId,"La tâche ne correspond pas au brief sélectionné.");
    for(const img of rec.materialVersions??[]){
      if(img.status!=="FILE_STORED"&&img.status!=="FILE_ARCHIVED")continue;
      guard(img.url==="/api/production/image/"+img.id,"URL de version inattendue.");
      const res=await fetch(new URL(img.url,origin),{headers:{cookie},redirect:"error",signal:AbortSignal.timeout(45000)});
      guard(res.ok,"Image non relue.");
      const bytes=Buffer.from(await res.arrayBuffer());guard(bytes.subarray(0,8).toString("hex")==="89504e470d0a1a0a","La version n’est pas le PNG final.");
      const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
      guard(w===1080&&h===(post.post.format==="Story"?1920:1080),"Dimensions finales incorrectes.");
      report.images.push({format:post.post.format,option:brief.variant,provider:task.provider,model:task.providerModel,brief:brief.assetId,version:brief.version,task:task.id,image:img.id,url:img.url,master:task.parameters?.productionArtwork,sha256:createHash("sha256").update(bytes).digest("hex"),bytes:bytes.length,width:w,height:h});
    }
  }
  if(stage==="verify"){
    guard(report.images.length===4&&new Set(report.images.map(i=>i.sha256)).size===4,"Quatre PNG distincts ne sont pas reçus.");
    guard(report.images.every(i=>i.option===1?i.provider==="openai"&&i.master?.photoPolicy==="GENERATED_CANDIDATE":i.provider==="master"&&i.master?.photoPolicy==="LOCKED_MASTER"),"Les origines des quatre visuels n’ont pas été confirmées.");
  }
}
try{await run();report.status="RECEIVED";}
catch(e){report.status="BLOCKED";report.message=e.message;process.exitCode=1;}
report.finishedAt=new Date().toISOString();checkpoint();console.log(JSON.stringify({status:report.status,step:stage,images:report.images.length,message:report.message??null,file:values.receipt}));
