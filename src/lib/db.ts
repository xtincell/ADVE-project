import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

// ── Prisma client with PostgreSQL adapter (Prisma 7) ────────────────────
// Prisma 7 retire `url` du schema datasource — la connexion DB passe par
// un driver adapter injecté dans le constructeur. Cf. ADR Phase 12.2.
//
// Le `connectionString` est resolved au runtime depuis `DATABASE_URL` :
// les seeds, scripts CLI et workers Vercel posent tous cette env.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — Prisma 7 driver adapter requires it at construction time.",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
