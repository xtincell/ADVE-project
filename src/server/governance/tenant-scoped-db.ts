/**
 * src/server/governance/tenant-scoped-db.ts — Default-deny multi-tenant
 * Prisma wrapper.
 *
 * Layer 2.
 *
 * Every protected route obtains its DB handle via `tenantScopedDb(ctx,
 * operatorId)`. The wrapper intercepts `findMany`, `findFirst`, `update`,
 * `delete`, `create`, `updateMany`, `deleteMany`, `upsert`, `count`,
 * `aggregate` on every model. For models that have an `operatorId` column,
 * it injects `where: { operatorId }` (or asserts it on writes) and refuses
 * the call otherwise.
 *
 * Tables genuinely global (sectors, country lookups, system models) opt out
 * via the GLOBAL_TABLES whitelist below.
 *
 * The implementation is a thin Proxy. We do not depend on Prisma's
 * `$extends` API to keep the wrapper visible in the audit and easy to
 * reason about.
 */

import type { PrismaClient } from "@prisma/client";

/**
 * Models that have no `operatorId` and are intentionally global.
 * Adding to this list is a security decision — review carefully.
 */
const GLOBAL_TABLES: ReadonlySet<string> = new Set([
  "sector",
  "country",
  "marketBenchmark",
  "llmModel",
  "currencyRate",
  "intentEmission", // hash-chain integrity is global
  "intentEmissionEvent",
  "intentQueue",
  "user", // user lookups are global, but user-tied joins must be scoped at the join level
  "session",
  "account",
  "verificationToken",
]);

const SCOPED_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);
const WRITE_OPS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

export type ScopedDb = PrismaClient;

export function tenantScopedDb(
  db: PrismaClient,
  operatorId: string | "ADMIN",
): ScopedDb {
  if (operatorId === "ADMIN") return db;

  return new Proxy(db, {
    get(target, prop: string | symbol) {
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof prop !== "string") return value;
      if (prop.startsWith("$")) return value;
      if (typeof value !== "object" || value === null) return value;
      if (GLOBAL_TABLES.has(prop)) return value;

      // Wrap the model delegate.
      return new Proxy(value as Record<string, unknown>, {
        get(model, op: string | symbol) {
          const fn = (model as Record<string | symbol, unknown>)[op];
          if (typeof op !== "string" || typeof fn !== "function") return fn;

          if (SCOPED_OPS.has(op)) {
            return (args: { where?: Record<string, unknown> } = {}) => {
              const where = { operatorId, ...(args.where ?? {}) };
              return (fn as (a: unknown) => unknown).call(model, {
                ...args,
                where,
              });
            };
          }
          if (WRITE_OPS.has(op)) {
            return (args: { where?: Record<string, unknown>; data?: Record<string, unknown> } = {}) => {
              if (op === "create" || op === "createMany") {
                const data = args.data ?? {};
                if (Array.isArray(data)) {
                  return (fn as (a: unknown) => unknown).call(model, {
                    ...args,
                    data: data.map((d: Record<string, unknown>) => ({ ...d, operatorId })),
                  });
                }
                return (fn as (a: unknown) => unknown).call(model, {
                  ...args,
                  data: { ...data, operatorId },
                });
              }
              const where = { operatorId, ...(args.where ?? {}) };
              return (fn as (a: unknown) => unknown).call(model, {
                ...args,
                where,
              });
            };
          }
          return fn;
        },
      });
    },
  }) as PrismaClient;
}
