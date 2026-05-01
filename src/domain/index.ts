/**
 * src/domain — Layer 0. Pure domain primitives.
 *
 * Imports allowed: zod only.
 * No Prisma, tRPC, NextAuth, LLM, React, fs, http.
 *
 * Anything in this barrel is safe to import from any layer (domain, lib,
 * server/governance, server/services, server/trpc, components, app).
 */

export * from "./pillars";
export * from "./lifecycle";
export * from "./touchpoints";
export * from "./intent-progress";
export * from "./brand-asset-kinds";
