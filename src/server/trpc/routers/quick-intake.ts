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
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { callLLM } from "@/server/services/llm-gateway";
import * as mestor from "@/server/services/mestor";
import { emitIntent as mestorEmitIntent } from "@/server/services/mestor/intents";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import * as quickIntakeService from "@/server/services/quick-intake";
import { getAdaptiveQuestions, getBusinessContextQuestions, getAllQuestions } from "@/server/services/quick-intake/question-bank";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { writePillar } from "@/server/services/pillar-gateway";
/* lafusee:governed-active */

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
 * Returns a responses object matching the same structure as the long questionnaire.
 */
const MODEL = "claude-sonnet-4-20250514";

async function extractFromText(
  text: string,
  companyName: string,
  sector?: string | null,
): Promise<Record<string, Record<string, unknown>>> {
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
3. Reponds UNIQUEMENT par un objet JSON valide. Aucun texte avant ou apres.

SCHEMA ATTENDU (Utilise EXACTEMENT ces clefs, n'invente pas de nouvelles clefs) :
{
${expectedSchema}
}`;

    const { text: out } = await callLLM({
      system,
      prompt,
      caller: "quick-intake:extract",
      purpose: "extraction",
      model: "gpt-5.5", // La version ultime de GPT-5
      maxOutputTokens: 4096,
    });

    const responseText = (typeof out === "string" ? out.trim() : "");
    console.log("[DEBUG] extractFromText LLM output:\n", responseText);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, Record<string, unknown>>;

    // Validate: keep only phases with at least 1 meaningful field
    const result: Record<string, Record<string, unknown>> = {};
    for (const [key, content] of Object.entries(parsed)) {
      if (content && typeof content === "object" && Object.keys(content).length >= 1) {
        result[key] = content;
      }
    }

    return result;
  } catch (err) {
    console.warn("[quick-intake] extractFromText failed:", err instanceof Error ? err.message : err);
    return { biz: {}, a: {}, d: {}, v: {}, e: {}, r: {}, t: {}, i: {}, s: {} };
  } finally {
    clearTimeout(timeout);
  }
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
      method: z.enum(["GUIDED", "IMPORT", "LONG", "SHORT", "INGEST", "INGEST_PLUS"]).optional(),
      // Vague 10 — empreinte web publique (alimente le pilier E)
      websiteUrl: z.string().max(300).optional(),
      socialLinksRaw: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      return quickIntakeService.start(input);
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
      return ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
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
        // Auto-detect: find first unanswered step
        const answeredSteps = new Set(Object.keys(responses));
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
          responses: true, advertis_vector: true,
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
          await seedPillarFromIntake(strategy.id, key, responses?.[key], (vector.confidence ?? 0.4) * 0.8);
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
      status: z.enum(["IN_PROGRESS", "COMPLETED", "CONVERTED", "EXPIRED"]).optional(),
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
  // ========================================================================

  /**
   * SHORT method: Process pasted text, AI extracts ADVE-RTIS data, scores.
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
      if (intake.status !== "IN_PROGRESS") throw new Error("Intake already completed");

      // Save raw text
      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: { rawText: input.text },
      });

      // Use the complete() flow with pre-populated responses from AI extraction
      const responses = await extractFromText(input.text, intake.companyName, intake.sector);

      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: { responses: responses as Prisma.InputJsonValue },
      });

      // Now complete the intake (scores, classifies, creates deal)
      return quickIntakeService.complete(input.token);
    }),

  /**
   * INGEST method: Process uploaded documents (base64), AI extracts ADVE-RTIS data.
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
      if (intake.status !== "IN_PROGRESS") throw new Error("Intake already completed");

      // Collect all text sources
      const textParts: string[] = [];

      // 1. Raw text input
      if (input.rawText) {
        textParts.push(`[TEXTE FOURNI]\n${input.rawText}`);
      }

      // 2. Website URL - Efficiently crawled
      if (input.websiteUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15_000);
          const resp = await fetch(input.websiteUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          });
          clearTimeout(timeout);

          if (resp.ok) {
            const html = await resp.text();
            const text = html
              .replace(/<script[\s\S]*?<\/script>/gi, "")
              .replace(/<style[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/\s{3,}/g, " ")
              .trim()
              .slice(0, 15_000); // Take more text to ensure good coverage
            textParts.push(`[SITE WEB: ${input.websiteUrl}]\n${text}`);
          } else {
            textParts.push(`[SITE WEB inaccessible: ${input.websiteUrl}]`);
          }
        } catch {
          textParts.push(`[Erreur de lecture du SITE WEB: ${input.websiteUrl}]`);
        }
      }

      // 3. Decode base64 files and extract text robustly
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
        } catch (err) {
          textParts.push(`[Fichier non lisible ou format non supporte: ${f.name}]`);
        }
      }

      // 4. Social Media & Digital Presence (Brave Search - Moyen légal unifié)
      if (intake.companyName) {
        try {
          const braveKey = process.env.BRAVE_API_KEY;
          if (braveKey) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            
            // On cherche la marque globalement + spécifiquement sur les réseaux
            const query = `"${intake.companyName}" OR site:twitter.com OR site:linkedin.com OR site:tiktok.com`;
            const url = new URL("https://api.search.brave.com/res/v1/web/search");
            url.searchParams.set("q", query);
            url.searchParams.set("count", "10"); // Top 10 resultats
            
            const res = await fetch(url.toString(), {
              signal: controller.signal,
              headers: { "Accept": "application/json", "X-Subscription-Token": braveKey },
            });
            clearTimeout(timeout);

            if (res.ok) {
              const data = await res.json();
              const results = (data.web?.results || []).map((item: any) => `- ${item.title}: ${item.description}`).join("\n");
              if (results) {
                textParts.push(`[PRÉSENCE DIGITALE & RÉSEAUX SOCIAUX]\n${results}`);
              }
            }
          }
        } catch (err) {
          console.warn("[quick-intake] Echec de la collecte de presence digitale:", err);
        }
      }

      const allText = textParts.join("\n\n---\n\n");

      // Update intake with source info
      const sourceNames = [
        input.rawText ? "texte" : null,
        input.websiteUrl ? input.websiteUrl : null,
        ...input.files.map((f) => f.name),
      ].filter(Boolean);

      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: {
          rawText: input.rawText ?? null,
          websiteUrl: input.websiteUrl ?? null,
          documentUrl: sourceNames.join(", "),
        },
      });

      const responses = await extractFromText(allText, intake.companyName, intake.sector);
      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: { responses: responses as Prisma.InputJsonValue },
      });

      // Méthode Hybride (Ghost Action) : On sauvegarde les réponses de l'IA
      // mais on ne clôture PAS l'intake. On redirige vers le formulaire pré-rempli.
      return { success: true, token: input.token };
    }),

  /**
   * INGEST PLUS method: Documents + URLs (website + social).
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
      if (intake.status !== "IN_PROGRESS") throw new Error("Intake already completed");

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

      // Fetch URLs (simple text extraction)
      if (input.urls?.length) {
        for (const url of input.urls) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15_000);
            const resp = await fetch(url, {
              signal: controller.signal,
              headers: { "User-Agent": "LaFusee-ADVE-Bot/1.0" },
            });
            clearTimeout(timeout);

            if (resp.ok) {
              const html = await resp.text();
              // Strip HTML tags, keep text
              const text = html
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/\s{3,}/g, " ")
                .trim()
                .slice(0, 10_000); // Limit to 10k chars per URL
              textParts.push(`[Source: ${url}]\n${text}`);
            }
          } catch {
            textParts.push(`[URL inaccessible: ${url}]`);
          }
        }
      }

      const allText = textParts.join("\n\n---\n\n");

      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: {
          documentUrl: input.files?.map((f) => f.name).join(", ") ?? null,
          websiteUrl: input.urls?.[0] ?? null,
        },
      });

      const responses = await extractFromText(allText, intake.companyName, intake.sector);
      await ctx.db.quickIntake.update({
        where: { id: intake.id },
        data: { responses: responses as Prisma.InputJsonValue },
      });

      return quickIntakeService.complete(input.token);
    }),

  // ── REQ-8: Notify fixer (Alexandre) on intake completion ───────────────
  notifyFixerOnComplete: governedProcedure({

    kind: "LEGACY_QUICK_INTAKE_NOTIFY_FIXER_ON_COMPLETE",

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
          status: "IN_PROGRESS",
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
});
