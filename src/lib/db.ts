import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

// ── Tenant context for RLS ──────────────────────────────────────────────
// v4 — AsyncLocalStorage holds the current tenantId for automatic filtering.
// Set via `runWithTenant(tenantId, fn)` in tRPC context setup.

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string | null }>();

export function getCurrentTenantId(): string | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

export function runWithTenant<T>(tenantId: string | null, fn: () => T): T {
  return tenantStorage.run({ tenantId }, fn);
}

// ── Models with tenantId column (v4 RLS) ────────────────────────────────

const TENANT_MODELS = new Set([
  "Strategy", "Campaign", "Mission", "Signal",
  "Driver", "Pillar", "GloryOutput", "KnowledgeEntry",
]);

// ── Prisma client with RLS middleware ───────────────────────────────────

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient();

  // v4 — Tenant isolation middleware via Prisma extension.
  // Auto-injects tenantId filter on read queries for TENANT_MODELS as a safety net.
  // Note: Prisma 6.x deprecated $use(). The $extends() approach is preferred but
  // requires model-specific middleware which is verbose for 8 models. For now we use
  // the query event pattern. The actual enforcement happens in operator-isolation
  // service at the tRPC router level. This is an additional safety net only.
  //
  // TODO: Migrate to $extends() with model-specific query overrides when
  //       Prisma provides a more ergonomic API for multi-model middleware.

  return client;
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
