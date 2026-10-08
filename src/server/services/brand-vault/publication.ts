/** Public editions live in BrandAsset, governed by strategy.update (ADR-0209).
 * No pillar write, generated text, provider call or implicit publication on read.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_BRAND_FORMAT, PublicBrandContent, PublicBrandPublicationInput } from "@/domain/public-brand";
import { isBrandPublicSlug, brandPublicSlugSafe, disambiguateBrandSlug } from "@/domain/brand-slug";
import { sourceFingerprint, loadBrandSources, assertCurrentSourceReceipts } from "@/server/services/ingestion-pipeline/source-usage";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "@/server/governance/collaborator-firewall";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { z } from "zod";

type Client = Prisma.TransactionClient;
const scope = { kind: "BRAND_GUIDELINES", format: PUBLIC_BRAND_FORMAT, campaignId: null };
const text = (value: unknown) => typeof value === "string" ? value : "";
const object = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
export const publicBrandDigest = (content: PublicBrandContent) => sourceFingerprint({ rawData: content });
export class PublicBrandError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "CONFLICT" | "PRECONDITION_FAILED", message: string) { super(message); }
}

async function inspect(strategyId: string, tx: Client) {
  const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId } });
  const [pillars, sources, logos, networks, editions] = await Promise.all([
    tx.pillar.findMany({ where: { strategyId, key: { in: ["a", "d"] } }, orderBy: { key: "asc" } }),
    loadBrandSources(strategyId, {}, tx),
    tx.brandAsset.findMany({ where: { strategyId, kind: "LOGO_FINAL", state: "ACTIVE", staleAt: null }, orderBy: { id: "asc" } }),
    tx.followerSnapshot.findMany({ where: { strategyId }, orderBy: [{ capturedAt: "desc" }, { id: "asc" }], take: 40 }),
    tx.brandAsset.findMany({ where: { strategyId, ...scope }, orderBy: [{ version: "desc" }, { id: "asc" }], take: 30 }),
  ]);
  const a = object(pillars.find((p) => p.key === "a")?.content);
  const d = object(pillars.find((p) => p.key === "d")?.content);
  const safeLogo = logos.find((l) => {
    const url = l.fileUrl;
    if (!url || /private-media|\/api\/|token|signature/i.test(url)) return false;
    return PublicBrandContent.shape.logoUrl.safeParse(url).success;
  });
  const links: PublicBrandContent["links"] = [];
  const hosts: Record<string, [string, string]> = {
    INSTAGRAM: ["Instagram", "https://instagram.com/"], FACEBOOK: ["Facebook", "https://facebook.com/"],
    TIKTOK: ["TikTok", "https://tiktok.com/@"], TWITTER: ["X", "https://x.com/"],
    YOUTUBE: ["YouTube", "https://youtube.com/@"], LINKEDIN: ["LinkedIn", "https://linkedin.com/in/"],
  };
  const seen = new Set<string>();
  for (const n of networks) {
    const h = hosts[String(n.platform)];
    if (!h || !n.handle || seen.has(String(n.platform))) continue;
    seen.add(String(n.platform));
    links.push({ label: h[0], url: h[1] + encodeURIComponent(n.handle.replace(/^@/, "")) });
  }
  const proposed = PublicBrandContent.parse({ name: strategy.name, title: strategy.name,
    tagline: text(a.accroche) || text(object(a.assetsLinguistiques).slogan),
    description: text(d.positionnement), logoUrl: safeLogo?.fileUrl ?? null, links });
  const receipts = sources.map((s) => ({ sourceId: s.id, contentHash: s.contentHash })).sort((x, y) => x.sourceId.localeCompare(y.sourceId));
  const pins = { name: strategy.name, operatorId: strategy.operatorId, status: strategy.status,
    pillars: pillars.map((p) => ({ id: p.id, key: p.key, version: p.currentVersion, content: p.content,
      validationStatus: p.validationStatus, fieldCertainty: p.fieldCertainty, sources: p.sources, staleAt: p.staleAt?.toISOString() ?? null })),
    sources: receipts, logos: logos.map((l) => ({ id: l.id, content: l.content, fileUrl: l.fileUrl, updatedAt: l.updatedAt.toISOString() })),
    links };
  return { strategy, proposed, receipts, pins, revision: sourceFingerprint({ rawData: pins }), editions };
}

export async function previewPublicBrand(strategyId: string, actorId?: string) {
  const state = await inspect(strategyId, db);
  const active = state.editions.find((e) => e.state === "ACTIVE");
  let canPublish = false;
  if (actorId) {
    const actor = await db.user.findUnique({ where: { id: actorId } });
    const role = isGodModeEmail(actor?.email) ? "ADMIN" : actor?.role;
    if (actor && role && await canAccessStrategy(strategyId, { userId: actorId, operatorId: actor.operatorId, role })) {
      try { await assertCollaboratorMayEmit({ userId: actorId, role, strategyId, kind: "LEGACY_STRATEGY_UPDATE" }); canPublish = true; }
      catch (error) { if (!(error instanceof Error) || error.name !== "CollaboratorWriteVetoError") throw error; }
    }
  }
  return { revision: state.revision, proposed: state.proposed, slug: state.strategy.publicSlug, canPublish,
    published: active ? { id: active.id, version: active.version, content: PublicBrandContent.parse(active.content),
      observed: object(active.metadata).publicationOrigin === "OBSERVED_PUBLICATION" } : null,
    previous: state.editions.filter((e) => e.state === "SUPERSEDED").map((e) => ({ id: e.id, version: e.version })),
    warning: "Relisez les textes avant publication. Ce choix ne valide pas l’ensemble de votre stratégie.",
  };
}

/** The wrapper supplies the persisted emission id and real session actor. */
export async function publishPublicBrand(strategyId: string, actorId: string, intentId: string,
  input: z.infer<typeof PublicBrandPublicationInput>) {
  const requested = PublicBrandPublicationInput.parse(input);
  const before = await inspect(strategyId, db);
  const restore = requested.restoreId ? await db.brandAsset.findFirst({ where: {
    id: requested.restoreId, strategyId, ...scope, state: "SUPERSEDED",
  } }) : null;
  const restoreReceipts = Array.isArray(object(restore?.metadata).sourceReceipts)
    ? object(restore?.metadata).sourceReceipts as Array<{ sourceId: string; contentHash: string }> : [];
  return db.$transaction(async (tx) => {
    // Same documentary lock order as the vault and corrections. Then fence
    // pillar edits (gateway updates Pillar) before re-reading the proposal.
    await assertCurrentSourceReceipts(tx, strategyId, [...before.receipts, ...restoreReceipts]);
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${strategyId} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + strategyId}, 0))`;
    await tx.$queryRaw`SELECT id FROM "Pillar" WHERE "strategyId"=${strategyId} ORDER BY id FOR SHARE`;
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    const role = isGodModeEmail(actor?.email) ? "ADMIN" : actor?.role;
    if (!actor || !role || !await canAccessStrategy(strategyId, { userId: actorId, operatorId: actor.operatorId, role }, tx)) {
      throw new PublicBrandError("FORBIDDEN", "Vous ne pouvez pas publier cette marque.");
    }
    await assertCollaboratorMayEmit({ userId: actorId, role, strategyId, kind: "LEGACY_STRATEGY_UPDATE" }, tx);
    const current = await inspect(strategyId, tx);
    if (["ARCHIVED", "DELETED"].includes(current.strategy.status)) throw new PublicBrandError("PRECONDITION_FAILED", "Cette marque est archivée.");
    const replay = current.editions.find((e) => e.sourceIntentId === intentId);
    if (replay) return replay;
    const active = current.editions.find((e) => e.state === "ACTIVE");
    if (current.revision !== requested.expectedRevision || (active?.id ?? null) !== requested.expectedPublishedId) {
      throw new PublicBrandError("CONFLICT", "La marque ou sa publication a changé. Rechargez l’aperçu avant de publier.");
    }
    let content = requested.content;
    if (requested.restoreId) {
      const prior = await tx.brandAsset.findFirst({ where: { id: requested.restoreId, strategyId, ...scope, state: "SUPERSEDED" } });
      if (!prior) throw new PublicBrandError("PRECONDITION_FAILED", "Cette ancienne publication n’est pas disponible.");
      if (prior.staleAt || prior.id !== restore?.id || prior.updatedAt.getTime() !== restore.updatedAt.getTime()) {
        throw new PublicBrandError("PRECONDITION_FAILED", "Cette ancienne publication doit être relue avant réutilisation.");
      }
      content = PublicBrandContent.parse(prior.content);
    }
    if (content.logoUrl && content.logoUrl !== current.proposed.logoUrl) throw new PublicBrandError("PRECONDITION_FAILED", "Choisissez un logo public actuel de cette marque.");
    let slug = current.strategy.publicSlug;
    if (!slug) {
      slug = brandPublicSlugSafe(content.name, strategyId);
      if (await tx.strategy.findFirst({ where: { publicSlug: slug, id: { not: strategyId } } })) slug = disambiguateBrandSlug(slug, strategyId);
      await tx.strategy.update({ where: { id: strategyId }, data: { publicSlug: slug } });
    }
    const version = (current.editions[0]?.version ?? 0) + 1;
    // Keep the old edition and the lineage; commit the choice atomically.
    if (active) await tx.brandAsset.update({ where: { id: active.id }, data: { state: "SUPERSEDED", supersededAt: new Date(), supersededReason: "Nouvelle publication choisie" } });
    const edition = await tx.brandAsset.create({ data: {
      strategyId, operatorId: current.strategy.operatorId, ...scope, family: "INTELLECTUAL", level: "production",
      name: `Page publique — version ${version}`, content: content as Prisma.InputJsonValue,
      state: "ACTIVE", version, parentBrandAssetId: active?.id, sourceIntentId: intentId,
      selectedAt: new Date(), selectedById: actorId, pillarSource: "A",
      metadata: { publicationOrigin: "EXPLICIT_SELECTION", proposalRevision: current.revision,
        sourceReceipts: current.receipts, pillarVersions: current.pins.pillars.map((p) => ({ key: p.key, version: p.version })),
        ...(requested.restoreId ? { restoredFromId: requested.restoreId } : {}) },
    } });
    if (active) await tx.brandAsset.update({ where: { id: active.id }, data: { supersededById: edition.id } });
    return edition;
  }, { timeout: 15000 });
}

export async function readPublicBrand(slug: string) {
  if (!isBrandPublicSlug(slug)) return null;
  const strategy = await db.strategy.findUnique({ where: { publicSlug: slug }, select: { id: true, status: true } });
  if (!strategy || ["ARCHIVED", "DELETED"].includes(strategy.status)) return null;
  const asset = await db.brandAsset.findFirst({ where: { strategyId: strategy.id, ...scope, state: "ACTIVE" }, orderBy: { version: "desc" } });
  if (!asset) return null;
  const content = PublicBrandContent.parse(asset.content);
  return { schema: PUBLIC_BRAND_FORMAT, slug, edition: asset.id, version: asset.version,
    publishedAt: asset.createdAt.toISOString(),
    selection: object(asset.metadata).publicationOrigin === "OBSERVED_PUBLICATION" ? "observed" as const : "chosen" as const,
    digest: publicBrandDigest(content), content };
}

/** Deployment migration only: capture already-visible fields, NOT human review.
 * The boot script opens/closes the canonical spine for every capture. Never
 * called by an anonymous read or used for a brand without an existing slug.
 */
export async function freezeObservedPublicBrand(strategyId: string, intentId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Strategy" WHERE id=${strategyId} FOR UPDATE`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"brand-vault:" + strategyId}, 0))`;
    const state = await inspect(strategyId, tx);
    if (!state.strategy.publicSlug || !isBrandPublicSlug(state.strategy.publicSlug)
      || ["ARCHIVED", "DELETED"].includes(state.strategy.status) || state.editions.length) return false;
    await tx.brandAsset.create({ data: { strategyId, operatorId: state.strategy.operatorId, ...scope,
      family: "INTELLECTUAL", name: "Page publique — publication historique observée", state: "ACTIVE",
      content: state.proposed as Prisma.InputJsonValue, sourceIntentId: intentId, pillarSource: "A",
      metadata: { publicationOrigin: "OBSERVED_PUBLICATION", proposalRevision: state.revision, sourceReceipts: state.receipts },
    } });
    return true;
  }, { timeout: 15000 });
}
