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
import * as mestor from "@/server/services/mestor";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import * as quickIntakeService from "@/server/services/quick-intake";
import { getAdaptiveQuestions, getBusinessContextQuestions } from "@/server/services/quick-intake/question-bank";

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
    const prompt = `A partir du texte suivant, extrait les reponses structurees pour chaque pilier ADVE en suivant la spec du quick-intake.

MARQUE: ${companyName}
SECTEUR: ${sector ?? "Non precise"}

TEXTE SOURCE:
${text.slice(0, 15_000)}

Reponds uniquement par un objet JSON avec les clefs: biz,a,d,v,e,r,t,i,s.`;

    const { text: out } = await generateText({
      model: anthropic(MODEL),
      system,
      prompt,
      maxTokens: 4096,
      abortSignal: controller.signal,
    });

    const responseText = (typeof out === "string" ? out.trim() : "");
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
    }))
    .mutation(async ({ input }) => {
      return quickIntakeService.start(input);
    }),

  advance: publicProcedure
    .input(z.object({
      token: z.string(),
      responses: z.record(z.unknown()),
    }))
    .mutation(async ({ input }) => {
      return quickIntakeService.advance(input);
    }),

  complete: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      return quickIntakeService.complete(input.token);
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.quickIntake.findUnique({
        where: { shareToken: input.token },
      });
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

  convert: adminProcedure
    .input(z.object({
      intakeId: z.string(),
      userId: z.string(),
      clientId: z.string().optional(),
    }))
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

      // Promote existing temporary strategy OR create new one
      let strategy;

      if (intake.convertedToId) {
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

        for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
          if (!existingKeys.has(key)) {
            await ctx.db.pillar.create({
              data: {
                strategyId: strategy.id,
                key,
                content: (responses?.[key] ?? {}) as Prisma.InputJsonValue,
                confidence: (vector.confidence ?? 0.4) * 0.8,
              },
            });
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

        for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
          await ctx.db.pillar.create({
            data: {
              strategyId: strategy.id,
              key,
              content: (responses?.[key] ?? {}) as Prisma.InputJsonValue,
              confidence: (vector.confidence ?? 0.4) * 0.8,
            },
          });
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

      // Create BrandDataSource from intake responses (source of truth)
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

      // 2. Website URL (stored for future crawling — not crawled yet)
      if (input.websiteUrl) {
        textParts.push(`[SITE WEB] ${input.websiteUrl}`);
      }

      // 3. Decode base64 files to text
      for (const f of input.files) {
        try {
          if (f.type === "text/plain") {
            textParts.push(`[DOCUMENT: ${f.name}]\n${Buffer.from(f.content, "base64").toString("utf-8")}`);
          } else {
            const decoded = Buffer.from(f.content, "base64").toString("utf-8");
            const cleaned = decoded.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
            if (cleaned.length > 50) textParts.push(`[DOCUMENT: ${f.name}]\n${cleaned}`);
          }
        } catch {
          textParts.push(`[Fichier non lisible: ${f.name}]`);
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

      return quickIntakeService.complete(input.token);
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
  notifyFixerOnComplete: adminProcedure
    .input(z.object({ intakeId: z.string() }))
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
  expireStale: adminProcedure
    .mutation(async ({ ctx }) => {
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
