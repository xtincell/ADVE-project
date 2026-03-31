/**
 * Ingestion Pipeline — AI ADVE Filler
 * Agent IA qui analyse les données brutes et remplit les piliers ADVE
 * Utilise les Glory tools pour affiner quand la confiance est basse
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { db } from "@/lib/db";
import { PILLAR_SCHEMAS, validatePillarPartial } from "@/lib/types/pillar-schemas";
import { executeTool as executeGloryTool } from "@/server/services/glory-tools";
import { getToolsByPillar } from "@/server/services/glory-tools/registry";
import type { PillarFillResult, SourceProvenance, GloryToolUsage } from "./types";
import type { Prisma } from "@prisma/client";

// ============================================================================
// PILLAR → GLORY TOOL MAPPING (which tools refine which pillar fields)
// ============================================================================

const GLORY_REFINEMENT_MAP: Record<string, Array<{ slug: string; fields: string[]; inputBuilder: (ctx: Record<string, unknown>) => Record<string, string> }>> = {
  A: [
    {
      slug: "semiotic-brand-analyzer",
      fields: ["archetype", "archetypeSecondary", "noyauIdentitaire"],
      inputBuilder: (ctx) => ({
        brand_identity: String(ctx.brandName ?? ""),
        sector_codes: String(ctx.sector ?? ""),
        cultural_context: String(ctx.country ?? "Cameroun"),
      }),
    },
    {
      slug: "wordplay-cultural-bank",
      fields: ["citationFondatrice", "prophecy"],
      inputBuilder: (ctx) => ({
        brand_name: String(ctx.brandName ?? ""),
        market: String(ctx.sector ?? ""),
        cultural_context: String(ctx.country ?? "Cameroun"),
        language: "francais",
      }),
    },
  ],
  D: [
    {
      slug: "visual-landscape-mapper",
      fields: ["paysageConcurrentiel", "positionnement"],
      inputBuilder: (ctx) => ({
        sector: String(ctx.sector ?? ""),
        competitors: String(ctx.competitors ?? ""),
        trends: String(ctx.trends ?? "marche africain"),
      }),
    },
    {
      slug: "claim-baseline-factory",
      fields: ["promesseMaitre", "sousPromesses", "assetsLinguistiques"],
      inputBuilder: (ctx) => ({
        brand_positioning: String(ctx.positionnement ?? ""),
        key_benefit: String(ctx.promesse ?? ""),
        tone: String(ctx.tone ?? "professionnel"),
        constraints: "",
      }),
    },
  ],
  V: [
    {
      slug: "devis-generator",
      fields: ["produitsCatalogue", "productLadder", "unitEconomics"],
      inputBuilder: (ctx) => ({
        services: String(ctx.products ?? ""),
        pricing: String(ctx.pricing ?? ""),
        timeline: "",
        client_info: String(ctx.brandName ?? ""),
      }),
    },
  ],
  E: [
    {
      slug: "content-calendar-strategist",
      fields: ["touchpoints", "rituels"],
      inputBuilder: (ctx) => ({
        platforms: String(ctx.channels ?? "FACEBOOK, INSTAGRAM"),
        frequency: "hebdomadaire",
        themes: String(ctx.themes ?? ""),
        events: "",
        duration: "3 mois",
      }),
    },
  ],
};

// ============================================================================
// SCHEMA FIELD EXTRACTOR — Gets field names from Zod schema
// ============================================================================

function getPillarFieldNames(pillarKey: string): string[] {
  const schema = PILLAR_SCHEMAS[pillarKey as keyof typeof PILLAR_SCHEMAS];
  if (!schema || !("shape" in schema)) return [];
  return Object.keys(schema.shape as Record<string, unknown>);
}

// ============================================================================
// SOURCE CONTEXT BUILDER — Aggregates all extracted content for a strategy
// ============================================================================

async function buildSourceContext(strategyId: string, sourceIds?: string[]): Promise<{
  fullText: string;
  sourceMap: Map<string, string>;
  strategy: { name: string; sector?: string; country?: string; businessContext?: Record<string, unknown> };
}> {
  const where: Prisma.BrandDataSourceWhereInput = {
    strategyId,
    processingStatus: "EXTRACTED",
    ...(sourceIds ? { id: { in: sourceIds } } : {}),
  };

  const sources = await db.brandDataSource.findMany({ where });
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    select: { name: true, description: true, businessContext: true },
  });

  const sourceMap = new Map<string, string>();
  const textParts: string[] = [];

  for (const src of sources) {
    const content = src.rawContent ?? JSON.stringify(src.rawData ?? {});
    sourceMap.set(src.id, content.slice(0, 500)); // excerpt for provenance
    textParts.push(`--- SOURCE: ${src.fileName ?? src.sourceType} (${src.id}) ---\n${content.slice(0, 8000)}`);
  }

  return {
    fullText: textParts.join("\n\n"),
    sourceMap,
    strategy: {
      name: strategy.name,
      businessContext: strategy.businessContext as Record<string, unknown> | undefined,
    },
  };
}

// ============================================================================
// ANALYZE AND MAP — Determines which sources feed which pillars
// ============================================================================

export async function analyzeAndMapSources(strategyId: string): Promise<Record<string, string[]>> {
  const ctx = await buildSourceContext(strategyId);
  if (!ctx.fullText.trim()) return {};

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `Tu es un expert en strategie de marque utilisant le framework ADVE-RTIS.
Les 4 piliers ADVE sont :
- A (Authenticite) : identite, valeurs, archetype, histoire fondatrice, ikigai
- D (Distinction) : personas, positionnement, promesse, ton de voix, concurrence
- V (Valeur) : produits, pricing, product ladder, unit economics
- E (Engagement) : touchpoints, rituels, KPIs, AARRR, communaute

Analyse les donnees fournies et determine quels piliers chaque source peut nourrir.
Reponds en JSON : { "A": ["sourceId1"], "D": ["sourceId2", "sourceId3"], "V": [], "E": ["sourceId1"] }
Inclus AUSSI un champ "businessContext" si tu detectes des infos sur le modele d'affaires.`,
    prompt: `Marque: ${ctx.strategy.name}

DONNEES SOURCES:
${ctx.fullText}

Retourne le mapping JSON source → pilier.`,
    maxTokens: 2048,
  });

  await trackCost(result, "ingestion:analyze-map", strategyId);

  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Record<string, unknown>;
      const mapping: Record<string, string[]> = {};
      for (const key of ["A", "D", "V", "E"]) {
        const val = parsed[key];
        mapping[key] = Array.isArray(val) ? val.map(String) : [];
      }

      // Update pillarMapping on each source
      for (const src of await db.brandDataSource.findMany({ where: { strategyId, processingStatus: "EXTRACTED" } })) {
        const pillars: Record<string, boolean> = {};
        for (const [key, ids] of Object.entries(mapping)) {
          if (ids.includes(src.id)) pillars[key.toLowerCase()] = true;
        }
        await db.brandDataSource.update({
          where: { id: src.id },
          data: { pillarMapping: pillars as Prisma.InputJsonValue },
        });
      }

      // Update BusinessContext if detected
      if (parsed.businessContext && typeof parsed.businessContext === "object") {
        const existing = (await db.strategy.findUnique({ where: { id: strategyId } }))?.businessContext as Record<string, unknown> | null;
        await db.strategy.update({
          where: { id: strategyId },
          data: {
            businessContext: { ...(existing ?? {}), ...(parsed.businessContext as Record<string, unknown>) } as Prisma.InputJsonValue,
          },
        });
      }

      return mapping;
    }
  } catch { /* parse error — return empty */ }
  return {};
}

// ============================================================================
// FILL PILLAR — The core: fills one ADVE pillar from source data + Glory tools
// ============================================================================

export async function fillPillar(
  strategyId: string,
  pillarKey: "A" | "D" | "V" | "E",
  sourceIds: string[],
): Promise<PillarFillResult> {
  const ctx = await buildSourceContext(strategyId, sourceIds);
  const fieldNames = getPillarFieldNames(pillarKey);
  const sources: SourceProvenance[] = [];
  const gloryToolsUsed: GloryToolUsage[] = [];

  // --- Step 1: Direct AI fill from source data ---
  const fillPrompt = `Tu es un expert en strategie de marque (framework ADVE-RTIS).

A partir des donnees sources ci-dessous, remplis le pilier ${pillarKey} avec les champs suivants.
Chaque champ doit etre rempli avec des donnees REELLES extraites des sources. Ne fabrique pas de donnees.

CHAMPS A REMPLIR:
${fieldNames.map((f) => `- ${f}`).join("\n")}

MARQUE: ${ctx.strategy.name}
${ctx.strategy.businessContext ? `CONTEXTE: ${JSON.stringify(ctx.strategy.businessContext)}` : ""}

DONNEES SOURCES:
${ctx.fullText}

INSTRUCTIONS:
- Reponds en JSON valide avec les champs listes ci-dessus
- Pour les tableaux, fournis au minimum les elements requis
- Pour chaque champ rempli, cite la source entre parentheses
- Si une donnee n'est pas disponible dans les sources, mets null
- Ne fabrique JAMAIS de donnees fictives`;

  const aiResult = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: "Tu es un extracteur de donnees structurees. Reponds UNIQUEMENT en JSON valide. Pas de texte avant ou apres le JSON.",
    prompt: fillPrompt,
    maxTokens: 8192,
  });

  await trackCost(aiResult, `ingestion:fill-${pillarKey}`, strategyId);

  let content: Record<string, unknown> = {};
  try {
    const match = aiResult.text.match(/\{[\s\S]*\}/);
    if (match) content = JSON.parse(match[0]);
  } catch {
    return {
      pillarKey,
      content: {},
      confidence: 0,
      sources: [],
      gloryToolsUsed: [],
      validationErrors: [{ path: "root", message: "Echec du parsing JSON de la reponse IA" }],
      completionPercentage: 0,
    };
  }

  // Track source provenance
  for (const [sourceId, excerpt] of ctx.sourceMap) {
    for (const field of fieldNames) {
      if (content[field] !== null && content[field] !== undefined) {
        sources.push({ sourceId, sourceType: "AI_EXTRACTION", field, excerpt: excerpt.slice(0, 100), confidence: 0.5 });
      }
    }
  }

  // --- Step 2: Validate ---
  const validation = validatePillarPartial(pillarKey, content);

  // --- Step 3: Glory tool refinement for low-confidence or invalid fields ---
  const nullFields = fieldNames.filter((f) => content[f] === null || content[f] === undefined);
  const invalidFields = validation.errors?.map((e) => e.path.split(".")[0]).filter(Boolean) ?? [];
  const fieldsToRefine = [...new Set([...nullFields, ...invalidFields])];

  if (fieldsToRefine.length > 0) {
    const refinements = GLORY_REFINEMENT_MAP[pillarKey] ?? [];
    const strategyData = await db.strategy.findUnique({
      where: { id: strategyId },
      select: { name: true, description: true, businessContext: true },
    });
    const bizCtx = (strategyData?.businessContext as Record<string, unknown>) ?? {};

    for (const refinement of refinements) {
      const overlap = refinement.fields.filter((f) => fieldsToRefine.includes(f));
      if (overlap.length === 0) continue;

      try {
        const gloryInput = refinement.inputBuilder({
          brandName: strategyData?.name ?? "",
          sector: bizCtx.sector ?? "",
          country: bizCtx.country ?? "Cameroun",
          competitors: String(content.paysageConcurrentiel ?? ""),
          positionnement: String(content.positionnement ?? ""),
          promesse: String(content.promesseMaitre ?? ""),
          products: String(content.produitsCatalogue ?? ""),
          channels: String(content.touchpoints ?? ""),
          tone: "",
          themes: "",
          pricing: "",
          trends: "",
        });

        const { outputId, output } = await executeGloryTool(refinement.slug, strategyId, gloryInput);

        // Merge Glory output into content
        const gloryData = output as Record<string, unknown>;
        delete gloryData._meta;
        const gloryContent = gloryData.content;

        if (typeof gloryContent === "string") {
          // Try to extract JSON from Glory text output
          try {
            const jsonMatch = gloryContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              for (const field of overlap) {
                if (parsed[field] !== undefined) {
                  content[field] = parsed[field];
                }
              }
            }
          } catch { /* non-JSON glory output — skip */ }
        } else if (typeof gloryContent === "object" && gloryContent !== null) {
          for (const field of overlap) {
            const val = (gloryContent as Record<string, unknown>)[field];
            if (val !== undefined) content[field] = val;
          }
        }

        gloryToolsUsed.push({ slug: refinement.slug, outputId, fieldsEnriched: overlap });

        sources.push(...overlap.map((f) => ({
          sourceId: outputId,
          sourceType: `GLORY:${refinement.slug}`,
          field: f,
          excerpt: `Output du Glory tool ${refinement.slug}`,
          confidence: 0.6,
        })));
      } catch {
        // Glory tool failed — continue with what we have
      }
    }
  }

  // --- Step 4: Re-validate after Glory refinement ---
  const finalValidation = validatePillarPartial(pillarKey, content);

  // --- Step 5: Persist to DB ---
  await db.pillar.upsert({
    where: { strategyId_key: { strategyId, key: pillarKey } },
    update: {
      content: content as Prisma.InputJsonValue,
      confidence: 0.5,
      validationStatus: "AI_PROPOSED",
      sources: sources as unknown as Prisma.InputJsonValue,
    },
    create: {
      strategyId,
      key: pillarKey,
      content: content as Prisma.InputJsonValue,
      confidence: 0.5,
      validationStatus: "AI_PROPOSED",
      sources: sources as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    pillarKey,
    content,
    confidence: 0.5,
    sources,
    gloryToolsUsed,
    validationErrors: finalValidation.errors ?? [],
    completionPercentage: finalValidation.completionPercentage,
  };
}

// ============================================================================
// FILL RTIS — Fills R/T/I/S using validated ADVE as context
// ============================================================================

export async function fillRTISPillar(
  strategyId: string,
  pillarKey: "R" | "T" | "I" | "S",
): Promise<PillarFillResult> {
  // Load validated ADVE pillars as context
  const advePillars = await db.pillar.findMany({
    where: { strategyId, key: { in: ["A", "D", "V", "E"] } },
  });

  const adveContext = advePillars
    .map((p) => `--- PILIER ${p.key.toUpperCase()} ---\n${JSON.stringify(p.content, null, 2)}`)
    .join("\n\n");

  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    select: { name: true, businessContext: true },
  });

  const fieldNames = getPillarFieldNames(pillarKey);

  const PILLAR_DESCRIPTIONS: Record<string, string> = {
    R: "Risk — Analyse SWOT, matrice risque/impact, score de risque, priorites de mitigation",
    T: "Track — TAM/SAM/SOM, triangulation, hypotheses a valider, score market fit",
    I: "Implementation — Budget, sprint 90 jours, calendrier annuel, structure equipe",
    S: "Strategie — Synthese executive, axes strategiques, facteurs cles de succes, recommandations",
  };

  const prompt = `Tu es un strategiste de marque senior utilisant le framework ADVE-RTIS.
A partir de l'ADN de marque (piliers ADVE valides ci-dessous), remplis le pilier ${pillarKey} (${PILLAR_DESCRIPTIONS[pillarKey]}).

MARQUE: ${strategy.name}
CONTEXTE BUSINESS: ${JSON.stringify(strategy.businessContext ?? {})}

ADN DE MARQUE (ADVE VALIDE):
${adveContext}

CHAMPS A REMPLIR:
${fieldNames.map((f) => `- ${f}`).join("\n")}

Reponds en JSON valide. Sois precis et actionnable. Base tes recommandations sur les donnees ADVE reelles.`;

  const result = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: "Tu es un extracteur de donnees structurees. Reponds UNIQUEMENT en JSON valide.",
    prompt,
    maxTokens: 8192,
  });

  await trackCost(result, `ingestion:fill-rtis-${pillarKey}`, strategyId);

  let content: Record<string, unknown> = {};
  try {
    const match = result.text.match(/\{[\s\S]*\}/);
    if (match) content = JSON.parse(match[0]);
  } catch { /* parse error */ }

  const validation = validatePillarPartial(pillarKey, content);

  await db.pillar.upsert({
    where: { strategyId_key: { strategyId, key: pillarKey } },
    update: {
      content: content as Prisma.InputJsonValue,
      confidence: 0.6,
      validationStatus: "AI_PROPOSED",
      sources: [{ sourceType: "AI_RTIS_GENERATION", field: "all", confidence: 0.6 }] as unknown as Prisma.InputJsonValue,
    },
    create: {
      strategyId,
      key: pillarKey,
      content: content as Prisma.InputJsonValue,
      confidence: 0.6,
      validationStatus: "AI_PROPOSED",
      sources: [{ sourceType: "AI_RTIS_GENERATION", field: "all", confidence: 0.6 }] as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    pillarKey,
    content,
    confidence: 0.6,
    sources: [{ sourceId: "rtis-gen", sourceType: "AI_RTIS_GENERATION", field: "all", excerpt: "Genere depuis ADVE valide", confidence: 0.6 }],
    gloryToolsUsed: [],
    validationErrors: validation.errors ?? [],
    completionPercentage: validation.completionPercentage,
  };
}

// ============================================================================
// COST TRACKING HELPER
// ============================================================================

async function trackCost(
  result: { usage?: { promptTokens?: number; completionTokens?: number } },
  context: string,
  strategyId: string,
) {
  await db.aICostLog.create({
    data: {
      model: "claude-sonnet-4-20250514",
      provider: "anthropic",
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
      cost: ((result.usage?.promptTokens ?? 0) / 1_000_000) * 3 + ((result.usage?.completionTokens ?? 0) / 1_000_000) * 15,
      context,
      strategyId,
    },
  }).catch((err) => { console.warn("[ingestion] AI cost log failed:", err instanceof Error ? err.message : err); });
}
