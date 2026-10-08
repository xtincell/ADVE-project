/** Real vault, dispatcher, spine and router; synthetic isolated PostgreSQL only. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.hoisted(() => { process.env.GOD_MODE_EMAILS = "vault-admin@example.invalid"; });
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { archive, promoteToActive, selectFromBatch, supersede } from "@/server/services/brand-vault/engine";
import { execute } from "@/server/services/artemis/commandant";
import { emitIntent, type Intent } from "@/server/services/mestor/intents";
import { sourceFingerprint, setSourceUse, invalidateSourceDerivatives } from "@/server/services/ingestion-pipeline/source-usage";
import { brandVaultRouter } from "@/server/trpc/routers/brand-vault";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";

const brands: string[] = [], users: string[] = [], operators: string[] = [];
let owner: string, stranger: string, operatorId: string;
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  for (const label of ["owner", "foreign"]) {
    const op = await db.operator.create({ data: { name: "Vault " + label, slug: "vault-" + randomUUID(),
      status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } });
    operators.push(op.id);
    users.push((await db.user.create({ data: { email: "vault-" + randomUUID() + "@example.invalid", operatorId: op.id } })).id);
  }
  [owner, stranger] = users as [string, string]; operatorId = operators[0]!;
  users.push((await db.user.create({ data: { email: "vault-admin@example.invalid", operatorId: operators[1]!, role: "USER" } })).id);
});
afterAll(async () => {
  const where = { strategyId: { in: brands } };
  await db.brandAsset.deleteMany({ where });
  await db.campaignBrief.deleteMany({ where: { campaign: where } });
  await db.campaign.deleteMany({ where });
  await db.brandSourceUse.deleteMany({ where }); await db.brandDataSource.deleteMany({ where });
  await db.intentEmission.deleteMany({ where }); await db.costDecision.deleteMany({ where });
  await db.strategy.deleteMany({ where: { id: { in: brands } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.operator.deleteMany({ where: { id: { in: operators } } });
  await db.$disconnect();
});
async function fixture() {
  const s = await db.strategy.create({ data: { name: "Vault synthetic", userId: owner, operatorId } });
  brands.push(s.id);
  return { s, input: { strategyId: s.id, operatorId, name: "Synthetic identity", kind: "LOGO_FINAL",
    content: { description: "Synthetic identity, never published" } } };
}
function caller(userId = owner) {
  return brandVaultRouter.createCaller({ db, headers: undefined, session: {
    user: { id: userId, role: "USER" }, expires: new Date(Date.now() + 60000).toISOString(),
  } });
}
async function asset(f: Awaited<ReturnType<typeof fixture>>, state: "ACTIVE" | "SELECTED" | "CANDIDATE" | "ARCHIVED" = "SELECTED", extra: Record<string, unknown> = {}) {
  return db.brandAsset.create({ data: { ...f.input, state, ...extra } });
}

describe("BrandAsset common lifecycle", () => {
  it.each(["SELECT_BRAND_ASSET", "PROMOTE_BRAND_ASSET_TO_ACTIVE", "SUPERSEDE_BRAND_ASSET", "ARCHIVE_BRAND_ASSET"])(
    "executes the catalogued command %s", async (kind) => {
      const f = await fixture(), a = await asset(f, kind === "SUPERSEDE_BRAND_ASSET" ? "ACTIVE" : "CANDIDATE", { batchId: "batch-" + randomUUID() });
      if (kind === "PROMOTE_BRAND_ASSET_TO_ACTIVE") await db.brandAsset.update({ where: { id: a.id }, data: { state: "SELECTED" } });
      const intent = { kind, strategyId: f.s.id, batchId: a.batchId, selectedAssetId: a.id, selectedById: owner,
        brandAssetId: a.id, promotedById: owner, archivedById: owner, oldAssetId: a.id,
        newAssetInput: { ...f.input, name: "Successor" }, supersededById: owner } as unknown as Intent;
      const r = await execute(intent);
      expect(r?.status).toBe("OK");
      const current = await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } });
      expect(current.state).toBe({ SELECT_BRAND_ASSET: "SELECTED", PROMOTE_BRAND_ASSET_TO_ACTIVE: "ACTIVE",
        SUPERSEDE_BRAND_ASSET: "SUPERSEDED", ARCHIVE_BRAND_ASSET: "ARCHIVED" }[kind]);
    },
  );

  it("rolls back a successor and the campaign slot on a late failure", async () => {
    const f = await fixture();
    const c = await db.campaign.create({ data: { strategyId: f.s.id, name: "Synthetic campaign" } });
    const old = await asset(f, "ACTIVE", { kind: "BIG_IDEA", campaignId: c.id });
    await db.campaign.update({ where: { id: c.id }, data: { activeBigIdeaId: old.id } });
    const constraint = "fixture_vault_" + randomUUID().replaceAll("-", "");
    await db.$executeRawUnsafe(`ALTER TABLE "BrandAsset" ADD CONSTRAINT ${constraint} CHECK (NOT (id='${old.id}' AND state='SUPERSEDED')) NOT VALID`);
    try {
      await expect(supersede({ oldAssetId: old.id, newAssetInput: { ...f.input, kind: "BIG_IDEA", campaignId: c.id }, supersededById: owner })).rejects.toThrow();
      expect(await db.brandAsset.count({ where: { strategyId: f.s.id } })).toBe(1);
      expect((await db.brandAsset.findUniqueOrThrow({ where: { id: old.id } })).state).toBe("ACTIVE");
      expect((await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).activeBigIdeaId).toBe(old.id);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "BrandAsset" DROP CONSTRAINT ${constraint}`); }
  });

  it.each(["strategy", "operator", "kind", "campaign"])("refuses a successor from another %s", async (field) => {
    const f = await fixture(), other = await fixture(), old = await asset(f, "ACTIVE");
    const c = await db.campaign.create({ data: { strategyId: f.s.id, name: "Other campaign" } });
    const patch = { strategy: { strategyId: other.s.id }, operator: { operatorId: operators[1]! },
      kind: { kind: "BIG_IDEA" }, campaign: { campaignId: c.id } }[field];
    await expect(supersede({ oldAssetId: old.id, newAssetInput: { ...f.input, ...patch }, supersededById: owner })).rejects.toThrow();
    expect(await db.brandAsset.count({ where: { strategyId: { in: [f.s.id, other.s.id] } } })).toBe(1);
  });

  it("confines batch rejection to the brand, campaign and kind", async () => {
    const f = await fixture(), other = await fixture(), batchId = randomUUID();
    const c = await db.campaign.create({ data: { strategyId: f.s.id, name: "Other campaign" } });
    const selected = await asset(f, "CANDIDATE", { batchId });
    const sibling = await asset(f, "CANDIDATE", { batchId });
    const untouched = await Promise.all([asset(other, "CANDIDATE", { batchId }),
      asset(f, "CANDIDATE", { batchId, kind: "BIG_IDEA" }), asset(f, "CANDIDATE", { batchId, campaignId: c.id })]);
    await selectFromBatch({ batchId, selectedAssetId: selected.id, selectedById: owner });
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: sibling.id } })).state).toBe("REJECTED");
    expect(await db.brandAsset.count({ where: { id: { in: untouched.map((a) => a.id) }, state: "CANDIDATE" } })).toBe(3);
  });

  it("refuses resurrection despite force and leaves the active slot empty", async () => {
    const f = await fixture(), a = await asset(f, "ARCHIVED");
    await expect(promoteToActive({ brandAssetId: a.id, promotedById: owner, force: true })).rejects.toThrow();
    await expect(caller().promoteToActive({ brandAssetId: a.id, force: true })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("ARCHIVED");
  });

  it("preserves the legitimate manual quality override on a selected draft", async () => {
    const f = await fixture(), a = await asset(f, "SELECTED", { content: {} });
    await expect(caller().promoteToActive({ brandAssetId: a.id })).rejects.toThrow(/Quality/);
    expect((await caller().promoteToActive({ brandAssetId: a.id, force: true })).state).toBe("ACTIVE");
  });

  it("rolls back lineage too when updating the campaign slot fails last", async () => {
    const f = await fixture(), c = await db.campaign.create({ data: { strategyId: f.s.id, name: "Late failure" } });
    const old = await asset(f, "ACTIVE", { kind: "BIG_IDEA", campaignId: c.id });
    await db.campaign.update({ where: { id: c.id }, data: { activeBigIdeaId: old.id } });
    const constraint = "fixture_vault_" + randomUUID().replaceAll("-", "");
    await db.$executeRawUnsafe(`ALTER TABLE "Campaign" ADD CONSTRAINT ${constraint} CHECK (id <> '${c.id}' OR "activeBigIdeaId" = '${old.id}') NOT VALID`);
    try {
      await expect(supersede({ oldAssetId: old.id, newAssetInput: { ...f.input, kind: "BIG_IDEA" }, supersededById: owner })).rejects.toThrow();
      expect(await db.brandAsset.count({ where: { strategyId: f.s.id } })).toBe(1);
      expect(await db.brandAsset.findUniqueOrThrow({ where: { id: old.id } })).toMatchObject({ state: "ACTIVE", supersededById: null });
      expect((await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).activeBigIdeaId).toBe(old.id);
    } finally { await db.$executeRawUnsafe(`ALTER TABLE "Campaign" DROP CONSTRAINT ${constraint}`); }
  });

  it("keeps the current campaign decision when another selected asset is promoted", async () => {
    const f = await fixture(), c = await db.campaign.create({ data: { strategyId: f.s.id, name: "Occupied slot" } });
    const old = await asset(f, "ACTIVE", { kind: "CLAIM", campaignId: c.id });
    const next = await asset(f, "SELECTED", { kind: "CLAIM", campaignId: c.id });
    await db.campaign.update({ where: { id: c.id }, data: { activeClaimId: old.id } });
    await expect(promoteToActive({ brandAssetId: next.id, promotedById: owner })).rejects.toThrow(/ACTIVE_SLOT_OCCUPIED/);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: next.id } })).state).toBe("SELECTED");
    expect((await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).activeClaimId).toBe(old.id);
  });

  it("does not bypass quality when selecting directly into ACTIVE", async () => {
    const f = await fixture(), a = await asset(f, "CANDIDATE", { batchId: randomUUID(), content: {} });
    await expect(selectFromBatch({ batchId: a.batchId!, selectedAssetId: a.id, selectedById: owner, promoteToActive: true })).rejects.toThrow(/Quality/);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("CANDIDATE");
  });

  it("serializes competing selections and retries without demoting the winner", async () => {
    const f = await fixture(), batchId = randomUUID(), a = await asset(f, "CANDIDATE", { batchId }), b = await asset(f, "CANDIDATE", { batchId });
    const r = await Promise.allSettled([a, b].map((v) => selectFromBatch({ batchId, selectedAssetId: v.id, selectedById: owner, promoteToActive: true })));
    expect(r.filter((v) => v.status === "fulfilled")).toHaveLength(1);
    const winner = await db.brandAsset.findFirstOrThrow({ where: { strategyId: f.s.id, state: "ACTIVE" } });
    const repeated = await selectFromBatch({ batchId, selectedAssetId: winner.id, selectedById: owner });
    expect(repeated.state).toBe("ACTIVE");
    expect(await db.brandAsset.count({ where: { strategyId: f.s.id, state: "ACTIVE" } })).toBe(1);
  });

  it("serializes replacements, preserves lineage, and clears only its own active slot", async () => {
    const f = await fixture(), c = await db.campaign.create({ data: { strategyId: f.s.id, name: "Campaign" } });
    const old = await asset(f, "ACTIVE", { kind: "CLAIM", campaignId: c.id });
    await db.campaign.update({ where: { id: c.id }, data: { activeClaimId: old.id } });
    const r = await Promise.allSettled(["A", "B"].map((name) => supersede({ oldAssetId: old.id,
      newAssetInput: { ...f.input, name, kind: "CLAIM", campaignId: c.id }, supersededById: owner })));
    expect(r.filter((v) => v.status === "fulfilled")).toHaveLength(1);
    const successor = await db.brandAsset.findFirstOrThrow({ where: { parentBrandAssetId: old.id } });
    expect(successor.version).toBe(2); expect(successor.operatorId).toBe(operatorId);
    await archive({ brandAssetId: old.id, archivedById: owner });
    expect((await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).activeClaimId).toBe(successor.id);
    await archive({ brandAssetId: successor.id, archivedById: owner });
    expect((await db.campaign.findUniqueOrThrow({ where: { id: c.id } })).activeClaimId).toBeNull();
  });

  it("uses one spined emission on each manual action and on the canonical emitter", async () => {
    const f = await fixture(), a = await asset(f);
    await caller().promoteToActive({ brandAssetId: a.id });
    const emissions = await db.intentEmission.findMany({ where: { strategyId: f.s.id } });
    expect(emissions).toHaveLength(1); expect(emissions[0]?.selfHash).toBeTruthy();
    expect(emissions[0]?.status).toBe("OK");
    const result = await emitIntent({ kind: "ARCHIVE_BRAND_ASSET", strategyId: f.s.id, brandAssetId: a.id, archivedById: owner } as unknown as Intent, { caller: "fixture:vault" });
    expect(result.status).toBe("OK");
    const canonical = await db.intentEmission.findMany({ where: { strategyId: f.s.id, intentKind: "ARCHIVE_BRAND_ASSET" } });
    expect(canonical).toHaveLength(1); expect(canonical[0]?.status).toBe("OK"); expect(canonical[0]?.selfHash).toBeTruthy();
  });

  it("derives the successor operator from the brand in the existing manual procedure", async () => {
    const f = await fixture(), old = await asset(f, "ACTIVE");
    const r = await caller().supersede({ oldAssetId: old.id, newAsset: {
      strategyId: f.s.id, name: "Manual successor", kind: "LOGO_FINAL", content: f.input.content,
    } });
    expect(r.newAsset.operatorId).toBe(operatorId); expect(r.newAsset.operatorId).not.toBe(owner);
    const rows = await db.intentEmission.findMany({ where: { strategyId: f.s.id } });
    expect(rows).toHaveLength(1); expect(rows[0]?.selfHash).toBeTruthy(); expect(rows[0]?.status).toBe("OK");
  });

  it("replays the same persisted command without creating another successor", async () => {
    const f = await fixture(), old = await asset(f, "ACTIVE");
    const intent: Intent = { kind: "SUPERSEDE_BRAND_ASSET", strategyId: f.s.id, oldAssetId: old.id,
      supersededById: owner, newAssetInput: { ...f.input, name: "One successor" } };
    const intentId = await openEmission({ kind: intent.kind, strategyId: f.s.id, caller: "fixture:replay", payload: intent });
    const first = await execute(intent, { intentId }); expect(first.status).toBe("OK");
    await closeEmission({ intentId, status: first.status, result: first });
    const repeated = await execute(intent, { intentId }); expect(repeated.status).toBe("OK");
    expect(repeated.output).toEqual(first.output);
    expect(await db.brandAsset.count({ where: { parentBrandAssetId: old.id } })).toBe(1);
  });

  it.each(["SELECT_BRAND_ASSET", "PROMOTE_BRAND_ASSET_TO_ACTIVE", "SUPERSEDE_BRAND_ASSET", "ARCHIVE_BRAND_ASSET"])(
    "closes one real hash-chained emission for %s", async (kind) => {
      const f = await fixture(), a = await asset(f, kind === "SUPERSEDE_BRAND_ASSET" ? "ACTIVE" : kind === "SELECT_BRAND_ASSET" ? "CANDIDATE" : "SELECTED", { batchId: randomUUID() });
      const intent = { kind, strategyId: f.s.id, batchId: a.batchId, selectedAssetId: a.id, selectedById: owner,
        brandAssetId: a.id, promotedById: owner, archivedById: owner, oldAssetId: a.id,
        newAssetInput: { ...f.input, name: "Canonical successor" }, supersededById: owner } as unknown as Intent;
      expect((await emitIntent(intent, { caller: "fixture:canonical-vault" })).status).toBe("OK");
      const rows = await db.intentEmission.findMany({ where: { strategyId: f.s.id } });
      expect(rows).toHaveLength(1); expect(rows[0]?.selfHash).toBeTruthy(); expect(rows[0]?.status).toBe("OK");
    },
  );

  it("refuses a foreign actor, a delegated reader, and an asset hidden behind another strategy", async () => {
    const f = await fixture(), other = await fixture(), a = await asset(f);
    await expect(caller(stranger).promoteToActive({ brandAssetId: a.id, force: true })).rejects.toThrow();
    await db.strategyCollaborator.create({ data: { strategyId: f.s.id, userId: stranger, role: "DIGITAL_DIRECTOR" } });
    await expect(caller(stranger).promoteToActive({ brandAssetId: a.id, force: true })).rejects.toThrow();
    const r = await execute({ kind: "PROMOTE_BRAND_ASSET_TO_ACTIVE", strategyId: other.s.id, brandAssetId: a.id, promotedById: owner } as unknown as Intent);
    expect(r?.status).toBe("FAILED");
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("SELECTED");
  });

  it("rechecks authority after a concurrent brand transfer", async () => {
    const f = await fixture(), a = await asset(f);
    let release!: () => void, acquired!: () => void;
    const locked = new Promise<void>((r) => { acquired = r; }), gate = new Promise<void>((r) => { release = r; });
    const transfer = db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Strategy" WHERE id=${f.s.id} FOR UPDATE`);
      acquired(); await gate;
      await tx.strategy.update({ where: { id: f.s.id }, data: { userId: stranger, operatorId: operators[1]! } });
    }, { timeout: 10000 });
    await locked;
    const promotion = promoteToActive({ brandAssetId: a.id, promotedById: owner, force: true })
      .then(() => "unexpected-success", (e: Error) => e.message);
    try {
      let observed = false;
      for (let i = 0; i < 50; i++) {
        const waiting = await db.$queryRaw<Array<{ pid: number }>>`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%Strategy%FOR SHARE%'`;
        if (waiting.length) { observed = true; break; }
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(observed).toBe(true);
    } finally { release(); await transfer; }
    expect(await promotion).toMatch(/ASSET_ACCESS_DENIED/);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("SELECTED");
  });

  it("preserves the effective administrator role already granted by authentication", async () => {
    const f = await fixture(), a = await asset(f);
    expect((await promoteToActive({ brandAssetId: a.id, promotedById: users[2]! })).state).toBe("ACTIVE");
  });

  it("refuses corrected and revoked documentary evidence without changing candidates", async () => {
    const f = await fixture(), sourceBrand = await fixture();
    const source = await db.brandDataSource.create({ data: { strategyId: sourceBrand.s.id, sourceType: "MANUAL_INPUT", rawContent: "Version 1", certainty: "DECLARED", processingStatus: "EXTRACTED" } });
    await setSourceUse({ sourceId: source.id, strategyId: f.s.id, userId: owner, operatorId, admin: false, revoke: false });
    const metadata = { sourceDataSourceId: source.id, sourceContentHash: sourceFingerprint(source) };
    const a = await asset(f, "SELECTED", { metadata });
    await db.brandDataSource.update({ where: { id: source.id }, data: { rawContent: "Version 2" } });
    await expect(promoteToActive({ brandAssetId: a.id, promotedById: owner, force: true })).rejects.toThrow(/SOURCE_CHANGED/);
    await setSourceUse({ sourceId: source.id, strategyId: f.s.id, userId: owner, operatorId, admin: false, revoke: true });
    await expect(promoteToActive({ brandAssetId: a.id, promotedById: owner, force: true })).rejects.toThrow(/SOURCE_/);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("SELECTED");
  });

  it("waits for a source correction then rereads its version before committing", async () => {
    const f = await fixture(), source = await db.brandDataSource.create({ data: { strategyId: f.s.id,
      sourceType: "MANUAL_INPUT", rawContent: "Version 1", certainty: "DECLARED", processingStatus: "EXTRACTED" } });
    const a = await asset(f, "SELECTED", { metadata: { sourceDataSourceId: source.id, sourceContentHash: sourceFingerprint(source) } });
    let release!: () => void, acquired!: () => void;
    const locked = new Promise<void>((r) => { acquired = r; }), gate = new Promise<void>((r) => { release = r; });
    const correction = db.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "BrandDataSource" WHERE id=${source.id} FOR UPDATE`);
      acquired(); await gate;
      await tx.brandDataSource.update({ where: { id: source.id }, data: { rawContent: "Version 2" } });
      await invalidateSourceDerivatives(tx, source.id);
    }, { timeout: 10000 });
    await locked;
    const promotion = promoteToActive({ brandAssetId: a.id, promotedById: owner, force: true });
    const caught = promotion.then(() => "unexpected-success", (e: Error) => e.message);
    try {
      let observed = false;
      for (let i = 0; i < 50; i++) {
        const waiting = await db.$queryRaw<Array<{ pid: number }>>`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%BrandDataSource%FOR UPDATE%'`;
        if (waiting.length) { observed = true; break; }
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(observed).toBe(true);
    } finally { release(); await correction; }
    expect(await caught).toMatch(/SOURCE_CHANGED/);
    expect((await db.brandAsset.findUniqueOrThrow({ where: { id: a.id } })).state).toBe("SELECTED");
  });
});
