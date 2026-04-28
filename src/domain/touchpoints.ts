/**
 * src/domain/touchpoints.ts — Touchpoint families & AARRR pirate metrics.
 *
 * Layer 0. Pure module.
 */

import { z } from "zod";

export const TOUCHPOINTS = [
  "DIGITAL",
  "ATL",
  "BTL",
  "TTL",
  "OWNED",
  "EARNED",
] as const;

export type Touchpoint = (typeof TOUCHPOINTS)[number];

export const TouchpointSchema = z.enum(TOUCHPOINTS);

export const AARRR_INTENTS = [
  "ACQUISITION",
  "ACTIVATION",
  "RETENTION",
  "REFERRAL",
  "REVENUE",
] as const;

export type AarrrIntent = (typeof AARRR_INTENTS)[number];

export const AarrrIntentSchema = z.enum(AARRR_INTENTS);
