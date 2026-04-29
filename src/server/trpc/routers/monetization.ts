/**
 * monetization router — exposes pricing and tier resolution to the UI.
 *
 * Public routes (no auth) since intake landing must show prices before
 * the user signs up.
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "../init";
import {
  buildTierGrid,
  resolvePrice,
  TIER_ORDER,
  PRICING_TIERS,
  type PricingTierKey,
} from "@/server/services/monetization";
import { listProviders } from "@/server/services/payment-providers";
import { lookupCountry } from "@/server/services/country-registry";

const TierEnum = z.enum(TIER_ORDER as unknown as [string, ...string[]]);

const DEFAULT_FUNNEL: readonly PricingTierKey[] = [
  "INTAKE_PDF",
  "ORACLE_FULL",
  "COCKPIT_MONTHLY",
  "RETAINER_BASE",
  "RETAINER_PRO",
];

export const monetizationRouter = createTRPCRouter({
  /** Resolve a single tier's price for a country. */
  getPrice: publicProcedure
    .input(z.object({
      tierKey: TierEnum,
      countryCode: z.string().min(2).max(80).default("FR"),
    }))
    .query(async ({ input }) => {
      return resolvePrice(input.tierKey as PricingTierKey, input.countryCode);
    }),

  /** Build the full tier grid (default funnel) for a country. */
  getTierGrid: publicProcedure
    .input(z.object({
      countryCode: z.string().min(2).max(80).default("FR"),
      tierKeys: z.array(TierEnum).optional(),
    }))
    .query(async ({ input }) => {
      const tierKeys = (input.tierKeys ?? DEFAULT_FUNNEL) as readonly PricingTierKey[];
      return buildTierGrid(input.countryCode, tierKeys);
    }),

  // ── ADMIN: pricing administration ────────────────────────────────────

  /** Full tier catalog (definitions only — useful for admin UI). */
  adminListTiers: adminProcedure.query(() => {
    return Object.values(PRICING_TIERS).map((t) => ({
      key: t.key,
      label: t.label,
      summary: t.summary,
      amountSpu: t.amountSpu,
      billing: t.billing,
      inclusions: t.inclusions,
      missionStep: t.unlocksMissionStep,
    }));
  }),

  /** List configured payment providers + status (no secrets). */
  adminListProviders: adminProcedure.query(() => {
    return listProviders();
  }),

  /** Resolve all tiers across a sample of common markets — admin sanity check. */
  adminTierMatrix: adminProcedure
    .input(z.object({
      countries: z.array(z.string()).default(["FR", "CM", "CI", "SN", "US", "MA", "NG"]),
      tierKeys: z.array(TierEnum).optional(),
    }))
    .query(async ({ input }) => {
      const tierKeys = (input.tierKeys ?? TIER_ORDER) as readonly PricingTierKey[];
      const out: Record<string, Awaited<ReturnType<typeof buildTierGrid>>> = {};
      for (const c of input.countries) {
        const country = await lookupCountry(c);
        if (!country) continue;
        out[country.code] = await buildTierGrid(country.code, tierKeys);
      }
      return out;
    }),

  // ── ADMIN: pricing override CRUD (PricingOverride model) ─────────────

  adminListOverrides: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.pricingOverride.findMany({
      orderBy: [{ tierKey: "asc" }, { countryCode: "asc" }],
    });
  }),

  adminUpsertOverride: adminProcedure
    .input(z.object({
      tierKey: TierEnum,
      countryCode: z.string().length(2).nullable(),
      amountSpu: z.number().int().nullable(),
      amountLocal: z.number().nullable(),
      currencyCode: z.string().length(3).nullable(),
      active: z.boolean().default(true),
      reason: z.string().nullable().optional(),
      expiresAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      return ctx.db.pricingOverride.upsert({
        where: {
          tierKey_countryCode: {
            tierKey: input.tierKey,
            countryCode: input.countryCode ?? "",
          },
        },
        update: {
          amountSpu: input.amountSpu,
          amountLocal: input.amountLocal,
          currencyCode: input.currencyCode,
          active: input.active,
          reason: input.reason ?? null,
          expiresAt: input.expiresAt ?? null,
          createdBy: userId,
        },
        create: {
          tierKey: input.tierKey,
          countryCode: input.countryCode,
          amountSpu: input.amountSpu,
          amountLocal: input.amountLocal,
          currencyCode: input.currencyCode,
          active: input.active,
          reason: input.reason ?? null,
          expiresAt: input.expiresAt ?? null,
          createdBy: userId,
        },
      });
    }),

  adminDeleteOverride: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pricingOverride.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  // ── ADMIN: provider config (PaymentProviderConfig model) ─────────────

  adminGetProviderConfig: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.paymentProviderConfig.findMany();
  }),

  adminUpdateProviderConfig: adminProcedure
    .input(z.object({
      providerId: z.enum(["CINETPAY", "STRIPE", "PAYPAL"]),
      enabled: z.boolean(),
      config: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      return ctx.db.paymentProviderConfig.upsert({
        where: { providerId: input.providerId },
        update: { enabled: input.enabled, config: JSON.parse(JSON.stringify(input.config ?? {})), updatedBy: userId },
        create: { providerId: input.providerId, enabled: input.enabled, config: JSON.parse(JSON.stringify(input.config ?? {})), updatedBy: userId },
      });
    }),

  /** Audit summary: rolling counts of paid intakes per tier / country / provider. */
  adminTransactionsSummary: adminProcedure
    .input(z.object({
      sinceDays: z.number().int().min(1).max(365).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.sinceDays * 24 * 3600 * 1000);
      const [byProvider, byStatus, byCurrency, recent] = await Promise.all([
        ctx.db.intakePayment.groupBy({
          by: ["provider"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        ctx.db.intakePayment.groupBy({
          by: ["status"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
        }),
        ctx.db.intakePayment.groupBy({
          by: ["currency"],
          where: { createdAt: { gte: since }, status: "PAID" },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        ctx.db.intakePayment.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            reference: true,
            intakeToken: true,
            amount: true,
            currency: true,
            provider: true,
            status: true,
            paidAt: true,
            createdAt: true,
            failureReason: true,
          },
        }),
      ]);
      return { byProvider, byStatus, byCurrency, recent, sinceDays: input.sinceDays };
    }),
});
