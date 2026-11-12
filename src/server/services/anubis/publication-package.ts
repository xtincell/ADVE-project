/** Anubis prepares transmission; the existing vault owns immutable versions. */
import { Prisma, type BrandAsset } from "@prisma/client";
import { db } from "@/lib/db";
import { SOCIAL_PUBLICATION_PACKAGE, prepareSocialPublication, socialPublicationContent, type PrepareSocialPublication } from "@/domain/social-publication-package";
import { canAccessStrategy, getOperatorContext } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "@/server/governance/collaborator-firewall";
import { readCalendarBriefSource } from "@/server/services/deliverable-orchestrator/calendar-production";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { encodePublicationImage, publicationPlacement, readReceivedImage } from "./publication-media";

const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const fingerprint = (v: unknown) => sourceFingerprint({ rawData: v });
const json = (v: unknown) => v as Prisma.InputJsonValue;
const kind = "ANUBIS_PREPARE_SOCIAL_POST";

async function assertActor(strategyId: string, userId: string, tx: Prisma.TransactionClient, write: boolean) {
  const actor = await getOperatorContext(userId, tx);
  if (!await canAccessStrategy(strategyId, actor, tx)) throw new Error("Accès à cette marque refusé.");
  if (write) await assertCollaboratorMayEmit({ userId, role: actor.role, strategyId, kind }, tx);
}

function view(asset: BrandAsset, actionId: string, current: boolean, issue: string | null) {
  const content = socialPublicationContent.parse(asset.content), meta = record(asset.metadata);
  const review = record(meta.editorialReview);
  const hash = fingerprint(content);
  return { id: asset.id, version: asset.version, contentHash: hash, content, actionId, current,
    selectedAt: asset.selectedAt, selectedById: asset.selectedById,
    review: review.contentHash === hash && typeof review.userId === "string" && typeof review.reviewedAt === "string"
      ? { userId: review.userId, reviewedAt: review.reviewedAt } : null,
    issue, previewUrl: `/api/production/publication/${encodeURIComponent(asset.id)}` };
}

async function assertCurrentSources(asset: BrandAsset, client: Prisma.TransactionClient = db) {
  const content = socialPublicationContent.parse(asset.content);
  const brief = await readCalendarBriefSource(asset.strategyId, content.brief.id, content.brief.version, client);
  if (brief.fingerprint !== content.brief.contentHash) throw new Error("Le brief a changé : préparez une nouvelle version.");
  const material = await client.assetVersion.findFirst({ where: { id: content.material.id, strategyId: asset.strategyId,
    generativeTaskId: content.material.taskId }, include: { generativeTask: true } });
  if (!material || material.generativeTask?.sourceBrandAssetId !== content.brief.id) throw new Error("La filiation du visuel a changé.");
  const received = await readReceivedImage(material);
  if (received.contentHash !== content.material.contentHash) throw new Error("Le fichier relu a changé : nouvelle relecture requise.");
  const delivery = await encodePublicationImage(received.bytes);
  if (delivery.contentHash !== content.delivery.contentHash) throw new Error("L’export relu a changé : nouvelle relecture requise.");
  return delivery;
}

export async function getPublicationPackage(strategyId: string, packageId: string, userId: string) {
  await assertActor(strategyId, userId, db, false);
  const asset = await db.brandAsset.findFirst({ where: { id: packageId, strategyId, format: SOCIAL_PUBLICATION_PACKAGE } });
  if (!asset) throw new Error("Paquet de publication introuvable.");
  const meta = record(asset.metadata);
  const action = await db.brandAction.findFirst({ where: { strategyId, id: String(meta.actionId) } });
  const current = record(action?.metadata).publicationPackageId === asset.id;
  let issue = current ? null : "Une autre version a été retenue pour cette publication.";
  if (current) { try { await assertCurrentSources(asset); } catch (e) { issue = e instanceof Error ? e.message : "Sources à réexaminer."; } }
  const destinations = await db.socialConnection.findMany({ where: { strategyId, status: "ACTIVE", platform: { in: ["FACEBOOK", "INSTAGRAM"] } },
    select: { id: true, platform: true, accountId: true, accountName: true } });
  return { ...view(asset, action?.id ?? "", current, issue), actionStatus: action?.status ?? null, destinations };
}

export async function listPublicationPackages(strategyId: string, userId: string) {
  await assertActor(strategyId, userId, db, false);
  const actions = await db.brandAction.findMany({ where: { strategyId, source: "CALENDAR_PRODUCTION" }, orderBy: { updatedAt: "desc" }, take: 100 });
  const ids = actions.flatMap(a => typeof record(a.metadata).publicationPackageId === "string" ? [String(record(a.metadata).publicationPackageId)] : []);
  const assets = await db.brandAsset.findMany({ where: { strategyId, id: { in: ids }, format: SOCIAL_PUBLICATION_PACKAGE } });
  return assets.flatMap(asset => {
    const parsed = socialPublicationContent.safeParse(asset.content);
    if (!parsed.success) return [];
    const action = actions.find(a => record(a.metadata).publicationPackageId === asset.id)!;
    return [{ id: asset.id, name: asset.name, version: asset.version, briefId: parsed.data.brief.id,
      materialId: parsed.data.material.id, status: action.status,
      reviewed: record(record(asset.metadata).editorialReview).contentHash === fingerprint(parsed.data) }];
  });
}

export async function preparePublicationPackage(raw: PrepareSocialPublication, userId: string, intentId: string) {
  const input = prepareSocialPublication.parse(raw);
  await assertActor(input.strategyId, userId, db, true);
  // Material decoding and source checks precede the short transactional write.
  if (input.operation === "REVIEW") {
    const asset = await db.brandAsset.findFirst({ where: { id: input.packageId, strategyId: input.strategyId, format: SOCIAL_PUBLICATION_PACKAGE } });
    if (!asset || fingerprint(asset.content) !== input.contentHash) throw new Error("La version à relire a changé.");
    await assertCurrentSources(asset);
    return db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${input.strategyId} FOR UPDATE`;
      await assertActor(input.strategyId, userId, tx, true);
      const current = await tx.brandAsset.findUniqueOrThrow({ where: { id: asset.id } });
      await assertCurrentSources(current, tx);
      const meta = record(current.metadata), action = await tx.brandAction.findFirst({ where: { id: String(meta.actionId), strategyId: input.strategyId } });
      if (!action || record(action.metadata).publicationPackageId !== current.id || fingerprint(current.content) !== input.contentHash || !["DRAFT", "ACCEPTED"].includes(action.status))
        throw new Error("La sélection a changé. Rouvrez la publication avant de la valider.");
      if (record(meta.editorialReview).contentHash !== input.contentHash) {
        await tx.brandAsset.update({ where: { id: current.id }, data: { state: "ACTIVE", metadata: json({ ...meta,
          editorialReview: { userId, reviewedAt: new Date().toISOString(), contentHash: input.contentHash, intentId } }) } });
        await tx.brandAction.update({ where: { id: action.id }, data: { status: "ACCEPTED" } });
      }
      return { packageId: current.id, actionId: action.id, version: current.version };
    }, { isolationLevel: "Serializable", timeout: 25000 });
  }

  const proof = await readCalendarBriefSource(input.strategyId, input.briefId, input.briefVersion);
  const brief = await db.brandAsset.findFirstOrThrow({ where: { id: input.briefId, strategyId: input.strategyId, version: input.briefVersion } });
  const material = await db.assetVersion.findFirst({ where: { id: input.assetVersionId, strategyId: input.strategyId,
    kind: { in: ["image", "design", "icon"] } }, include: { generativeTask: true } });
  const task = material?.generativeTask;
  if (!material || !task || task.strategyId !== input.strategyId || task.sourceBrandAssetId !== brief.id || task.status !== "COMPLETED")
    throw new Error("Ce rendu reçu ne provient pas de cette version du brief.");
  const image = await readReceivedImage(material);
  const { bytes: _deliveryBytes, ...delivery } = await encodePublicationImage(image.bytes);
  const body = record(brief.content), meta = record(brief.metadata), post = record(body.post);
  if (!brief.sourceGloryOutputId || typeof post.caption !== "string") throw new Error("La légende ou le calendrier source manque.");
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.filter((v): v is string => typeof v === "string") : [];
  const content = socialPublicationContent.parse({ schema: SOCIAL_PUBLICATION_PACKAGE,
    calendar: { sourceId: brief.sourceGloryOutputId, version: meta.calendarVersion, postKey: meta.key, origin: body.origin,
      date: typeof post.date === "string" ? post.date : null },
    brief: { id: brief.id, version: brief.version, contentHash: proof.fingerprint },
    material: { id: material.id, taskId: task.id, contentHash: image.contentHash, width: image.width, height: image.height,
      author: { provider: task.provider, model: task.providerModel, generatedAt: material.createdAt.toISOString() } },
    delivery: { ...delivery, placement: publicationPlacement(typeof post.format === "string" ? post.format : null) },
    platform: post.platform, format: typeof post.format === "string" ? post.format : null,
    caption: post.caption, hashtags, publicationText: post.caption + (hashtags.length ? `\n\n${hashtags.join(" ")}` : "") });
  const key = `calendar-publication:${brief.sourceGloryOutputId}:${String(meta.key)}`;
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${input.strategyId} FOR UPDATE`;
    await assertActor(input.strategyId, userId, tx, true);
    const currentProof = await readCalendarBriefSource(input.strategyId, input.briefId, input.briefVersion, tx);
    if (currentProof.fingerprint !== proof.fingerprint) throw new Error("Le brief a changé pendant la sélection.");
    const currentMaterial = await tx.assetVersion.findUniqueOrThrow({ where: { id: material.id }, include: { generativeTask: true } });
    if (currentMaterial.generativeTask?.sourceBrandAssetId !== brief.id || currentMaterial.generativeTask?.status !== "COMPLETED" || (await readReceivedImage(currentMaterial)).contentHash !== image.contentHash) throw new Error("Le rendu a changé pendant la sélection.");
    const lockedBrief = await tx.brandAsset.findUniqueOrThrow({ where: { id: brief.id } });
    if (fingerprint(lockedBrief.content) !== proof.fingerprint || ["SUPERSEDED", "REJECTED", "ARCHIVED"].includes(lockedBrief.state)) throw new Error("Le brief a changé pendant la sélection.");
    let action = await tx.brandAction.findUnique({ where: { strategyId_sourceInitiativeId: { strategyId: input.strategyId, sourceInitiativeId: key } } });
    const previousId = record(action?.metadata).publicationPackageId;
    const previous = typeof previousId === "string" ? await tx.brandAsset.findUnique({ where: { id: previousId } }) : null;
    if (previous && fingerprint(previous.content) === fingerprint(content)) return { packageId: previous.id, actionId: action!.id, version: previous.version };
    if (action && !["DRAFT", "ACCEPTED"].includes(action.status)) throw new Error("Cet envoi est planifié ou déjà pris en charge ; conservez son contenu.");
    if (!action) action = await tx.brandAction.create({ data: { strategyId: input.strategyId, sourceInitiativeId: key,
      title: `Publication : ${String(post.theme ?? brief.name).slice(0, 150)}`, description: content.publicationText,
      source: "CALENDAR_PRODUCTION", touchpoint: "DIGITAL", status: "DRAFT", selected: true } });
    const selectedAt = new Date();
    const packet = await tx.brandAsset.create({ data: { strategyId: input.strategyId, operatorId: brief.operatorId,
      name: action.title, kind: "SOCIAL_COPY", family: "HYBRID", format: SOCIAL_PUBLICATION_PACKAGE,
      state: "SELECTED", content: json(content), sourceIntentId: intentId, sourceGloryOutputId: brief.sourceGloryOutputId,
      sourceAssetVersionId: material.id, version: (previous?.version ?? 0) + 1, parentBrandAssetId: previous?.id,
      selectedById: userId, selectedAt, metadata: { actionId: action.id, contentHash: fingerprint(content) } } });
    if (previous) await tx.brandAsset.update({ where: { id: previous.id }, data: { state: "SUPERSEDED", supersededById: packet.id,
      supersededAt: selectedAt, supersededReason: "Une autre option a été retenue pour cette publication." } });
    await tx.brandAction.update({ where: { id: action.id }, data: { status: "DRAFT", description: content.publicationText,
      metadata: { publicationPackageId: packet.id, contentHash: fingerprint(content) } } });
    return { packageId: packet.id, actionId: action.id, version: packet.version };
  }, { isolationLevel: "Serializable", timeout: 25000 });
}

/** Exact reviewed version only; called again inside the publication claim. */
export async function readPreparedPublication(strategyId: string, packageId: string, contentHash: string, userId: string, client: Prisma.TransactionClient = db) {
  await assertActor(strategyId, userId, client, true);
  const asset = await client.brandAsset.findFirst({ where: { id: packageId, strategyId, format: SOCIAL_PUBLICATION_PACKAGE, state: "ACTIVE" } });
  if (!asset || fingerprint(asset.content) !== contentHash) throw new Error("La version relue n’est plus celle de ce paquet.");
  const meta = record(asset.metadata), review = record(meta.editorialReview);
  if (review.contentHash !== contentHash || typeof review.userId !== "string" || typeof review.reviewedAt !== "string")
    throw new Error("Une relecture humaine de ce paquet exact est requise.");
  const action = await client.brandAction.findFirst({ where: { id: String(meta.actionId), strategyId } });
  if (!action || record(action.metadata).publicationPackageId !== packageId || !["ACCEPTED", "SCHEDULED", "PUBLISHING", "EXECUTED"].includes(action.status))
    throw new Error("La sélection ou l’état de publication a changé.");
  const delivery = await assertCurrentSources(asset, client);
  const content = socialPublicationContent.parse(asset.content);
  const platform = content.platform.toUpperCase();
  if (!["INSTAGRAM", "FACEBOOK"].includes(platform) || !content.delivery.placement || (platform === "FACEBOOK" && content.delivery.placement !== "FEED"))
    throw new Error("Ce format exige un transport dédié. Le paquet reste conservé ; seuls les posts image Facebook, Instagram et les stories image Instagram sont raccordés ici.");
  if (delivery.byteLength > 8_000_000) throw new Error("Le JPEG relu dépasse 8 Mo. Préparez un export plus léger et relisez cette nouvelle version.");
  if (platform === "INSTAGRAM" && content.delivery.placement === "FEED" && (delivery.width / delivery.height < 0.8 || delivery.width / delivery.height > 1.91))
    throw new Error("Ce visuel n’a pas le ratio d’un post image Instagram (4:5 à 1,91:1). Préparez un rendu au bon format.");
  return { content, action, asset, platform, delivery };
}

/** Private preview and short-lived provider callback share the exact JPEG bytes. */
export async function readPublicationImage(packageId: string, expectedHash?: string) {
  const asset = await db.brandAsset.findFirst({ where: { id: packageId, format: SOCIAL_PUBLICATION_PACKAGE } });
  if (!asset || (expectedHash && fingerprint(asset.content) !== expectedHash)) throw new Error("Paquet introuvable.");
  const content = socialPublicationContent.parse(asset.content);
  const material = await db.assetVersion.findFirst({ where: { id: content.material.id, strategyId: asset.strategyId } });
  if (!material) throw new Error("Fichier introuvable.");
  const received = await readReceivedImage(material);
  if (received.contentHash !== content.material.contentHash) throw new Error("Fichier modifié.");
  const delivery = await encodePublicationImage(received.bytes);
  if (delivery.contentHash !== content.delivery.contentHash) throw new Error("Export modifié.");
  return { asset, content, ...delivery };
}
