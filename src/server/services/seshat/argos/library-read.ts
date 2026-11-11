/**
 * Argos — lectures publiques (SHK-0002 point 5, ADR-0100 amendée).
 *
 * La bibliothèque canonique est Argos-studio : quand `ARGOS_STUDIO_URL` est
 * posée, le mur `/argos`, la fiche `/argos/[ref]`, le pied du championnat et le
 * sitemap lisent `GET /api/v1/references(/{slug})`. `CampaignReferenceDossier`
 * reste le journal de gouvernance (récolte, verdict, revue, projection) et ne
 * sert de lecture publique qu'en repli :
 *   - studio non configuré ou adresse refusée ;
 *   - délai dépassé (borné), réseau/HTTP en erreur ;
 *   - réponse hors de la forme validée (Zod, `@/domain/argos-library`).
 * Chaque lecture rend sa source et sa fraîcheur (`ArgosReadSource`) : jamais
 * d'erreur 500 parce que le studio manque, jamais une copie présentée comme la
 * bibliothèque. Lecture seule : rien n'est écrit dans le journal.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  ARGOS_PUBLIC_REF_RE,
  isPublicHttpLink,
  studioNotFoundSchema,
  studioReferenceDetailSchema,
  studioReferenceListSchema,
  type ArgosLibraryFallbackReason,
  type ArgosReadSource,
  type StudioReference,
} from "@/domain/argos-library";
import { readBoundedJson, SourceReadError } from "../creative-intelligence/source-http";
import { studioBase, studioBaseShape, StudioUrlShapeError } from "./studio-url";
import { slugify } from "./uid";

type DossierRow = Prisma.CampaignReferenceDossierGetPayload<object>;

export interface PublicDossier {
  ref: string;
  brand: string;
  campaign: string | null;
  sector: string | null;
  market: string | null;
  /** Résumé canonique (bibliothèque) ; null pour un dossier du journal. */
  summary: string | null;
  dna: unknown;
  editorial: unknown;
  sources: Array<{ title: string; url: string }>;
  /** Date de publication par La Fusée (journal) ; null pour la bibliothèque. */
  publishedAt: string | null;
  /** Dernière mise à jour de la fiche, quelle que soit la source. */
  updatedAt: string | null;
  /** Fiche complète dans la bibliothèque Argos (source STUDIO seulement). */
  libraryUrl: string | null;
}

export interface PublicDossierList {
  dossiers: PublicDossier[];
  source: ArgosReadSource;
}

export interface PublicDossierRead {
  dossier: PublicDossier | null;
  source: ArgosReadSource;
}

/** Délai total (connexion + corps) d'une lecture publique du studio. */
export const ARGOS_STUDIO_READ_TIMEOUT_MS = 3_000;
/** Après un échec, les lectures suivantes servent le journal sans rappeler le
 * studio pendant ce répit : une panne ne coûte pas le délai à chaque visiteur. */
export const ARGOS_STUDIO_RETRY_AFTER_MS = 30_000;
const MAX_LIST_BYTES = 2_000_000;
const MAX_DETAIL_BYTES = 500_000;

let lastFailure: { at: number; reason: ArgosLibraryFallbackReason } | null = null;

/** Tests uniquement : oublie le dernier échec mémorisé. */
export function resetArgosLibraryReadState(): void {
  lastFailure = null;
}

class StudioReadFailure extends Error {
  constructor(public readonly reason: ArgosLibraryFallbackReason, detail?: string) {
    super(detail ?? reason);
  }
}

// ── Journal (repli) ───────────────────────────────────────────────────────────

function publicLinks(raw: unknown): Array<{ title: string; url: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const { title, url } = s as Record<string, unknown>;
    if (typeof url !== "string" || !isPublicHttpLink(url)) return [];
    return [{ title: typeof title === "string" && title.trim() ? title : url, url }];
  });
}

function journalToPublic(d: DossierRow): PublicDossier {
  return {
    ref: d.ref,
    brand: d.brand,
    campaign: d.campaign,
    sector: d.sector,
    market: d.market,
    summary: null,
    dna: d.dna,
    editorial: d.editorial,
    sources: publicLinks(d.sources),
    publishedAt: d.publishedAt?.toISOString() ?? null,
    updatedAt: d.updatedAt?.toISOString() ?? null,
    libraryUrl: null,
  };
}

const PUBLISHED = { published: true, safetyVerdict: "PASS" } as const;

async function readJournalList(args: { sector?: string; limit: number }): Promise<PublicDossier[]> {
  const rows = await db.campaignReferenceDossier.findMany({
    where: { ...PUBLISHED, ...(args.sector ? { sector: args.sector } : {}) },
    orderBy: { publishedAt: "desc" },
    take: args.limit,
  });
  return rows.map(journalToPublic);
}

async function journalLatestPublishedAt(): Promise<string | null> {
  const latest = await db.campaignReferenceDossier.findFirst({
    where: PUBLISHED,
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true },
  });
  return latest?.publishedAt?.toISOString() ?? null;
}

async function readJournalDossier(ref: string): Promise<PublicDossier | null> {
  const d = await db.campaignReferenceDossier.findUnique({ where: { ref } });
  if (!d || !d.published || d.safetyVerdict !== "PASS") return null;
  return journalToPublic(d);
}

function journalSource(reason: ArgosLibraryFallbackReason, latestPublishedAt: string | null): ArgosReadSource {
  return { origin: "JOURNAL", reason, observedAt: new Date().toISOString(), latestPublishedAt };
}

// ── Bibliothèque canonique (Argos-studio) ─────────────────────────────────────

type StudioTarget =
  | { ok: true; base: string }
  | { ok: false; reason: Extract<ArgosLibraryFallbackReason, "NOT_CONFIGURED" | "MISCONFIGURED"> };

function studioTarget(): StudioTarget {
  const raw = process.env.ARGOS_STUDIO_URL?.trim();
  if (!raw) return { ok: false, reason: "NOT_CONFIGURED" };
  try {
    return { ok: true, base: studioBaseShape(raw).toString() };
  } catch {
    return { ok: false, reason: "MISCONFIGURED" };
  }
}

function studioToPublic(r: StudioReference, base: string): PublicDossier {
  const sections = [
    { title: "Résumé", body: r.summary },
    ...(r.patternObservation ? [{ title: "Lecture du motif", body: r.patternObservation }] : []),
    ...(r.significance ? [{ title: "Portée", body: r.significance }] : []),
    ...(r.axes.length ? [{ title: "Axes de lecture", body: r.axes.map((a) => a.value).join("\n\n") }] : []),
  ].filter((s) => s.body.trim());
  return {
    ref: r.slug,
    brand: r.brandEmitter,
    campaign: r.title === r.brandEmitter ? null : r.title,
    sector: r.sector || null,
    market: r.marketPrimary || null,
    summary: r.summary.trim() || null,
    dna: {},
    editorial: { sections },
    sources: (r.researchSources ?? []).map((s) => ({ title: s.title.trim() || s.url, url: s.url })),
    publishedAt: null,
    updatedAt: r.updatedAt ?? null,
    libraryUrl: new URL(`work/${encodeURIComponent(r.slug)}`, base).toString(),
  };
}

function classify(error: unknown): StudioReadFailure {
  if (error instanceof StudioReadFailure) return error;
  if (error instanceof StudioUrlShapeError) return new StudioReadFailure("MISCONFIGURED", error.message);
  // AbortSignal.timeout rejette avec une DOMException « TimeoutError », au fetch
  // comme pendant la lecture du corps.
  const name = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new StudioReadFailure("TIMEOUT", "délai de lecture dépassé");
  }
  if (error instanceof SyntaxError || error instanceof SourceReadError) {
    return new StudioReadFailure("INVALID_RESPONSE", error.message);
  }
  return new StudioReadFailure("UNREACHABLE", error instanceof Error ? error.message : String(error));
}

/**
 * GET borné. `notFoundIsAnswer` : un 404 au corps exact du studio est une
 * réponse (« la bibliothèque n'a pas cette fiche »), pas une panne.
 */
async function studioGet(
  base: string,
  path: string,
  maxBytes: number,
  notFoundIsAnswer = false,
): Promise<{ status: 200; body: unknown } | { status: 404 }> {
  await studioBase(base); // hôte public (garde SSRF), à chaque lecture
  const response = await fetch(new URL(path, base), {
    method: "GET",
    redirect: "error",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(ARGOS_STUDIO_READ_TIMEOUT_MS),
  });
  if (notFoundIsAnswer && response.status === 404) {
    let body: unknown;
    try {
      body = await readBoundedJson(new Response(response.body, { status: 200, headers: response.headers }), 10_000);
    } catch (error) {
      throw new StudioReadFailure("INVALID_RESPONSE", error instanceof Error ? error.message : "404 illisible");
    }
    if (!studioNotFoundSchema.safeParse(body).success) throw new StudioReadFailure("INVALID_RESPONSE", "404 hors contrat");
    return { status: 404 };
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new StudioReadFailure("UNREACHABLE", `HTTP ${response.status}`);
  }
  return { status: 200, body: await readBoundedJson(response, maxBytes) };
}

function remember(failure: StudioReadFailure): void {
  lastFailure = { at: Date.now(), reason: failure.reason };
  console.warn(`[argos:library-read] lecture du studio refusée (${failure.reason}) : ${failure.message}`);
}

/** Échec récent encore dans son répit → raison à reprendre sans rappeler. */
function coolingDown(): ArgosLibraryFallbackReason | null {
  if (!lastFailure) return null;
  if (Date.now() - lastFailure.at < ARGOS_STUDIO_RETRY_AFTER_MS) return lastFailure.reason;
  lastFailure = null;
  return null;
}

async function fromStudio<T>(read: (base: string) => Promise<T>): Promise<
  { ok: true; value: T } | { ok: false; reason: ArgosLibraryFallbackReason }
> {
  const target = studioTarget();
  if (!target.ok) return target;
  const pending = coolingDown();
  if (pending) return { ok: false, reason: pending };
  try {
    const value = await read(target.base);
    lastFailure = null;
    return { ok: true, value };
  } catch (error) {
    const failure = classify(error);
    remember(failure);
    return { ok: false, reason: failure.reason };
  }
}

// ── Lectures publiques ────────────────────────────────────────────────────────

/** Mur public : bibliothèque canonique, sinon dossiers publiés (PASS) du journal. */
export async function listPublicDossiers(args?: { sector?: string; limit?: number }): Promise<PublicDossierList> {
  const limit = Math.min(Math.max(args?.limit ?? 60, 1), 60);
  const studio = await fromStudio(async (base) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (args?.sector) query.set("sector", slugify(args.sector));
    const { body } = (await studioGet(base, `api/v1/references?${query}`, MAX_LIST_BYTES)) as { status: 200; body: unknown };
    const parsed = studioReferenceListSchema.safeParse(body);
    if (!parsed.success) throw new StudioReadFailure("INVALID_RESPONSE", parsed.error.issues[0]?.message);
    return parsed.data.data.map((r) => studioToPublic(r, base));
  });
  if (studio.ok) {
    return { dossiers: studio.value, source: { origin: "STUDIO", observedAt: new Date().toISOString() } };
  }
  const [dossiers, latestPublishedAt] = await Promise.all([
    readJournalList({ sector: args?.sector, limit }),
    journalLatestPublishedAt(),
  ]);
  return { dossiers, source: journalSource(studio.reason, latestPublishedAt) };
}

/** Fiche publique par ref (slug du studio ou ref du journal en repli). */
export async function getPublicDossierByRef(ref: string): Promise<PublicDossierRead> {
  if (!ARGOS_PUBLIC_REF_RE.test(ref)) {
    // Ni un slug de la bibliothèque (toujours `[a-z0-9-]`) ni une ref du
    // journal : réponse certaine sans appel ni lecture.
    const target = studioTarget();
    return {
      dossier: null,
      source: target.ok
        ? { origin: "STUDIO", observedAt: new Date().toISOString() }
        : journalSource(target.reason, null),
    };
  }
  const studio = await fromStudio(async (base) => {
    const result = await studioGet(base, `api/v1/references/${encodeURIComponent(ref)}`, MAX_DETAIL_BYTES, true);
    if (result.status === 404) return null;
    const parsed = studioReferenceDetailSchema.safeParse(result.body);
    if (!parsed.success) throw new StudioReadFailure("INVALID_RESPONSE", parsed.error.issues[0]?.message);
    return studioToPublic(parsed.data.data, base);
  });
  if (studio.ok) {
    return { dossier: studio.value, source: { origin: "STUDIO", observedAt: new Date().toISOString() } };
  }
  const dossier = await readJournalDossier(ref);
  return { dossier, source: journalSource(studio.reason, dossier?.publishedAt ?? null) };
}

/** Sitemap : toutes les refs publiques de la source servie (bornée à 1 000). */
export async function listPublicDossierEntries(): Promise<{
  entries: Array<{ ref: string; updatedAt: string | null }>;
  source: ArgosReadSource;
}> {
  const studio = await fromStudio(async (base) => {
    const entries: Array<{ ref: string; updatedAt: string | null }> = [];
    for (let offset = 0; offset < 1_000; offset += 100) {
      const { body } = (await studioGet(base, `api/v1/references?limit=100&offset=${offset}`, MAX_LIST_BYTES)) as {
        status: 200;
        body: unknown;
      };
      const parsed = studioReferenceListSchema.safeParse(body);
      if (!parsed.success) throw new StudioReadFailure("INVALID_RESPONSE", parsed.error.issues[0]?.message);
      entries.push(...parsed.data.data.map((r) => ({ ref: r.slug, updatedAt: r.updatedAt ?? null })));
      if (parsed.data.data.length < 100 || offset + 100 >= parsed.data.meta.pagination.total) break;
    }
    return entries;
  });
  if (studio.ok) return { entries: studio.value, source: { origin: "STUDIO", observedAt: new Date().toISOString() } };
  const rows = await db.campaignReferenceDossier.findMany({
    where: PUBLISHED,
    select: { ref: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });
  return {
    entries: rows.map((r) => ({ ref: r.ref, updatedAt: r.updatedAt?.toISOString() ?? null })),
    source: journalSource(studio.reason, rows[0]?.publishedAt?.toISOString() ?? null),
  };
}
