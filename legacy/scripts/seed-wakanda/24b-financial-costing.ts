/**
 * WAKANDA SEED — Batch 2: Thot action-costing atomisé (ADR-0087 / ADR-0093).
 *
 * La voie « factures prestataires / costing » n'était pas irriguée côté Wakanda.
 * Le catalogue global (12 archétypes) vit dans `prisma/seed-action-costs.ts` ;
 * pour rester self-contained quand on lance `db:seed:wakanda` seul, on pose ici
 * un mini-catalogue WK (actionKeys préfixés `WK_` → aucune collision unique) +
 * les deux modèles que le seed global n'irrigue pas (`ProviderCostRate`,
 * `ActionCostEstimate`) + les `BrandAction` (projection I-pillar matérialisée).
 *
 * 100 % déterministe (estimateur Thot = zéro LLM, ADR-0093).
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T, WAKANDA } from "./constants";
import { track } from "./helpers";

const COSTING_VALID_FROM = new Date("2026-01-01T00:00:00.000Z");

export async function seedFinancialCosting(prisma: PrismaClient) {
  // ── ZoneIndex (zone WK — cost-of-living, TVA, TJM créatif) ───────────
  const zoneIndices: Array<{
    id: string;
    family: "COST_OF_LIVING" | "TAXES" | "TJM" | "MOBILE_MONEY_FEES";
    key: string;
    value: number;
    unit?: string;
  }> = [
    { id: "wk-zi-col-general", family: "COST_OF_LIVING", key: "general", value: 1.15, unit: "ratio" },
    { id: "wk-zi-vat", family: "TAXES", key: "vat_standard", value: 0.1925, unit: "rate" },
    { id: "wk-zi-tjm-creative", family: "TJM", key: "creative_day", value: 150000, unit: "XAF/day" },
    { id: "wk-zi-momo-fee", family: "MOBILE_MONEY_FEES", key: "cashout_standard", value: 0.015, unit: "rate" },
  ];
  for (const zi of zoneIndices) {
    await prisma.zoneIndex.upsert({
      where: { id: zi.id },
      update: {},
      create: {
        id: zi.id,
        family: zi.family,
        zoneCode: WAKANDA.country, // "WK"
        key: zi.key,
        value: zi.value,
        currency: zi.family === "TJM" ? WAKANDA.currency : null,
        unit: zi.unit,
        validFrom: COSTING_VALID_FROM,
        sourceRef: "WAKANDA_DEMO",
      },
    });
    track("ZoneIndex");
  }

  // ── ActionCostTemplate (mini-catalogue WK) + composants atomiques ────
  const templates: Array<{
    id: string;
    actionKey: string;
    label: string;
    category: string;
    family: string;
    components: Array<{
      driver: string;
      label: string;
      quantity: number;
      unit: string;
      rateBasis: string;
      baseRate: number;
      appliesToSubtotal?: boolean;
    }>;
  }> = [
    {
      id: "wk-tmpl-photo",
      actionKey: "WK_PHOTO_SESSION_HALF_DAY",
      label: "Séance photo — demi-journée (Wakanda)",
      category: "PRODUCTION",
      family: "PHOTO",
      components: [
        { driver: "LABOR", label: "Photographe principal", quantity: 0.5, unit: "DAY", rateBasis: "PROVIDER_RATE", baseRate: 150000 },
        { driver: "EQUIPMENT_RENTAL", label: "Boîtier + objectifs + éclairage", quantity: 1, unit: "FLAT", rateBasis: "FIXED", baseRate: 50000 },
        { driver: "LOCATION", label: "Location studio", quantity: 1, unit: "FLAT", rateBasis: "FIXED", baseRate: 30000 },
        { driver: "POST_PRODUCTION", label: "Retouche (lot)", quantity: 1, unit: "FLAT", rateBasis: "FIXED", baseRate: 40000 },
        { driver: "AGENCY_MARGIN", label: "Marge agence", quantity: 0.2, unit: "PERCENT", rateBasis: "FIXED", baseRate: 0, appliesToSubtotal: true },
      ],
    },
    {
      id: "wk-tmpl-video",
      actionKey: "WK_VIDEO_SHOOT_1DAY",
      label: "Tournage vidéo — 1 jour (Wakanda)",
      category: "PRODUCTION",
      family: "VIDEO",
      components: [
        { driver: "LABOR", label: "Réalisateur + cadreur", quantity: 1, unit: "DAY", rateBasis: "PROVIDER_RATE", baseRate: 200000 },
        { driver: "EQUIPMENT_RENTAL", label: "Caméra + drone + son", quantity: 1, unit: "FLAT", rateBasis: "FIXED", baseRate: 120000 },
        { driver: "POST_PRODUCTION", label: "Montage + étalonnage", quantity: 2, unit: "DAY", rateBasis: "FIXED", baseRate: 80000 },
        { driver: "AGENCY_MARGIN", label: "Marge agence", quantity: 0.2, unit: "PERCENT", rateBasis: "FIXED", baseRate: 0, appliesToSubtotal: true },
      ],
    },
    {
      id: "wk-tmpl-influence",
      actionKey: "WK_INFLUENCER_POST",
      label: "Post influenceur (Wakanda)",
      category: "MEDIA",
      family: "INFLUENCE",
      components: [
        { driver: "MEDIA_SPACE", label: "Cachet influenceur tier mid", quantity: 1, unit: "UNIT", rateBasis: "BENCHMARK", baseRate: 250000 },
        { driver: "LABOR", label: "Brief + coordination", quantity: 2, unit: "HOUR", rateBasis: "FIXED", baseRate: 15000 },
        { driver: "AGENCY_MARGIN", label: "Marge agence", quantity: 0.15, unit: "PERCENT", rateBasis: "FIXED", baseRate: 0, appliesToSubtotal: true },
      ],
    },
  ];

  for (const t of templates) {
    await prisma.actionCostTemplate.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        actionKey: t.actionKey,
        label: t.label,
        category: t.category,
        family: t.family,
        unitOfWork: "PROJECT",
        baseZoneCode: WAKANDA.country,
        baseCurrency: WAKANDA.currency,
        tags: ["wakanda", "demo"],
        source: "WAKANDA_DEMO",
      },
    });
    track("ActionCostTemplate");

    let sortOrder = 0;
    for (const c of t.components) {
      await prisma.actionCostComponent.upsert({
        where: { id: `${t.id}-c${sortOrder}` },
        update: {},
        create: {
          id: `${t.id}-c${sortOrder}`,
          templateId: t.id,
          driver: c.driver as Prisma.ActionCostComponentCreateInput["driver"],
          label: c.label,
          quantity: c.quantity,
          unit: c.unit as Prisma.ActionCostComponentCreateInput["unit"],
          rateBasis: c.rateBasis as Prisma.ActionCostComponentCreateInput["rateBasis"],
          baseRate: c.baseRate,
          appliesToSubtotal: c.appliesToSubtotal ?? false,
          sortOrder: sortOrder++,
        },
      });
      track("ActionCostComponent");
    }
  }

  // ── ProviderCostRate — taux par prestataire (talents Wakanda) ────────
  const rates: Array<{ id: string; providerId: string; label: string; driver: string; roleKey: string; rate: number; unit: string }> = [
    { id: "wk-rate-photo", providerId: IDS.talentPhoto, label: "Kwame Fotso (MAITRE)", driver: "LABOR", roleKey: "PHOTOGRAPHER", rate: 175000, unit: "DAY" },
    { id: "wk-rate-video", providerId: IDS.talentVideo, label: "Fatou Diallo (COMPAGNON)", driver: "LABOR", roleKey: "VIDEOGRAPHER", rate: 140000, unit: "DAY" },
    { id: "wk-rate-da", providerId: IDS.talentDA, label: "Kofi Asante (MAITRE)", driver: "LABOR", roleKey: "ART_DIRECTOR", rate: 200000, unit: "DAY" },
  ];
  for (const r of rates) {
    await prisma.providerCostRate.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        providerKind: "TALENT",
        providerId: r.providerId,
        providerLabel: r.label,
        driver: r.driver as Prisma.ProviderCostRateCreateInput["driver"],
        roleKey: r.roleKey,
        zoneCode: WAKANDA.country,
        rate: r.rate,
        unit: r.unit as Prisma.ProviderCostRateCreateInput["unit"],
        currency: WAKANDA.currency,
        validFrom: COSTING_VALID_FROM,
        sourceRef: "WAKANDA_DEMO",
      },
    });
    track("ProviderCostRate");
  }

  // ── BrandAction — initiatives I-pillar matérialisées (queryables) ────
  const actions: Array<{
    id: string;
    strategyId: string;
    title: string;
    touchpoint: string;
    aarrrIntent: string;
    costTemplateKey: string;
    budgetMin: number;
    budgetMax: number;
    estimatedHt: number;
    estimatedTtc: number;
    selected: boolean;
    status: string;
    initiative: string;
  }> = [
    { id: "wk-action-bliss-photo", strategyId: IDS.stratBliss, title: "Shooting Heritage Collection", touchpoint: "OWNED", aarrrIntent: "ACQUISITION", costTemplateKey: "WK_PHOTO_SESSION_HALF_DAY", budgetMin: 250000, budgetMax: 350000, estimatedHt: 324000, estimatedTtc: 386370, selected: true, status: "EXECUTED", initiative: "wk-init-bliss-heritage-shoot" },
    { id: "wk-action-bliss-influence", strategyId: IDS.stratBliss, title: "Vague influenceuses beauté", touchpoint: "EARNED", aarrrIntent: "REFERRAL", costTemplateKey: "WK_INFLUENCER_POST", budgetMin: 600000, budgetMax: 900000, estimatedHt: 759000, estimatedTtc: 905107, selected: true, status: "SCHEDULED", initiative: "wk-init-bliss-influence" },
    { id: "wk-action-vib-video", strategyId: IDS.stratVibranium, title: "Film de marque Vibranium Pay", touchpoint: "DIGITAL", aarrrIntent: "ACTIVATION", costTemplateKey: "WK_VIDEO_SHOOT_1DAY", budgetMin: 500000, budgetMax: 700000, estimatedHt: 552000, estimatedTtc: 658260, selected: true, status: "PROPOSED", initiative: "wk-init-vib-brandfilm" },
    { id: "wk-action-shuri-video", strategyId: IDS.stratShuri, title: "Capsules pédagogiques back-to-school", touchpoint: "OWNED", aarrrIntent: "RETENTION", costTemplateKey: "WK_VIDEO_SHOOT_1DAY", budgetMin: 400000, budgetMax: 600000, estimatedHt: 552000, estimatedTtc: 658260, selected: false, status: "DRAFT", initiative: "wk-init-shuri-capsules" },
  ];
  for (const a of actions) {
    await prisma.brandAction.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        strategyId: a.strategyId,
        title: a.title,
        touchpoint: a.touchpoint,
        aarrrIntent: a.aarrrIntent,
        budgetMin: a.budgetMin,
        budgetMax: a.budgetMax,
        budgetCurrency: WAKANDA.currency,
        selected: a.selected,
        source: "SEED",
        status: a.status,
        sourceInitiativeId: a.initiative,
        costTemplateKey: a.costTemplateKey,
        costZoneCode: WAKANDA.country,
        costQualityTier: "STANDARD",
        costEstimateId: `${a.id}-est`,
        estimatedCostHt: a.estimatedHt,
        estimatedCostTtc: a.estimatedTtc,
        estimatedCostCurrency: WAKANDA.currency,
        createdAt: T.campaignPlanning,
      },
    });
    track("BrandAction");
  }

  // ── ActionCostEstimate — snapshots déterministes (ThotCalcResult) ────
  const estimates = actions
    .filter((a) => a.status === "EXECUTED" || a.status === "SCHEDULED" || a.status === "PROPOSED")
    .map((a) => {
      const subtotal = Math.round(a.estimatedHt / 1.2); // marge 20% déjà incluse dans HT
      const marginAmount = a.estimatedHt - subtotal;
      const taxAmount = a.estimatedTtc - a.estimatedHt;
      return {
        id: `${a.id}-est`,
        templateKey: a.costTemplateKey,
        brandActionId: a.id,
        strategyId: a.strategyId,
        zoneCode: WAKANDA.country,
        qualityTier: "STANDARD",
        currency: WAKANDA.currency,
        subtotalHt: subtotal,
        marginAmount,
        contingencyAmount: 0,
        taxAmount,
        totalHt: a.estimatedHt,
        totalTtc: a.estimatedTtc,
        taxRatePct: 0.1925,
        marginPct: 0.2,
        contingencyPct: 0,
        lineItems: [
          { driver: "LABOR", label: "Prestation principale", quantity: 1, unit: "DAY", unitRate: subtotal * 0.6, zoneMultiplier: 1.15, qualityMultiplier: 1, amount: Math.round(subtotal * 0.6), rateBasis: "PROVIDER_RATE", resolvedFrom: "ProviderCostRate" },
          { driver: "EQUIPMENT_RENTAL", label: "Matériel", quantity: 1, unit: "FLAT", unitRate: subtotal * 0.4, zoneMultiplier: 1.15, qualityMultiplier: 1, amount: Math.round(subtotal * 0.4), rateBasis: "FIXED", resolvedFrom: "template" },
        ] as Prisma.InputJsonValue,
        formula: "subtotal × (1 + margin) × (1 + vat)",
        breakdown: { zone: WAKANDA.country, vat: 0.1925, margin: 0.2, _deterministic: true } as Prisma.InputJsonValue,
        usedFallback: false,
        fallbackChain: [],
        computedBy: IDS.userWkabi,
        computedAt: T.campaignPlanning,
      };
    });
  for (const e of estimates) {
    await prisma.actionCostEstimate.upsert({ where: { id: e.id }, update: {}, create: e });
    track("ActionCostEstimate");
  }

  console.log(
    `[OK] Costing: ${zoneIndices.length} ZoneIndex + ${templates.length} templates + ${rates.length} provider rates + ${actions.length} BrandActions + ${estimates.length} estimates`,
  );
}
