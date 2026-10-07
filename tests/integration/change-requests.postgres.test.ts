/** Real governed commands and disposable PostgreSQL. No client data or provider. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { campaignChangeRequestRouter } from "@/server/trpc/routers/campaign-change-request";
import { campaignDeliverableRouter } from "@/server/trpc/routers/campaign-deliverable";
import { campaignRouter } from "@/server/trpc/routers/campaign";
import { operatorActionRouter } from "@/server/trpc/routers/operator-action";
import { createChangeRequestHandler } from "@/server/services/campaign-change-request";
import { createCampaignDeliverableHandler } from "@/server/services/campaign-deliverable";
import { createOperatorActionHandler, updateOperatorActionHandler, toggleActionDoneHandler, deleteOperatorActionHandler } from "@/server/services/operator-action";

const operators: string[] = [], users: string[] = [], brands: string[] = [];
const campaigns: string[] = [], deliverables: string[] = [], nodes: string[] = [];
let localOperator: string, foreignOperator: string, owner: string, stranger: string;
let brand: string, foreignBrand: string;
function session(userId = owner) {
  return { user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60_000).toISOString() };
}
function caller(userId = owner) {
  return campaignChangeRequestRouter.createCaller({ db, headers: undefined, session: session(userId) });
}
function deliverableCaller(userId = owner) {
  return campaignDeliverableRouter.createCaller({ db, headers: undefined, session: session(userId) });
}
async function fixture(foreign = false, noTaskCode = false) {
  const campaign = await db.campaign.create({ data: {
    name: "Reprise synthétique", strategyId: foreign ? foreignBrand : brand,
    code: `TEST-${randomUUID()}`,
  } });
  campaigns.push(campaign.id);
  const tasks = await Promise.all([1, 2].map(index => db.campaignDeliverable.create({ data: {
    id: `samehead-${randomUUID()}`, campaignId: campaign.id,
    targetNodeId: foreign ? nodes[1]! : nodes[0]!, deliverableType: "POSTER_60x40",
    taskCode: noTaskCode ? null : `${campaign.code}.${String(index).padStart(2, "0")}`,
  } })));
  deliverables.push(...tasks.map(t => t.id));
  return { campaign, tasks, strategyId: campaign.strategyId, operatorId: foreign ? foreignOperator : localOperator };
}
function command(f: Awaited<ReturnType<typeof fixture>>, index = 0) {
  return { strategyId: f.strategyId, operatorId: f.operatorId, campaignDeliverableId: f.tasks[index]!.id,
    requestedByName: "Demandeur de recette", description: "Préserver le besoin exact.", impact: "MINOR" as const };
}
async function existingTicket(f: Awaited<ReturnType<typeof fixture>>, index = 0, revision = 1) {
  const { strategyId: _strategyId, operatorId: _operatorId, ...payload } = command(f, index);
  return db.campaignChangeRequest.create({ data: { ...payload, ticketCode: `${f.tasks[index]!.taskCode ?? `DEL-${f.tasks[index]!.id}`}-R${String(revision).padStart(2, "0")}`,
  } });
}
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  // Fixed disposable targets: local receipt DB or the existing GitHub service.
  expect(url.port).toBe(process.env.GITHUB_ACTIONS === "true" ? "5432" : "55439");
  expect(url.pathname).toBe("/shinkiro_verify");
  for (const name of ["local", "foreign"]) {
    const op = await db.operator.create({ data: { name: `Change receipt ${name}`,
      slug: `changes-${randomUUID()}`, status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(),
      licenseExpiry: new Date(Date.now() + 86_400_000) } });
    operators.push(op.id);
    const user = await db.user.create({ data: { email: `changes-${randomUUID()}@example.invalid`, operatorId: op.id } });
    users.push(user.id);
    const strategy = await db.strategy.create({ data: { name: `Changes ${randomUUID()}`, userId: user.id, operatorId: op.id } });
    brands.push(strategy.id);
    nodes.push((await db.brandNode.create({ data: { name: "Produit synthétique", slug: `changes-${randomUUID()}`,
      nodeKind: "SKU", operatorId: op.id, strategyId: strategy.id } })).id);
  }
  [localOperator, foreignOperator] = operators as [string, string];
  [owner, stranger] = users as [string, string];
  [brand, foreignBrand] = brands as [string, string];
});
afterAll(async () => {
  await db.operatorAction.deleteMany({ where: { operatorId: { in: operators } } });
  await db.intentEmission.deleteMany({ where: { strategyId: { in: brands } } });
  await db.campaignChangeRequest.deleteMany({ where: { deliverable: { campaignId: { in: campaigns } } } });
  await db.campaignDeliverable.deleteMany({ where: { campaignId: { in: campaigns } } });
  await db.campaign.deleteMany({ where: { id: { in: campaigns } } });
  await db.brandNode.deleteMany({ where: { id: { in: nodes } } });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } });
  await db.$disconnect();
});

describe.sequential("campaign change requests through the existing governed boundary", () => {
  it("runs an own transverse action without inventing a brand audit pivot", async () => {
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    const created = await actions.create({ operatorId: localOperator, label: "Relance transversale exacte" });
    const args = { operatorId: localOperator, actionId: created.action.id };
    const done = await actions.toggleDone({ ...args, done: true });
    const replay = await actions.toggleDone({ ...args, done: true });
    expect(replay.action.doneAt).toEqual(done.action.doneAt);
    expect(done.action.done).toBe(true);
    const updated = await actions.update({ ...args, patches: { context: "Contexte conservé" } });
    expect(updated.action.context).toBe("Contexte conservé");
    await actions.delete(args);
    expect(await db.operatorAction.findUnique({ where: { id: args.actionId } })).toBeNull();
  });
  it("refuses creating an action for another team with an accessible brand pivot", async () => {
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    const before = await db.operatorAction.count({ where: { operatorId: foreignOperator } });
    await expect(actions.create({ strategyId: brand, operatorId: foreignOperator, label: "Interdit" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.operatorAction.count({ where: { operatorId: foreignOperator } })).toBe(before);
  });
  it.each(["campaign", "deliverables", "assignee", "pivot"] as const)("refuses a foreign %s in an action", async link => {
    const f = await fixture(true);
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    const input = { strategyId: brand, operatorId: localOperator, label: "Refus lien étranger",
      ...(link === "campaign" ? { campaignId: f.campaign.id } : {}),
      ...(link === "deliverables" ? { deliverableIds: [f.tasks[0]!.id] } : {}),
      ...(link === "assignee" ? { assigneeUserId: stranger } : {}),
      ...(link === "pivot" ? { strategyId: foreignBrand } : {}),
    };
    await expect(actions.create(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it.each(["campaign", "deliverables", "assignee"] as const)("reports a missing %s instead of accepting a dangling action", async link => {
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(actions.create({ strategyId: brand, operatorId: localOperator, label: "Lien absent",
      ...(link === "campaign" ? { campaignId: "missing-action-link" } : {}),
      ...(link === "deliverables" ? { deliverableIds: ["missing-action-link"] } : {}),
      ...(link === "assignee" ? { assigneeUserId: "missing-action-link" } : {}),
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("requires linked tasks to match an explicitly linked campaign", async () => {
    const a = await fixture(); const b = await fixture();
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(actions.create({ strategyId: brand, operatorId: localOperator, label: "Mauvaise campagne",
      campaignId: a.campaign.id, deliverableIds: [b.tasks[0]!.id],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("keeps a legitimate transverse action across campaigns in the same team", async () => {
    const a = await fixture(); const b = await fixture();
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    const row = await actions.create({ strategyId: brand, operatorId: localOperator, label: "Préparer deux projets",
      deliverableIds: [b.tasks[0]!.id, a.tasks[0]!.id], assigneeUserId: owner,
    });
    expect(row.action.campaignId).toBeNull();
    expect(row.action.deliverableIds).toEqual([b.tasks[0]!.id, a.tasks[0]!.id]);
  });
  it.each(["update", "toggle", "delete"] as const)("cannot %s a foreign action under the own team", async operation => {
    const row = await db.operatorAction.create({ data: { operatorId: foreignOperator, label: "À préserver" } });
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    const args = { strategyId: brand, operatorId: localOperator, actionId: row.id };
    const call = operation === "update" ? actions.update({ ...args, patches: { label: "Interdit" } })
      : operation === "toggle" ? actions.toggleDone({ ...args, done: true }) : actions.delete(args);
    await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.operatorAction.findUnique({ where: { id: row.id } })).toEqual(row);
  });
  it.each(["campaign", "deliverables", "assignee"] as const)("validates the resulting action when updating %s", async link => {
    const own = await fixture(); const other = await fixture(true);
    const row = await db.operatorAction.create({ data: { operatorId: localOperator, label: "À préserver",
      campaignId: own.campaign.id, deliverableIds: [own.tasks[0]!.id], assigneeUserId: owner } });
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(actions.update({ strategyId: brand, operatorId: localOperator, actionId: row.id, patches: {
      ...(link === "campaign" ? { campaignId: other.campaign.id } : {}),
      ...(link === "deliverables" ? { deliverableIds: [other.tasks[0]!.id] } : {}),
      ...(link === "assignee" ? { assigneeUserId: stranger } : {}),
    } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.operatorAction.findUnique({ where: { id: row.id } })).toEqual(row);
  });
  it("validates retained task links when changing only the campaign", async () => {
    const a = await fixture(); const b = await fixture();
    const row = await db.operatorAction.create({ data: { operatorId: localOperator, label: "À préserver",
      campaignId: a.campaign.id, deliverableIds: [a.tasks[0]!.id] } });
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(actions.update({ strategyId: brand, operatorId: localOperator, actionId: row.id,
      patches: { campaignId: b.campaign.id } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await db.operatorAction.findUnique({ where: { id: row.id } })).toEqual(row);
  });
  it.each(["blank", "date"] as const)("rejects an invalid %s action explicitly", async invalid => {
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(actions.create({ strategyId: brand, operatorId: localOperator,
      label: invalid === "blank" ? "   " : "Action datée", ...(invalid === "date" ? { dueDate: "bad-date" } : {}),
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("applies the linked campaign boundary in the direct action handler", async () => {
    const other = await fixture(true);
    const result = await createOperatorActionHandler({ kind: "OPERATOR_CREATE_ACTION", strategyId: brand,
      operatorId: localOperator, label: "Interdit", campaignId: other.campaign.id });
    expect(result).toMatchObject({ status: "VETOED", reason: "FORBIDDEN" });
  });
  it.each(["update", "toggle", "delete"] as const)("binds the direct %s action handler to the real action", async operation => {
    const row = await db.operatorAction.create({ data: { operatorId: foreignOperator, label: "Reçu à préserver" } });
    const args = { strategyId: brand, operatorId: localOperator, actionId: row.id };
    const result = operation === "update" ? await updateOperatorActionHandler({ kind: "OPERATOR_UPDATE_ACTION", ...args, patches: { label: "Interdit" } })
      : operation === "toggle" ? await toggleActionDoneHandler({ kind: "OPERATOR_TOGGLE_ACTION_DONE", ...args, done: true })
      : await deleteOperatorActionHandler({ kind: "OPERATOR_DELETE_ACTION", ...args });
    expect(result).toMatchObject({ status: "VETOED", reason: "FORBIDDEN" });
    expect(await db.operatorAction.findUnique({ where: { id: row.id } })).toEqual(row);
  });
  it("preserves the structured scope refusal on the change request handler", async () => {
    const f = await fixture(true);
    const result = await createChangeRequestHandler({ kind: "OPERATOR_CREATE_CHANGE_REQUEST", ...command(f),
      strategyId: brand, operatorId: localOperator });
    expect(result).toMatchObject({ status: "VETOED", reason: "FORBIDDEN" });
  });
  it("preserves the structured scope refusal on the task handler", async () => {
    const f = await fixture(true);
    const result = await createCampaignDeliverableHandler({ kind: "OPERATOR_CREATE_CAMPAIGN_DELIVERABLE",
      strategyId: brand, operatorId: localOperator, campaignId: f.campaign.id,
      targetNodeId: f.tasks[0]!.targetNodeId, deliverableType: "POSTER_60x40" });
    expect(result).toMatchObject({ status: "VETOED", reason: "FORBIDDEN" });
  });

  it("refuses a foreign team campaign selector instead of ignoring the requested team", async () => {
    const campaigns = campaignRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(campaigns.list({ operatorId: foreignOperator })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("scopes an administrator campaign selector to the requested team, including campaigns without tasks", async () => {
    const own = await fixture(); const other = await fixture(true);
    const empty = await db.campaign.create({ data: { name: "Campagne reçue sans tâche", strategyId: brand } });
    campaigns.push(empty.id);
    const admin = await db.user.create({ data: { email: `actions-admin-${randomUUID()}@example.invalid`, role: "ADMIN" } });
    users.push(admin.id);
    const caller = campaignRouter.createCaller({ db, headers: undefined, session: { ...session(admin.id), user: { id: admin.id, role: "ADMIN" } } });
    const rows = await caller.list({ operatorId: localOperator });
    expect(rows.map(row => row.id)).toEqual(expect.arrayContaining([own.campaign.id, empty.id]));
    expect(rows.map(row => row.id)).not.toContain(other.campaign.id);
  });
  it("lists the own operator action without including another team", async () => {
    const ownAction = await db.operatorAction.create({ data: { operatorId: localOperator, label: "Action de recette locale" } });
    const foreignAction = await db.operatorAction.create({ data: { operatorId: foreignOperator, label: "Action de recette étrangère" } });
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    const rows = await actions.listForOperator({ operatorId: localOperator });
    expect(rows.map(row => row.id)).toContain(ownAction.id);
    expect(rows.map(row => row.id)).not.toContain(foreignAction.id);
  });
  it("refuses a foreign operator action list even for an attached account", async () => {
    const actions = operatorActionRouter.createCaller({ db, headers: undefined, session: session() });
    await expect(actions.listForOperator({ operatorId: foreignOperator })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("lists CampaignDeliverable tickets without looking up a MissionDeliverable", async () => {
    const f = await fixture(); const ticket = await existingTicket(f);
    expect((await caller().listForDeliverable({ deliverableId: f.tasks[0]!.id })).map(t => t.id)).toEqual([ticket.id]);
    await expect(caller(stranger).listForDeliverable({ deliverableId: f.tasks[0]!.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("numbers two tasks independently instead of borrowing the campaign prefix", async () => {
    const f = await fixture();
    const first = await caller().create(command(f)); const second = await caller().create(command(f, 1));
    expect(first.ticket.ticketCode).toBe(`${f.tasks[0]!.taskCode}-R01`);
    expect(second.ticket.ticketCode).toBe(`${f.tasks[1]!.taskCode}-R01`);
  });
  it("persists four simultaneous requests on the same task with four distinct numbers", async () => {
    const f = await fixture();
    const results = await Promise.allSettled(Array.from({ length: 4 }, (_, i) => caller().create({ ...command(f), description: `Besoin distinct ${i}` })));
    expect(results.filter(r => r.status === "rejected")).toEqual([]);
    const rows = await db.campaignChangeRequest.findMany({ where: { campaignDeliverableId: f.tasks[0]!.id } });
    expect(rows.map(r => r.ticketCode).sort()).toEqual([1,2,3,4].map(i => `${f.tasks[0]!.taskCode}-R0${i}`));
  });
  it("continues after the greatest recorded revision and preserves historical gaps", async () => {
    const f = await fixture(); const historical = await existingTicket(f, 0, 2);
    expect((await caller().create(command(f))).ticket.ticketCode).toBe(`${f.tasks[0]!.taskCode}-R03`);
    expect(await db.campaignChangeRequest.findUnique({ where: { id: historical.id } })).toEqual(historical);
  });
  it("retains complete task identities for legacy rows with the same first eight characters", async () => {
    const f = await fixture(false, true);
    const a = await caller().create(command(f)); const b = await caller().create(command(f,1));
    expect(a.ticket.ticketCode).toBe(`DEL-${f.tasks[0]!.id}-R01`);
    expect(b.ticket.ticketCode).toBe(`DEL-${f.tasks[1]!.id}-R01`);
    expect(f.tasks.map(t => t.taskCode)).toEqual([null,null]);
  });
  it("replays the same explicit request identity after a new process without a second ticket", async () => {
    const f = await fixture(); const args = { ...command(f), requestId: randomUUID(), assignedToUserId: null };
    const first = await caller().create(args);
    const script = `import { createChangeRequest } from './src/server/services/campaign-change-request'; import { db } from './src/lib/db'; createChangeRequest(${JSON.stringify(args)}).then(r=>console.log(JSON.stringify({id:r.id,code:r.ticketCode}))).finally(()=>db.$disconnect());`;
    const second = JSON.parse(execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "-e", script], { cwd: process.cwd(), env: process.env, encoding: "utf8", timeout: 20_000 }).trim());
    expect(second).toEqual({ id: first.ticket.id, code: first.ticket.ticketCode });
    expect(await db.campaignChangeRequest.count({ where: { campaignDeliverableId: f.tasks[0]!.id } })).toBe(1);
  });
  it("replays simultaneous requests with the same identity as one persisted ticket", async () => {
    const f = await fixture(); const args = { ...command(f), requestId: randomUUID() };
    const rows = await Promise.all([caller().create(args), caller().create(args)]);
    expect(rows[0].ticket.id).toBe(rows[1].ticket.id);
    expect(await db.campaignChangeRequest.count({ where: { campaignDeliverableId: f.tasks[0]!.id } })).toBe(1);
  });
  it("refuses reusing a request identity for another task or changed need", async () => {
    const f = await fixture(); const requestId = randomUUID(); const first = await caller().create({ ...command(f), requestId });
    await expect(caller().create({ ...command(f, 1), requestId })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller().create({ ...command(f), requestId, description: "Autre besoin" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.campaignChangeRequest.findUnique({ where: { id: first.ticket.id } })).toEqual(first.ticket);
  });
  it("does not deduplicate separate explicit requests merely because their text matches", async () => {
    const f = await fixture(); const a = await caller().create({ ...command(f), requestId: randomUUID() });
    const b = await caller().create({ ...command(f), requestId: randomUUID() });
    expect(a.ticket.id).not.toBe(b.ticket.id);
  });
  it("rejects a foreign deliverable paired with an accessible strategy", async () => {
    const f = await fixture(true);
    await expect(caller().create({ ...command(f), strategyId: brand, operatorId: localOperator })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.campaignChangeRequest.count({ where: { campaignDeliverableId: f.tasks[0]!.id } })).toBe(0);
  });
  it("applies the same resource binding on the direct Mestor handler", async () => {
    const f = await fixture(true);
    const result = await createChangeRequestHandler({ kind: "OPERATOR_CREATE_CHANGE_REQUEST", ...command(f), strategyId: brand, operatorId: localOperator });
    expect(result.status).toBe("VETOED");
    expect(await db.campaignChangeRequest.count({ where: { campaignDeliverableId: f.tasks[0]!.id } })).toBe(0);
  });
  it("cannot update, resolve or escalate another strategy's ticket", async () => {
    const f = await fixture(true); const ticket = await existingTicket(f);
    const scope = { strategyId: brand, operatorId: localOperator, ticketId: ticket.id };
    await expect(caller().update({ ...scope, patches: { description: "Remplacement interdit" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().resolve({ ...scope, resolutionNotes: "Non autorisé" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller().escalate({ ...scope, escalationNotes: "Non autorisé" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.campaignChangeRequest.findUnique({ where: { id: ticket.id } })).toEqual(ticket);
  });
  it("cannot enumerate another operator's tickets, task list or aggregate", async () => {
    await expect(caller().listOpenForOperator({ operatorId: foreignOperator })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deliverableCaller().listForOperator({ operatorId: foreignOperator })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deliverableCaller().statsForOperator({ operatorId: foreignOperator })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("resolves once, returns the same receipt on replay, and does not reopen on escalation", async () => {
    const f = await fixture(); const ticket = await existingTicket(f);
    const scope = { strategyId: brand, operatorId: localOperator, ticketId: ticket.id };
    const first = await caller().resolve({ ...scope, resolutionNotes: "Reçu de résolution exact" });
    expect((await caller().resolve({ ...scope, resolutionNotes: "Reçu de résolution exact" })).ticket).toEqual(first.ticket);
    await expect(caller().resolve({ ...scope, resolutionNotes: "Réécriture interdite" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller().escalate({ ...scope, escalationNotes: "Réouverture interdite" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.campaignChangeRequest.findUnique({ where: { id: ticket.id } })).toEqual(first.ticket);
  });
  it("creates concurrent campaign tasks with the existing canonical task codes", async () => {
    const f = await fixture();
    const args = { strategyId: brand, operatorId: localOperator, campaignId: f.campaign.id,
      targetNodeId: nodes[0]!, deliverableType: "POSTER_60x40" };
    const rows = await Promise.all([deliverableCaller().create(args), deliverableCaller().create(args)]);
    expect(rows.map(r => r.deliverable.taskCode).sort()).toEqual([`${f.campaign.code}.03`,`${f.campaign.code}.04`]);
  });
  it("binds task status edits and deletion to the same campaign scope", async () => {
    const f = await fixture(true); const id = f.tasks[0]!.id;
    await expect(deliverableCaller().update({ strategyId: brand, operatorId: localOperator,
      deliverableId: id, patches: { status: "DELIVERED" } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deliverableCaller().delete({ strategyId: brand, operatorId: localOperator,
      deliverableId: id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.campaignDeliverable.findUnique({ where: { id } })).toEqual(f.tasks[0]);
  });
  it("cannot override a foreign campaign's health or a foreign task's health", async () => {
    const f = await fixture(true); const common = { strategyId: brand, operatorId: localOperator,
      ragOverride: "GREEN" as const, reason: "Refus de recette" };
    await expect(deliverableCaller().overrideRag({ ...common, campaignId: f.campaign.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deliverableCaller().overrideRag({ ...common, deliverableId: f.tasks[0]!.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("recomputes an overdue task instead of making it green when its manual override is cleared", async () => {
    const f = await fixture(); const id = f.tasks[0]!.id;
    await db.campaignDeliverable.update({ where: { id }, data: {
      status: "TODO", dueDate: new Date("2000-01-01"), rag: "GREEN", manualRagOverride: "GREEN",
    } });
    await deliverableCaller().overrideRag({ strategyId: brand, operatorId: localOperator,
      deliverableId: id, ragOverride: null, reason: "Retour au calcul de la tâche" });
    expect(await db.campaignDeliverable.findUniqueOrThrow({ where: { id } })).toMatchObject({
      manualRagOverride: null, rag: "RED",
    });
  });
  it("does not manufacture a green campaign when no automatic campaign calculation exists", async () => {
    const f = await fixture();
    const before = await db.campaign.update({ where: { id: f.campaign.id }, data: {
      manualRagOverride: "RED", healthSignal: "RED",
    } });
    await expect(deliverableCaller().overrideRag({ strategyId: brand, operatorId: localOperator,
      campaignId: before.id, ragOverride: null, reason: "Retour au calcul de campagne" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    expect(await db.campaign.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
  });
  it("cannot create a task in a foreign campaign or attach another operator's product", async () => {
    const foreign = await fixture(true); const own = await fixture();
    const common = { strategyId: brand, operatorId: localOperator, targetNodeId: nodes[0]!, deliverableType: "POSTER_60x40" };
    await expect(deliverableCaller().create({ ...common, campaignId: foreign.campaign.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deliverableCaller().create({ ...common, campaignId: own.campaign.id, targetNodeId: nodes[1]! })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("refuses a foreign assignee without changing the request", async () => {
    const f = await fixture();
    await expect(caller().create({ ...command(f), assignedToUserId: stranger })).rejects.toMatchObject({ code: "FORBIDDEN" });
    const ticket = (await caller().create(command(f))).ticket;
    await expect(caller().update({ strategyId: brand, operatorId: localOperator, ticketId: ticket.id,
      patches: { assignedToUserId: stranger } })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await db.campaignChangeRequest.findUniqueOrThrow({ where: { id: ticket.id } })).assignedToUserId).toBeNull();
  });
  it("refuses ambiguous task codes and malformed historical revisions without renaming records", async () => {
    const f = await fixture();
    await db.campaignDeliverable.update({ where: { id: f.tasks[1]!.id }, data: { taskCode: f.tasks[0]!.taskCode } });
    await expect(caller().create(command(f))).rejects.toMatchObject({ code: "CONFLICT" });
    const other = await fixture(); const historical = await existingTicket(other);
    await db.campaignChangeRequest.update({ where: { id: historical.id }, data: { ticketCode: `UNKNOWN-${randomUUID()}` } });
    await expect(caller().create(command(other))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.campaignChangeRequest.count({ where: { campaignDeliverableId: other.tasks[0]!.id } })).toBe(1);
  });
  it("replaying a creation after resolution preserves the finished state and timestamp", async () => {
    const f = await fixture(); const args = { ...command(f), requestId: randomUUID() };
    const ticket = (await caller().create(args)).ticket;
    const closed = (await caller().resolve({ strategyId: brand, operatorId: localOperator, ticketId: ticket.id,
      resolutionNotes: "Modification reçue" })).ticket;
    expect((await caller().create(args)).ticket).toEqual(closed);
  });
  it("serializes conflicting resolutions and never overwrites the first recorded decision", async () => {
    const f = await fixture(); const ticket = await existingTicket(f);
    const scope = { strategyId: brand, operatorId: localOperator, ticketId: ticket.id };
    const results = await Promise.allSettled(["Compte rendu A", "Compte rendu B"].map(resolutionNotes => caller().resolve({ ...scope, resolutionNotes })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const winner = results.find(r => r.status === "fulfilled");
    if (winner?.status !== "fulfilled") throw new Error("Missing resolution receipt");
    expect(await db.campaignChangeRequest.findUnique({ where: { id: ticket.id } })).toEqual(winner.value.ticket);
  });
  it("accepts only a new brief belonging to the same campaign", async () => {
    const f = await fixture(); const other = await fixture(true); const ticket = await existingTicket(f);
    const scope = { strategyId: brand, operatorId: localOperator, ticketId: ticket.id, resolutionNotes: "Nouveau brief reçu" };
    const briefs = await Promise.all([f, other].map(row => db.campaignBrief.create({ data: {
      campaignId: row.campaign.id, title: "Brief synthétique", content: { need: "Preuve locale" }, version: 2,
    } })));
    try {
      await expect(caller().resolve({ ...scope, newBriefVersionId: briefs[1]!.id })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect((await caller().resolve({ ...scope, newBriefVersionId: briefs[0]!.id })).ticket.newBriefVersionId).toBe(briefs[0]!.id);
    } finally { await db.campaignBrief.deleteMany({ where: { id: { in: briefs.map(b => b.id) } } }); }
  });
  it("does not treat an earlier escalation reason as a resolution or reopen a rejected ticket", async () => {
    const f = await fixture(); const ticket = await existingTicket(f);
    const scope = { strategyId: brand, operatorId: localOperator, ticketId: ticket.id };
    const escalated = (await caller().escalate({ ...scope, escalationNotes: "Arbitrage requis" })).ticket;
    expect((await caller().escalate({ ...scope, escalationNotes: "Arbitrage requis" })).ticket).toEqual(escalated);
    await expect(caller().update({ ...scope, patches: { status: "RESOLVED" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const rejected = (await caller().update({ ...scope, patches: { status: "REJECTED", resolutionNotes: "Hors périmètre confirmé" } })).ticket;
    await expect(caller().update({ ...scope, patches: { status: "PENDING" } })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller().escalate({ ...scope, escalationNotes: "Réouverture" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.campaignChangeRequest.findUnique({ where: { id: ticket.id } })).toEqual(rejected);
  });
  it("requires a recorded resolution instead of treating an empty status patch as completed", async () => {
    const f = await fixture(); const ticket = await existingTicket(f);
    await expect(caller().update({ strategyId: brand, operatorId: localOperator, ticketId: ticket.id, patches: { status: "RESOLVED" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await db.campaignChangeRequest.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe("PENDING");
  });
});
