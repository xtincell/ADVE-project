/** SHK-0002: governed journal → canonical library. Never fabricate a license or taxonomy. */
import { createHash } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { assertPublicUrl } from "@/lib/net/ssrf-guard";
import { projectArgosInput } from "@/domain/argos-projection";
import { credentialVault } from "@/server/services/anubis/credential-vault";
import { readBoundedJson, SourceReadError } from "../creative-intelligence/source-adapters";
import { computeSafetyVerdict, type DossierDnaLike, type DossierEditorialLike } from "./safety";

export async function studioEndpoint(baseUrl: string) {
  const url = await assertPublicUrl(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Endpoint Argos HTTPS public requis, sans paramètres ni identifiants.");
  return new URL("api/v1/ingest/dossier", url.toString().replace(/\/?$/, "/"));
}
const receiptSchema = z.object({ ok: z.literal(true), slug: z.string().min(1).max(200), assetCount: z.number().int().nonnegative(), newlyCreated: z.boolean() });
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
  try {
    const endpoint = await studioEndpoint(credential.config.baseUrl);
    const response = await fetch(endpoint, { method: "POST", redirect: "error", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/json", ...(typeof credential.config.apiKey === "string" && credential.config.apiKey ? { Authorization: `Bearer ${credential.config.apiKey}` } : {}) }, body: payload });
    if (response.status === 422 || response.status === 400) { await response.body?.cancel(); return { state: "DEGRADED" as const, reason: "MISSING_PREREQUISITE" as const, detail: "REMOTE_CONTRACT_REJECTED" }; }
    const receipt = receiptSchema.parse(await readBoundedJson(response, 100000));
    // This response is stored by the outer governed emission, separately from local PASS/publication.
    return { state: "LIVE" as const, observedAt: new Date().toISOString(), dossierId: journal.id, payloadHash, receipt };
  } catch (error) { return { state: "DEGRADED" as const, reason: error instanceof SourceReadError ? error.reason : "VENDOR_OUTAGE" as const }; }
}
