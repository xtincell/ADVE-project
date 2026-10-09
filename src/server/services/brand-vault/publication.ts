/** Public editions live in BrandAsset, governed by strategy.update (ADR-0209).
 * No pillar write, generated text, provider call or implicit publication on read.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PUBLIC_BRAND_FORMAT, PUBLIC_BRAND_IDENTITY_FORMAT, PublicBrandContent, PublicBrandContentV2, PublicBrandPublicationInput, PublicIdentityChoice, PublicIdentity } from "@/domain/public-brand";
import { isBrandPublicSlug, brandPublicSlugSafe, disambiguateBrandSlug } from "@/domain/brand-slug";
import { sourceFingerprint, loadBrandSources, assertCurrentSourceReceipts, assertAssetSourceCurrent } from "@/server/services/ingestion-pipeline/source-usage";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "@/server/governance/collaborator-firewall";
import { isGodModeEmail } from "@/lib/auth/god-mode";
import { z } from "zod";
import { resolveBrandIdentity, resolveBrandDeploymentOrigin, collectHexes, extractFontFamilies, contrastRatio, hexToRgb } from "@/server/services/brand-theme";
import { publicLogoReceipt, retainPublicLogo, retainPublicMedia, readPublicLogoBytes, publicLogoSnapshotUrl, publicIdentityArchives, type PublicLogoReceipt, type IdentityArchive } from "./public-media";

type Client = Prisma.TransactionClient;
const scope = { kind: "BRAND_GUIDELINES", format: { in: [PUBLIC_BRAND_FORMAT, PUBLIC_BRAND_IDENTITY_FORMAT] }, campaignId: null };
const privateContent = (value: unknown) => PublicBrandContentV2.safeParse(value).success
  ? PublicBrandContent.parse(Object.fromEntries(Object.entries(object(value)).filter(([key]) => key !== "identity"))) : PublicBrandContent.parse(value);
const text = (value: unknown) => typeof value === "string" ? value : "";
const object = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
export const publicBrandDigest = (content: PublicBrandContent | z.infer<typeof PublicBrandContentV2>) => sourceFingerprint({ rawData: content });
export class PublicBrandError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "CONFLICT" | "PRECONDITION_FAILED", message: string) { super(message); }
}

/** Only already-public files may leave the vault. A relative /brand/ path
 * belongs to this deployment, never to the consuming site's origin. */
function publicLogoUrl(value: string | null, font = false): string | null {
  if (!value || /private-media|\/api\/|token|signature/i.test(value)) return null;
  if (value.startsWith("/")) {
    if (!new RegExp(`^/brand/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\\.(?:${font ? "otf|ttf" : "png|webp|jpe?g|svg"})$`).test(value)) return null;
    const base = resolveBrandDeploymentOrigin();
    if (!base) return null;
    value = new URL(value, base).href;
  }
  return PublicBrandContent.shape.logoUrl.safeParse(value).success ? value : null;
}
const logoFingerprint = (logo: { id: string; version: number; fileUrl: string | null; content: unknown; metadata: unknown }) =>
  sourceFingerprint({ rawData: { id: logo.id, version: logo.version, fileUrl: logo.fileUrl, content: logo.content, metadata: logo.metadata } });

async function inspect(strategyId: string, tx: Client) {
  const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: strategyId } });
  const [pillars, sources, identity, networks, editions] = await Promise.all([
    tx.pillar.findMany({ where: { strategyId, key: { in: ["a", "d"] } }, orderBy: { key: "asc" } }),
    loadBrandSources(strategyId, {}, tx),
    resolveBrandIdentity(strategyId, tx),
    tx.followerSnapshot.findMany({ where: { strategyId }, orderBy: [{ capturedAt: "desc" }, { id: "asc" }], take: 40 }),
    tx.brandAsset.findMany({ where: { strategyId, ...scope }, orderBy: [{ version: "desc" }, { id: "asc" }], take: 30 }),
  ]);
  const a = object(pillars.find((p) => p.key === "a")?.content);
  const d = object(pillars.find((p) => p.key === "d")?.content);
  const logos = identity.logos.flatMap((logo) => {
    const meta = object(logo.metadata);
    const sourceCurrent = typeof meta.sourceDataSourceId !== "string" || sources.some((source) =>
      source.id === meta.sourceDataSourceId && source.contentHash === meta.sourceContentHash);
    const url = sourceCurrent ? publicLogoUrl(logo.fileUrl) : null;
    return logo.kind === "LOGO_FINAL" && logo.campaignId === null && ["ACTIVE", "SELECTED"].includes(logo.state) && url
      ? [{ ...logo, url, fingerprint: logoFingerprint(logo) }] : [];
  });
  const activeLogos = logos.filter((logo) => logo.state === "ACTIVE");
  const identityAssets = [...identity.palettes, ...identity.typographies, ...identity.fonts, ...identity.characters, ...identity.illustrations]
    .filter(asset => asset.campaignId === null && ["ACTIVE", "SELECTED"].includes(asset.state))
    .filter(asset => { const meta = object(asset.metadata); return typeof meta.sourceDataSourceId !== "string" || sources.some(source => source.id === meta.sourceDataSourceId && source.contentHash === meta.sourceContentHash); });
  const safeLogo = activeLogos.length === 1 ? activeLogos[0] : null;
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
    description: text(d.positionnement), logoUrl: safeLogo?.url ?? null, links });
  const receipts = sources.map((s) => ({ sourceId: s.id, contentHash: s.contentHash })).sort((x, y) => x.sourceId.localeCompare(y.sourceId));
  const pins = { name: strategy.name, operatorId: strategy.operatorId, status: strategy.status,
    pillars: pillars.map((p) => ({ id: p.id, key: p.key, version: p.currentVersion, content: p.content,
      validationStatus: p.validationStatus, fieldCertainty: p.fieldCertainty, sources: p.sources, staleAt: p.staleAt?.toISOString() ?? null })),
    sources: receipts, logos: logos.map((l) => ({ id: l.id, name: l.name, version: l.version, state: l.state, url: l.url, fingerprint: l.fingerprint })),
    identity: identityAssets.map(asset => ({ id: asset.id, state: asset.state, version: asset.version, fingerprint: logoFingerprint(asset) })), links };
  return { strategy, proposed, receipts, pins, revision: sourceFingerprint({ rawData: pins }), editions, logos, identityAssets, sources };
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
    logos: state.logos.map(({ id, name, version, state: assetState, url }) => ({ id, name, version, state: assetState, url })),
    identityOptions: {
      sources: state.sources.map(source => ({ id: source.id, name: source.fileName ?? "Document de marque" })),
      assets: state.identityAssets.map(asset => ({ id: asset.id, kind: asset.kind, name: asset.name, version: asset.version,
        url: publicLogoUrl(asset.fileUrl, asset.kind === "GENERIC"),
        colors: asset.kind === "CHROMATIC_STRATEGY" ? collectHexes(asset.content).all : [],
        families: asset.kind === "TYPOGRAPHY_SYSTEM" ? extractFontFamilies(asset.content).all : [] })),
    },
    published: active ? { id: active.id, version: active.version, logoAssetId: text(object(object(active.metadata).logoAsset).id) || null, content: privateContent(active.content),
      identityChoice: object(active.metadata).identityChoice ? PublicIdentityChoice.parse(object(active.metadata).identityChoice) : null,
      observed: object(active.metadata).publicationOrigin === "OBSERVED_PUBLICATION" } : null,
    previous: state.editions.filter((e) => e.state === "SUPERSEDED").map((e) => ({ id: e.id, version: e.version })),
    warning: "Relisez les textes avant publication. Ce choix ne valide pas l’ensemble de votre stratégie.",
  };
}

/** Factor the four families through the same choice/pin/byte-receipt path.
 * Source text is evidence, never an executable instruction or an auto-approved charter. */
async function preparePublicIdentity(choice: PublicIdentityChoice | null, state: Awaited<ReturnType<typeof inspect>>,
  tx: Client, reusable?: unknown) {
  if (!choice) return { identity: null, archives: [] as IdentityArchive[], pins: [] as Array<{ id: string; version: number; fingerprint: string }> };
  choice = PublicIdentityChoice.parse(choice);
  const source = state.sources.find(source => source.id === choice.referenceSourceId);
  if (!source) throw new PublicBrandError("PRECONDITION_FAILED", "Choisissez une référence actuellement accessible pour cette marque.");
  const pins: Array<{ id: string; version: number; fingerprint: string }> = [], archives: IdentityArchive[] = [];
  const old = publicIdentityArchives(reusable);
  const choose = async (pick: { assetId: string; version: number }, kind: string) => {
    const asset = state.identityAssets.find(asset => asset.id === pick.assetId && asset.version === pick.version && asset.kind === kind);
    if (!asset) throw new PublicBrandError("PRECONDITION_FAILED", "Un élément choisi n’est plus une version disponible de cette marque. Relisez la publication.");
    await assertAssetSourceCurrent(tx, { strategyId: state.strategy.id, metadata: asset.metadata });
    const pin = { id: asset.id, version: asset.version, fingerprint: logoFingerprint(asset) };
    if (!pins.some(p => p.id === pin.id)) pins.push(pin);
    return asset;
  };
  const file = async (pick: { assetId: string; version: number }, role: string, weight?: number, family?: string) => {
    const asset = await choose(pick, weight === undefined ? "KV_VISUAL" : "GENERIC"), fingerprint = logoFingerprint(asset);
    const url = publicLogoUrl(asset.fileUrl, weight !== undefined);
    if (!url) throw new PublicBrandError("PRECONDITION_FAILED", "Un fichier choisi n’est pas une ressource publique admissible.");
    const prior = old.find(a => a.role === role);
    if (prior && (prior.assetId !== asset.id || prior.version !== asset.version || prior.fingerprint !== fingerprint)) {
      throw new PublicBrandError("PRECONDITION_FAILED", "Un élément de cette ancienne édition a changé. Relisez-le avant une nouvelle publication.");
    }
    let receipt: PublicLogoReceipt;
    try {
      if (prior) { await readPublicLogoBytes(prior.receipt); receipt = prior.receipt; }
      else receipt = await retainPublicMedia(url, weight, family);
    } catch {
      throw new PublicBrandError("PRECONDITION_FAILED", "Un fichier de l’identité n’a pas pu être conservé et vérifié. L’édition précédente reste en ligne.");
    }
    archives.push({ role, assetId: asset.id, version: asset.version, fingerprint, receipt });
    return { url: publicLogoSnapshotUrl("pending", receipt), hash: receipt.contentHash, bytes: receipt.byteLength, type: receipt.mediaType };
  };
  const identity: PublicIdentity = { palette: null, typography: null, mascots: [], voice: null };
  if (choice.palette) {
    const palette = await choose(choice.palette, "CHROMATIC_STRATEGY"), values = collectHexes(palette.content).all.map(v => v.toLowerCase());
    if (!Object.values(choice.palette.roles).every(value => values.includes(value.toLowerCase()))) {
      throw new PublicBrandError("PRECONDITION_FAILED", "Les couleurs choisies doivent appartenir à la palette sélectionnée.");
    }
    for (const [foreground, background] of [["ink", "paper"], ["ink", "soft"], ["ink", "signature"], ["community", "paper"]] as const) {
      if (contrastRatio(hexToRgb(choice.palette.roles[foreground])!, hexToRgb(choice.palette.roles[background])!) < 4.5) {
        throw new PublicBrandError("PRECONDITION_FAILED", "Ces couleurs ne permettent pas de lire les textes usuels du site. Revoyez leurs usages avant publication.");
      }
    }
    identity.palette = choice.palette.roles;
  }
  if (choice.typography) {
    const charter = await choose(choice.typography, "TYPOGRAPHY_SYSTEM"), families = extractFontFamilies(charter.content).all;
    const files: string[] = [];
    const walk = (value: unknown, depth = 0) => {
      if (depth > 5) return;
      if (typeof value === "string" && /\.(otf|ttf)$/i.test(value)) { const url = publicLogoUrl(value, true); if (url) files.push(url); }
      else if (Array.isArray(value)) value.forEach(v => walk(v, depth + 1));
      else if (value && typeof value === "object") Object.values(value).forEach(v => walk(v, depth + 1));
    }; walk(charter.content);
    const projectFont = async (font: { family: string; faces: Array<{ assetId: string; version: number; weight: number }> }, role: string) => {
      if (!families.includes(font.family)) throw new PublicBrandError("PRECONDITION_FAILED", "La famille choisie n’appartient pas à ce système typographique.");
      const faces = [];
      for (const face of font.faces) {
        const candidate = state.identityAssets.find(a => a.id === face.assetId);
        if (!candidate || !files.includes(publicLogoUrl(candidate.fileUrl, true) ?? "")) throw new PublicBrandError("PRECONDITION_FAILED", "Le fichier choisi n’appartient pas à ce système typographique.");
        faces.push({ weight: face.weight, file: await file(face, `${role}:${face.weight}`, face.weight, font.family) });
      }
      return { family: font.family, faces };
    };
    identity.typography = { display: await projectFont(choice.typography.display, "display"), body: await projectFont(choice.typography.body, "body") };
  }
  if (choice.mascots) {
    await choose(choice.mascots, "PERSONA");
    for (const use of choice.mascots.uses) identity.mascots.push({ role: use.role, alt: use.alt, file: await file(use, `mascot:${use.role}`) });
  }
  if (choice.voice) {
    const normalized = (s: string) => s.replace(/\s+/g, " ").trim();
    if (!source.rawContent || !normalized(source.rawContent).includes(normalized(choice.voice.quote))) {
      throw new PublicBrandError("PRECONDITION_FAILED", "La citation doit être un extrait exact de la référence choisie. Aucune charte brouillon n’est publiée automatiquement.");
    }
    identity.voice = choice.voice;
  }
  return { identity: PublicIdentity.parse(identity), archives, pins };
}

function identityForEdition(identity: PublicIdentity | null, archives: IdentityArchive[], editionId: string) {
  if (!identity) return null;
  const resolved = (role: string, file: z.infer<typeof PublicIdentity>["mascots"][number]["file"]) => {
    const archive = archives.find(a => a.role === role);
    if (!archive) throw new PublicBrandError("PRECONDITION_FAILED", "La copie d’un fichier choisi est absente.");
    return { ...file, url: publicLogoSnapshotUrl(editionId, archive.receipt) };
  };
  return PublicIdentity.parse({ ...identity,
    typography: identity.typography ? Object.fromEntries(Object.entries(identity.typography).map(([role, font]) => [role,
      { ...font, faces: font.faces.map(face => ({ ...face, file: resolved(`${role}:${face.weight}`, face.file) })) }])) : null,
    mascots: identity.mascots.map(use => ({ ...use, file: resolved(`mascot:${use.role}`, use.file) })),
  });
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
    await tx.$queryRaw`SELECT id FROM "BrandAsset" WHERE "strategyId"=${strategyId} ORDER BY id FOR SHARE`;
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
    let chosenLogoId = requested.logoAssetId;
    let restoredLogo: Record<string, unknown> | null = null;
    let logoArchive: PublicLogoReceipt | null = null;
    let identityChoice = requested.identity === undefined ? object(active?.metadata).identityChoice ?? null : requested.identity;
    let reusableIdentity = requested.identity === undefined ? active?.metadata : undefined;
    if (requested.restoreId) {
      const prior = await tx.brandAsset.findFirst({ where: { id: requested.restoreId, strategyId, ...scope, state: "SUPERSEDED" } });
      if (!prior) throw new PublicBrandError("PRECONDITION_FAILED", "Cette ancienne publication n’est pas disponible.");
      if (prior.staleAt || prior.id !== restore?.id || prior.updatedAt.getTime() !== restore.updatedAt.getTime()) {
        throw new PublicBrandError("PRECONDITION_FAILED", "Cette ancienne publication doit être relue avant réutilisation.");
      }
      content = privateContent(prior.content);
      restoredLogo = object(object(prior.metadata).logoAsset);
      chosenLogoId = text(restoredLogo.id) || undefined;
      logoArchive = publicLogoReceipt(prior.metadata);
      identityChoice = object(prior.metadata).identityChoice ?? null;
      reusableIdentity = prior.metadata;
      if (content.logoUrl && !logoArchive) throw new PublicBrandError("PRECONDITION_FAILED", "Cette ancienne édition ne conserve pas son fichier. Choisissez le logo actuel et publiez une nouvelle version après relecture.");
    }
    // A text-only review keeps the visible edition's verified bytes. A fresh
    // selection supplies the source URL and captures a new copy instead.
    if (!requested.restoreId && active && content.logoUrl
      && content.logoUrl === privateContent(active.content).logoUrl) {
      const retained = publicLogoReceipt(active.metadata);
      if (retained && content.logoUrl === publicLogoSnapshotUrl(active.id, retained)) {
        restoredLogo = object(object(active.metadata).logoAsset);
        if (chosenLogoId === text(restoredLogo.id)) logoArchive = retained;
      }
    }
    const matches = current.logos.filter((logo) => (logoArchive ? logo.id === chosenLogoId : logo.url === content.logoUrl)
      && (!chosenLogoId || logo.id === chosenLogoId));
    const chosenLogo = content.logoUrl && matches.length === 1 ? matches[0]! : null;
    if ((content.logoUrl && !chosenLogo) || (!content.logoUrl && chosenLogoId)
      || (restoredLogo?.fingerprint && restoredLogo.fingerprint !== chosenLogo?.fingerprint)) {
      throw new PublicBrandError("PRECONDITION_FAILED", "Choisissez une version actuelle du logo de cette marque, ou publiez sans logo.");
    }
    // Eligible source ids are already fenced above in the same lock order.
    if (chosenLogo) await assertAssetSourceCurrent(tx, { strategyId, metadata: chosenLogo.metadata });
    if (chosenLogo) {
      try {
        if (logoArchive) await readPublicLogoBytes(logoArchive);
        else logoArchive = await retainPublicLogo(chosenLogo.url);
      } catch {
        throw new PublicBrandError("PRECONDITION_FAILED", "Le logo n’a pas pu être conservé et vérifié. La publication précédente reste en ligne. Vérifiez son fichier et le stockage avant de réessayer.");
      }
    }
    const preparedIdentity = await preparePublicIdentity(identityChoice ? PublicIdentityChoice.parse(identityChoice) : null, current, tx, reusableIdentity);
    if (reusableIdentity && identityChoice) {
      const oldPins = object(reusableIdentity).identityPins;
      if (!Array.isArray(oldPins) || sourceFingerprint({ rawData: oldPins }) !== sourceFingerprint({ rawData: preparedIdentity.pins })) {
        throw new PublicBrandError("PRECONDITION_FAILED", "L’identité de cette ancienne édition a changé. Choisissez les versions actuelles après relecture.");
      }
    }
    let slug = current.strategy.publicSlug;
    if (!slug) {
      slug = brandPublicSlugSafe(content.name, strategyId);
      if (await tx.strategy.findFirst({ where: { publicSlug: slug, id: { not: strategyId } } })) slug = disambiguateBrandSlug(slug, strategyId);
      await tx.strategy.update({ where: { id: strategyId }, data: { publicSlug: slug } });
    }
    const version = (current.editions[0]?.version ?? 0) + 1;
    // Keep the old edition and the lineage; commit the choice atomically.
    if (active) await tx.brandAsset.update({ where: { id: active.id }, data: { state: "SUPERSEDED", supersededAt: new Date(), supersededReason: "Nouvelle publication choisie" } });
    let edition = await tx.brandAsset.create({ data: {
      strategyId, operatorId: current.strategy.operatorId, ...scope, format: preparedIdentity.identity ? PUBLIC_BRAND_IDENTITY_FORMAT : PUBLIC_BRAND_FORMAT, family: "INTELLECTUAL", level: "production",
      name: `Page publique — version ${version}`, content: content as Prisma.InputJsonValue,
      state: "ACTIVE", version, parentBrandAssetId: active?.id, sourceIntentId: intentId,
      selectedAt: new Date(), selectedById: actorId, pillarSource: "A",
      metadata: { publicationOrigin: "EXPLICIT_SELECTION", proposalRevision: current.revision,
        sourceReceipts: current.receipts,
        logoAsset: chosenLogo ? { id: chosenLogo.id, version: chosenLogo.version, fileUrl: chosenLogo.fileUrl, fingerprint: chosenLogo.fingerprint } : null,
        ...(logoArchive ? { logoArchive } : {}),
        identityChoice: identityChoice as Prisma.InputJsonValue ?? null, identityArchives: preparedIdentity.archives as unknown as Prisma.InputJsonValue,
        identityPins: preparedIdentity.pins,
        pillarVersions: current.pins.pillars.map((p) => ({ key: p.key, version: p.version })),
        ...(requested.restoreId ? { restoredFromId: requested.restoreId } : {}) },
    } });
    if (logoArchive) content = { ...content, logoUrl: publicLogoSnapshotUrl(edition.id, logoArchive) };
    const publishedContent = preparedIdentity.identity ? { ...content, identity: identityForEdition(preparedIdentity.identity, preparedIdentity.archives, edition.id) } : content;
    edition = await tx.brandAsset.update({ where: { id: edition.id }, data: { content: publishedContent as Prisma.InputJsonValue } });
    if (active) await tx.brandAsset.update({ where: { id: active.id }, data: { supersededById: edition.id } });
    return edition;
  }, { timeout: 60000 });
}

export async function readPublicBrand(slug: string, includeIdentity = false) {
  if (!isBrandPublicSlug(slug)) return null;
  const strategy = await db.strategy.findUnique({ where: { publicSlug: slug }, select: { id: true, status: true } });
  if (!strategy || ["ARCHIVED", "DELETED"].includes(strategy.status)) return null;
  const asset = await db.brandAsset.findFirst({ where: { strategyId: strategy.id, ...scope, state: "ACTIVE" }, orderBy: { version: "desc" } });
  if (!asset) return null;
  const content = includeIdentity && asset.format === PUBLIC_BRAND_IDENTITY_FORMAT ? PublicBrandContentV2.parse(asset.content) : privateContent(asset.content);
  return { schema: includeIdentity && asset.format === PUBLIC_BRAND_IDENTITY_FORMAT ? PUBLIC_BRAND_IDENTITY_FORMAT : PUBLIC_BRAND_FORMAT, slug, edition: asset.id, version: asset.version,
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
    await tx.brandAsset.create({ data: { strategyId, operatorId: state.strategy.operatorId, ...scope, format: PUBLIC_BRAND_FORMAT,
      family: "INTELLECTUAL", name: "Page publique — publication historique observée", state: "ACTIVE",
      content: state.proposed as Prisma.InputJsonValue, sourceIntentId: intentId, pillarSource: "A",
      metadata: { publicationOrigin: "OBSERVED_PUBLICATION", proposalRevision: state.revision, sourceReceipts: state.receipts },
    } });
    return true;
  }, { timeout: 15000 });
}
