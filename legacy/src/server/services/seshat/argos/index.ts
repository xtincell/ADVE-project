/**
 * Argos by LaFusée — service Hunter (sous-domaine Seshat). ADR-0083 + ADR-0100.
 *
 * Réimplémentation SOUS GOUVERNANCE du harvester (le code vendored
 * docs/external-design/argos-hunter-v1 reste gelé, jamais importé/exécuté) :
 *   - Hunter (LLM) passe par le LLM Gateway (executeStructuredLLMCall), JAMAIS
 *     d'appel Anthropic direct.
 *   - persistance Prisma (jamais localStorage).
 *   - verdict de sûreté DÉTERMINISTE ; auto-publish ⇔ PASS.
 *   - parité manual-first (ADR-0060) : createReferenceDossierManual (zéro LLM).
 * Hunter = sub-agent, PAS un Neter. Cap APOGEE 7/7 préservé.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { executeStructuredLLMCall } from "@/server/services/utils/llm-structured";
import { computeSafetyVerdict } from "./safety";
import { dossierRef, brandUid, campaignUid } from "./uid";
import {
  harvestOutputSchema,
  type HarvestOutput,
  type ManualDossierInput,
} from "./schemas";

type DossierRow = Prisma.CampaignReferenceDossierGetPayload<object>;

interface PersistInput {
  brand: string;
  campaign?: string;
  sector?: string;
  market?: string;
  dna: HarvestOutput["dna"];
  editorial?: HarvestOutput["editorial"] | null;
  sources?: HarvestOutput["sources"];
  origin: "HUNTER" | "MANUAL";
  intentEmissionId?: string;
}

/** Upsert par ref + verdict sûreté déterministe + auto-publish si PASS. */
export async function persistDossier(input: PersistInput): Promise<DossierRow> {
  const { verdict, reasons } = computeSafetyVerdict({ dna: input.dna, editorial: input.editorial });
  const ref = dossierRef(input.brand, input.campaign);
  const published = verdict === "PASS";
  const now = new Date();

  const common = {
    brand: input.brand,
    brandUid: brandUid(input.brand),
    campaign: input.campaign ?? null,
    campaignUid: input.campaign ? campaignUid(input.campaign) : null,
    sector: input.sector ?? null,
    market: input.market ?? null,
    dna: input.dna as unknown as Prisma.InputJsonValue,
    editorial: (input.editorial ?? undefined) as Prisma.InputJsonValue | undefined,
    sources: (input.sources ?? undefined) as Prisma.InputJsonValue | undefined,
    safetyVerdict: verdict,
    safetyReasons: reasons as unknown as Prisma.InputJsonValue,
    published,
    publishedAt: published ? now : null,
    origin: input.origin,
    intentEmissionId: input.intentEmissionId ?? null,
  };

  return db.campaignReferenceDossier.upsert({
    where: { ref },
    create: { ref, ...common },
    update: common,
  });
}

/** Hunter (LLM via Gateway). Récolte un dossier de référence pour une marque. */
export async function harvestReference(input: {
  brand: string;
  campaign?: string;
  sector?: string;
  market?: string;
  topics?: string[];
  intentEmissionId?: string;
}): Promise<DossierRow> {
  const system = [
    "Tu es Hunter, l'agent de recherche d'Argos by LaFusée.",
    "Tu produis un DOSSIER DE RÉFÉRENCE (DNA + editorial) sur une marque/campagne emblématique,",
    "à des fins d'inspiration créative pour le marché africain francophone.",
    "Base-toi sur des références PUBLIQUES connues. Ne fabrique JAMAIS de sources : si tu n'es pas",
    "sûr d'une URL, laisse `sources` vide. Rédige en français, précis et exploitable.",
    "dna.keyPhrases = formules signature ; dna.axes = axes culturels ; dna.voice = ton de marque.",
  ].join("\n");

  // ── Ancrage internet RÉEL via Brave (ADR-0108) ──────────────────────────────
  // owl-alpha n'a pas de recherche web native → Hunter passe par le point d'accès
  // internet canonique de Seshat (Brave). On récolte d'abord des résultats réels,
  // on les fournit comme grounding NEUTRALISÉ (OWASP LLM01), et on récupère de
  // VRAIES URLs pour `sources` au lieu de laisser le LLM les halluciner. Sans clé
  // Brave → DEFERRED honnête : Hunter retombe sur le rappel LLM (comportement
  // historique), jamais de hard-fail.
  const { braveWebSearch, formatWebHits } = await import("@/server/services/seshat/web-search");
  const { wrapUntrusted } = await import("@/server/services/utils/untrusted-content");
  const searchQuery = [input.brand, input.campaign, input.sector, "campagne publicitaire"]
    .filter(Boolean)
    .join(" ");
  const search = await braveWebSearch(searchQuery, { count: 6 });
  const realHits = search.status === "OK" ? search.hits : [];
  const realUrls = realHits.map((h) => h.url);
  const groundingBlock = realHits.length
    ? `\n\n${wrapUntrusted("RÉSULTATS WEB RÉELS (Brave)", formatWebHits(realHits), { max: 6000 })}\n` +
      "Ancre le dossier sur ces résultats réels. Pour `sources`, n'utilise QUE des URLs ci-dessus."
    : "";

  const prompt = [
    `Marque : ${input.brand}`,
    input.campaign ? `Campagne : ${input.campaign}` : "",
    input.sector ? `Secteur : ${input.sector}` : "",
    input.market ? `Marché : ${input.market}` : "",
    input.topics?.length ? `Angles à couvrir : ${input.topics.join(", ")}` : "",
    "Produis le dossier de référence complet (DNA + editorial.sections).",
    groundingBlock,
  ]
    .filter(Boolean)
    .join("\n");

  const { data } = await executeStructuredLLMCall<HarvestOutput>({
    system,
    prompt,
    schema: harvestOutputSchema,
    caller: "argos:hunter",
    schemaTitle: "CampaignReferenceDossier",
    maxOutputTokens: 3000,
  });

  // Sources = priorité aux VRAIES sources Brave (title+url réels) ; complétées
  // par celles du LLM dont l'URL figure parmi les résultats réels (anti-hallu).
  const llmSources = data.sources ?? [];
  let sources = llmSources;
  if (realHits.length) {
    const seen = new Set<string>();
    const merged: HarvestOutput["sources"] = [];
    for (const h of realHits) {
      if (seen.has(h.url)) continue;
      seen.add(h.url);
      merged.push({ title: (h.title || h.url).slice(0, 200), url: h.url.slice(0, 2000) });
    }
    for (const s of llmSources) {
      if (realUrls.includes(s.url) && !seen.has(s.url)) {
        seen.add(s.url);
        merged.push(s);
      }
    }
    sources = merged.slice(0, 8);
  }

  return persistDossier({
    brand: data.brand || input.brand,
    campaign: data.campaign ?? input.campaign,
    sector: data.sector ?? input.sector,
    market: data.market ?? input.market,
    dna: data.dna,
    editorial: data.editorial,
    sources,
    origin: "HUNTER",
    intentEmissionId: input.intentEmissionId,
  });
}

/** Création manuelle (parité manual-first, zéro LLM). */
export async function createReferenceDossierManual(
  input: ManualDossierInput & { intentEmissionId?: string },
): Promise<DossierRow> {
  return persistDossier({
    brand: input.brand,
    campaign: input.campaign,
    sector: input.sector,
    market: input.market,
    dna: input.dna,
    editorial: input.editorial ?? { sections: [] },
    sources: input.sources ?? [],
    origin: "MANUAL",
    intentEmissionId: input.intentEmissionId,
  });
}

// ── Lectures ───────────────────────────────────────────────────────────────────

/** Liste opérateur (tous statuts). */
export async function listDossiers(args?: { sector?: string; limit?: number }) {
  return db.campaignReferenceDossier.findMany({
    where: { ...(args?.sector ? { sector: args.sector } : {}) },
    orderBy: { createdAt: "desc" },
    take: args?.limit ?? 100,
  });
}

export async function getDossierById(id: string) {
  return db.campaignReferenceDossier.findUnique({ where: { id } });
}

/** Décision opérateur : override verdict + (dé)publication. */
export async function setDossierVerdict(args: {
  id: string;
  verdict: "PASS" | "QUARANTINE" | "REJECT";
  reviewedBy: string;
}): Promise<DossierRow> {
  const published = args.verdict === "PASS";
  return db.campaignReferenceDossier.update({
    where: { id: args.id },
    data: {
      safetyVerdict: args.verdict,
      published,
      publishedAt: published ? new Date() : null,
      reviewedBy: args.reviewedBy,
    },
  });
}

// ── Projection publique (apps Argos /argos) ────────────────────────────────────

export interface PublicDossier {
  ref: string;
  brand: string;
  campaign: string | null;
  sector: string | null;
  market: string | null;
  dna: unknown;
  editorial: unknown;
  sources: Array<{ title: string; url: string }>;
  publishedAt: string | null;
}

function toPublicDossier(d: DossierRow): PublicDossier {
  return {
    ref: d.ref,
    brand: d.brand,
    campaign: d.campaign,
    sector: d.sector,
    market: d.market,
    dna: d.dna,
    editorial: d.editorial,
    sources: Array.isArray(d.sources) ? (d.sources as Array<{ title: string; url: string }>) : [],
    publishedAt: d.publishedAt?.toISOString() ?? null,
  };
}

/** Mur public : dossiers publiés ET PASS uniquement. */
export async function listPublicDossiers(args?: { sector?: string; limit?: number }): Promise<PublicDossier[]> {
  const rows = await db.campaignReferenceDossier.findMany({
    where: { published: true, safetyVerdict: "PASS", ...(args?.sector ? { sector: args.sector } : {}) },
    orderBy: { publishedAt: "desc" },
    take: args?.limit ?? 60,
  });
  return rows.map(toPublicDossier);
}

export async function getPublicDossierByRef(ref: string): Promise<PublicDossier | null> {
  const d = await db.campaignReferenceDossier.findUnique({ where: { ref } });
  if (!d || !d.published || d.safetyVerdict !== "PASS") return null;
  return toPublicDossier(d);
}
