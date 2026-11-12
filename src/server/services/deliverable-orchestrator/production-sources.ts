/** Source selection is specific to this production; it never promotes a CANDIDATE to brand canon. */
import { isUsableGeneration } from "@/domain/generation-result";
import { readMixDecision } from "@/domain/production-mix";
import { db } from "@/lib/db";
import { checkLawTwoPreconditions } from "./preconditions";
import type { BrandAsset } from "@prisma/client";
import { listProductionPassagesInText, selectProductionPassages } from "@/domain/production-passages";
import { materialHandoffBlock, productionPins, productionSourceManifest, type ProductionPin, type ProductionSourceManifest } from "@/domain/production-sources";
import { sourceIsUsable } from "@/domain/source-document";
import { resolveBrandSource, sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";

const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
// Match the JSON actually persisted by PostgreSQL and restored by tRPC.
const hash = (value: unknown) => sourceFingerprint({rawData: JSON.parse(JSON.stringify(value))});
const contentText = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object" || !Object.keys(v).some(k => !k.startsWith("_"))) return "";
  if (!Array.isArray(v) && !isUsableGeneration(v)) return "";
  return JSON.stringify(Array.isArray(v) ? v : Object.fromEntries(Object.entries(v).filter(([key]) => !key.startsWith("_"))));
};
const textFileType = (mime: string | null, name: string) => {
  const suffix = name.match(/\.(txt|md|json|csv|pdf|docx|pptx|xlsx)$/i)?.[1]?.toUpperCase();
  if (suffix) return suffix;
  if (mime?.startsWith("text/")) return "TXT";
  return ({"application/pdf":"PDF","application/json":"JSON",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":"PPTX",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"XLSX"} as Record<string,string>)[mime ?? ""];
};

export function assertUsablePin(asset: { id: string; version: number; name: string; state: string; staleAt: Date | null; campaignId: string | null; metadata: unknown }, pin: ProductionPin, campaignId?: string) {
  const classification = object(object(asset.metadata)._sourceClassification);
  if (asset.version !== pin.version || ["ARCHIVED","SUPERSEDED","REJECTED"].includes(asset.state) || (asset.staleAt && asset.staleAt <= new Date())
    || ["ARCHIVED", "SUPERSEDED"].includes(String(classification.status))) {
    throw new Error(`Source à relire : ${asset.name} v${pin.version} a changé, est périmée ou archivée. Préparez un nouvel aperçu.`);
  }
  if (asset.campaignId && asset.campaignId !== campaignId) throw new Error("Cette source est réservée à une autre campagne.");
  if (asset.id !== pin.assetId) throw new Error("Source de production inaccessible.");
}

export async function readPinSourceText(strategyId: string, asset: Pick<BrandAsset,"id"|"name"|"content"|"metadata"|"mimeType">, role: ProductionPin["role"]) {
  const meta = object(asset.metadata), original = object(meta.original);
  if (Object.keys(original).length && original.state !== "STORED") throw new Error("Original non reçu : relisez la source.");
  const documentId = typeof meta.sourceDataSourceId === "string" ? meta.sourceDataSourceId : null;
  const doc = documentId ? await resolveBrandSource(documentId, strategyId) : null;
  if (doc && (!sourceIsUsable(doc.source.rawData) || doc.contentHash !== meta.sourceContentHash))
    throw new Error("Document retiré ou corrigé : relisez la source de production.");
  const originalHash = typeof original.contentHash === "string" ? original.contentHash : null;
  let text = contentText(asset.content);
  if (!text.trim() && doc?.source.rawContent) text = doc.source.rawContent;
  // Read only exact retained textual originals. Visual references are not transferred as pixels.
  const fileType = textFileType(asset.mimeType, asset.name);
  if (!text.trim() && fileType && originalHash && role !== "MATERIAL") {
    const { readAssetOriginal } = await import("@/server/services/brand-vault/original");
    const bytes = await readAssetOriginal(asset.id);
    if (!bytes || bytes.receipt.contentHash !== originalHash) throw new Error("L’original reçu diffère de la version sélectionnée.");
    const { extractReceivedFile } = await import("@/server/services/ingestion-pipeline/extractors");
    text = (await extractReceivedFile(fileType, bytes.bytes, strategyId)).text;
  }
  return {fullText: text, originalHash, documentId, documentHash: doc?.contentHash ?? null};
}
export async function listProductionPassages(strategyId: string, assetId: string, version: number, campaignId?: string) {
  const asset = await db.brandAsset.findFirst({where:{id:assetId,strategyId}});
  if (!asset) throw new Error("Source de production inaccessible dans cette marque.");
  assertUsablePin(asset, {assetId,version,role:"REFERENCE"}, campaignId);
  const {fullText} = await readPinSourceText(strategyId, asset, "REFERENCE");
  return {passages:listProductionPassagesInText(fullText),totalCharacters:fullText.length};
}

export async function resolveProductionSources(strategyId: string, selected: ProductionPin[], campaignId?: string, creativeProposalId?: string, calendarBrief?:{assetId:string;version:number}): Promise<ProductionSourceManifest> {
  const cal = calendarBrief ? await (await import("./calendar-production")).readCalendarBriefSource(strategyId,calendarBrief.assetId,calendarBrief.version):undefined;
  const master = cal?.artwork;
  let pins = productionPins.parse(selected);
  for(const source of cal?.sourcePins??[]){
    const selectedSame=pins.find(p=>p.assetId===source.assetId);
    if(selectedSame && hash(selectedSame)!==hash(source))throw new Error("Cette sélection contredit la version des sources du brief ; révisez la ligne avant de produire.");
    if(!selectedSame)pins=productionPins.parse([...pins,source]);
  }
  if(master) {
    const {assetId,version,photoLayerId,photoPolicy}=master;
    const same=pins.find(p=>p.assetId===assetId);
    if(same && (same.role!=="MATERIAL" || same.version!==version || same.artwork?.photoLayerId!==photoLayerId || same.artwork?.photoPolicy!==photoPolicy))
      throw new Error("La sélection contredit le master de la ligne du planning ; révisez la ligne pour le changer.");
    if(!same)pins=productionPins.parse([...pins,{assetId,version,role:"MATERIAL",artwork:{photoLayerId,photoPolicy}}]);
  }
  const campaign = campaignId ? await db.campaign.findFirst({ where: { id: campaignId, strategyId }, select: { routeKey: true } }) : null;
  if (campaignId && !campaign) throw new Error("Campagne inaccessible dans cette marque.");
  const rows = pins.length ? await db.brandAsset.findMany({ where: { strategyId, id: { in: pins.map(p=>p.assetId) } } }) : [];
  const sources = await Promise.all(pins.map(async pin => {
    const asset = rows.find(a => a.id === pin.assetId);
    if (!asset) throw new Error("Source de production inaccessible dans cette marque.");
    assertUsablePin(asset, pin, campaignId);
    const { fullText, originalHash, documentId, documentHash } = await readPinSourceText(strategyId, asset, pin.role);
    if(pin.artwork && (asset.mimeType!=="image/svg+xml" || !originalHash || (master && master.originalHash!==originalHash)))
      throw new Error("Le master SVG requis ne correspond pas à l’original versionné de cette ligne.");
    const text = pin.sections?.length ? selectProductionPassages(fullText, pin.sections) : fullText;
    if (!text.trim() && (pin.role === "COPY" || pin.role === "ART_DIRECTION"))
      throw new Error(`Aucun texte de ${pin.role === "COPY" ? "copie" : "direction artistique"} exploitable dans « ${asset.name} ». Choisissez une version contenant le texte retenu.`);
    if (text.length > 16000) throw new Error(`« ${asset.name} » est trop long pour ce brief. Retenez un extrait versionné ; aucun texte n’a été tronqué.`);
    const source = { ...pin, name: asset.name, kind: asset.kind, state: asset.state, text,
      transport: pin.artwork ? "ARTWORK_MASTER" as const : pin.role==="REFERENCE" && originalHash && /^(image\/(png|jpeg|webp))$/i.test(asset.mimeType??"") ? "IMAGE_REFERENCE" as const
        : text.trim() ? "TEXT" as const : "IDENTITY_ONLY" as const,
      originalHash, documentId, documentHash };
    return { ...source, fingerprint: hash({ ...source, fileUrl: asset.fileUrl, mediaVersion: asset.sourceAssetVersionId }) };
  }));
  // A validated direction is authoritative within its strategy/route. Never substitute a draft,
  // a candidate asset or the most recent among several validated alternatives.
  const proposals = await db.creativeProposal.findMany({ where: { strategyId, status: "VALIDATED",
    ...(creativeProposalId ? { id: creativeProposalId } : {}), ...(campaign?.routeKey ? { routeKey: campaign.routeKey } : {}) },
    take: 2, select: { id: true, routeKey: true, direction: true, updatedAt: true } });
  if (creativeProposalId && proposals.length !== 1) throw new Error("La proposition créative n'est plus validée pour cette marque et cette campagne.");
  if (proposals.length > 1) throw new Error("Plusieurs propositions créatives validées : choisissez la proposition à produire.");
  const proposal = proposals[0];
  const creativeProposal = proposal ? { id: proposal.id, routeKey: proposal.routeKey, direction: JSON.stringify(proposal.direction),
    revision: proposal.updatedAt.toISOString(), fingerprint: hash(proposal.direction) } : null;
  const artworkSource=sources.find(s=>s.transport==="ARTWORK_MASTER");
  const verifiedArtwork=artworkSource && {assetId:artworkSource.assetId,version:artworkSource.version,originalHash:artworkSource.originalHash,...artworkSource.artwork};
  const strategy=await db.strategy.findUnique({where:{id:strategyId},select:{manipulationMix:true}});
  const mix=readMixDecision(strategy?.manipulationMix);
  const manifest = productionSourceManifest.parse({ schema: "production-sources/v1", sources, creativeProposal,...(mix.primary ? {mixReview:{primary:mix.primary,version:mix.version}} : {}), ...(verifiedArtwork?{productionArtwork:verifiedArtwork}:{}) });
  if (JSON.stringify(manifest).length > 32000) throw new Error("Les sources dépassent la capacité du brief. Retenez des extraits versionnés ou moins de références.");
  return cal?{...manifest,calendarBrief:cal}:manifest;
}

export async function readProductionPreview(strategyId: string, previewIntentId: string) {
  const row = await db.intentEmission.findFirst({ where: { id: previewIntentId, strategyId, intentKind: "COMPOSE_DELIVERABLE", status: "OK" },
    select: { payload: true, result: true } });
  const payload = object(row?.payload), output = object(object(row?.result).output);
  const parsed = productionSourceManifest.safeParse(output.sourceManifest);
  if (!parsed.success || output.status !== "PREVIEW" || output.previewIntentId !== previewIntentId || typeof payload.targetKind !== "string")
    throw new Error("Aperçu de production inaccessible ou antérieur au suivi des versions. Préparez un nouvel aperçu.");
  const upstream = output.vaultMatches ?? object(output.composition).vaultMatches;
  return { previewIntentId, targetKind: payload.targetKind, upstreamSnapshot: Array.isArray(upstream) ? hash(upstream) : null, pins: productionPins.parse(payload.pins ?? []),
    campaignId: typeof payload.campaignId === "string" ? payload.campaignId : null,
    overrideManipulationMode: typeof payload.overrideManipulationMode === "string" ? payload.overrideManipulationMode : null,
    creativeProposalId: typeof payload.creativeProposalId === "string" ? payload.creativeProposalId : null,
    sourceManifest: parsed.data };
}
export function requireReviewedUpstream(snapshot: string | null, matches: unknown) {
  if (!snapshot || snapshot !== hash(matches)) throw new Error("Un brief amont a changé depuis l’aperçu. Recalculez la cascade pour relire les versions à utiliser.");
}
export function requireReviewedManifest(reviewed: ProductionSourceManifest, current: ProductionSourceManifest) {
  if (hash(reviewed) !== hash(current)) throw new Error("Une source ou la proposition créative a changé depuis l’aperçu. Relisez les versions et préparez un nouvel aperçu.");
}

/** A preview approves one production attempt. Serialize its claim before any provider
 * call; a crash or a refused provider cannot silently send the same work twice. */
const RUN_STEP = "production-source-launch";
export async function claimProductionPreview(strategyId: string, previewIntentId: string, dispatchIntentId: string | undefined, calendarBrief?:{assetId:string;version:number}) {
  if (!dispatchIntentId) throw new Error("Lancement sans reçu d'intention ; préparez un nouvel aperçu.");
  await db.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM "IntentEmission" WHERE id=${previewIntentId} AND "strategyId"=${strategyId} AND "intentKind"='COMPOSE_DELIVERABLE' AND status='OK' FOR UPDATE`;
    if (!rows.length) throw new Error("Aperçu introuvable dans cette marque.");
    if (await tx.intentEmissionEvent.findFirst({ where:{intentId:previewIntentId,stepName:RUN_STEP},select:{id:true} }))
      throw new Error("Cet aperçu a déjà été lancé. Rouvrez-le pour retrouver la tentative. Préparez un nouvel aperçu pour une nouvelle production.");
    if(calendarBrief){
      const [row]=await tx.$queryRaw<Array<{metadata:unknown,state:string,version:number}>>`SELECT metadata, state, version FROM "BrandAsset" WHERE id=${calendarBrief.assetId} AND "strategyId"=${strategyId} FOR UPDATE`;
      if(!row || row.version!==calendarBrief.version || ["ARCHIVED","SUPERSEDED","REJECTED"].includes(row.state))throw new Error("La version du brief a changé.");
      const metadata=object(row.metadata);
      if(metadata.generation)throw new Error("Cette piste a déjà été attribuée. Rouvrez son suivi.");
      await tx.brandAsset.update({where:{id:calendarBrief.assetId},data:{metadata:{...metadata,generation:{previewIntentId,dispatchIntentId,status:"ASSIGNED",message:"Piste attribuée à la production."}} as import("@prisma/client").Prisma.InputJsonValue}});
    }
    await tx.intentEmissionEvent.create({data:{intentId:previewIntentId,stepName:RUN_STEP,phase:"DISPATCHED",partial:{dispatchIntentId}}});
  });
}

async function previewDispatchReceipt(strategyId: string, previewIntentId: string) {
  const event = await db.intentEmissionEvent.findFirst({where:{intentId:previewIntentId,stepName:RUN_STEP,intent:{strategyId}},select:{partial:true}});
  const id = object(event?.partial).dispatchIntentId;
  if (typeof id !== "string") return null;
  const run = await db.intentEmission.findFirst({where:{id,strategyId,intentKind:"COMPOSE_DELIVERABLE"},select:{status:true,result:true}});
  if (!run) throw new Error("La tentative réservée n'est plus accessible ; vérifiez son suivi.");
  const output = object(object(run.result).output);
  const generativeTaskId = typeof output.generativeTaskId === "string" ? output.generativeTaskId : null;
  // The dispatch receipt can precede an asynchronous provider completion.
  // Poll the current task state, never a frozen IN_PROGRESS result or image bytes.
  const task = generativeTaskId ? await db.generativeTask.findFirst({
    where: { id: generativeTaskId, strategyId }, select: { status: true },
  }) : null;
  return {intentId:id,status:run.status,briefOutputId:typeof output.briefOutputId === "string" ? output.briefOutputId : null,
    generativeTaskId,
    materialStatus:task?.status ?? (typeof output.materialStatus === "string" ? output.materialStatus : null)};
}

/** Lightweight progress query. Full originals never transit a polling response. */
export async function productionProgress(strategyId:string, previewIntentId:string) {
  const run = await previewDispatchReceipt(strategyId, previewIntentId);
  if (!run) return null;
  const events = await db.intentEmissionEvent.findMany({where:{intentId:run.intentId,stepName:{startsWith:"upstream:"}}, orderBy:[{emittedAt:"asc"},{id:"asc"}],
    select:{stepName:true,phase:true,partial:true}});
  const latest = new Map<string,{kind:string; state:string; message:string|null}>();
  for (const event of events) {
    const kind = event.stepName!.slice("upstream:".length);
    const detail = object(event.partial);
    latest.set(kind,{kind, state:typeof detail.status==="string"?detail.status:event.phase, message:typeof detail.message==="string"?detail.message:null});
  }
  return {...run,steps:Array.from(latest.values())};
}

// Reopen may not return copied text if the source's authorization or version has since changed.
export async function getCurrentProductionPreview(strategyId: string, previewIntentId: string) {
  const missingPreconditions = await checkLawTwoPreconditions(strategyId);
  if (missingPreconditions.includes("STRATEGY_ARCHIVED") || missingPreconditions.includes("STRATEGY_NOT_FOUND")) throw new Error("La marque n’est pas disponible pour la production.");
  const preview = await readProductionPreview(strategyId, previewIntentId);
  const now = await resolveProductionSources(strategyId, preview.pins, preview.campaignId ?? undefined, preview.creativeProposalId ?? undefined, preview.sourceManifest.calendarBrief);
  requireReviewedManifest(preview.sourceManifest, now);
  return { ...preview, missingPreconditions, materialBlock: materialHandoffBlock(now), dispatchReceipt: await previewDispatchReceipt(strategyId, previewIntentId) };
}
