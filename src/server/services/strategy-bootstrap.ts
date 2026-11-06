import type { Prisma, MarketScale } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { PILLAR_STORAGE_KEYS } from "@/domain";

export type StrategySeed = {
  name: string;
  description?: string;
  operatorId?: string;
  clientId?: string;
  sector?: string;
  country?: string;
  marketScale?: MarketScale;
  businessContext?: Record<string, unknown>;
};
export type SeedActor = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export async function assertSeedScopeAccess(
  db: Prisma.TransactionClient,
  actor: { role: string; operatorId: string | null },
  operatorId?: string,
  clientId?: string,
) {
  if (
    !operatorId ||
    (actor.role !== "ADMIN" && actor.operatorId !== operatorId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Le dossier doit appartenir à votre équipe.",
    });
  }
  if (
    clientId &&
    !(await db.client.findFirst({
      where: {
        id: clientId,
        operatorId,
        status: { notIn: ["ARCHIVED", "REFERENCE"] },
      },
      select: { id: true },
    }))
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Client indisponible pour cette équipe.",
    });
  }
}

/** Initialise un nouveau dossier, ses fondations et leur source dans la même transaction. */
export async function seedStrategy(
  db: Prisma.TransactionClient,
  input: StrategySeed,
  actor: SeedActor,
) {
  const { sector, country, businessContext, clientId, ...rest } = input;
  const { lookupCountry } = await import("@/server/services/country-registry");
  const declaredCountry = country ? await lookupCountry(country) : null;
  const biz = businessContext as Record<string, unknown> | undefined;
  const declaredBusinessContext = sector ? { ...biz, sector } : biz;
  const strategy = await db.strategy.create({
    data: {
      ...rest,
      userId: actor.id,
      operatorId: input.operatorId,
      clientId: clientId ?? undefined,
      businessContext: declaredBusinessContext as Prisma.InputJsonValue,
      ...(declaredCountry
        ? {
            countryCode: declaredCountry.code,
            currencyCode: declaredCountry.currencyCode,
          }
        : {}),
    },
  });

  // Auto-create 8 pillars — seed A and V with Strategy metadata (Chantier -1)
  const pillarSeeds: Record<string, Record<string, unknown>> = {
    a: {
      nomMarque: input.name,
      description: input.description ?? "",
      secteur: sector ?? "",
      pays: country ?? "",
      brandNature: biz?.brandNature ?? undefined,
      langue: biz?.language,
    },
    d: {},
    v: {
      businessModel: biz?.businessModel ?? undefined,
      economicModels: biz?.economicModels ?? undefined,
      positioningArchetype: biz?.positioningArchetype ?? undefined,
      salesChannel: biz?.salesChannel ?? undefined,
      freeLayer: biz?.freeLayer ?? undefined,
    },
    e: {},
    r: {},
    t: {},
    i: {},
    s: {},
  };
  // Clean undefined values to avoid Prisma issues
  for (const obj of Object.values(pillarSeeds)) {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) delete obj[k];
    }
  }
  for (const key of [...PILLAR_STORAGE_KEYS]) {
    await db.pillar.create({
      data: {
        strategyId: strategy.id,
        key,
        content: pillarSeeds[key] as Prisma.InputJsonValue,
        confidence: Object.keys(pillarSeeds[key] ?? {}).length > 0 ? 0.1 : 0,
      },
    });
  }

  // Initialize structured responses object
  const bizCtx = (biz ?? {}) as Record<string, unknown>;
  // Creating a dossier is not answering its diagnostic questionnaire.
  // Only the business facts actually supplied are admitted as declared input.
  const initialResponses = buildInitialIntakeResponses(bizCtx);

  // Auto-create QuickIntake to act as the biz intake for the cockpit-created brand
  const quickIntake = await db.quickIntake.create({
    data: {
      contactName: actor.name ?? "System",
      contactEmail: actor.email ?? "system@lafusee.io",
      companyName: input.name,
      sector: sector ?? null,
      country: country ?? null,
      businessModel: (bizCtx.businessModel as string) ?? null,
      economicModel: Array.isArray(bizCtx.economicModels)
        ? (bizCtx.economicModels as string[]).join(",")
        : null,
      positioning: (bizCtx.positioningArchetype as string) ?? null,
      brandNature: (bizCtx.brandNature as string) ?? null,
      responses: initialResponses as Prisma.InputJsonValue,
      status: "CONVERTED",
      convertedToId: strategy.id,
    },
  });

  // Auto-create BrandDataSource of type MANUAL_INPUT linked to the QuickIntake
  const rawContent = [
    formatIntakeRawContent(input.name, initialResponses),
    input.description && `Description: ${input.description}`,
    sector && `Secteur: ${sector}`,
    country && `Pays: ${country}`,
    bizCtx.language && `Langue: ${String(bizCtx.language)}`,
  ]
    .filter(Boolean)
    .join("\n");
  const hasValueContext = Object.keys(initialResponses.biz).some(
    (key) => key !== "biz_nature",
  );
  await db.brandDataSource.create({
    data: {
      strategyId: strategy.id,
      sourceType: "MANUAL_INPUT",
      fileName: `Quick Intake — ${input.name}`,
      rawContent,
      rawData: initialResponses as Prisma.InputJsonValue,
      extractedFields: initialResponses as Prisma.InputJsonValue,
      pillarMapping: {
        a: true,
        ...(hasValueContext ? { v: true } : {}),
      } as Prisma.InputJsonValue,
      processingStatus: "PROCESSED",
      certainty: "DECLARED",
      origin: `intake:${quickIntake.id}`,
    },
  });

  // Chantier 7 — Seed SESHAT with sector benchmarks
  if (sector) {
    await db.knowledgeEntry.create({
      data: {
        entryType: "SECTOR_BENCHMARK",
        sector: sector,
        market: country ?? "",
        data: {
          source: "initial_seed",
          benchmarkType: "sector_defaults",
          strategyId: strategy.id,
        },
        // `successScore` est une pertinence 0-1 (elle est servie telle quelle
        // en `relevance`) : la valeur 50 classait ce placeholder loin devant
        // toute référence réelle. Rien n'a été mesuré ici — donc `null`.
        successScore: null,
        sampleSize: 0,
        sourceHash: `seed-${strategy.id}`,
      },
    });
  }

  // Auto-create VariableStoreConfig
  await db.variableStoreConfig.create({
    data: {
      strategyId: strategy.id,
      stalenessThresholdDays: 30,
      autoRecalculate: true,
    },
  });

  // Auto-create BrandOSConfig
  await db.brandOSConfig.create({
    data: {
      strategyId: strategy.id,
      config: {
        ...(declaredCountry ? { currency: declaredCountry.currencyCode } : {}),
        language: "fr",
      },
    },
  });

  // A brand dossier is not a sale. Commercial opportunities and their
  // outcomes belong to the existing explicit CRM commands.

  await db.auditLog.create({
    data: {
      userId: actor.id,
      action: "CREATE",
      entityType: "Strategy",
      entityId: strategy.id,
      newValue: { name: input.name, ...(clientId ? { clientId } : {}) },
    },
  });
  return strategy;
}

/** Seed a linked intake without inventing answers to its brand diagnostic. */
export function buildInitialIntakeResponses(
  businessContext: Record<string, unknown> = {},
) {
  const freeLayer = businessContext.freeLayer;
  const free =
    typeof freeLayer === "object" &&
    freeLayer !== null &&
    !Array.isArray(freeLayer)
      ? (freeLayer as Record<string, unknown>)
      : {};
  const supplied = {
    biz_model: businessContext.businessModel,
    biz_nature: businessContext.brandNature,
    biz_revenue: businessContext.economicModels,
    biz_positioning: businessContext.positioningArchetype,
    biz_sales_channel: businessContext.salesChannel,
    biz_free_element: free.whatIsFree,
    biz_free_detail: free.whatIsPaid,
    biz_premium_scope: businessContext.premiumScope,
  };
  const biz = Object.fromEntries(
    Object.entries(supplied).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0),
    ),
  );
  // The brand name is metadata, not an answer to the identity-core question.
  return { biz, a: {}, d: {}, v: {}, e: {}, r: {}, t: {}, i: {}, s: {} };
}

export function formatIntakeRawContent(
  name: string,
  responses: Record<string, any>,
): string {
  const parts: string[] = [];
  parts.push(`=== Fiche d'Intake : ${name} ===`);

  const biz = responses.biz ?? {};
  if (biz.biz_model) parts.push(`Modèle d'affaires: ${biz.biz_model}`);
  if (biz.biz_nature) parts.push(`Nature de marque: ${biz.biz_nature}`);
  if (
    biz.biz_revenue &&
    (!Array.isArray(biz.biz_revenue) || biz.biz_revenue.length > 0)
  )
    parts.push(
      `Modèle économique: ${Array.isArray(biz.biz_revenue) ? biz.biz_revenue.join(", ") : biz.biz_revenue}`,
    );
  if (biz.biz_positioning)
    parts.push(`Positionnement prix: ${biz.biz_positioning}`);
  if (biz.biz_sales_channel)
    parts.push(`Canal de vente: ${biz.biz_sales_channel}`);
  if (biz.biz_free_element)
    parts.push(`Partie gratuite: ${biz.biz_free_element}`);
  if (biz.biz_free_detail)
    parts.push(`Détail gratuité: ${biz.biz_free_detail}`);
  if (biz.biz_premium_scope)
    parts.push(`Gamme premium: ${biz.biz_premium_scope}`);

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
  if (d.d_persona_principal)
    parts.push(`Persona principal: ${d.d_persona_principal}`);
  if (d.d_persona_secondary)
    parts.push(`Persona secondaire: ${d.d_persona_secondary}`);
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
