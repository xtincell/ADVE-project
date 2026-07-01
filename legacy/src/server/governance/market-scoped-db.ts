/**
 * src/server/governance/market-scoped-db.ts — ADR-0105 market kill-switch.
 *
 * Layer 2 (governance). Wrappe le client Prisma pour rendre **invisibles** toutes
 * les lectures rattachées à un marché SHADOWBANNED/PURGED, pour tout appelant
 * non-ADMIN (founder cockpit, agency, creator, surfaces publiques). ADMIN bypasse
 * → la console `/console/governance/markets` voit les marchés neutralisés.
 *
 * Filtrage **par ensembles d'identifiants** (cf. `market-visibility`) : les racines
 * (Strategy/Client/BrandNode/Campaign/Mission) sont exclues par leur propre `id` ;
 * les modèles enfants par leur clé étrangère (`strategyId`/`campaignId`/…). Le
 * périmètre enfant est dérivé du DMMF Prisma runtime (pas de mapping à la main).
 * Aucun champ `country`/`countryCode` n'est consulté côté Proxy — la logique ISO-2
 * vit uniquement dans le résolveur (immunité aux noms d'affichage type "Wakanda").
 */

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { resolveMarketVisibility } from "@/server/services/market-visibility";

type IdSetKey = "strategyIds" | "clientIds" | "campaignIds" | "missionIds" | "brandNodeIds";

/** Modèles racines : exclus par leur propre `id` ∈ ensemble résolu. */
const ROOT_MODELS: Readonly<Record<string, IdSetKey>> = {
  strategy: "strategyIds",
  client: "clientIds",
  brandNode: "brandNodeIds",
  campaign: "campaignIds",
  mission: "missionIds",
};

/** Clés étrangères de rattachement marché (par priorité) → ensemble résolu. */
const FK_SET: Readonly<Record<string, IdSetKey>> = {
  strategyId: "strategyIds",
  campaignId: "campaignIds",
  missionId: "missionIds",
  brandNodeId: "brandNodeIds",
  clientId: "clientIds",
};
const FK_PRIORITY = ["strategyId", "campaignId", "missionId", "brandNodeId", "clientId"] as const;

/**
 * Modèles JAMAIS filtrés par marché : identité, lookups, hash-chain de
 * gouvernance (l'audit reste complet même pour un marché banni), logs/metering
 * (ADMIN-only de toute façon), et tables de référence économique partagées
 * (servent le fallback voisin d'autres marchés). Décision de sécurité.
 */
const MARKET_FILTER_DENYLIST: ReadonlySet<string> = new Set([
  "Country",
  "Currency",
  "Sector",
  "User",
  "Operator",
  "Account",
  "Session",
  "VerificationToken",
  "IntentEmission",
  "IntentEmissionEvent",
  "IntentQueue",
  "AuditLog",
  "AICostLog",
  "ErrorEvent",
  "ModelPolicy",
  "MfaSecret",
  "IntegrationConnection",
  "ExternalConnector",
  "ZoneIndex",
  "EconomicNeighborMap",
  "MarketBenchmark",
  "MarketCostSnapshot",
  "ProviderCostRate",
  "ActionCostTemplate",
  "ActionCostComponent",
  "McpApiKey",
  "McpApiCall",
  "McpUsageStatement",
  "McpServerConfig",
  "McpRegistry",
  "McpToolInvocation",
  "Post",
]);

/**
 * delegateKey (camelCase) → clé étrangère de rattachement marché, dérivée du DMMF
 * une seule fois. Exclut les racines (filtrées par `id`) et la denylist. Les
 * modèles sans aucune FK marché ne sont pas filtrés (résidu honnête : ex.
 * `QuickIntake`/`MediaContact` à champ `country` libre sans rattachement tenant).
 */
const MODEL_FK: Readonly<Record<string, string>> = (() => {
  const map: Record<string, string> = {};
  for (const model of Prisma.dmmf.datamodel.models) {
    if (MARKET_FILTER_DENYLIST.has(model.name)) continue;
    const delegate = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    if (delegate in ROOT_MODELS) continue;
    const fields = new Set(model.fields.map((f) => f.name));
    const fk = FK_PRIORITY.find((f) => fields.has(f));
    if (fk) map[delegate] = fk;
  }
  return map;
})();

/** Opérations de lecture qui acceptent un `where` composite (AND/OR). */
const READ_OPS: ReadonlySet<string> = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

type WhereArgs = { where?: Record<string, unknown> };

/**
 * Retourne un handle Prisma market-aware. ADMIN ou état non-neutralisé →
 * le client brut (zéro surcoût). Sinon, un Proxy qui injecte, par modèle, un
 * garde `NOT (id|fk ∈ ensemble invisible)` préservant les valeurs nulles.
 */
export async function marketScopedDb(rawDb: PrismaClient, isAdmin: boolean): Promise<PrismaClient> {
  if (isAdmin) return rawDb;
  const vis = await resolveMarketVisibility(rawDb);
  if (vis.empty) return rawDb;

  return new Proxy(rawDb, {
    get(target, prop: string | symbol) {
      const value = (target as unknown as Record<string | symbol, unknown>)[prop];
      if (typeof prop !== "string" || prop.startsWith("$")) return value;
      if (typeof value !== "object" || value === null) return value;

      let field: string;
      let exclude: string[];
      const rootKey = ROOT_MODELS[prop];
      if (rootKey) {
        field = "id";
        exclude = vis[rootKey];
      } else {
        const fk = MODEL_FK[prop];
        if (!fk) return value;
        const setKey = FK_SET[fk];
        if (!setKey) return value;
        field = fk;
        exclude = vis[setKey];
      }
      if (exclude.length === 0) return value;

      const guard = { OR: [{ [field]: null }, { [field]: { notIn: exclude } }] };
      const mergeWhere = (w?: Record<string, unknown>) => (w ? { AND: [w, guard] } : guard);

      return new Proxy(value as Record<string, unknown>, {
        get(model, op: string | symbol) {
          const fn = (model as Record<string | symbol, unknown>)[op];
          if (typeof op !== "string" || typeof fn !== "function") return fn;

          // findUnique* n'accepte pas de where composite → reroute vers findFirst*.
          if (op === "findUnique" || op === "findUniqueOrThrow") {
            const realOp = op === "findUnique" ? "findFirst" : "findFirstOrThrow";
            const realFn = (model as Record<string, unknown>)[realOp] as (a: unknown) => unknown;
            return (args: WhereArgs = {}) => realFn.call(model, { ...args, where: mergeWhere(args.where) });
          }
          if (READ_OPS.has(op)) {
            return (args: WhereArgs = {}) =>
              (fn as (a: unknown) => unknown).call(model, { ...args, where: mergeWhere(args.where) });
          }
          return fn;
        },
      });
    },
  }) as PrismaClient;
}
