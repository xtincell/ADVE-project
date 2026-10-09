/** Canonical documents and their explicit uses by other brands (ADR-0198).
 * Never copies content and never launches analysis on a read or a grant.
 */
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sourceOriginalSummary } from "@/domain/source-original";
import type { SourceReceipt } from "@/domain/source-certainty";
import { getPillarDependents, type PillarKey } from "@/lib/types/advertis-vector";
import { markPillarsStale } from "@/server/services/pillar-gateway/review-invalidation";

export type SourceDb = Prisma.TransactionClient;
export type { SourceReceipt } from "@/domain/source-certainty";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]),
  );
  return value ?? null;
}

/** Analysis status, mapping and timestamps are NOT changes to documentary evidence. */
export function sourceFingerprint(source: {
  rawContent?: string | null; rawData?: unknown; extractedFields?: unknown;
  certainty?: string; fileName?: string | null; sourceType?: string; fileType?: string | null;
}): string {
  return createHash("sha256").update(JSON.stringify(canonical({
    rawContent: source.rawContent, rawData: source.rawData, extractedFields: source.extractedFields,
    certainty: source.certainty, fileName: source.fileName, sourceType: source.sourceType, fileType: source.fileType,
  }))).digest("hex");
}

export function readSourceReceipts(value: unknown): SourceReceipt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v: unknown) => {
    if (!v || typeof v !== "object") return [];
    const r = v as Record<string, unknown>;
    return typeof r.sourceId === "string" && typeof r.contentHash === "string" && /^[a-f0-9]{64}$/.test(r.contentHash)
      ? [{ sourceId: r.sourceId, contentHash: r.contentHash }] : [];
  });
}

/** A local analysis cannot make a failed/pending canonical extraction usable. */
export function sharedSourceAnalysis(source: { processingStatus: string } & Parameters<typeof sourceFingerprint>[0], use?: {
  analysisStatus: string; pillarMapping: Prisma.JsonValue; analyzedSourceHash: string | null;
}) {
  const ready = ["EXTRACTED", "PROCESSED"].includes(source.processingStatus);
  const current = ready && use?.analyzedSourceHash === sourceFingerprint(source);
  return {
    analysisStatus: !ready ? source.processingStatus : current ? use.analysisStatus : "EXTRACTED",
    pillarMapping: current ? use.pillarMapping : null,
  };
}

/** Compare BOTH current operators AND the operator at grant, even after a transfer. */
export async function sourceScope(strategyId: string, client: SourceDb = db): Promise<Prisma.BrandDataSourceWhereInput> {
  const target = await client.strategy.findUnique({ where: { id: strategyId }, select: { operatorId: true } });
  if (!target?.operatorId) return { strategyId };
  return { OR: [
    { strategyId },
    { strategy: { operatorId: target.operatorId }, uses: { some: {
      strategyId, operatorId: target.operatorId, revokedAt: null,
      strategy: { operatorId: target.operatorId },
    } } },
  ] };
}

/** One metadata projection for Sources and portfolio. Contents are hashed on the
 * server and excluded from this response; consultation resolves access again. */
export async function listBrandSourceSummaries(strategyId: string, client: SourceDb = db) {
  const sources = await client.brandDataSource.findMany({
    where: await sourceScope(strategyId, client),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      strategyId: true,
      strategy: { select: { name: true } },
      uses: { where: { strategyId: strategyId, revokedAt: null }, select: { analysisStatus: true, pillarMapping: true, analyzedSourceHash: true } },
      sourceType: true,
      fileName: true,
      fileType: true,
      processingStatus: true,
      pillarMapping: true,
      extractedFields: true,
      rawContent: true, rawData: true,
      errorMessage: true,
      createdAt: true, updatedAt: true,
      // PR-A (ADR-0032)
      certainty: true,
      origin: true,
      originalUpload: { select: { storageReceipt: true } },
    },
  });

  // ADR-0184 — « déposé » ne veut pas dire « exploitable ». L'indexation est
  // best-effort (`void` + `console.warn`) : une source EXTRACTED jamais
  // indexée ne se signalait NULLE PART, et le porteur croyait sa
  // documentation prise en compte. On lit le compte réel de chunks.
  const fingerprints = new Map(sources.map((s) => [s.id, sourceFingerprint(s)]));
  const indexed = await client.brandContextNode.findMany({
    where: { strategyId: strategyId, kind: "BRAND_SOURCE", sourceId: { in: sources.map((s) => s.id) } },
    select: { sourceId: true, payload: true },
  });
  const chunksBySource = new Map<string, number>();
  for (const row of indexed) {
    if (row.sourceId && (row.payload as Record<string, unknown> | null)?.sourceContentHash === fingerprints.get(row.sourceId)) {
      chunksBySource.set(row.sourceId, (chunksBySource.get(row.sourceId) ?? 0) + 1);
    }
  }

  return sources.map(({ strategy, uses, originalUpload, rawContent: _rawContent, rawData: _rawData, ...s }) => ({
    ...s,
    shared: s.strategyId !== strategyId,
    ownerBrandName: strategy.name,
    ownerStrategyId: s.strategyId,
    processingStatus: s.strategyId === strategyId ? s.processingStatus : sharedSourceAnalysis({ ...s, rawContent: _rawContent, rawData: _rawData }, uses[0]).analysisStatus,
    pillarMapping: s.strategyId === strategyId ? s.pillarMapping : sharedSourceAnalysis({ ...s, rawContent: _rawContent, rawData: _rawData }, uses[0]).pillarMapping,
    original: sourceOriginalSummary(originalUpload?.storageReceipt),
    /** Nombre de fragments indexés — 0 = pas encore exploitable en analyse. */
    indexedChunks: chunksBySource.get(s.id) ?? 0,
  }));
}

export async function resolveBrandSource(sourceId: string, strategyId?: string, client: SourceDb = db) {
  const where = strategyId ? { AND: [{ id: sourceId }, await sourceScope(strategyId, client)] } : { id: sourceId };
  const source = await client.brandDataSource.findFirst({
    where, include: {
      strategy: { select: { id: true, name: true, operatorId: true, userId: true } },
      uses: strategyId ? { where: { strategyId, revokedAt: null } } : false,
    },
  });
  if (!source) throw new Error("SOURCE_UNAVAILABLE: ce document n’est plus accessible dans ce dossier.");
  const use = source.uses?.find((u) => u.strategyId === strategyId);
  return {
    source, consumerStrategyId: strategyId ?? source.strategyId,
    shared: Boolean(strategyId && strategyId !== source.strategyId),
    contentHash: sourceFingerprint(source),
    analysisStatus: strategyId && strategyId !== source.strategyId ? sharedSourceAnalysis(source, use).analysisStatus : source.processingStatus,
    pillarMapping: strategyId && strategyId !== source.strategyId ? sharedSourceAnalysis(source, use).pillarMapping : source.pillarMapping,
  };
}

/** Lossless reader shared by the existing analysis paths. Local mapping is never
 * inherited from the owner; the underlying document remains canonical. */
export async function loadBrandSources(strategyId: string, extra: Prisma.BrandDataSourceWhereInput = {}, client: SourceDb = db) {
  const rows = await client.brandDataSource.findMany({
    where: { AND: [await sourceScope(strategyId, client), extra] },
    include: { uses: { where: { strategyId, revokedAt: null } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((source) => ({
    ...source, contentHash: sourceFingerprint(source),
    pillarMapping: source.strategyId === strategyId ? source.pillarMapping : sharedSourceAnalysis(source, source.uses[0]).pillarMapping,
    analysisStatus: source.strategyId === strategyId ? source.processingStatus : sharedSourceAnalysis(source, source.uses[0]).analysisStatus,
  }));
}

export async function recordSourceAnalysis(client: SourceDb, strategyId: string, receipt: SourceReceipt, data: {
  pillarMapping?: Prisma.InputJsonValue; analysisStatus?: string;
}) {
  await assertCurrentSourceReceipts(client, strategyId, [receipt]);
  const { source, shared } = await resolveBrandSource(receipt.sourceId, strategyId, client);
  if (shared) {
    await client.brandSourceUse.update({ where: { sourceId_strategyId: { sourceId: source.id, strategyId } }, data: {
      ...data, analyzedSourceHash: receipt.contentHash,
    } });
  } else {
    await client.brandDataSource.update({ where: { id: source.id }, data: {
      ...(data.pillarMapping !== undefined ? { pillarMapping: data.pillarMapping } : {}),
      ...(data.analysisStatus ? { processingStatus: data.analysisStatus } : {}),
    } });
  }
}

/** Writers call this inside their own transaction, BEFORE persisting any derivative.
 * The same source row is updated/locked by corrections, grants and revocations.
 * Ordered writer locks close check/write races and avoid SHARE-to-UPDATE deadlocks
 * when an analysis also records its local status. Ordinary reads never acquire them.
 */
export async function assertCurrentSourceReceipts(
  client: SourceDb, strategyId: string, receipts: SourceReceipt[], requiredSourceIds: string[] = [],
  strategyLock: "SHARE" | "UPDATE" = "SHARE",
): Promise<void> {
  if (requiredSourceIds.some((id) => !receipts.some((r) => r.sourceId === id))) {
    throw new Error("SOURCE_RECEIPT_MISSING: la version documentaire de cette proposition doit être revue.");
  }
  const ids = [...new Set(receipts.map((r) => r.sourceId))].sort();
  if (!ids.length) return;
  await client.$queryRaw(Prisma.sql`SELECT id FROM "BrandDataSource" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
  // A pillar writer also withdraws Strategy approval. Acquire its final lock
  // directly, avoiding two concurrent SHARE → UPDATE upgrades. Other source
  // consumers retain their read fence. Source rows are always locked first.
  const lock = strategyLock === "UPDATE" ? Prisma.sql`FOR UPDATE` : Prisma.sql`FOR SHARE`;
  await client.$queryRaw(Prisma.sql`SELECT id FROM "Strategy" WHERE id = ${strategyId}
    OR id IN (SELECT "strategyId" FROM "BrandDataSource" WHERE id IN (${Prisma.join(ids)})) ORDER BY id ${lock}`);
  for (const receipt of receipts) {
    const current = await resolveBrandSource(receipt.sourceId, strategyId, client);
    if (current.contentHash !== receipt.contentHash) throw new Error("SOURCE_CHANGED: le document a été corrigé. Relire ou refaire cette proposition.");
  }
}

export async function assertAssetSourceCurrent(client: SourceDb, asset: { strategyId: string; metadata: unknown; staleAt?: Date | null }) {
  const meta = asset.metadata as Record<string, unknown> | null;
  if (typeof meta?.sourceDataSourceId !== "string") return;
  if (asset.staleAt) throw new Error("SOURCE_CHANGED: cet actif documentaire doit être relu avant utilisation.");
  await assertCurrentSourceReceipts(client, asset.strategyId, readSourceReceipts([
    { sourceId: meta.sourceDataSourceId, contentHash: meta.sourceContentHash },
  ]), [meta.sourceDataSourceId]);
}

/** Invalidates evidence without erasing decisions or silently rewriting ADVE. */
export async function invalidateSourceDerivatives(client: SourceDb, sourceId: string, strategyId?: string) {
  const scope = strategyId ? { strategyId } : {};
  await client.brandContextNode.deleteMany({ where: { sourceId, ...scope } });
  await client.brandSourceUse.updateMany({ where: { sourceId, ...scope }, data: {
    analysisStatus: "EXTRACTED", pillarMapping: Prisma.DbNull, analyzedSourceHash: null,
  } });
  const assetScope = { ...scope, metadata: { path: ["sourceDataSourceId"], equals: sourceId } };
  const assets = await client.brandAsset.findMany({ where: assetScope, select: { id: true } });
  await client.brandAsset.updateMany({ where: {
    ...scope, metadata: { path: ["sourceDataSourceId"], equals: sourceId },
  }, data: { staleAt: new Date(), staleReason: "La source a changé ou son accès a été retiré. Relire avant de réutiliser cet actif." } });
  const recos = await client.recommendation.findMany({ where: {
    ...scope, OR: [{ groundedSourceIds: { has: sourceId } }, { sourceReceipts: { array_contains: [{ sourceId }] } }],
  }, select: { id: true, strategyId: true, targetPillarKey: true, status: true } });
  const derivedIds = [...assets.map((a) => a.id), ...recos.map((r) => r.id)];
  if (derivedIds.length) await client.brandContextNode.deleteMany({ where: { ...scope, sourceId: { in: derivedIds }, kind: { in: ["ASSET", "RECO"] } } });
  if (recos.length) await client.recommendation.updateMany({ where: { id: { in: recos.map((r) => r.id) } }, data: {
    applyPolicy: "requires_review", validationWarning: "SOURCE_CHANGED: source corrigée ou accès retiré ; proposition à relire.",
  } });
  // Invalidate the actual downstream pillars, preserving content and validation history.
  const affected = new Map<string, Set<string>>();
  for (const r of recos.filter((r) => r.status === "APPLIED")) {
    const keys = affected.get(r.strategyId) ?? new Set<string>();
    keys.add(r.targetPillarKey);
    for (const key of getPillarDependents(r.targetPillarKey as PillarKey)) keys.add(key);
    affected.set(r.strategyId, keys);
  }
  // Also covers direct brand-book ingestion carrying source receipts in Pillar.sources.
  const pillars = await client.pillar.findMany({ where: { ...scope, sources: { array_contains: [{ sourceId }] } }, select: { id: true, strategyId: true, key: true, sources: true } });
  for (const p of pillars) {
    if (!readSourceReceipts(p.sources).some((r) => r.sourceId === sourceId)) continue;
    const keys = affected.get(p.strategyId) ?? new Set<string>();
    keys.add(p.key);
    for (const key of getPillarDependents(p.key as PillarKey)) keys.add(key);
    affected.set(p.strategyId, keys);
  }
  // Multi-brand documentary changes acquire their final strategy locks in a
  // stable order before touching pillars, matching approval and gateway writes.
  const ids = [...affected.keys()].sort();
  if (ids.length) await client.$queryRaw(Prisma.sql`SELECT id FROM "Strategy" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
  for (const id of ids) await markPillarsStale(client, id, [...affected.get(id)!]);
}

/** Only source ownership/operator management can grant; collaboration is read access. */
export async function setSourceUse(input: {
  sourceId: string; strategyId: string; userId: string; operatorId: string | null; admin: boolean; revoke: boolean;
}) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "BrandDataSource" WHERE id = ${input.sourceId} FOR UPDATE`;
    const { source } = await resolveBrandSource(input.sourceId, undefined, tx);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Strategy" WHERE id IN (${Prisma.join([source.strategyId, input.strategyId].sort())}) ORDER BY id FOR UPDATE`);
    const owner = await tx.strategy.findUniqueOrThrow({ where: { id: source.strategyId }, select: { operatorId: true, userId: true } });
    const target = await tx.strategy.findUniqueOrThrow({ where: { id: input.strategyId }, select: { id: true, operatorId: true, userId: true } });
    if (target.id === source.strategyId) throw new Error("Le document appartient déjà à cette marque.");
    const manages = (s: { userId: string; operatorId: string | null }) => input.admin
      || s.userId === input.userId || Boolean(input.operatorId && s.operatorId === input.operatorId);
    if (!manages(owner)) throw new Error("Seul le responsable du document peut modifier cet usage.");
    const key = { sourceId: input.sourceId, strategyId: input.strategyId };
    if (input.revoke) {
      await tx.brandSourceUse.updateMany({ where: { ...key, revokedAt: null }, data: { revokedAt: new Date(), updatedById: input.userId } });
      await invalidateSourceDerivatives(tx, input.sourceId, input.strategyId);
      return { linked: false };
    }
    if (!target.operatorId || target.operatorId !== owner.operatorId) throw new Error("Le partage exige deux marques du même opérateur.");
    if (!manages(target)) throw new Error("Seul le responsable des deux dossiers peut ajouter cet usage.");
    const previous = await tx.brandSourceUse.findUnique({ where: { sourceId_strategyId: key } });
    if (previous && !previous.revokedAt && previous.operatorId === target.operatorId) return { linked: true };
    await tx.brandSourceUse.upsert({ where: { sourceId_strategyId: key },
      create: { ...key, operatorId: target.operatorId, createdById: input.userId, updatedById: input.userId },
      update: { operatorId: target.operatorId, revokedAt: null, updatedById: input.userId,
        analysisStatus: "EXTRACTED", pillarMapping: Prisma.DbNull, analyzedSourceHash: null },
    });
    return { linked: true };
  });
}
