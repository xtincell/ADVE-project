/**
 * Santé automatique de campagne et éditions concurrentes — commandes gouvernées réelles
 * sur PostgreSQL jetable. Aucune donnée client, aucun fournisseur, aucun modèle.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { campaignChangeRequestRouter } from "@/server/trpc/routers/campaign-change-request";
import { campaignDeliverableRouter } from "@/server/trpc/routers/campaign-deliverable";
import { computeRAG, updateCampaignDeliverableHandler } from "@/server/services/campaign-deliverable";

const operators: string[] = [], users: string[] = [], brands: string[] = [];
const campaigns: string[] = [], nodes: string[] = [], assets: string[] = [];
let team: string, foreignTeam: string, delegate: string, otherDelegate: string;
let owner: string, colleague: string, brand: string, foreignBrand: string, product: string;
const day = 86_400_000;

function session(userId = owner) {
  return { user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString() };
}
const tasks = (userId = owner) => campaignDeliverableRouter.createCaller({ db, headers: undefined, session: session(userId) });
const tickets = (userId = owner) => campaignChangeRequestRouter.createCaller({ db, headers: undefined, session: session(userId) });
const scope = () => ({ strategyId: brand, operatorId: team });
async function campaign(data: { manualRagOverride?: string | null; healthSignal?: string; isCritical?: boolean } = {}) {
  const row = await db.campaign.create({ data: { name: "Santé synthétique", strategyId: brand, code: `HEALTH-${randomUUID()}`, ...data } });
  campaigns.push(row.id);
  return row;
}
async function task(campaignId: string, data: { status?: string; dueDate?: Date | null; deliveredAt?: Date | null } = {}) {
  return db.campaignDeliverable.create({ data: { campaignId, targetNodeId: product, deliverableType: "POSTER_60x40", ...data } });
}
async function version(id: string) {
  return (await db.campaignDeliverable.findUniqueOrThrow({ where: { id } })).updatedAt.toISOString();
}
async function ticketVersion(id: string) {
  return (await db.campaignChangeRequest.findUniqueOrThrow({ where: { id } })).updatedAt.toISOString();
}
async function asset(strategyId: string) {
  const row = await db.brandAsset.create({ data: { strategyId, name: `Visuel ${randomUUID()}` } });
  assets.push(row.id);
  return row.id;
}
function settled<T>(results: PromiseSettledResult<T>[]) {
  const fulfilled = results.filter((r): r is PromiseFulfilledResult<T> => r.status === "fulfilled");
  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  return { fulfilled, rejected };
}

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  // Fixed disposable targets: local receipt DB or the existing GitHub service.
  expect(url.port).toBe(process.env.GITHUB_ACTIONS === "true" ? "5432" : "55439");
  expect(url.pathname).toBe("/shinkiro_verify");
  for (const name of ["team", "foreign", "delegate", "other-delegate"]) {
    const op = await db.operator.create({ data: { name: `Health receipt ${name}`, slug: `health-${randomUUID()}`,
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + day) } });
    operators.push(op.id);
  }
  [team, foreignTeam, delegate, otherDelegate] = operators as [string, string, string, string];
  for (const operatorId of [team, team, foreignTeam]) {
    users.push((await db.user.create({ data: { email: `health-${randomUUID()}@example.invalid`, operatorId } })).id);
  }
  [owner, colleague] = users as [string, string];
  for (const [operatorId, userId] of [[team, owner], [foreignTeam, users[2]!]] as const) {
    brands.push((await db.strategy.create({ data: { name: `Health ${randomUUID()}`, userId, operatorId } })).id);
  }
  [brand, foreignBrand] = brands as [string, string];
  product = (await db.brandNode.create({ data: { name: "Produit synthétique", slug: `health-${randomUUID()}`,
    nodeKind: "SKU", operatorId: team, strategyId: brand } })).id;
  nodes.push(product);
});
afterAll(async () => {
  await db.intentEmission.deleteMany({ where: { strategyId: { in: brands } } });
  await db.campaignChangeRequest.deleteMany({ where: { deliverable: { campaignId: { in: campaigns } } } });
  await db.campaignDeliverable.deleteMany({ where: { campaignId: { in: campaigns } } });
  await db.brandAsset.deleteMany({ where: { id: { in: assets } } });
  await db.campaign.deleteMany({ where: { id: { in: campaigns } } });
  await db.brandNode.deleteMany({ where: { id: { in: nodes } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } });
  await db.$disconnect();
});

describe.sequential("automatic campaign health from the existing task calculation", () => {
  it("returns to automatic with a computed red instead of refusing", async () => {
    const c = await campaign({ manualRagOverride: "GREEN", healthSignal: "GREEN" });
    await task(c.id, { dueDate: new Date(Date.now() - 2 * day) });
    await task(c.id, { status: "VALIDATED" });
    const res = await tasks().overrideRag({ ...scope(), campaignId: c.id, ragOverride: null, reason: "Retour au calcul" });
    expect(res.result).toMatchObject({ kind: "campaign", rag: null, health: { calculable: true, signal: "RED" } });
    expect(await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ manualRagOverride: null, healthSignal: "RED" });
  });

  it("records an explicit not-computable state rather than a green when tasks carry no evidence", async () => {
    const c = await campaign({ manualRagOverride: "RED", healthSignal: "RED" });
    await task(c.id); await task(c.id, { status: "IN_PROGRESS" });
    const res = await tasks().overrideRag({ ...scope(), campaignId: c.id, ragOverride: null, reason: "Retour au calcul" });
    expect(res.result).toMatchObject({ health: { calculable: false, signal: null } });
    expect(await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ manualRagOverride: null, healthSignal: "UNKNOWN" });
    const empty = await campaign({ manualRagOverride: "GREEN", healthSignal: "GREEN" });
    await tasks().overrideRag({ ...scope(), campaignId: empty.id, ragOverride: null, reason: "Retour au calcul" });
    expect((await db.campaign.findUniqueOrThrow({ where: { id: empty.id } })).healthSignal).toBe("UNKNOWN");
  });

  it("keeps an automatic campaign current through task and change request commands", async () => {
    const c = await campaign();
    const created = (await tasks().create({ ...scope(), campaignId: c.id, targetNodeId: product,
      deliverableType: "POSTER_60x40", dueDate: new Date(Date.now() + 10 * day).toISOString() })).deliverable;
    const health = async () => (await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).healthSignal;
    expect(await health()).toBe("GREEN");
    const ticket = (await tickets().create({ ...scope(), campaignDeliverableId: created.id,
      requestedByName: "Demandeur", description: "Reprise ouverte", impact: "MINOR" })).ticket;
    expect(await health()).toBe("AMBER");
    await tickets().resolve({ ...scope(), ticketId: ticket.id, resolutionNotes: "Reprise faite" });
    expect(await health()).toBe("GREEN");
    await tasks().update({ ...scope(), deliverableId: created.id, expectedUpdatedAt: await version(created.id),
      patches: { dueDate: new Date(Date.now() - day).toISOString() } });
    expect(await health()).toBe("RED");
    await tasks().delete({ ...scope(), deliverableId: (await task(c.id, { status: "VALIDATED" })).id });
    expect(await health()).toBe("RED");
  });

  it("never overwrites a manual campaign health when its tasks change", async () => {
    const c = await campaign({ manualRagOverride: "AMBER", healthSignal: "AMBER" });
    const t = await task(c.id, { dueDate: new Date(Date.now() + 10 * day) });
    await tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: await version(t.id),
      patches: { dueDate: new Date(Date.now() - day).toISOString() } });
    expect(await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).toMatchObject({ manualRagOverride: "AMBER", healthSignal: "AMBER" });
  });
});

describe.sequential("concurrent edits of the same task or change request", () => {
  it("refuses a second note edit made from the same read version", async () => {
    const c = await campaign(); const t = await task(c.id);
    const read = await version(t.id);
    await tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { notes: "Note A" } });
    await expect(tasks(colleague).update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { notes: "Note B" } }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    expect((await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } })).notes).toBe("Note A");
  });

  it("lets exactly one of two simultaneous edits from the same version win", async () => {
    const c = await campaign(); const t = await task(c.id);
    const read = await version(t.id);
    const results = await Promise.allSettled(["Note A", "Note B"].map((notes, i) =>
      tasks(i ? colleague : owner).update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { notes } })));
    const { fulfilled, rejected } = settled(results);
    expect(fulfilled).toHaveLength(1); expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({ code: "CONFLICT" });
    const row = await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } });
    expect(row.notes).toBe(fulfilled[0]!.value.deliverable.notes);
    expect(row.updatedAt.getTime()).toBeGreaterThan(Date.parse(read));
  });

  it("keeps one asset attachment when two are attempted from the same version", async () => {
    const c = await campaign(); const t = await task(c.id);
    const read = await version(t.id);
    const candidates = [await asset(brand), await asset(brand)];
    const { fulfilled, rejected } = settled(await Promise.allSettled(candidates.map(brandAssetId =>
      tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { brandAssetId } }))));
    expect(fulfilled).toHaveLength(1); expect(rejected[0]!.reason).toMatchObject({ code: "CONFLICT" });
    expect((await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } })).brandAssetId)
      .toBe(fulfilled[0]!.value.deliverable.brandAssetId);
  });

  it("refuses attaching another brand's asset without changing the task", async () => {
    const c = await campaign(); const t = await task(c.id);
    await expect(tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: await version(t.id),
      patches: { brandAssetId: await asset(foreignBrand) } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } })).toEqual(t);
  });

  it("keeps one transfer when two agencies are chosen from the same version", async () => {
    const c = await campaign(); const t = await task(c.id);
    const read = await version(t.id);
    const { fulfilled, rejected } = settled(await Promise.allSettled([delegate, otherDelegate].map(delegatedToOperatorId =>
      tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { delegatedToOperatorId } }))));
    expect(fulfilled).toHaveLength(1); expect(rejected[0]!.reason).toMatchObject({ code: "CONFLICT" });
    expect((await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } })).delegatedToOperatorId)
      .toBe(fulfilled[0]!.value.deliverable.delegatedToOperatorId);
  });

  it("requires the read version before replacing content, a link or a transfer", async () => {
    const c = await campaign(); const t = await task(c.id);
    for (const patches of [{ notes: "Sans version" }, { brandAssetId: await asset(brand) }, { delegatedToOperatorId: delegate }]) {
      await expect(tasks().update({ ...scope(), deliverableId: t.id, patches })).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect(await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } })).toEqual(t);
  });

  it("serializes status-only transitions and keeps the stored task health consistent with the final row", async () => {
    const c = await campaign();
    for (let round = 0; round < 6; round++) {
      const t = await task(c.id, { dueDate: new Date(Date.now() - day) });
      await Promise.allSettled([
        tasks().update({ ...scope(), deliverableId: t.id, patches: { status: "VALIDATED" } }),
        tasks(colleague).update({ ...scope(), deliverableId: t.id, patches: { status: "IN_PROGRESS" } }),
      ]);
      const row = await db.campaignDeliverable.findUniqueOrThrow({ where: { id: t.id } });
      expect(row.rag).toBe(computeRAG({ status: row.status, dueDate: row.dueDate, deliveredAt: row.deliveredAt, manualOverride: null }));
    }
  });

  it("never deletes a task while an asset is being attached to it", async () => {
    const c = await campaign();
    for (let round = 0; round < 4; round++) {
      const t = await task(c.id);
      const read = await version(t.id);
      const [attach, remove] = await Promise.allSettled([
        tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { brandAssetId: await asset(brand) } }),
        tasks(colleague).delete({ ...scope(), deliverableId: t.id }),
      ]);
      const row = await db.campaignDeliverable.findUnique({ where: { id: t.id } });
      if (row) {
        expect(attach.status).toBe("fulfilled");
        expect(remove).toMatchObject({ status: "rejected", reason: { code: "CONFLICT" } });
        expect(row.brandAssetId).not.toBeNull();
      } else {
        expect(remove.status).toBe("fulfilled");
        expect(attach).toMatchObject({ status: "rejected", reason: { code: "NOT_FOUND" } });
      }
    }
  });

  it("reports a stale version through the direct Mestor handler as a typed conflict", async () => {
    const c = await campaign(); const t = await task(c.id);
    const read = await version(t.id);
    await tasks().update({ ...scope(), deliverableId: t.id, expectedUpdatedAt: read, patches: { notes: "Première" } });
    const result = await updateCampaignDeliverableHandler({ kind: "OPERATOR_UPDATE_CAMPAIGN_DELIVERABLE", ...scope(),
      deliverableId: t.id, expectedUpdatedAt: read, patches: { notes: "Seconde" } });
    expect(result).toMatchObject({ status: "VETOED", reason: "CONFLICT" });
  });

  it("lets one of two change request edits from the same version win, including a reassignment", async () => {
    const c = await campaign(); const t = await task(c.id);
    const ticket = (await tickets().create({ ...scope(), campaignDeliverableId: t.id, requestedByName: "Demandeur",
      description: "Besoin initial", impact: "MINOR" })).ticket;
    const read = await ticketVersion(ticket.id);
    const edits = settled(await Promise.allSettled(["Besoin A", "Besoin B"].map(description =>
      tickets().update({ ...scope(), ticketId: ticket.id, expectedUpdatedAt: read, patches: { description } }))));
    expect(edits.fulfilled).toHaveLength(1); expect(edits.rejected[0]!.reason).toMatchObject({ code: "CONFLICT" });
    const afterEdit = await ticketVersion(ticket.id);
    const transfers = settled(await Promise.allSettled([owner, colleague].map(assignedToUserId =>
      tickets().update({ ...scope(), ticketId: ticket.id, expectedUpdatedAt: afterEdit, patches: { assignedToUserId } }))));
    expect(transfers.fulfilled).toHaveLength(1); expect(transfers.rejected[0]!.reason).toMatchObject({ code: "CONFLICT" });
    const row = await db.campaignChangeRequest.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(row.description).toBe(edits.fulfilled[0]!.value.ticket.description);
    expect(row.assignedToUserId).toBe(transfers.fulfilled[0]!.value.ticket.assignedToUserId);
  });

  it("requires the read version before replacing a change request's content", async () => {
    const c = await campaign(); const t = await task(c.id);
    const ticket = (await tickets().create({ ...scope(), campaignDeliverableId: t.id, requestedByName: "Demandeur",
      description: "Besoin à préserver", impact: "MINOR" })).ticket;
    for (const patches of [{ description: "Remplacement" }, { impact: "MAJOR" as const }, { assignedToUserId: colleague }]) {
      await expect(tickets().update({ ...scope(), ticketId: ticket.id, patches })).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect(await db.campaignChangeRequest.findUniqueOrThrow({ where: { id: ticket.id } })).toEqual(ticket);
  });
});
