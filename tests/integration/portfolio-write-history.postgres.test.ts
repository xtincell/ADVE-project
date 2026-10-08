/** Read projection against disposable PostgreSQL. No brand corpus or providers. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// The session is supplied to the real tRPC caller; no Next.js request is made.
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next-auth", () => ({}));
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getPortfolioWorkspace } from "@/server/services/brand-node/workspace";
import { setSourceUse, resolveBrandSource } from "@/server/services/ingestion-pipeline/source-usage";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";
let operatorId: string, userId: string, foreignUserId: string;
const strategies: string[] = [], nodes: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  const op = await db.operator.create({ data: { name: "Recette historique", slug: `history-${randomUUID()}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
  operatorId = op.id;
  userId = (await db.user.create({ data: { email: `own-${randomUUID()}@example.test`, operatorId } })).id;
  foreignUserId = (await db.user.create({ data: { email: `foreign-${randomUUID()}@example.test` } })).id;
});
afterAll(async () => {
  if (nodes.length) await db.brandNode.deleteMany({ where: { id: { in: nodes }, operatorId } });
  if (strategies.length) {
    await db.brandDataSource.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.pillar.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  if (userId && foreignUserId) await db.user.deleteMany({ where: { id: { in: [userId, foreignUserId] } } });
  if (operatorId) await db.operator.delete({ where: { id: operatorId } });
  await db.$disconnect();
});

describe("documents utilisables depuis le portefeuille", () => {
  async function sharedFixture() {
    const { own, node } = await fixture();
    const owner = await db.strategy.create({ data: { name: "Marque propriétaire", userId, operatorId } });
    strategies.push(owner.id);
    const source = await db.brandDataSource.create({ data: { strategyId: owner.id, sourceType: "MANUAL_INPUT",
      fileName: "Brief multimarque synthétique", rawContent: "Une seule pièce et deux usages, sans analyse implicite.",
      certainty: "DECLARED", processingStatus: "PROCESSED" } });
    await setSourceUse({ sourceId: source.id, strategyId: own.id, userId, operatorId, admin: false, revoke: false });
    const read = () => getPortfolioWorkspace(node, { allowBarre: false, actor: { userId, operatorId, role: "USER" } });
    return { own, owner, source, read };
  }
  it("retrouve le document canonique avec son propriétaire et l’état local, sans exposer le texte", async () => {
    const { source, read } = await sharedFixture();
    const before = await db.brandSourceUse.findMany({ where: { sourceId: source.id } });
    const view = await read();
    const documents = view.strategies[0]!.dataSources;
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({ id: source.id, shared: true, ownerBrandName: "Marque propriétaire",
      certainty: "DECLARED", processingStatus: "EXTRACTED", fileName: source.fileName });
    expect(documents[0]).not.toHaveProperty("rawContent");
    expect(documents[0]).not.toHaveProperty("rawData");
    expect(documents[0]).not.toHaveProperty("uses");
    expect(await db.brandSourceUse.findMany({ where: { sourceId: source.id } })).toEqual(before);
    expect(await db.brandDataSource.count({ where: { id: source.id } })).toBe(1);
  });
  it("ne confond pas un document propre avec un usage partagé", async () => {
    const { own, read } = await sharedFixture();
    const local = await db.brandDataSource.create({ data: { strategyId: own.id, sourceType: "MANUAL_INPUT",
      fileName: "Pièce du dossier", rawContent: "Une pièce propre à cette marque.", processingStatus: "EXTRACTED" } });
    const documents = (await read()).strategies[0]!.dataSources;
    expect(documents).toHaveLength(2);
    expect(documents.find((d) => d.id === local.id)).toMatchObject({ shared: false, ownerStrategyId: own.id });
  });
  it("retire l’usage révoqué au prochain chargement et refuse sa consultation", async () => {
    const { own, source, read } = await sharedFixture();
    await setSourceUse({ sourceId: source.id, strategyId: own.id, userId, operatorId, admin: false, revoke: true });
    expect((await read()).strategies[0]!.dataSources).toEqual([]);
    await expect(resolveBrandSource(source.id, own.id)).rejects.toThrow("SOURCE_UNAVAILABLE");
    const caller = ingestionRouter.createCaller({ db, headers: undefined, session: {
      user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString(),
    } });
    await expect(caller.getSource({ id: source.id, strategyId: own.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("retire aussi la pièce si le propriétaire quitte le périmètre partagé", async () => {
    const { own, owner, source, read } = await sharedFixture();
    await db.strategy.update({ where: { id: owner.id }, data: { operatorId: null } });
    expect((await read()).strategies[0]!.dataSources).toEqual([]);
    await expect(resolveBrandSource(source.id, own.id)).rejects.toThrow("SOURCE_UNAVAILABLE");
  });
});
async function fixture() {
  const own = await db.strategy.create({ data: { name: "Dossier propre", userId, operatorId } });
  const foreign = await db.strategy.create({ data: { name: "Dossier externe", userId: foreignUserId } });
  strategies.push(own.id, foreign.id);
  const pillar = await db.pillar.create({ data: { strategyId: own.id, key: "a", currentVersion: 3, validationStatus: "VALIDATED",
    content: { secretFixture: "Le contenu ne fait pas partie de cette projection" } } });
  await db.pillarVersion.createMany({ data: [
    { pillarId: pillar.id, version: 1, author: "seed-fixture", content: { previous: 1 } },
    { pillarId: pillar.id, version: 3, author: "OPERATOR:fixture", content: { previous: 2 } },
    { pillarId: pillar.id, version: 2, author: "AUTO_FILLER", content: { previous: 3 } },
  ] });
  const node = await db.brandNode.create({ data: { name: "Marque de recette", slug: `history-${randomUUID()}`,
    operatorId, strategyId: own.id, nodeKind: "STANDALONE_BRAND", nodeNature: "PRODUCT",
    sourceRefs: [{ system: "LA_FUSEE", kind: "strategy", id: foreign.id }] } });
  nodes.push(node.id); return { own, foreign, node };
}
describe("dernière écriture dans le dossier de marque", () => {
  it("lit la version la plus haute, sans recopier le contenu ni accorder l’accès par un lien", async () => {
    const { own, foreign, node } = await fixture();
    const before = await db.pillar.findMany({ where: { strategyId: own.id } });
    const view = await getPortfolioWorkspace(node, { allowBarre: false, actor: { userId, operatorId, role: "USER" } });
    expect(view.strategies.map((s) => s.id)).toEqual([own.id]);
    expect(view.strategies.map((s) => s.id)).not.toContain(foreign.id);
    const p = view.strategies[0]!.pillars[0]!;
    expect(p.currentVersion).toBe(3);
    expect(p.validationStatus).toBe("VALIDATED");
    expect(p.versions).toHaveLength(1);
    expect(p.versions[0]).toEqual({ version: 3, author: "OPERATOR:fixture", createdAt: expect.any(Date) });
    expect(p).not.toHaveProperty("content");
    expect(await db.pillar.findMany({ where: { strategyId: own.id } })).toEqual(before);
  });
  it("conserve l’absence d’historique et l’état importé sans reçu inventé", async () => {
    const { own, node } = await fixture();
    await db.pillar.create({ data: { strategyId: own.id, key: "d", validationStatus: "VALIDATED" } });
    const view = await getPortfolioWorkspace(node, { allowBarre: false, actor: { userId, operatorId, role: "USER" } });
    expect(view.strategies[0]!.pillars.find((p) => p.key === "d")?.versions).toEqual([]);
  });
});
