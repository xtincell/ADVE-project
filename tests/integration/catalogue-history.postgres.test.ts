/**
 * Retrait et réintroduction d'un produit du catalogue — vraies transactions du
 * gateway, vrai restaurateur (ADR-0207) et vraie procédure de lecture, sur la base
 * jetable nommée. Aucun fournisseur, aucun modèle de langue.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { writePillar } from "@/server/services/pillar-gateway";
import { rollbackPillar } from "@/server/services/pillar-gateway/rollback";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { pillarRouter } from "@/server/trpc/routers/pillar";

const brands: string[] = [], users: string[] = [], operators: string[] = [];
let owner: string, stranger: string, localOperator: string;

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  for (const name of ["local", "foreign"]) {
    const operator = await db.operator.create({ data: { name: `Catalogue ${name}`, slug: `catalogue-${randomUUID()}`, status: "ACTIVE",
      licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
    operators.push(operator.id);
    users.push((await db.user.create({ data: { email: `catalogue-${randomUUID()}@example.invalid`, operatorId: operator.id } })).id);
  }
  [owner, stranger] = users as [string, string]; localOperator = operators[0]!;
});

afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.scoreSnapshot.deleteMany({ where }); await db.intentEmission.deleteMany({ where });
  await db.costDecision.deleteMany({ where }); await db.signal.deleteMany({ where });
  await db.pillar.deleteMany({ where }); await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } }); await db.operator.deleteMany({ where: { id: { in: operators } } });
  await db.$disconnect();
});

const product = (id: string | undefined, nom: string) => ({ ...(id ? { id } : {}), nom, categorie: "PLATEFORME", prix: 0,
  gainClientConcret: "Accès à une recette", lienPromesse: "Découvrir selon son goût" });
const palais = product("palais", "Palais"), autre = product("autre", "Autre");

async function fixture() {
  const strategy = await db.strategy.create({ data: { name: "Historique catalogue — recette isolée", userId: owner, operatorId: localOperator } });
  brands.push(strategy.id);
  const pillar = await db.pillar.create({ data: { strategyId: strategy.id, key: "v", currentVersion: 1, content: {
    produitsCatalogue: [palais, autre],
    productLadder: [{ tier: "Gamme", produitIds: ["palais", "Palais", "autre"] }],
  } as Prisma.InputJsonValue } });
  return { strategyId: strategy.id, pillarId: pillar.id };
}

/** Une écriture du catalogue sous son intention, comme une commande gouvernée. */
async function writeCatalogue(f: Awaited<ReturnType<typeof fixture>>, catalogue: unknown[]) {
  const current = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
  const intentId = await openEmission({ kind: "WRITE_PILLAR", strategyId: f.strategyId, caller: "fixture:catalogue-history",
    payload: { strategyId: f.strategyId, key: "v" } });
  const result = await writePillar({ strategyId: f.strategyId, pillarKey: "v", options: { expectedVersion: current.currentVersion },
    author: { system: "OPERATOR", userId: owner, intentId, reason: "Recette du catalogue" },
    operation: { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue", value: catalogue }] } });
  await closeEmission({ intentId, status: result.success ? "OK" : "FAILED", result });
  return { intentId, result };
}

const caller = (userId: string) => pillarRouter.createCaller({ db, headers: undefined, session: {
  user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString(),
} });

describe("retrait et réintroduction d'un produit du catalogue", () => {
  it("garde l'identité retirée réservée : un nouvel homonyme reçoit un autre identifiant et les liens restent à corriger", async () => {
    const f = await fixture();
    expect((await writeCatalogue(f, [autre])).result.success).toBe(true);
    const { result } = await writeCatalogue(f, [autre, product(undefined, "Palais")]);
    expect(result.success).toBe(true);
    expect((result.newContent.produitsCatalogue as Array<Record<string, unknown>>).map(p => p.id)).toEqual(["autre", "palais-2"]);
    expect(result.newContent.productLadder).toEqual([{ tier: "Gamme", produitIds: ["palais", "Palais", "autre"] }]);
  });

  it("refuse une écriture qui reprend l'identifiant retiré sans restaurer son archive, sans version ni archive nouvelles", async () => {
    const f = await fixture();
    expect((await writeCatalogue(f, [autre])).result.success).toBe(true);
    const before = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    const archives = await db.pillarVersion.count({ where: { pillarId: f.pillarId } });
    const { result } = await writeCatalogue(f, [autre, palais]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("CATALOGUE_RETIRED_ID");
    const after = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(after.currentVersion).toBe(before.currentVersion); expect(after.content).toEqual(before.content);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(archives);
  });

  it("réintroduit l'identifiant par restauration de l'archive et l'historique dit qui, quand et par quelle écriture", async () => {
    const f = await fixture();
    const retirement = await writeCatalogue(f, [autre]);
    expect(retirement.result.success).toBe(true);
    const rollbackIntent = await openEmission({ kind: "ROLLBACK_PILLAR", strategyId: f.strategyId, caller: "fixture:catalogue-history",
      payload: { strategyId: f.strategyId, key: "v", compensatedFrom: retirement.intentId } });
    const restored = await rollbackPillar({ strategyId: f.strategyId, pillarKey: "v", compensatedFrom: retirement.intentId,
      operatorId: owner, intentId: rollbackIntent, reason: "Réintroduction du produit retiré" });
    await closeEmission({ intentId: rollbackIntent, status: restored.restored ? "OK" : "FAILED", result: restored });
    expect(restored.restored).toBe(true);
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect((row.content as Record<string, unknown>).produitsCatalogue).toEqual([palais, autre]);
    const archives = await db.pillarVersion.count({ where: { pillarId: f.pillarId } });

    const history = await caller(owner).getCatalogueHistory({ strategyId: f.strategyId });
    expect(history.currentVersion).toBe(3);
    expect(history.events.map(e => [e.kind, e.productId, e.fromVersion, e.toVersion, e.proof])).toEqual([
      ["APPEARED", "palais", null, 1, null],
      ["APPEARED", "autre", null, 1, null],
      ["RETIRED", "palais", 1, 2, null],
      ["REINTRODUCED", "palais", 2, 3, "RESTORATION"],
    ]);
    const [, , retired, reintroduced] = history.events;
    expect(retired!.write).toMatchObject({ author: `OPERATOR:${owner}`, intentId: retirement.intentId, intentKind: "WRITE_PILLAR", compensatedFrom: null });
    expect(reintroduced!.write).toMatchObject({ intentId: rollbackIntent, intentKind: "ROLLBACK_PILLAR", compensatedFrom: retirement.intentId });
    expect(Date.parse(reintroduced!.write!.at)).toBeGreaterThanOrEqual(Date.parse(retired!.write!.at));
    expect(history.retiredIds).toEqual([]); expect(history.unattributed).toEqual([]);
    // La lecture n'écrit rien.
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(archives);
    await expect(caller(stranger).getCatalogueHistory({ strategyId: f.strategyId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
