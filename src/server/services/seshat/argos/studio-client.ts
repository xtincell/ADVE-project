/**
 * SHK-0002: governed journal → canonical library. Never fabricate a license or taxonomy.
 *
 * Contrat d'écriture d'Argos-studio (`app/src/app/api/v1/ingest/dossier/route.ts`) :
 * une référence existante ne s'amende qu'avec `If-Match` portant sa version
 * courante, l'ETag de `GET /api/v1/references/{slug}?format=dossier`. La
 * projection lit donc cette version (même clé, sans redirection, délai borné)
 * puis écrit une seule fois : 201 création, 200 amendement ou même contenu
 * rejoué, 409 conflit qualifié — jamais lu comme une panne, jamais relancé
 * en boucle. Le studio archive la version remplacée (ReferenceRevision).
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import type { ConnectorDegradationReason } from "@/domain/connector-result";
import {
  argosStudioSlug,
  parseArgosStudioVersion,
  projectArgosInput,
  type ArgosProjectionChange,
  type ArgosProjectionDetail,
} from "@/domain/argos-projection";
import { credentialVault } from "@/server/services/anubis/credential-vault";
import { readBoundedJson, SourceReadError } from "../creative-intelligence/source-adapters";
import { computeSafetyVerdict, type DossierDnaLike, type DossierEditorialLike } from "./safety";
import { studioBase, StudioUrlShapeError } from "./studio-url";

export { studioEndpoint } from "./studio-url";

/** Lecture de version + écriture tiennent dans le p95 de 20 s du kind SESHAT_PROJECT_ARGOS_DOSSIER. */
const VERSION_READ_TIMEOUT_MS = 5_000;
const WRITE_TIMEOUT_MS = 15_000;

const receiptSchema = z.object({
  ok: z.literal(true),
  slug: z.string().min(1).max(200),
  assetCount: z.number().int().nonnegative(),
  newlyCreated: z.boolean(),
  /** Version de la fiche après l'écriture (horodatage du studio). */
  updatedAt: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).optional(),
});
const remoteRefusalSchema = z.object({ ok: z.literal(false), error: z.string().regex(/^[A-Z_]{1,64}$/) });

type Degraded = { state: "DEGRADED"; reason: ConnectorDegradationReason; detail?: ArgosProjectionDetail };
type VersionRead = { found: true; version: string } | { found: false } | Degraded;

const degraded = (reason: ConnectorDegradationReason, detail?: ArgosProjectionDetail): Degraded =>
  detail ? { state: "DEGRADED", reason, detail } : { state: "DEGRADED", reason };

/** Même classement que `readBoundedJson` : un refus d'accès n'est pas une panne. */
const statusReason = (status: number): ConnectorDegradationReason =>
  status === 429 ? "RATE_LIMITED" : status === 401 || status === 403 ? "AUTH_REVOKED" : "VENDOR_OUTAGE";

/** Code d'erreur du corps de refus du studio (`{ ok: false, error }`), borné ; null hors contrat. */
async function remoteErrorCode(response: Response): Promise<string | null> {
  try {
    const body = await readBoundedJson(new Response(response.body, { status: 200, headers: response.headers }), 20_000);
    const parsed = remoteRefusalSchema.safeParse(body);
    return parsed.success ? parsed.data.error : null;
  } catch {
    return null;
  }
}

async function readCurrentVersion(base: URL, slug: string, auth: Record<string, string>): Promise<VersionRead> {
  const response = await fetch(new URL(`api/v1/references/${encodeURIComponent(slug)}?format=dossier`, base), {
    method: "GET",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(VERSION_READ_TIMEOUT_MS),
    headers: { Accept: "application/json", ...auth },
  });
  if (response.status === 200) {
    const version = parseArgosStudioVersion(response.headers.get("etag"));
    await response.body?.cancel().catch(() => {});
    return version ? { found: true, version } : degraded("VENDOR_OUTAGE", "VERSION_UNREADABLE");
  }
  if (response.status === 404) {
    return (await remoteErrorCode(response)) === "NOT_FOUND" ? { found: false } : degraded("VENDOR_OUTAGE", "VERSION_UNREADABLE");
  }
  if (response.status === 409) {
    return (await remoteErrorCode(response)) === "SOURCE_DOSSIER_UNAVAILABLE"
      ? degraded("MISSING_PREREQUISITE", "SOURCE_DOSSIER_UNAVAILABLE")
      : degraded("VENDOR_OUTAGE", "VERSION_UNREADABLE");
  }
  await response.body?.cancel().catch(() => {});
  return degraded(statusReason(response.status));
}

export async function projectToArgosStudio(input: z.infer<typeof projectArgosInput>, operatorId: string | null) {
  input = projectArgosInput.parse(input);
  const journal = await db.campaignReferenceDossier.findUnique({ where: { id: input.dossierId } });
  if (!journal || journal.safetyVerdict !== "PASS" || !journal.reviewedBy) throw new TRPCError({ code: "BAD_REQUEST", message: "La projection requiert un dossier PASS revu par un opérateur." });
  const safety = computeSafetyVerdict({ dna: journal.dna as DossierDnaLike, editorial: { sections: [...((journal.editorial as DossierEditorialLike)?.sections ?? []), { title: "Projection", body: JSON.stringify(input.dossier) }] } });
  if (safety.verdict !== "PASS") throw new TRPCError({ code: "BAD_REQUEST", message: "Le dossier ne satisfait plus les conditions de publication." });
  const operation = input.dossier.operation;
  if (operation.brandEmitter !== journal.brand || operation.title !== (journal.campaign ?? journal.brand) || operation.sector !== journal.sector || operation.marketPrimary !== journal.market) throw new TRPCError({ code: "BAD_REQUEST", message: "Le contrat doit correspondre au dossier gouverné (marque, campagne, secteur, marché)." });
  const knownSources = z.array(z.object({ url: z.string() })).safeParse(journal.sources);
  if (!knownSources.success || input.dossier.sources.some(s => !knownSources.data.some(k => k.url === s.url))) throw new TRPCError({ code: "BAD_REQUEST", message: "Chaque source projetée doit appartenir au dossier gouverné." });
  const credential = operatorId ? await credentialVault.get(operatorId, "argos-studio") : null;
  if (!credential || typeof credential.config.baseUrl !== "string") return { state: "DEFERRED_AWAITING_CREDENTIALS" as const, connectorId: "argos-studio" };
  const payload = JSON.stringify(input.dossier), payloadHash = createHash("sha256").update(payload).digest("hex");
  const slug = argosStudioSlug(operation);
  const auth: Record<string, string> = typeof credential.config.apiKey === "string" && credential.config.apiKey ? { Authorization: `Bearer ${credential.config.apiKey}` } : {};
  // Each non-LIVE outcome keeps what was attempted, for the governed emission that stores it.
  const trace = { slug, payloadHash };
  let readVersion: string | null = null;
  try {
    const base = await studioBase(credential.config.baseUrl);
    const current = await readCurrentVersion(base, slug, auth);
    if ("state" in current) return { ...current, ...trace, readVersion };
    readVersion = current.found ? current.version : null;
    const response = await fetch(new URL("api/v1/ingest/dossier", base), {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
      headers: { "Content-Type": "application/json", ...auth, ...(readVersion ? { "If-Match": JSON.stringify(readVersion) } : {}) },
      body: payload,
    });
    if (response.status === 422 || response.status === 400) { await response.body?.cancel().catch(() => {}); return { ...degraded("MISSING_PREREQUISITE", "REMOTE_CONTRACT_REJECTED"), ...trace, readVersion }; }
    if (response.status === 409) {
      const code = await remoteErrorCode(response);
      // One write only: a conflict is reported, the operator decides whether to project again.
      if (code === "VERSION_CONFLICT" || code === "VISIBILITY_CONFLICT") return { ...degraded("MISSING_PREREQUISITE", code), ...trace, readVersion };
      return { ...degraded("VENDOR_OUTAGE"), ...trace, readVersion };
    }
    const receipt = receiptSchema.parse(await readBoundedJson(response, 100000));
    const change: ArgosProjectionChange = receipt.newlyCreated ? "CREATED" : receipt.updatedAt === readVersion ? "UNCHANGED" : "AMENDED";
    // This response is stored by the outer governed emission, separately from local PASS/publication.
    return { state: "LIVE" as const, observedAt: new Date().toISOString(), dossierId: journal.id, payloadHash, readVersion, change, receipt };
  } catch (error) {
    if (error instanceof StudioUrlShapeError) return { ...degraded("MISSING_PREREQUISITE", "ENDPOINT_REFUSED"), ...trace, readVersion };
    return { ...degraded(error instanceof SourceReadError ? error.reason : "VENDOR_OUTAGE"), ...trace, readVersion };
  }
}
