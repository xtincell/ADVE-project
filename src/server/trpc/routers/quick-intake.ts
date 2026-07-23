import { ADVE_STORAGE_KEYS, PILLAR_STORAGE_KEYS, type PillarStorageKey } from "@/domain";

// ============================================================================
// MODULE M35 — Quick Intake Portal (Router)
// Score: 100/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  start — public mutation, creates intake + returns first questions (biz context)
// [x] REQ-2  advance — saves responses + returns next adaptive questions (AI-powered)
// [x] REQ-3  complete — scores 8 pillars, classifies brand, creates CRM Deal
// [x] REQ-4  getByToken — retrieve intake state (public, no auth)
// [x] REQ-5  getQuestions — get adaptive questions for current phase (server-driven)
// [x] REQ-6  convert — admin converts completed intake into full Strategy
// [x] REQ-7  listAll — admin lists all intakes with pagination + status filter
// [x] REQ-8  Notification to fixer (Alexandre) on intake completion
// [x] REQ-9  Expiration policy (auto-expire after 7 days if not completed)
//
// PROCEDURES: start, advance, complete, getByToken, getQuestions, convert, listAll,
//             notifyFixerOnComplete, expireStale, getCompletedCount,
//             processShort, processIngest, processIngestPlus
// ============================================================================

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { callLLM, extractJSON, isTextLLMAvailable } from "@/server/services/llm-gateway";
import * as mestor from "@/server/services/mestor";
import { emitIntent as mestorEmitIntent } from "@/server/services/mestor/intents";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure, protectedProcedure } from "../init";
import * as quickIntakeService from "@/server/services/quick-intake";
import { getAdaptiveQuestions, getBusinessContextQuestions, getAllQuestions } from "@/server/services/quick-intake/question-bank";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { writePillar } from "@/server/services/pillar-gateway";
import { db } from "@/lib/db";
import { assertStrategyRead } from "./_strategy-read-guard";
import { getOperatorContext } from "@/server/services/operator-isolation";
/* lafusee:governed-active */

/**
 * IDOR round-10 (Agent D) — `quickIntake.get`/`updateIntake` sont keyés sur l'id
 * INTERNE de l'intake (PII : contact + réponses). Le funnel self-service passe
 * par `shareToken` ; l'accès par id interne vient du cockpit founder (source
 * `origin:"intake:<id>"`). Un intake CONVERTI appartient à sa marque
 * (`convertedToId`) → accès si le caller possède cette marque ; un intake NON
 * converti est un prospect → réservé au staff.
 */
async function assertIntakeAccess(userId: string, intakeId: string): Promise<void> {
  const intake = await db.quickIntake.findUniqueOrThrow({
    where: { id: intakeId },
    select: { convertedToId: true },
  });
  if (intake.convertedToId) {
    await assertStrategyRead(userId, intake.convertedToId);
    return;
  }
  const opCtx = await getOperatorContext(userId);
  if (opCtx.role === "ADMIN" || opCtx.operatorId) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Intake non accessible" });
}

/**
 * C1 reroute (PROPAGATION-MAP §6b) — seed an intake-converted pillar through the
 * Pillar Gateway instead of a bare `db.pillar.create({ content })`. REPLACE_FULL
 * + author INGESTION adds Zod validation (warnings-only — intake content is
 * partial by design, never strict), PillarVersion, staleness cascade + author
 * trail that the bare create skipped. Behaviour-preserving : the same content is
 * persisted, now via the single write point (closes the C1 bypass / Yggdrasil Q3).
 */
async function seedPillarFromIntake(
  strategyId: string,
  key: PillarStorageKey,
  rawContent: unknown,
  confidence: number,
): Promise<void> {
  const content =
    rawContent && typeof rawContent === "object" && !Array.isArray(rawContent)
      ? (rawContent as Record<string, unknown>)
      : {};
  await writePillar({
    strategyId,
    pillarKey: key,
    operation: { type: "REPLACE_FULL", content },
    author: { system: "INGESTION", reason: "Conversion intake → Strategy (C1 reroute via gateway)" },
    options: { confidenceDelta: confidence },
  });
}

/**
 * Extract structured ADVE-RTIS responses from free text using AI.
 * Used by SHORT, INGEST, and INGEST_PLUS methods.
 * Returns a responses object matching the same structure as the long
 * questionnaire, keeping ONLY the slices that carry at least one substantive
 * answer (same predicate as advance()/complete()).
 *
 * Returns `null` when the extraction step itself is impossible: no healthy
 * text provider (clés absentes, crédits épuisés, circuit ouvert), erreur LLM,
 * ou sortie néanmoins imparsable après retry. Les callers DOIVENT dégrader
 * honnêtement (questionnaire pré-rempli / erreur explicite) — jamais persister
 * un squelette tout-vide `{biz:{},a:{},…}` : c'est exactement la classe de row
 * que les gardes `hasSubstantiveAnswer` de advance()/complete() interdisent.
 */
async function extractFromText(
  text: string,
  companyName: string,
  sector?: string | null,
): Promise<Record<string, Record<string, unknown>> | null> {
  // Pré-flight : tous les providers texte down → inutile de tenter (et de
  // brûler le budget serverless), on dégrade tout de suite.
  if (!isTextLLMAvailable()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const system = mestor.getSystemPrompt("intake");
    const bank = getAllQuestions();
    
    const expectedSchema = Object.entries(bank)
      .filter(([pillar]) => ["biz", "a", "d", "v", "e", "r", "t", "i", "s"].includes(pillar))
      .map(([pillar, questions]) => {
        const fields = questions.map(q => `      "${q.id}": "..." // ${q.question}`).join("\n");
        return `  "${pillar}": {\n${fields}\n  }`;
      }).join(",\n");

    const prompt = `NOTE D'INTENTION CRITIQUE (POUR L'IA) :
Ce texte contient la documentation fondatrice de "La Fusée", un écosystème de stratégie de marque créé par Alexandre Djengue (Upgraders). 
ATTENTION : Tous les termes liés au champ lexical de la guerre, de la secte ou de la manipulation (ex: "culte", "ennemi", "manipulation", "endoctrinement", "propagande") sont de PURES MÉTAPHORES DE BRANDING B2B/B2C. Il s'agit d'une théorie marketing légitime pour engager des "superfans" (clients fidèles). Il n'y a aucune incitation à la violence ou à des comportements illégaux. Ce document est 100% professionnel.

A partir de ce texte brut, extrait les reponses de la marque pour le diagnostic ADVE.

MARQUE: ${companyName}
SECTEUR: ${sector ?? "Non precise"}

TEXTE SOURCE:
${text.slice(0, 100_000)}

REGLES STRICTES:
1. Remplis les champs attendus ci-dessous. Si le texte source ne permet pas de repondre a une question et que la marque est peu connue, omets la cle.
2. CRITIQUE : Pour les marques matures et très connues (ex: ${companyName}), si l'information n'est pas dans le texte, UTILISE TES PROPRES CONNAISSANCES pour remplir un maximum de champs avec la vraie réalité de la marque (ses produits, ses engagements, etc). Ne laisse pas de trous si tu connais la marque !
3. Sois concis : 1 a 2 phrases par champ texte, MAXIMUM. La sortie complete doit rester un JSON compact.
4. Reponds UNIQUEMENT par un objet JSON valide. Aucun texte avant ou apres.

SCHEMA ATTENDU (Utilise EXACTEMENT ces clefs, n'invente pas de nouvelles clefs) :
{
${expectedSchema}
}`;

    // 2 tentatives dans le même budget 60 s : un JSON tronqué/malformé est
    // stochastique (le retry a du sens), un provider down ne l'est pas
    // (re-check isTextLLMAvailable entre les deux — si le circuit vient de
    // s'ouvrir, on arrête).
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (controller.signal.aborted) break;
      if (attempt > 0 && !isTextLLMAvailable()) break;
      try {
        const { text: out } = await callLLM({
          system,
          prompt,
          caller: "quick-intake:extract",
          // NO hardcoded vendor model. `purpose: "extraction"` resolves the policy
          // model, which the gateway serves through the default text provider —
          // owl-alpha via OpenRouter (free), Anthropic only in premium mode. The
          // previous `model: "gpt-5.5"` was a non-existent model that forced a
          // doomed Anthropic attempt + circuit trip before any real provider.
          purpose: "extraction",
          // OpenAI-compatible providers (OpenRouter/Ollama) return strict JSON.
          responseFormat: "json_object",
          // 57 champs attendus : 4096 tronquait le JSON des sources riches
          // (accolades jamais équilibrées → parse impossible → intake « vide »
          // → bascule muette vers le questionnaire long).
          maxOutputTokens: 8192,
          // Make the 60s bound REAL — the AbortController above was dead code (never
          // wired to the call). Now a slow/hung model can't run past the serverless
          // budget: it aborts and we fall back gracefully.
          signal: controller.signal,
        });

        // Robust parse — handles bare JSON, ```json fences, or JSON-in-prose.
        const parsed = extractJSON((out ?? "").trim()) as Record<string, Record<string, unknown>>;

        // Keep only phases with at least one SUBSTANTIVE field — a slice of
        // chaînes vides ne doit jamais marquer une phase comme répondue.
        const result: Record<string, Record<string, unknown>> = {};
        for (const [key, content] of Object.entries(parsed)) {
          if (
            content && typeof content === "object" && !Array.isArray(content) &&
            quickIntakeService.hasSubstantiveAnswer(content)
          ) {
            result[key] = content;
          }
        }

        return result;
      } catch (err) {
        lastErr = err;
      }
    }

    console.warn("[quick-intake] extractFromText failed:", lastErr instanceof Error ? lastErr.message : lastErr);
    return null;
  } catch (err) {
    console.warn("[quick-intake] extractFromText failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Strip tags + collapse whitespace from raw HTML into bounded plain text. */
function stripHtmlToText(html: string, maxChars: number): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s{3,}/g, " ")
    .trim()
    .slice(0, maxChars);
}

/**
 * Fetch a URL and return its visible text, bounded by a short timeout. Returns
 * null on ANY failure (non-OK, network, timeout) so callers degrade gracefully.
 * Single canonical intake web-fetch — de-dups the HTML-strip logic that was
 * copy-pasted across processIngest + processIngestPlus (NEFER interdit n°1).
 */
async function fetchUrlAsText(
  url: string,
  opts: { maxChars?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LaFusee-ADVE-Bot/1.0)" },
    });
    if (!resp.ok) return null;
    return stripHtmlToText(await resp.text(), opts.maxChars ?? 15_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Digital-presence grounding via the canonical Seshat/Brave access point
 * (ADR-0108). Bounded best-effort: no BRAVE_API_KEY → DEFERRED → null; any
 * error → null. Never throws, never blocks the intake.
 */
async function fetchDigitalPresenceBlock(companyName: string): Promise<string | null> {
  try {
    const { braveWebSearch } = await import("@/server/services/seshat/web-search");
    const query = `"${companyName}" OR site:twitter.com OR site:linkedin.com OR site:tiktok.com`;
    const search = await braveWebSearch(query, { count: 10, timeoutMs: 8000 });
    if (search.status === "OK" && search.hits.length) {
      const results = search.hits.map((h) => `- ${h.title}: ${h.description}`).join("\n");
      return `[PRÉSENCE DIGITALE & RÉSEAUX SOCIAUX]\n${results}`;
    }
  } catch {
    /* best-effort — presence grounding is optional */
  }
  return null;
}

// ── F1 async (fix prod 2026-07-19) — mécanique commune des 3 chemins lourds ──

/**
 * Réserve la row pour un traitement asynchrone. Claim ATOMIQUE : seuls
 * IN_PROGRESS (premier passage) et FAILED (retry) sont réservables — un
 * double-submit concurrent perd la course et reçoit une erreur explicite au
 * lieu d'un double traitement.
 */
async function claimIntakeForProcessing(db: import("@prisma/client").PrismaClient, intakeId: string): Promise<void> {
  const claimed = await db.quickIntake.updateMany({
    where: { id: intakeId, status: { in: ["IN_PROGRESS", "FAILED"] } },
    data: { status: "PROCESSING", failureReason: null },
  });
  if (claimed.count === 0) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "L'analyse est déjà en cours pour ce diagnostic. Patientez quelques instants, la page suit l'avancement.",
    });
  }
}

/**
 * Merge substantive slices only — jamais d'écrasement des réponses existantes
 * par un squelette vide (classe de bug interdite par hasSubstantiveAnswer).
 * Relit la row au moment du merge (le snapshot pré-claim peut être périmé).
 */
async function mergeIntakeResponses(
  db: import("@prisma/client").PrismaClient,
  intakeId: string,
  responses: Record<string, Record<string, unknown>>,
): Promise<void> {
  if (Object.keys(responses).length === 0) return;
  const fresh = await db.quickIntake.findUnique({ where: { id: intakeId }, select: { responses: true } });
  const existingResponses = (fresh?.responses as Record<string, unknown>) ?? {};
  await db.quickIntake.update({
    where: { id: intakeId },
    data: { responses: { ...existingResponses, ...responses } as Prisma.InputJsonValue },
  });
}

/**
 * Exécute le travail lourd HORS requête (fire-and-forget — pattern du relevé
 * d'audience du scoreur, `footprint.ts` : notre prod est un serveur
 * long-vivant Coolify, pas du serverless ; pas de file externe). GARANTIE de
 * transition terminale : COMPLETED est écrit par `complete()` lui-même ;
 * toute autre issue pose FAILED + failureReason — uniquement si la row est
 * encore PROCESSING (jamais écraser un succès). Un process tué net (redeploy)
 * est rattrapé par la garde paresseuse de getByToken (> 10 min → FAILED
 * "timeout").
 */
function runIntakeProcessing(
  db: import("@prisma/client").PrismaClient,
  intakeId: string,
  token: string,
  caller: string,
  work: () => Promise<{ failed: "extraction" | "llm_unavailable" | null }>,
): Promise<void> {
  return (async () => {
    let reason: "extraction" | "llm_unavailable" | "internal" | null = null;
    try {
      const outcome = await work();
      reason = outcome.failed;
    } catch (err) {
      reason = err instanceof quickIntakeService.IncompleteIntakeError ? "extraction" : "internal";
      console.error(
        `[quick-intake:${caller}] traitement de fond échoué (token ${token}):`,
        err instanceof Error ? err.message : err,
      );
    }
    if (reason !== null) {
      await db.quickIntake
        .updateMany({
          where: { id: intakeId, status: "PROCESSING" },
          data: { status: "FAILED", failureReason: reason },
        })
        .catch((err) => {
          console.error(`[quick-intake:${caller}] transition FAILED impossible:`, err instanceof Error ? err.message : err);
        });
    }
  })();
}

export const quickIntakeRouter = createTRPCRouter({
  start: publicProcedure
    .input(z.object({
      contactName: z.string().min(1),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
      companyName: z.string().min(1),
      sector: z.string().optional(),
      country: z.string().optional(),
      businessModel: z.string().optional(),
      economicModel: z.string().optional(),
      positioning: z.string().optional(),
      source: z.string().optional(),
      // Attribution funnel (vague E) : UTM/referrer/click-ids structurés,
      // bornés (12 clés max côté client, valeurs ≤ 300 chars).
      attribution: z.record(z.string().max(40), z.string().max(300)).optional(),
      method: z.enum(["GUIDED", "IMPORT", "LONG", "SHORT", "INGEST", "INGEST_PLUS"]).optional(),
      // Vague 10 — empreinte web publique (alimente le pilier E)
      websiteUrl: z.string().max(300).optional(),
      socialLinksRaw: z.string().max(2000).optional(),
      // ADR-0157 — parrainage : « recommandé par » (code LF-XXXXXX). Optionnel,
      // best-effort — un code invalide n'affecte jamais l'intake.
      referralCode: z.string().max(24).optional(),
    }))
    .mutation(async ({ input }) => {
      const { referralCode, ...startInput } = input;
      const result = await quickIntakeService.start(startInput);
      if (referralCode?.trim()) {
        const { recordReferralFromIntake } = await import("@/server/services/referral");
        await recordReferralFromIntake({
          code: referralCode,
          refereeEmail: input.contactEmail,
          refereeName: input.contactName,
          companyName: input.companyName,
        });
      }
      return result;
    }),

  advance: publicProcedure
    .input(
      z.object({
        token: z.string(),
        // Refuse outright at the API boundary when the payload is structurally
        // empty. The service layer (`hasSubstantiveAnswer`) has the final say —
        // this is just a fast-fail to avoid a round-trip.
        responses: z
          .record(z.string(), z.unknown())
          .refine((r) => Object.keys(r).length > 0, {
            message: "responses must contain at least one phase slice",
          }),
      }),
    )
    .mutation(async ({ input }) => {
      return quickIntakeService.advance(input);
    }),

  complete: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      return quickIntakeService.complete(input.token);
    }),

  /**
   * Re-run analysis for an existing intake. Wipes the temp Strategy/Pillar
   * rows produced by the previous `complete()` call and regenerates them
   * from the same persisted responses — useful when LLM extraction drifted
   * (e.g. cosmetic catalog hallucinated for a real-estate brand) or after a
   * fix to the extraction logic. Refuses to run if the strategy was already
   * activated by `activateBrand` (status !== `QUICK_INTAKE`).
   */
  regenerateAnalysis: adminProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return quickIntakeService.regenerateAnalysis(input.token);
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
      // Garde de sécurité F1 : un traitement de fond tué net (redeploy, OOM)
      // ne doit JAMAIS laisser une row PROCESSING pour toujours. Réparation
      // paresseuse à la lecture — le client qui suit l'avancement passe
      // forcément ici : > 10 min sans transition terminale → FAILED honnête.
      // `updatedAt` en clause where = lock optimiste (un worker concurrent qui
      // vient de transitionner la row a bumpé updatedAt → no-op ici).
      if (intake?.status === "PROCESSING" && Date.now() - intake.updatedAt.getTime() > 10 * 60_000) {
        const repaired = await ctx.db.quickIntake.updateMany({
          where: { id: intake.id, status: "PROCESSING", updatedAt: intake.updatedAt },
          data: { status: "FAILED", failureReason: "timeout" },
        });
        if (repaired.count > 0) {
          return ctx.db.quickIntake.findUnique({ where: { shareToken: input.token } });
        }
      }
      return intake;
    }),

  /**
   * Get Notoria recommendations for an intake.
   * Returns a preview (free, 2 recos) or full set (paid, all recos).
   * Used by the result page paywall.
   */
  getRecosByToken: publicProcedure
    .input(z.object({
      token: z.string(),
      paid: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
        select: { id: true, convertedToId: true, status: true },
      });
      if (!intake?.convertedToId) {
        return { recos: [], totalCount: 0, isPreview: true };
      }
      const allRecos = await (ctx.db as unknown as { recommendation: { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> } }).recommendation.findMany({
        where: { strategyId: intake.convertedToId, status: "PENDING" },
        orderBy: [{ impact: "desc" }, { confidence: "desc" }],
      });
      // Free preview: 2 recos. Paid: all.
      const recos = input.paid ? allRecos : allRecos.slice(0, 2);
      return {
        recos,
        totalCount: allRecos.length,
        isPreview: !input.paid,
      };
    }),

  /**
   * Returns the structured pillar content extracted from the intake responses.
   * Drives the result page "what we extracted" view — clients see the actual
   * field values the system produced, not just scores.
   */
  getPillarsByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
        select: { convertedToId: true },
      });
      if (!intake?.convertedToId) {
        return { pillars: [] as Array<{ key: string; content: Record<string, unknown> }> };
      }
      const rows = await ctx.db.pillar.findMany({
        where: { strategyId: intake.convertedToId, key: { in: [...ADVE_STORAGE_KEYS] } },
        select: { key: true, content: true },
      });
      return {
        pillars: rows.map((r) => ({
          key: r.key,
          content: (r.content as Record<string, unknown> | null) ?? {},
        })),
      };
    }),

  /**
   * Force de marque RÉVÉLÉE (nouveau scoreur, ADR-0149) pour le rapport d'intake.
   * Lecture SEULE (`persist:false` — aucun snapshot leaderboard, aucune écriture).
   * Mesurée sur la preuve publique captée (empreinte), jamais le déclaratif. DTO
   * en vocabulaire client (« terrains », « palier ») — pas de jargon interne.
   * Best-effort : pas de strategy / calcul KO → `PENDING` honnête, jamais un throw.
   */
  getForceByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
        select: { convertedToId: true },
      });
      if (!intake?.convertedToId) return { status: "PENDING" as const };
      try {
        const { scoreBrand } = await import("@/server/services/seshat/scoreur");
        const { ARENA_LABELS } = await import("@/domain/scoreur");
        const { verdict } = await scoreBrand(intake.convertedToId, { persist: false });
        const measured = verdict.arenas.filter((a) => a.epreuveCount > 0).length;
        return {
          status: "OK" as const,
          force: Math.round(verdict.force * 10) / 10,
          outOf: 200,
          tier: verdict.tier,
          coveragePct: verdict.coveragePct,
          measuredArenas: measured,
          totalArenas: verdict.arenas.length,
          terrains: verdict.arenas.map((a) => ({
            key: a.arena,
            label: ARENA_LABELS[a.arena],
            force: Math.round(a.force * 10) / 10,
            measured: a.epreuveCount > 0,
          })),
          // Portes non encore franchies = ce qui débloque les paliers suivants
          // (libellés déjà orientés métier : « Dirigeant identifiable »…).
          nextUnlock: verdict.gates.filter((g) => !g.ok).map((g) => g.label).slice(0, 3),
          cappedReason: verdict.cappedReason,
        };
      } catch {
        return { status: "PENDING" as const };
      }
    }),

  /**
   * Server-driven question fetcher. Returns adaptive questions for the current
   * phase of the intake (biz context or a specific ADVE pillar).
   * This enables the AI-guided questionnaire experience per CdC §5.2.
   */
  getQuestions: publicProcedure
    .input(z.object({
      token: z.string(),
      pillar: z.string().optional(), // Override: fetch questions for specific pillar
    }))
    .query(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
      if (!intake) throw new Error("Intake not found");

      const responses = (intake.responses as Record<string, unknown>) ?? {};
      // Intake covers biz context + 4 ADVE pillars only (RTIS = paid version)
      const allSteps = ["biz", "a", "d", "v", "e"];

      // Determine which pillar to fetch questions for
      let targetPillar: string | undefined = input.pillar ?? undefined;
      if (!targetPillar) {
        // Auto-detect: find first unanswered step. Same substantive-answer
        // predicate as advance()/complete() — une slice vide persistée (row
        // legacy) ne doit pas marquer une phase comme répondue ni renvoyer
        // readyToComplete sur un intake vide.
        const answeredSteps = new Set(
          Object.entries(responses)
            .filter(([, v]) => quickIntakeService.hasSubstantiveAnswer(v))
            .map(([key]) => key.split("_")[0]),
        );
        targetPillar = allSteps.find((p) => !answeredSteps.has(p));
      }

      if (!targetPillar) {
        return { questions: [], currentPillar: null as string | null, readyToComplete: true, progress: 1 };
      }

      const questions = targetPillar === "biz"
        ? getBusinessContextQuestions()
        : await getAdaptiveQuestions(targetPillar, responses, {
            sector: intake.sector ?? undefined,
            positioning: intake.positioning ?? undefined,
          });

      const answeredCount = Object.keys(responses).length;
      const progress = answeredCount / allSteps.length;

      return {
        questions,
        currentPillar: targetPillar,
        readyToComplete: false,
        progress,
      };
    }),

  /**
   * Self-serve activation after the result-page paywall.
   *
   * Public mutation — turns a completed intake into a real Client + Strategy
   * the prospect can claim by signing up with the same email later.
   * Idempotent: if the intake already has a non-systemUser owner, returns it.
   */
  /**
   * ADR-0033 — Atomic purge + re-ingest of an intake-origin BrandDataSource.
   *
   * Operator-triggered cleanup when the intake produced bad data
   * (hallucinations, wrong sector, garbage). Routed via Mestor Intent for
   * audit trail. Anti-foot-gun via confirmName (caller must echo brand name
   * uppercase). Hard delete + reset + re-create in a single Prisma transaction.
   *
   * Surface : button on /cockpit/brand/sources next to MANUAL_INPUT rows
   * with origin starting with "intake:". Wraps a confirmation modal.
   */
  purgeAndReingest: governedProcedure({

    kind: "LEGACY_QUICK_INTAKE_PURGE_AND_REINGEST",

    inputSchema: z.object({
      strategyId: z.string().min(1),
      sourceId: z.string().min(1),
      confirmName: z.string().min(1, "confirmName required (anti-foot-gun)"),
    }),

    caller: "quick-intake:purgeAndReingest",

  })
    .mutation(async ({ ctx, input }) => {
      const result = await mestorEmitIntent(
        {
          kind: "INTAKE_SOURCE_PURGE_AND_REINGEST",
          strategyId: input.strategyId,
          operatorId: ctx.session.user.id,
          sourceId: input.sourceId,
          confirmName: input.confirmName,
        },
        { caller: "quick-intake.purgeAndReingest" },
      );
      if (result.status !== "OK") {
        throw new TRPCError({
          code: result.reason === "CONFIRM_NAME_MISMATCH" ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
          message: result.summary,
        });
      }
      return result.output;
    }),

  activateBrand: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
        select: {
          id: true, status: true, convertedToId: true,
          contactName: true, contactEmail: true, contactPhone: true,
          companyName: true, sector: true, country: true,
          businessModel: true, positioning: true, rawText: true,
          responses: true, advertis_vector: true, webFootprint: true,
        },
      });
      if (!intake) throw new TRPCError({ code: "NOT_FOUND", message: "Intake introuvable" });
      if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Intake non finalise" });
      }

      // Defense (ADR-0029): convertedToId can dangle after Strategy archive+purge
      // (cf. ADR-0028). If the pointer is null OR the referenced Strategy was
      // purged, re-materialize the temp strategy from intake data.
      const tempStrategyExists = intake.convertedToId
        ? Boolean(await ctx.db.strategy.findUnique({ where: { id: intake.convertedToId }, select: { id: true } }))
        : false;

      const email = intake.contactEmail.toLowerCase();

      // Default self-serve operator (one row, idempotent via slug).
      const operator = await ctx.db.operator.upsert({
        where: { slug: "lafusee-self-serve" },
        update: {},
        create: {
          name: "La Fusee — Self Serve",
          slug: "lafusee-self-serve",
          status: "ACTIVE",
          licenseType: "OWNER",
          licensedAt: new Date(),
          licenseExpiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        },
      });

      // Find or stub the prospect User (no password — claimed via auth.register).
      const stubUser = await ctx.db.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name: intake.contactName,
          role: "USER",
          operatorId: operator.id,
        },
      });
      const alreadyClaimed = !!stubUser.hashedPassword;

      // Find or create the Client (one Client per (operator, name) — idempotent).
      const existingClient = await ctx.db.client.findFirst({
        where: { name: intake.companyName, operatorId: operator.id },
      });
      const client = existingClient ?? await ctx.db.client.create({
        data: {
          name: intake.companyName,
          contactName: intake.contactName,
          contactEmail: intake.contactEmail,
          contactPhone: intake.contactPhone ?? undefined,
          sector: intake.sector,
          country: intake.country,
          operatorId: operator.id,
        },
      });

      // Promote existing temp Strategy if it survived; otherwise re-create
      // from intake data (recovery path for purged temp strategies — ADR-0029).
      let strategy: { id: string; name: string; clientId: string | null; status: string };
      if (tempStrategyExists && intake.convertedToId) {
        strategy = await ctx.db.strategy.update({
          where: { id: intake.convertedToId },
          data: {
            userId: stubUser.id,
            operatorId: operator.id,
            clientId: client.id,
            name: intake.companyName,
            status: "ACTIVE",
          },
          select: { id: true, name: true, clientId: true, status: true },
        });
      } else {
        strategy = await ctx.db.strategy.create({
          data: {
            name: intake.companyName,
            description: `Activé self-serve depuis Quick Intake le ${new Date().toLocaleDateString("fr-FR")}`,
            userId: stubUser.id,
            operatorId: operator.id,
            clientId: client.id,
            status: "ACTIVE",
            advertis_vector: (intake.advertis_vector ?? undefined) as Prisma.InputJsonValue | undefined,
          },
          select: { id: true, name: true, clientId: true, status: true },
        });
        const responses = intake.responses as Record<string, unknown> | null;
        const vector = (intake.advertis_vector ?? {}) as Record<string, number>;
        for (const key of PILLAR_STORAGE_KEYS) {
          let content = responses?.[key];
          // ADR-0121 — le chemin de récupération (temp strategy purgée) re-seed
          // depuis les réponses brutes : réinjecter l'empreinte publique dans E
          // pour ne pas perdre webPresence/compteurs (le chemin nominal promeut
          // la temp strategy, où le merge a déjà eu lieu).
          if (key === "e" && intake.webFootprint && content && typeof content === "object") {
            const { mergeEnrichedFootprintIntoPillarE } = await import("@/server/services/quick-intake/public-enrichment");
            const fp = intake.webFootprint as unknown as import("@/server/services/quick-intake/public-enrichment").EnrichedFootprint;
            if (Array.isArray(fp.socials)) {
              // Rétro-compat : un webFootprint legacy (shape Vague 10) n'a pas
              // les champs enrichis — défauts vides, jamais de fabrication.
              content = mergeEnrichedFootprintIntoPillarE(content as Record<string, unknown>, {
                ...fp,
                followerCounts: fp.followerCounts ?? [],
                press: fp.press ?? [],
                discovery: fp.discovery ?? { attempted: false, queries: [], status: "SKIPPED_DECLARED" },
                enrichment: fp.enrichment ?? { apify: "SKIPPED", press: "EMPTY", totalMs: 0, errors: [] },
              }).content;
            }
          }
          await seedPillarFromIntake(strategy.id, key, content, (vector.confidence ?? 0.4) * 0.8);
        }
      }

      // Mark the intake as converted + heal convertedToId pointer.
      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: { status: "CONVERTED", convertedToId: strategy.id },
      });

      // ── PR-A (ADR-0032) — persist intake artifacts in the brand vault ───
      // Mirror what `convert` does (line ~558) so the self-serve activation
      // path produces the same audit trail. Idempotent on (strategyId, origin)
      // — re-running activateBrand on an already-activated intake does NOT
      // duplicate the source row (the unique origin marker dedupes via the
      // findFirst guard, since we don't have a DB-level unique constraint
      // yet to keep the migration cheap).
      const intakeOrigin = `intake:${intake.id}`;
      const existingIntakeSource = await ctx.db.brandDataSource.findFirst({
        where: { strategyId: strategy.id, origin: intakeOrigin },
        select: { id: true },
      });
      if (!existingIntakeSource) {
        await ctx.db.brandDataSource.create({
          data: {
            strategyId: strategy.id,
            sourceType: "MANUAL_INPUT",
            fileName: `Quick Intake — ${intake.companyName ?? intake.contactName ?? ""}`,
            rawContent: [
              intake.companyName ? `Entreprise: ${intake.companyName}` : "",
              intake.sector ? `Secteur: ${intake.sector}` : "",
              intake.country ? `Pays: ${intake.country}` : "",
              intake.businessModel ? `Modele: ${intake.businessModel}` : "",
              intake.positioning ? `Positionnement: ${intake.positioning}` : "",
              intake.rawText ?? "",
            ].filter(Boolean).join("\n"),
            rawData: (intake.responses ?? {}) as Prisma.InputJsonValue,
            extractedFields: (intake.responses ?? {}) as Prisma.InputJsonValue,
            pillarMapping: { a: true, d: true, v: true, e: true } as Prisma.InputJsonValue,
            processingStatus: "PROCESSED",
            // PR-A — fondateur a déclaré ces faits via intake. Pas vérifié,
            // mais pas non plus inféré IA. DECLARED = neutre, override possible
            // côté cockpit (passer à OFFICIAL après upload de KBIS, etc.).
            certainty: "DECLARED",
            origin: intakeOrigin,
          },
        }).catch(() => undefined); // Non-fatal — l'activation prime sur la trace.
      }

      // Trace the rapport ADVE PDF in the brand vault as an INTELLECTUAL
      // BrandAsset. The PDF blob itself stays generated on-demand via
      // /api/intake/[token]/pdf — we just record the pointer + snapshot date
      // so the asset shows up in the brand's deliverables list. Reusing this
      // BrandAsset row across re-downloads keeps the vault clean.
      const existingReport = await ctx.db.brandAsset.findFirst({
        where: { strategyId: strategy.id, kind: "INTAKE_REPORT" },
        select: { id: true },
      });
      if (!existingReport) {
        await ctx.db.brandAsset.create({
          data: {
            strategyId: strategy.id,
            name: `Rapport ADVE — ${intake.companyName}`,
            kind: "INTAKE_REPORT",
            family: "INTELLECTUAL",
            state: "ACTIVE",
            content: {
              intakeToken: input.token,
              intakeId: intake.id,
              snapshotDate: new Date().toISOString(),
              downloadUrl: `/api/intake/${input.token}/pdf`,
              note: "PDF généré à la volée via puppeteer — ce row est un pointeur de vault, pas un blob.",
            } as Prisma.InputJsonValue,
            summary: `Diagnostic ADVE complet généré au paywall intake (${new Date().toLocaleDateString("fr-FR")}).`,
            pillarSource: "A",
          },
        }).catch(() => undefined); // Non-fatal — l'activation prime.
      }

      // ── PR-C (ADR-0035) — LLM inference of the 7 needsHuman ADVE fields ──
      // Fire-and-forget: never block activation on a slow LLM call. The
      // operator can refresh the cockpit pillar pages a few seconds after
      // landing on them and see the inferred values populated. Failures are
      // logged server-side; the operator just sees the original empty fields
      // and can fill them manually as before.
      void (async () => {
        try {
          const { inferNeedsHumanFields } = await import("@/server/services/quick-intake/infer-needs-human-fields");
          const result = await inferNeedsHumanFields(intake.id);
          if (!result.ok) {
            console.warn(
              `[activateBrand] inferNeedsHumanFields skipped for intake ${intake.id}:`,
              result.error,
            );
          }
        } catch (err) {
          console.warn(
            `[activateBrand] inferNeedsHumanFields crashed for intake ${intake.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      })();

      return {
        userId: stubUser.id,
        userEmail: stubUser.email,
        clientId: client.id,
        clientName: client.name,
        strategyId: strategy.id,
        alreadyClaimed,
      };
    }),

  convert: governedProcedure({


    kind: "LEGACY_QUICK_INTAKE_CONVERT",

    // IDOR round-10 (CRITICAL) : `userId` est choisi par l'appelant et estampillé
    // PROPRIÉTAIRE de la Strategy créée → tout compte convertissait l'intake d'un
    // tiers et s'attribuait la marque. REQ-6 = « l'admin convertit ». Surface console.
    requireOperator: true,

    inputSchema: z.object({
      intakeId: z.string(),
      userId: z.string(),
      clientId: z.string().optional(),
    }),


    caller: "quick-intake:convert",


  })
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUniqueOrThrow({
        where: { id: input.intakeId },
      });
      if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
        throw new Error("Intake must be completed before conversion");
      }

      // Retrieve businessContext from the temporary strategy if it exists
      let businessContext = undefined;
      if (intake.convertedToId) {
        const tempStrategy = await ctx.db.strategy.findUnique({
          where: { id: intake.convertedToId },
          select: { businessContext: true },
        });
        businessContext = tempStrategy?.businessContext ?? undefined;
      }

      // Resolve user: prefer explicit input.userId, fallback to session.email, otherwise use system user
      let user = null as { id: string; operatorId?: string | null } | null;
      if (input.userId) {
        user = await ctx.db.user.findUnique({ where: { id: input.userId } });
      }
      if (!user && ctx.session?.user?.email) {
        user = await ctx.db.user.findUnique({ where: { email: ctx.session.user.email } });
      }
      if (!user) {
        // As a last resort, use or create the system user so conversion can proceed
        user = await ctx.db.user.upsert({
          where: { email: "system@lafusee.io" },
          update: {},
          create: { email: "system@lafusee.io", name: "System", role: "ADMIN" },
        });
      }
      const operatorId = user.operatorId;

      // Create or reuse Client
      let clientId = input.clientId;
      if (!clientId && operatorId) {
        // Check if a client with same name+operator already exists
        const existing = await ctx.db.client.findFirst({
          where: { name: intake.companyName, operatorId },
        });
        if (existing) {
          clientId = existing.id;
        } else {
          const newClient = await ctx.db.client.create({
            data: {
              name: intake.companyName,
              contactName: intake.contactName,
              contactEmail: intake.contactEmail,
              contactPhone: intake.contactPhone ?? undefined,
              sector: intake.sector,
              country: intake.country,
              operatorId,
            },
          });
          clientId = newClient.id;
        }
      }

      // Promote existing temporary strategy OR create new one.
      // Defense (ADR-0029): convertedToId is a String? + FK SetNull, so it can
      // be NULL after a Strategy archive+purge (cf. ADR-0028). Verify existence
      // before update; fall back to creation if the temp strategy was purged.
      let strategy;
      const tempStrategyExists = intake.convertedToId
        ? Boolean(await ctx.db.strategy.findUnique({ where: { id: intake.convertedToId }, select: { id: true } }))
        : false;

      if (tempStrategyExists && intake.convertedToId) {
        // Temporary strategy already exists from Quick Intake completion — promote it
        strategy = await ctx.db.strategy.update({
          where: { id: intake.convertedToId },
          data: {
            name: intake.companyName,
            description: `Converti depuis Quick Intake le ${new Date().toLocaleDateString("fr-FR")}`,
            userId: user.id,
            operatorId,
            clientId: clientId ?? undefined,
            status: "ACTIVE",
            advertis_vector: intake.advertis_vector ?? undefined,
            businessContext: businessContext ?? undefined,
          },
        });

        // Ensure pillars exist (may already have been created during intake)
        const existingPillars = await ctx.db.pillar.findMany({
          where: { strategyId: strategy.id },
          select: { key: true },
        });
        const existingKeys = new Set(existingPillars.map(p => p.key));

        const responses = intake.responses as Record<string, unknown> | null;
        const vector = (intake.advertis_vector ?? {}) as Record<string, number>;

        for (const key of [...PILLAR_STORAGE_KEYS]) {
          if (!existingKeys.has(key)) {
            await seedPillarFromIntake(strategy.id, key, responses?.[key], (vector.confidence ?? 0.4) * 0.8);
          }
        }
      } else {
        // No temporary strategy — create from scratch
        strategy = await ctx.db.strategy.create({
          data: {
            name: intake.companyName,
            description: `Converti depuis Quick Intake le ${new Date().toLocaleDateString("fr-FR")}`,
            userId: user.id,
            operatorId,
            clientId: clientId ?? undefined,
            status: "ACTIVE",
            advertis_vector: intake.advertis_vector ?? undefined,
            businessContext: businessContext ?? undefined,
          },
        });

        // Create pillars from intake responses
        const responses = intake.responses as Record<string, unknown> | null;
        const vector = (intake.advertis_vector ?? {}) as Record<string, number>;

        for (const key of [...PILLAR_STORAGE_KEYS]) {
          await seedPillarFromIntake(strategy.id, key, responses?.[key], (vector.confidence ?? 0.4) * 0.8);
        }
      }

      // Update intake status
      await ctx.db.quickIntake.update({
        where: { id: input.intakeId },
        data: {
          status: "CONVERTED",
          convertedToId: strategy.id,
        },
      });

      // Create BrandDataSource from intake responses (source of truth).
      // PR-A (ADR-0032) — symétrie avec activateBrand : même certainty +
      // origin marker pour permettre INTAKE_SOURCE_PURGE_AND_REINGEST.
      await ctx.db.brandDataSource.create({
        data: {
          strategyId: strategy.id,
          sourceType: "MANUAL_INPUT",
          fileName: `Quick Intake — ${intake.companyName ?? intake.contactName ?? ""}`,
          rawContent: [
            intake.companyName ? `Entreprise: ${intake.companyName}` : "",
            intake.sector ? `Secteur: ${intake.sector}` : "",
            intake.country ? `Pays: ${intake.country}` : "",
            intake.businessModel ? `Modele: ${intake.businessModel}` : "",
            intake.positioning ? `Positionnement: ${intake.positioning}` : "",
            intake.rawText ?? "",
          ].filter(Boolean).join("\n"),
          rawData: (intake.responses ?? {}) as Prisma.InputJsonValue,
          extractedFields: (intake.responses ?? {}) as Prisma.InputJsonValue,
          pillarMapping: { a: true, d: true, v: true, e: true } as Prisma.InputJsonValue,
          processingStatus: "PROCESSED",
          certainty: "DECLARED",
          origin: `intake:${intake.id}`,
        },
      }).catch(() => {}); // Non-fatal

      // Capture knowledge event
      await ctx.db.knowledgeEntry.create({
        data: {
          entryType: "MISSION_OUTCOME",
          sector: intake.sector,
          market: intake.country,
          data: {
            type: "quick_intake_conversion",
            intakeId: intake.id,
            strategyId: strategy.id,
            classification: intake.classification,
          } as Prisma.InputJsonValue,
          sourceHash: `intake-${intake.id}`,
        },
      });

      return strategy;
    }),

  /**
   * Social proof: count of completed intakes (public, cached).
   * Displayed on result page to build trust.
   */
  getCompletedCount: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.quickIntake.count({
        where: { status: { in: ["COMPLETED", "CONVERTED"] } },
      });
    }),

  listAll: adminProcedure
    .input(z.object({
      status: z.enum(["IN_PROGRESS", "PROCESSING", "COMPLETED", "CONVERTED", "EXPIRED", "FAILED"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.quickIntake.findMany({
        where: input.status ? { status: input.status } : undefined,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return { items, nextCursor };
    }),

  // ========================================================================
  // ALTERNATIVE METHODS: Short (text), Ingest (files), Ingest Plus (files+URLs)
  // All follow the same pattern: extract → structured content → score → complete
  //
  // F1 async (fix prod 2026-07-19, RESIDUAL-DEBT « Intake processIngest
  // synchrone → Load failed ») : le travail lourd (scrape + décodage +
  // extraction LLM + complete()) dépassait le timeout du proxy frontal
  // (Cloudflare ~100 s / Traefik) — le client recevait « Load failed » et la
  // row restait IN_PROGRESS à vie. Désormais chaque procédure : persiste les
  // sources → pré-flight LLM synchrone (dégradation honnête immédiate) →
  // CLAIM atomique PROCESSING → lance le travail en fire-and-forget (pattern
  // du relevé d'audience du scoreur, footprint.ts — serveur long-vivant
  // Coolify, pas de file externe) → ack immédiat { status: "PROCESSING" }.
  // Le client suit getByToken jusqu'à l'état terminal (COMPLETED écrit par
  // complete() lui-même, FAILED + failureReason sinon — jamais de PROCESSING
  // sans issue : garde paresseuse 10 min dans getByToken).
  // ========================================================================

  /**
   * SHORT method: Process pasted text, AI extracts ADVE-RTIS data, scores.
   * Ack immédiat { status: "PROCESSING" } — le scoring se fait hors requête.
   */
  processShort: publicProcedure
    .input(z.object({
      token: z.string(),
      text: z.string().min(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
      if (!intake) throw new Error("Intake not found");
      if (intake.status !== "IN_PROGRESS" && intake.status !== "FAILED") {
        throw new Error("Intake already completed");
      }

      // Save raw text FIRST — rien de ce que l'utilisateur fournit n'est perdu,
      // même si la suite échoue.
      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: { rawText: input.text },
      });

      // Pré-flight LLM synchrone : providers down → erreur explicite immédiate,
      // rien n'est réservé (le texte est sauvé, retry ou questionnaire guidé).
      if (!isTextLLMAvailable()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "L'analyse automatique est momentanément indisponible. Votre texte est conservé — réessayez dans quelques minutes, ou passez par le questionnaire guidé.",
        });
      }

      await claimIntakeForProcessing(ctx.db, intake.id);

      void runIntakeProcessing(ctx.db, intake.id, input.token, "processShort", async () => {
        const responses = await extractFromText(input.text, intake.companyName, intake.sector);
        if (responses === null) return { failed: "llm_unavailable" as const };
        await mergeIntakeResponses(ctx.db, intake.id, responses);
        await quickIntakeService.complete(input.token);
        return { failed: null };
      });

      return { status: "PROCESSING" as const, token: input.token };
    }),

  /**
   * INGEST method: Process uploaded documents (base64), AI extracts ADVE-RTIS data.
   * Ack immédiat { status: "PROCESSING" } (ou { status: "REJECTED" } si les
   * providers LLM sont down — dégradation honnête sans rien réserver).
   */
  processIngest: publicProcedure
    .input(z.object({
      token: z.string(),
      rawText: z.string().optional(),
      websiteUrl: z.string().url().optional(),
      files: z.array(z.object({
        name: z.string(),
        content: z.string(), // base64
        type: z.string(),
      })).max(5).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
      if (!intake) throw new Error("Intake not found");
      if (intake.status !== "IN_PROGRESS" && intake.status !== "FAILED") {
        throw new Error("Intake already completed");
      }

      // Le site déclaré à l'étape contact (landing) reste la source par défaut :
      // le champ de la page ingest est pré-rempli côté UI, mais s'il revient
      // vide on ne DÉTRUIT pas la déclaration initiale — on la réutilise.
      const effectiveWebsiteUrl = input.websiteUrl ?? intake.websiteUrl?.trim() ?? undefined;

      // Persist source info FIRST — même si l'extraction échoue ensuite, rien
      // de ce que l'utilisateur a fourni n'est perdu. `undefined` = champ non
      // touché : on n'écrase JAMAIS une valeur déclarée par null.
      const sourceNames = [
        input.rawText ? "texte" : null,
        effectiveWebsiteUrl ?? null,
        ...input.files.map((f) => f.name),
      ].filter(Boolean);

      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: {
          rawText: input.rawText ?? undefined,
          websiteUrl: input.websiteUrl ?? undefined,
          documentUrl: sourceNames.join(", "),
        },
      });

      // Pré-flight LLM : providers texte down (clés absentes, crédits épuisés,
      // circuit ouvert) → on n'entame ni scrape ni décodage, on route tout de
      // suite vers le questionnaire pré-rempli avec une raison explicite.
      // JAMAIS de bascule muette.
      if (!isTextLLMAvailable()) {
        return { status: "REJECTED" as const, reason: "llm_unavailable" as const, token: input.token };
      }

      await claimIntakeForProcessing(ctx.db, intake.id);

      void runIntakeProcessing(ctx.db, intake.id, input.token, "processIngest", async () => {
        // Collect all text sources
        const textParts: string[] = [];

        // 1. Raw text input
        if (input.rawText) {
          textParts.push(`[TEXTE FOURNI]\n${input.rawText}`);
        }

        // 2 + 4. Network I/O CONCURRENT (scrape site + présence digitale
        // Seshat/Brave) — bounded best-effort, never throw. Plus de budget
        // serverless à respecter : on tourne hors requête.
        const sitePromise = effectiveWebsiteUrl
          ? fetchUrlAsText(effectiveWebsiteUrl, { maxChars: 15_000 })
          : Promise.resolve(null);
        const presencePromise = intake.companyName
          ? fetchDigitalPresenceBlock(intake.companyName)
          : Promise.resolve(null);

        // 3. Decode base64 files and extract text robustly (CPU-bound — runs
        //    while the network calls above are in flight).
        for (const f of input.files) {
          try {
            const buffer = Buffer.from(f.content, "base64");

            if (f.type === "text/plain" || f.name.endsWith(".txt")) {
              textParts.push(`[DOCUMENT: ${f.name}]\n${buffer.toString("utf-8")}`);
            } else if (f.type === "application/pdf" || f.name.endsWith(".pdf")) {
              const pdfParseRaw = await import("pdf-parse");
              const pdfParse = (pdfParseRaw as any).default || pdfParseRaw;
              const pdfData = await pdfParse(buffer);
              const text = pdfData.text.replace(/\s{3,}/g, " ").trim().slice(0, 20_000);
              if (text.length > 50) textParts.push(`[DOCUMENT: ${f.name}]\n${text}`);
            } else if (f.name.endsWith(".docx") || f.type.includes("wordprocessingml")) {
              const mammoth = (await import("mammoth")).default;
              const result = await mammoth.extractRawText({ buffer });
              const text = result.value.replace(/\s{3,}/g, " ").trim().slice(0, 20_000);
              if (text.length > 50) textParts.push(`[DOCUMENT: ${f.name}]\n${text}`);
            } else {
              // Fallback for unknown text-like formats
              const decoded = buffer.toString("utf-8");
              const cleaned = decoded.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
              if (cleaned.length > 50) textParts.push(`[DOCUMENT: ${f.name}]\n${cleaned}`);
            }
          } catch {
            textParts.push(`[Fichier non lisible ou format non supporté: ${f.name}]`);
          }
        }

        // Await the concurrent network I/O kicked off above and append in a
        // stable order. Digital presence uses the canonical Seshat/Brave access
        // point (ADR-0108) — no inline Brave code here.
        const [siteText, presenceBlock] = await Promise.all([sitePromise, presencePromise]);
        if (effectiveWebsiteUrl) {
          textParts.push(siteText ? `[SITE WEB: ${effectiveWebsiteUrl}]\n${siteText}` : `[SITE WEB inaccessible: ${effectiveWebsiteUrl}]`);
        }
        if (presenceBlock) textParts.push(presenceBlock);

        const allText = textParts.join("\n\n---\n\n");

        const responses = await extractFromText(allText, intake.companyName, intake.sector);
        if (responses === null) {
          // Extraction impossible (erreur LLM / sortie imparsable après retry).
          // Les sources sont persistées, rien n'est perdu — échec explicite.
          return { failed: "llm_unavailable" as const };
        }
        await mergeIntakeResponses(ctx.db, intake.id, responses);

        // Direct-to-diagnostic (operator choice 2026-06-29) : run the full ADVE
        // diagnostic and let the client land on the result page. If the AI
        // extraction came back empty/sparse (thin sources), complete() refuses
        // to score — FAILED "extraction" route le client vers le questionnaire
        // pré-rempli avec la raison (never silent), via runIntakeProcessing.
        await quickIntakeService.complete(input.token);
        return { failed: null };
      });

      return { status: "PROCESSING" as const, token: input.token };
    }),

  /**
   * INGEST PLUS method: Documents + URLs (website + social).
   * Ack immédiat { status: "PROCESSING" } — décodage, fetchs et scoring hors requête.
   */
  processIngestPlus: publicProcedure
    .input(z.object({
      token: z.string(),
      files: z.array(z.object({
        name: z.string(),
        content: z.string(),
        type: z.string(),
      })).max(5).optional(),
      urls: z.array(z.string().url()).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
      if (!intake) throw new Error("Intake not found");
      if (intake.status !== "IN_PROGRESS" && intake.status !== "FAILED") {
        throw new Error("Intake already completed");
      }

      // Persist source info FIRST (parité processIngest) — `undefined` = champ
      // non touché, jamais d'écrasement d'une déclaration antérieure par null.
      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: {
          documentUrl: input.files?.map((f) => f.name).join(", ") ?? undefined,
          websiteUrl: input.urls?.[0] ?? undefined,
        },
      });

      // Pré-flight LLM synchrone : dégradation honnête immédiate, rien réservé.
      if (!isTextLLMAvailable()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "L'analyse automatique est momentanément indisponible. Vos sources sont conservées — réessayez dans quelques minutes.",
        });
      }

      await claimIntakeForProcessing(ctx.db, intake.id);

      void runIntakeProcessing(ctx.db, intake.id, input.token, "processIngestPlus", async () => {
        const textParts: string[] = [];

        // Process files
        if (input.files?.length) {
          for (const f of input.files) {
            try {
              if (f.type === "text/plain") {
                textParts.push(Buffer.from(f.content, "base64").toString("utf-8"));
              } else {
                const decoded = Buffer.from(f.content, "base64").toString("utf-8");
                textParts.push(decoded.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim());
              }
            } catch {
              textParts.push(`[Fichier: ${f.name}]`);
            }
          }
        }

        // Fetch URLs CONCURRENTLY (bounded best-effort) — same canonical
        // web-fetch helper as processIngest.
        if (input.urls?.length) {
          const fetched = await Promise.all(
            input.urls.map(async (url) => {
              const text = await fetchUrlAsText(url, { maxChars: 10_000 });
              return text ? `[Source: ${url}]\n${text}` : `[URL inaccessible: ${url}]`;
            }),
          );
          textParts.push(...fetched);
        }

        const allText = textParts.join("\n\n---\n\n");

        const responses = await extractFromText(allText, intake.companyName, intake.sector);
        if (responses === null) return { failed: "llm_unavailable" as const };
        await mergeIntakeResponses(ctx.db, intake.id, responses);
        await quickIntakeService.complete(input.token);
        return { failed: null };
      });

      return { status: "PROCESSING" as const, token: input.token };
    }),

  // ── REQ-8: Notify fixer (Alexandre) on intake completion ───────────────
  notifyFixerOnComplete: governedProcedure({

    kind: "LEGACY_QUICK_INTAKE_NOTIFY_FIXER_ON_COMPLETE",

    // IDOR round-10 : `intakeId` arbitraire → copie la PII de contact de l'intake
    // dans un Signal rattaché à la Strategy la plus récente + alerte fixer. Interne (REQ-8).
    requireOperator: true,

    inputSchema: z.object({ intakeId: z.string() }),

    caller: "quick-intake:notifyFixerOnComplete",

  })
    .mutation(async ({ ctx, input }) => {
      const intake = await ctx.db.quickIntake.findUniqueOrThrow({ where: { id: input.intakeId } });
      if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Intake not yet completed" });
      }

      // Create a Signal for the fixer notification system
      const strategies = await ctx.db.strategy.findMany({
        where: { userId: { not: undefined } },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const fallbackStrategyId = strategies[0]?.id;
      if (!fallbackStrategyId) return { notified: false, reason: "No strategy found for notification" };

      await ctx.db.signal.create({
        data: {
          strategyId: fallbackStrategyId,
          type: "INTAKE_COMPLETED",
          data: {
            intakeId: intake.id,
            companyName: intake.companyName,
            contactName: intake.contactName,
            contactEmail: intake.contactEmail,
            classification: intake.classification,
            completedAt: intake.updatedAt.toISOString(),
            message: `Nouveau diagnostic ADVE complete: ${intake.companyName} (${intake.contactName})`,
          } as Prisma.InputJsonValue,
        },
      });

      return { notified: true, intakeId: intake.id, companyName: intake.companyName };
    }),

  // ── REQ-9: Expiration policy — auto-expire stale intakes (7 days) ──────
  expireStale: governedProcedure({
    kind: "LEGACY_QUICK_INTAKE_EXPIRE_STALE",
    inputSchema: z.object({}),
    caller: "quick-intake:expireStale",
  }).mutation(async ({ ctx }) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const staleIntakes = await ctx.db.quickIntake.findMany({
        where: {
          // FAILED abandonné > 7 j expire comme IN_PROGRESS (F1 async) ; les
          // PROCESSING coincés sont rattrapés bien avant par la garde 10 min
          // de getByToken (→ FAILED) puis expirent ici.
          status: { in: ["IN_PROGRESS", "FAILED"] },
          updatedAt: { lt: sevenDaysAgo },
        },
        select: { id: true, companyName: true, contactEmail: true, updatedAt: true },
      });

      if (staleIntakes.length === 0) return { expired: 0, intakes: [] };

      await ctx.db.quickIntake.updateMany({
        where: {
          id: { in: staleIntakes.map(i => i.id) },
        },
        data: { status: "EXPIRED" },
      });

      return {
        expired: staleIntakes.length,
        intakes: staleIntakes.map(i => ({
          id: i.id,
          companyName: i.companyName,
          contactEmail: i.contactEmail,
          lastActivity: i.updatedAt.toISOString(),
        })),
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertIntakeAccess(ctx.session.user.id, input.id);
      return ctx.db.quickIntake.findUniqueOrThrow({
        where: { id: input.id },
      });
    }),

  getAllQuestions: protectedProcedure
    .query(async () => {
      const { getAllQuestions } = await import("@/server/services/quick-intake/question-bank");
      return getAllQuestions();
    }),

  updateIntake: governedProcedure({
    kind: "LEGACY_QUICK_INTAKE_UPDATE",
    inputSchema: z.object({
      id: z.string(),
      responses: z.record(z.string(), z.record(z.string(), z.unknown())),
    }),
    caller: "quick-intake:updateIntake",
  })
    .mutation(async ({ ctx, input }) => {
      await assertIntakeAccess(ctx.session.user.id, input.id);
      const intake = await ctx.db.quickIntake.findUniqueOrThrow({
        where: { id: input.id },
      });

      const biz = input.responses.biz ?? {};
      const bizModel = biz.biz_model ? extractKeyFromOption(biz.biz_model as string) : undefined;
      const bizPositioning = biz.biz_positioning ? extractKeyFromOption(biz.biz_positioning as string) : undefined;
      const bizNature = biz.biz_nature ? extractKeyFromOption(biz.biz_nature as string) : undefined;
      const bizRevenue = Array.isArray(biz.biz_revenue)
        ? (biz.biz_revenue as string[]).map(extractKeyFromOption).join(",")
        : typeof biz.biz_revenue === "string"
          ? extractKeyFromOption(biz.biz_revenue)
          : undefined;

      const updatedIntake = await ctx.db.quickIntake.update({
        where: { id: input.id },
        data: {
          responses: input.responses as Prisma.InputJsonValue,
          ...(bizModel !== undefined ? { businessModel: bizModel } : {}),
          ...(bizPositioning !== undefined ? { positioning: bizPositioning } : {}),
          ...(bizNature !== undefined ? { brandNature: bizNature } : {}),
          ...(bizRevenue !== undefined ? { economicModel: bizRevenue } : {}),
        },
      });

      // Update associated BrandDataSource if it exists
      const source = await ctx.db.brandDataSource.findFirst({
        where: { origin: `intake:${intake.id}` },
      });

      if (source) {
        const rawContent = formatIntakeRawContent(intake.companyName, input.responses);
        await ctx.db.brandDataSource.update({
          where: { id: source.id },
          data: {
            rawContent,
            rawData: input.responses as Prisma.InputJsonValue,
            extractedFields: input.responses as Prisma.InputJsonValue,
          },
        });
      }

      return updatedIntake;
    }),
});

function extractKeyFromOption(option: string): string {
  const parts = option.split("::");
  return parts[0] ?? option;
}

function formatIntakeRawContent(name: string, responses: Record<string, any>): string {
  const parts: string[] = [];
  parts.push(`=== Fiche d'Intake : ${name} ===`);
  
  const biz = responses.biz ?? {};
  if (biz.biz_model) parts.push(`Modèle d'affaires: ${biz.biz_model}`);
  if (biz.biz_nature) parts.push(`Nature de marque: ${biz.biz_nature}`);
  if (biz.biz_revenue) parts.push(`Modèle économique: ${Array.isArray(biz.biz_revenue) ? biz.biz_revenue.join(", ") : biz.biz_revenue}`);
  if (biz.biz_positioning) parts.push(`Positionnement prix: ${biz.biz_positioning}`);
  if (biz.biz_sales_channel) parts.push(`Canal de vente: ${biz.biz_sales_channel}`);
  if (biz.biz_free_element) parts.push(`Partie gratuite: ${biz.biz_free_element}`);
  if (biz.biz_free_detail) parts.push(`Détail gratuité: ${biz.biz_free_detail}`);
  if (biz.biz_premium_scope) parts.push(`Gamme premium: ${biz.biz_premium_scope}`);

  const a = responses.a ?? {};
  if (a.a_vision) parts.push(`Vision: ${a.a_vision}`);
  if (a.a_mission) parts.push(`Mission: ${a.a_mission}`);
  if (a.a_noyau) parts.push(`Noyau identitaire: ${a.a_noyau}`);
  if (a.a_values) parts.push(`Valeurs: ${a.a_values}`);
  if (a.a_origin) parts.push(`Origine: ${a.a_origin}`);
  if (a.a_archetype) parts.push(`Archétype: ${a.a_archetype}`);
  if (a.a_citation) parts.push(`Citation: ${a.a_citation}`);

  const d = responses.d ?? {};
  if (d.d_positioning) parts.push(`Positionnement unique: ${d.d_positioning}`);
  if (d.d_promise) parts.push(`Promesse maître: ${d.d_promise}`);
  if (d.d_persona_principal) parts.push(`Persona principal: ${d.d_persona_principal}`);
  if (d.d_persona_secondary) parts.push(`Persona secondaire: ${d.d_persona_secondary}`);
  if (d.d_visual) parts.push(`Identité visuelle: ${d.d_visual}`);
  if (d.d_voice) parts.push(`Ton de voix: ${d.d_voice}`);
  if (d.d_competitors) parts.push(`Concurrents: ${d.d_competitors}`);

  const v = responses.v ?? {};
  if (v.v_promise) parts.push(`Promesse client: ${v.v_promise}`);
  if (v.v_products) parts.push(`Produits/services: ${v.v_products}`);
  if (v.v_experience) parts.push(`Expérience client: ${v.v_experience}/10`);

  const e = responses.e ?? {};
  if (e.e_community) parts.push(`Communauté: ${e.e_community}`);
  if (e.e_loyalty) parts.push(`Fidélité client: ${e.e_loyalty}`);
  if (e.e_advocates) parts.push(`Recommandation: ${e.e_advocates}`);
  if (e.e_rituals) parts.push(`Rituels: ${e.e_rituals}`);

  const r = responses.r ?? {};
  if (r.r_threats) parts.push(`Risques: ${r.r_threats}`);
  if (r.r_crisis) parts.push(`Plan de crise: ${r.r_crisis}`);
  if (r.r_reputation) parts.push(`Suivi réputation: ${r.r_reputation}`);

  const t = responses.t ?? {};
  if (t.t_kpis) parts.push(`KPIs: ${t.t_kpis}`);
  if (t.t_measurement) parts.push(`Fréquence de mesure: ${t.t_measurement}`);
  if (t.t_nps) parts.push(`Connaissance NPS: ${t.t_nps}`);

  const i = responses.i ?? {};
  if (i.i_roadmap) parts.push(`Plan marketing: ${i.i_roadmap}`);
  if (i.i_budget) parts.push(`Budget marketing (% CA): ${i.i_budget}`);
  if (i.i_team) parts.push(`Gestion marketing: ${i.i_team}`);

  const s = responses.s ?? {};
  if (s.s_guidelines) parts.push(`Guidelines de marque: ${s.s_guidelines}`);
  if (s.s_coherence) parts.push(`Cohérence communication: ${s.s_coherence}/10`);
  if (s.s_ambition) parts.push(`Ambition à 3 ans: ${s.s_ambition}`);

  return parts.filter(Boolean).join("\n");
}
