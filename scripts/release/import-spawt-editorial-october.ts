/** Only the historical version from Drive. No jobs, AI call, publication or schedule.
 * --bundle DIR --strategy ID [--actor ID --apply]. Default is a read-only plan. */
import {readFileSync,writeFileSync,mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import { ACTIVE_CALENDAR_TOOL, HISTORICAL_CALENDAR_TOOL, CALENDAR_TOOLS, calendarPosts, linkUniqueSourcePost } from "@/domain/calendar-editions";
import {resolve} from "node:path";
import {createHash} from "node:crypto";
import {db} from "@/lib/db";
import {brandVaultRouter} from "@/server/trpc/routers/brand-vault";
import {canAccessStrategy,getOperatorContext} from "@/server/services/operator-isolation";
import {readAssetOriginal} from "@/server/services/brand-vault/original";
import {inspectArtworkMaster} from "@/server/services/ptah/artwork-master";
import type {Context} from "@/server/trpc/context";
import type {Prisma} from "@prisma/client";
const target="spawt-strategy-001", operator="cmq9imnwt0000abab3adjeibi";
const folder="1X0g3gxR14DYBLPFBWt93kHvfIt6g1l8U",archive="1ksMqGZeQvgeLzkytkcF6QkmDSXWKA3CD",edition="drive:spawt:2026-10-20:v7-photo-et-typographie";
const originals=[
 {path:"masters/manifest.json",name:"SPAWT · manifeste éditorial réel du 20 octobre · v7.json",hash:"df6a75a299f012fd2f0545e7e24a91d01d31fa8a6c9c75898ac3db58fbad3144",mime:"application/json",type:"DOCUMENT" as const},
 {path:"masters/Post.svg",name:"SPAWT · master éditable du 20 octobre · Post v7.svg",hash:"4e18b6c83ae133b4fd70a2fd397f8a49a605013fa87354f123d71f6005b46729",mime:"image/svg+xml",type:"IMAGE" as const},
 {path:"masters/Story.svg",name:"SPAWT · master éditable du 20 octobre · Story v7.svg",hash:"fc452998acff1a3e69320457ce3c185632fe348d2811c340fa17fca7fd904f08",mime:"image/svg+xml",type:"IMAGE" as const},
 {path:"photo-du-master.png",name:"SPAWT · photographie embarquée du duel du 20 octobre · v7.png",hash:"9b33086fc48951eb2075518bbb59362e6e66396cfca482f71b65c954265f80d0",mime:"image/png",type:"IMAGE" as const}
];
const digest=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const arg=(name:string)=>{const i=process.argv.indexOf("--"+name);return i>0?process.argv[i+1]:undefined};
async function run(){
 const apply=process.argv.includes("--apply"),bundle=arg("bundle");
 if(!bundle||arg("strategy")!==target)throw Error("Indiquer le dossier des quatre originaux et l’identifiant exact de la véritable marque SPAWT.");
 const files=originals.map(f=>{const bytes=readFileSync(resolve(bundle,f.path));if(digest(bytes)!==f.hash)throw Error("Empreinte non conforme : "+f.path);return {...f,bytes}});
 const manifest=JSON.parse(files[0]!.bytes.toString("utf8"));if(manifest.date!=="2026-10-20"||manifest.status!=="Final à valider"||manifest.scheduled!==false||manifest.published!==false||typeof manifest.caption!=="string"||!manifest.caption.trim())throw Error("État du manifeste incompatible.");
 for(const format of ["Post","Story"]){const f=files.find(x=>x.path.endsWith("/"+format+".svg"))!;const spec=inspectArtworkMaster(f.bytes);if(!spec.imageLayers.some(l=>l.id==="food-photography")||spec.width!==manifest.formats[format][0]||spec.height!==manifest.formats[format][1])throw Error("Master et manifeste en conflit.");}
 const strategy=await db.strategy.findUniqueOrThrow({where:{id:target},select:{id:true,name:true,userId:true,operatorId:true,status:true,archivedAt:true}});
 const node=await db.brandNode.findFirst({where:{slug:"spawt",strategyId:target,operatorId:operator,archivedAt:null},select:{id:true}});
 if(!node||strategy.operatorId!==operator||strategy.archivedAt||["DELETED","ARCHIVED"].includes(strategy.status))throw Error("Impossible de confirmer la marque SPAWT, son opérateur et son nœud de portefeuille.");
 const calendars=await db.gloryOutput.findMany({where:{strategyId:target,toolSlug:{in:CALENDAR_TOOLS}},orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,toolSlug:true,createdAt:true,updatedAt:true,output:true}});
 const active=calendars.find(row=>row.toolSlug===ACTIVE_CALENDAR_TOOL);
 const sourcePosts=["Post","Story"].map(format=>({date:manifest.date,platform:"Instagram",format,caption:manifest.caption}));
 const activePosts=calendarPosts(active?.output);
 const matchedPosts=activePosts.flatMap((_,index)=>linkUniqueSourcePost(activePosts,index,sourcePosts) ? [index] : []);
 const seen=await Promise.all(files.map(async f=>{
  const rows=await db.brandAsset.findMany({where:{strategyId:target,metadata:{path:["original","contentHash"],equals:f.hash}},select:{id:true,state:true,version:true,staleAt:true,mimeType:true,metadata:true}});
  const used=rows.filter(a=>!["ARCHIVED","REJECTED","SUPERSEDED"].includes(a.state)&&(!a.staleAt||a.staleAt>new Date())&&a.mimeType===f.mime && (a.metadata as any)?.original?.state==="STORED");
  if(rows.length && used.length!==1)throw Error("Original existant ambigu, retiré ou non reçu : "+f.path+" ; aucun remaniement autorisé.");
  if(used[0]){const local=await readAssetOriginal(used[0].id);if(!local||digest(local.bytes)!==f.hash)throw Error("Octets existants non vérifiés : "+f.path);}
  return used[0]??null;
 }));
 const found=calendars.find(c=>(c.output as any)?.sourceEdition===edition);
 const report={mode:apply?"apply":"plan",strategy:{id:target,name:strategy.name,operatorId:strategy.operatorId,portfolioNode:node.id},
  originals:files.map((file,index)=>({path:file.path,sha256:file.hash,action:seen[index]?"reuse":"import",id:seen[index]?.id??null})),
  calendar:found?"edition_already_present":active?"add_separate_historical_edition":"create_historical_edition",existingActiveCalendar:active?.id??null,
  existingActivePostCount:activePosts.length,matchedActivePostIndexes:matchedPosts,published:false,scheduled:false};
 console.log(JSON.stringify(report));
 if(!apply)return;
 const actorId=arg("actor");if(!actorId)throw Error("L’identifiant explicite de l’opérateur autorisé est obligatoire.");
 const actor=await db.user.findUniqueOrThrow({where:{id:actorId}});
 const authority=await getOperatorContext(actor.id);
 if(!await canAccessStrategy(target,authority))throw Error("Cet opérateur ne peut déposer dans cette marque.");
 const snapshot=arg("snapshot")??resolve(mkdtempSync(resolve(tmpdir(),"spawt-reprise-")),"planning-avant-import.json");
 writeFileSync(snapshot,JSON.stringify({strategy,portfolioNode:node,calendars,assets:seen,edition,observedAt:new Date().toISOString()},null,2),{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({mode:"snapshot",file:snapshot}));
 const ctx={db,headers:new Headers(),session:{user:{id:actor.id,email:actor.email,role:authority.role,operatorId:actor.operatorId},expires:new Date(Date.now()+60_000).toISOString()}} as Context;
 const vault=brandVaultRouter.createCaller(ctx),received=[];
 for(const [i,file] of files.entries()){
  const existing=seen[i];
  const id=existing?.id??(await vault.create({strategyId:target,name:file.name,type:file.type,file:{name:file.path.split("/").at(-1)!,mimeType:file.mime,content:file.bytes.toString("base64")}})).id;
  const a=await db.brandAsset.findFirstOrThrow({where:{id,strategyId:target}});
  const actual=await readAssetOriginal(a.id);if(!actual||digest(actual.bytes)!==file.hash)throw Error("Original non reçu : "+file.path);
  received.push({assetId:a.id,version:a.version,originalHash:file.hash});
 }
 const final=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${target} FOR UPDATE`;
  const current=await tx.gloryOutput.findMany({where:{strategyId:target,toolSlug:{in:CALENDAR_TOOLS}},orderBy:[{createdAt:"desc"},{id:"desc"}],select:{id:true,toolSlug:true,updatedAt:true,output:true}});
  const same=current.find(row=>(row.output as any)?.sourceEdition===edition);
  if(same)return {action:"reuse",id:same.id};
  const currentActive=current.find(row=>row.toolSlug===ACTIVE_CALENDAR_TOOL);
  if((active?.id??null)!==(currentActive?.id??null)||active?.updatedAt.getTime()!==currentActive?.updatedAt.getTime())throw Error("Le planning actif a changé. Relire le plan et l’instantané avant de reprendre.");
  const postRefs=[{assetId:received[0]!.assetId,version:received[0]!.version,role:"REFERENCE"},{assetId:received[3]!.assetId,version:received[3]!.version,role:"REFERENCE"}];
  const output={sourceEdition:edition,editionLabel:"Duel du 20 octobre 2026 · Post et Story",relatedActiveCalendar:active?.id??null,matchedActivePostIndexes:matchedPosts,brand:strategy.name,source:{folder,archive,version:manifest.version,manifestSha256:files[0]!.hash,sourceMembers:files.map((f,i)=>({path:f.path,sha256:f.hash,assetId:received[i]!.assetId})),scope:manifest.correction_scope},published:false,scheduled:false,posts:["Post","Story"].map((f,i)=>({date:manifest.date,weekday:"mardi",platform:"Instagram",format:f,theme:"Duel du 20 octobre · Tu y retournes ou tu changes ?",angle:"Mon spot habituel ou un nouveau spot",creativeFamily:"duel",caption:manifest.caption,status:manifest.status,illustration:"Steak-frites et ramen sur une table lumineuse. Les deux tickets restent statiques.",productionArtwork:{...received[i+1]!,photoLayerId:"food-photography",photoPolicy:"LOCKED_MASTER"},productionSources:postRefs}))};
  const row=await tx.gloryOutput.create({data:{strategyId:target,toolSlug:currentActive?HISTORICAL_CALENDAR_TOOL:ACTIVE_CALENDAR_TOOL,output:output as Prisma.InputJsonValue,advertis_vector:{}}});return {action:"created",id:row.id};
 });console.log(JSON.stringify({mode:"received",originals:received,calendar:final,published:false,scheduled:false}));
}
run().catch(e=>{console.error(e instanceof Error?e.message:"Transposition refusée.");process.exitCode=1;}).finally(()=>db.$disconnect());
