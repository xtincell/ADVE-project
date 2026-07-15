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
import { createTRPCRouter, publicProcedure } from "../init";
import { enrichPublicFootprint } from "@/server/services/quick-intake/public-enrichment";
import { computeFootprintScore } from "@/server/services/quick-intake/footprint-score";

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
      }),
    )
    .mutation(async ({ input, ctx }) => {
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
        strategyId: null, // éphémère — aucune écriture
        budgetMs: 8_000,
      });
      const score = computeFootprintScore(enriched);

      return {
        total: score.total, // number | null
        outOf: score.outOf, // 100
        measuredWeight: score.measuredWeight,
        dimensions: score.dimensions.map((d) => ({
          key: d.key,
          measured: d.measured,
          score: d.score,
          weight: d.weight,
        })),
        followerCounts: enriched.followerCounts ?? null,
      };
    }),
});
