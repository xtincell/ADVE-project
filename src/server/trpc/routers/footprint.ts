/**
 * Funnel de capture — score d'empreinte INSTANTANÉ, public, éphémère.
 *
 * Le hook du tunnel « Scorer ma marque » : un prospect entre nom + site + réseaux
 * et voit un score /100 tout de suite, SANS compte, SANS email (largeur maximale du
 * haut de funnel). Le score d'EMPREINTE (présence digitale) est distinct de la force
 * révélée /200 (ADR-0149) — c'est le teaser qui pousse vers l'intake (capture email).
 *
 * 100 % éphémère : `strategyId: null` ⇒ aucune écriture (les snapshots sont
 * strategyId-gardés ; Apify défère sans clé). Zéro LLM. Rate-limit best-effort par IP.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, operatorProcedure } from "../init";
import { enrichPublicFootprint } from "@/server/services/quick-intake/public-enrichment";
import { computeFootprintScore } from "@/server/services/quick-intake/footprint-score";
import { buildFootprintFacts, parseFootprintFacts } from "@/server/services/quick-intake/footprint-facts";
import type { FollowerCountEntry } from "@/server/services/quick-intake/footprint-types";

/**
 * Normalise les relevés d'audience (stockés en Json `unknown` côté cache, typés
 * côté scan frais) vers une forme stable pour le front — jamais `unknown`.
 */
function asFollowerCounts(value: unknown): FollowerCountEntry[] | null {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e) => ({
      platform: String(e.platform ?? ""),
      handle: String(e.handle ?? ""),
      followerCount: typeof e.followerCount === "number" ? e.followerCount : 0,
      source: (e.source === "CONNECTOR" ? "CONNECTOR" : "APIFY") as "APIFY" | "CONNECTOR",
      capturedAt: String(e.capturedAt ?? ""),
    }));
  return out.length > 0 ? out : null;
}
import {
  normalizeBrandKey,
  lookupLatestFootprint,
  recordFootprintObservation,
  listBrandDirectory,
} from "@/server/services/seshat/brand-registry";

// ── Rate-limit best-effort en mémoire (par instance) ─────────────────────────
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return false;
  }
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

export const footprintRouter = createTRPCRouter({
  /**
   * Score d'empreinte instantané d'une marque (public, éphémère, ne persiste rien).
   * Renvoie le /100 + la ventilation par dimension (honnête : dimension non mesurée
   * exclue du dénominateur ; total null si rien de mesurable).
   */
  scoreInstant: publicProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(120),
        websiteUrl: z.string().max(300).optional(),
        socialLinksRaw: z.string().max(1000).optional(),
        country: z.string().max(2).optional(),
        /** Force un nouveau scan même si une observation récente existe. */
        refresh: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const brandKey = normalizeBrandKey({
        name: input.brandName,
        websiteUrl: input.websiteUrl,
        countryCode: input.country,
      });

      // ── Cache instantané : une marque déjà observée revient sans re-scanner ──
      // (sauf `refresh`). La donnée de Seshat sert le prospect immédiatement.
      // Un snapshot legacy SANS faits (pré-v6.27.174) est traité comme un cache
      // miss : on re-scanne plutôt que servir un rapport sans preuve.
      if (!input.refresh) {
        const cached = await lookupLatestFootprint(brandKey);
        const cachedFacts = cached ? parseFootprintFacts(cached.facts) : null;
        if (cached && cachedFacts) {
          return {
            total: cached.total,
            outOf: 100,
            measuredWeight: cached.measuredWeight,
            dimensions: cached.dimensions,
            followerCounts: asFollowerCounts(cached.followerCounts),
            facts: cachedFacts,
            cached: true,
            capturedAt: cached.capturedAt.toISOString(),
            stale: cached.stale,
          };
        }
      }

      // Un vrai scan (ou un refresh) consomme le budget → rate-limité par IP.
      const ip = ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
      if (!rateLimit(ip)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Trop de scores demandés. Réessayez dans une minute.",
        });
      }

      const enriched = await enrichPublicFootprint({
        companyName: input.brandName.trim(),
        websiteUrl: input.websiteUrl?.trim() || null,
        socialLinksRaw: input.socialLinksRaw?.trim() || null,
        country: input.country?.trim() || null,
        strategyId: null, // pas de FollowerSnapshot par-client — persistance via le répertoire Seshat
        // Bug prod 2026-07-16 : 8s de budget total → le fetch du site pouvait
        // tout consommer et l'étage des signaux GRATUITS (domaine/email/perf,
        // gardé par remaining()>3s) sautait en silence — score 0 « Critique »
        // avec un site renseigné. La copy promet 30 secondes : on les donne.
        budgetMs: 25_000,
      });
      const score = computeFootprintScore(enriched);
      // On garde `label` + `details` (la preuve factuelle « sur quoi ça se base »)
      // — persistés dans le snapshot et renvoyés au front pour le rapport dense.
      const dimensions = score.dimensions.map((d) => ({
        key: d.key,
        label: d.label,
        details: d.details,
        measured: d.measured,
        score: d.score,
        weight: d.weight,
      }));

      // La PREUVE du score : faits observés (réseaux + handles + audiences,
      // presse titres + liens, domaine, email, avis, perf). Renvoyée au front
      // ET persistée — le cache montre la même chose qu'un scan frais.
      const facts = buildFootprintFacts(enriched);

      // ── Persistance dans la base de marques de Seshat (jamais perdu) ─────────
      const saved = await recordFootprintObservation({
        name: input.brandName,
        websiteUrl: input.websiteUrl,
        countryCode: input.country,
        sectorSlug: null, // le /scorer ne collecte pas le secteur — honnête (jamais deviné)
        total: score.total,
        measuredWeight: score.measuredWeight,
        dimensions,
        followerCounts: enriched.followerCounts,
        facts,
      });

      return {
        total: score.total, // number | null
        outOf: score.outOf, // 100
        measuredWeight: score.measuredWeight,
        dimensions,
        followerCounts: asFollowerCounts(enriched.followerCounts),
        facts,
        // POURQUOI l'audience n'est pas relevée (remontée opérateur 2026-07-16 :
        // « pourquoi ça ne récupère pas les réseaux ? ») — DEFERRED = clé de
        // collecte non configurée côté plateforme ; DEGRADED = collecte tentée
        // mais en échec/timeout ; LIVE = relevée ; SKIPPED = aucun compte.
        audienceStatus: enriched.enrichment.apify,
        cached: false,
        capturedAt: (saved?.capturedAt ?? new Date()).toISOString(),
        stale: false,
      };
    }),

  /** Console (opérateur) : la base de marques de Seshat — dernière observation par marque. */
  directory: operatorProcedure
    .input(z.object({ limit: z.number().min(1).max(500).optional() }).optional())
    .query(async ({ input }) => {
      const rows = await listBrandDirectory(input?.limit ?? 200);
      return rows.map((r) => ({ ...r, lastCapturedAt: r.lastCapturedAt.toISOString() }));
    }),
});
