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

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — Prisma 7 driver adapter requires it at construction time.",
    );
  }
  // Pool borné — sur un pooler Supabase en *session mode* (pool_size 15 en
  // free tier), un pg.Pool par défaut (max 10) suffit à saturer la limite dès
  // qu'une 2ᵉ instance serverless chauffe → erreur EMAXCONNSESSION. On plafonne
  // donc le pool et on relâche vite les connexions idle. Surchargeable via env
  // pour les déploiements à plus forte concurrence (ou pooler transaction-mode,
  // port 6543, cf. .env.example).
  const max = Number(process.env.DB_POOL_MAX ?? "5") || 5;
  const adapter = new PrismaPg({
    connectionString,
    max,
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? "10000") || 10_000,
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONN_MS ?? "10000") || 10_000,
  });
  return new PrismaClient({ adapter });
}

/**
 * Lazy-initialized Prisma client. Uses a Proxy so the PrismaClient is only
 * constructed on first property access (at runtime), not at module evaluation
 * time. This prevents `npm run build` / Vercel's static page-data collection
 * phase from crashing when DATABASE_URL is absent (it's only available at
 * runtime in serverless functions).
 */
function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    // Next.js and Webpack inspect these properties during build to resolve modules.
    // By returning undefined for these without triggering `getDb()`, we ensure
    // the PrismaClient is truly lazy and only initialized when a real query is made.
    if (
      typeof prop === "symbol" ||
      ["then", "__esModule", "default", "$$typeof"].includes(prop as string)
    ) {
      return Reflect.get(_target, prop, receiver);
    }
    
    return Reflect.get(getDb(), prop, receiver);
  },
});
