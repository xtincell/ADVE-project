import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { readSourceOriginal } from "@/server/services/ingestion-pipeline/original";
import { db } from "@/lib/db";
import { retainIntakeDocuments, readIntakeOriginal, listIntakeDocuments, persistCompletedIntake } from "@/server/services/quick-intake/document-input";

let root: string;
const intakes: string[] = [];
const users: string[] = [], strategies: string[] = [];
const completedResult = { advertis_vector: { a: 1 }, classification: "LATENT", diagnostic: { fixture: true } };
function first<T>(rows: T[]): T { if (!rows[0]) throw new Error("Expected one received file"); return rows[0]; }
async function target(companyName: string) {
  const user = await db.user.create({ data: { email: `intake-source-${randomUUID()}@shinkiro.invalid`, role: "USER" } });
  users.push(user.id);
  const strategy = await db.strategy.create({ data: { name: `Quick Intake: ${companyName}`, status: "QUICK_INTAKE", userId: user.id } });
  strategies.push(strategy.id);
  return strategy;
}
const file = (text = "Une source fictive reçue, sans valeur commerciale réelle.", name = "brief.txt") =>
  ({ name, type: "text/plain", content: Buffer.from(text).toString("base64") });
async function intake() {
  const row = await db.quickIntake.create({ data: { companyName: "Original intake fixture", contactName: "Local fixture",
    contactEmail: `intake-original-${randomUUID()}@shinkiro.invalid`, responses: {} } });
  intakes.push(row.id);
  return row;
}
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  root = await mkdtemp(join(tmpdir(), "intake-original-"));
  vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", root);
  vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", randomBytes(32).toString("hex"));
});
afterAll(async () => {
  if (intakes.length) {
    await db.fileUpload.deleteMany({ where: { entityType: "QUICK_INTAKE", entityId: { in: intakes } } });
    await db.quickIntake.deleteMany({ where: { id: { in: intakes } } });
  }
  if (strategies.length) {
    await db.brandDataSource.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  if (users.length) await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect(); vi.unstubAllEnvs();
  if (root) await rm(root, { recursive: true, force: true });
});

describe.sequential("intake originals retained before any provider or scoring", () => {
  it("stores encrypted exact bytes, restores text, and records no secret or base64 in its emission", async () => {
    const i = await intake(), f = file();
    const beforeCosts = await db.aICostLog.count();
    const docs = await retainIntakeDocuments(i.shareToken, [f], { rawText: "Texte distinct du document." });
    expect(docs).toHaveLength(1); expect(first(docs).original?.state).toBe("STORED");
    expect(first(docs).original).not.toHaveProperty("objectKey");
    expect((await readIntakeOriginal(i.shareToken, first(docs).id))?.bytes.toString("base64")).toBe(f.content);
    const upload = await db.fileUpload.findUniqueOrThrow({ where: { id: first(docs).id } });
    const receipt = upload.storageReceipt as { objectKey: string };
    expect((await readFile(join(root, receipt.objectKey + ".enc"))).includes(Buffer.from("source fictive"))).toBe(false);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).rawText).toBe("Texte distinct du document.");
    const emissions = await db.intentEmission.findMany({ where: { caller: "quick-intake:retain-sources", payload: { path: ["intakeId"], equals: i.id } } });
    expect(emissions).toHaveLength(1); expect(first(emissions).status).toBe("OK");
    expect(JSON.stringify(first(emissions))).not.toContain(f.content);
    expect(JSON.stringify(first(emissions))).not.toContain(i.shareToken);
    expect(await db.aICostLog.count()).toBe(beforeCosts);
  });
  it("replays the same bytes and alias without a second file or physical rewrite", async () => {
    const i = await intake();
    const doc = first(await retainIntakeDocuments(i.shareToken, [file()]));
    const upload = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    const path = join(root, (upload.storageReceipt as { objectKey: string }).objectKey + ".enc");
    const physical = await readFile(path);
    const replay = await retainIntakeDocuments(i.shareToken, [file(undefined, "copie.txt")]);
    expect(replay.map(d => d.id)).toEqual([doc.id]);
    expect(first(replay).original?.aliases?.map(a => a.fileName)).toEqual(["copie.txt"]);
    expect(await readFile(path)).toEqual(physical);
  });
  it("serializes concurrent deposits of identical bytes", async () => {
    const i = await intake(), f = file("Concurrence réelle. ".repeat(10000));
    const [a, b] = await Promise.all([retainIntakeDocuments(i.shareToken, [f]), retainIntakeDocuments(i.shareToken, [f])]);
    expect(a.map(d => d.id)).toEqual(b.map(d => d.id));
    expect(await listIntakeDocuments(i.shareToken)).toHaveLength(1);
  });
  it("resumes a pending receipt when the original has already been written", async () => {
    const i = await intake(), doc = first(await retainIntakeDocuments(i.shareToken, [file()]));
    const row = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    await db.fileUpload.update({ where: { id: row.id }, data: { storageReceipt: { ...(row.storageReceipt as object), state: "PENDING" } } });
    await expect(readIntakeOriginal(i.shareToken, doc.id)).rejects.toThrow("pas encore été reçu");
    expect(first(await retainIntakeDocuments(i.shareToken, [file()])).id).toBe(doc.id);
    expect((await readIntakeOriginal(i.shareToken, doc.id))?.bytes.toString("base64")).toBe(file().content);
  });
  it("refuses corrupt stored bytes without replacing the object", async () => {
    const i = await intake(), doc = first(await retainIntakeDocuments(i.shareToken, [file()]));
    const row = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    const path = join(root, (row.storageReceipt as { objectKey: string }).objectKey + ".enc");
    await writeFile(path, "corruption de recette");
    await expect(readIntakeOriginal(i.shareToken, doc.id)).rejects.toThrow();
    await expect(retainIntakeDocuments(i.shareToken, [file()])).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("corruption de recette");
  });
  it("does not give another intake access to the original", async () => {
    const owner = await intake(), other = await intake();
    const doc = first(await retainIntakeDocuments(owner.shareToken, [file()]));
    expect(await readIntakeOriginal(other.shareToken, doc.id)).toBeNull();
    expect(await readIntakeOriginal("unknown-token", doc.id)).toBeNull();
    await expect(retainIntakeDocuments("unknown-token", [file()])).rejects.toThrow("introuvable");
  });
  it("rejects further deposits after completion and preserves the existing original", async () => {
    const i = await intake(), doc = first(await retainIntakeDocuments(i.shareToken, [file()]));
    await db.quickIntake.update({ where: { id: i.id }, data: { status: "COMPLETED" } });
    await expect(retainIntakeDocuments(i.shareToken, [file("Autre source.")])).rejects.toThrow("n’accepte plus");
    expect((await readIntakeOriginal(i.shareToken, doc.id))?.bytes.toString("base64")).toBe(file().content);
  });
  it("bounds the received set and rejects invalid encoding before creating a receipt", async () => {
    const i = await intake();
    await expect(retainIntakeDocuments(i.shareToken, [{ ...file(), content: "YWJj=" }])).rejects.toThrow();
    expect(await listIntakeDocuments(i.shareToken)).toHaveLength(0);
    await retainIntakeDocuments(i.shareToken, Array.from({ length: 5 }, (_, n) => file(`Source ${n}.`, `${n}.txt`)));
    await expect(retainIntakeDocuments(i.shareToken, [file("Sixième source.")])).rejects.toThrow("Cinq fichiers");
    expect(await listIntakeDocuments(i.shareToken)).toHaveLength(5);
  });
  it("keeps newly saved text and prior receipts when a later byte write fails", async () => {
    const i = await intake(), doc = first(await retainIntakeDocuments(i.shareToken, [file()]));
    const row = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    await writeFile(join(root, (row.storageReceipt as { objectKey: string }).objectKey + ".enc"), "corruption");
    await expect(retainIntakeDocuments(i.shareToken, [file()], { rawText: "Texte plus récent à conserver." })).rejects.toThrow();
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).rawText).toBe("Texte plus récent à conserver.");
    expect((await listIntakeDocuments(i.shareToken)).map(d => d.id)).toEqual([doc.id]);
  });
  it("attaches the same encrypted original to its brand and never rewrites a corrected source on replay", async () => {
    const i = await intake(), strategy = await target(i.companyName), f = file("Texte documentaire de recette. ".repeat(10));
    const doc = first(await retainIntakeDocuments(i.shareToken, [f]));
    const before = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    const receipt = before.storageReceipt as { objectKey: string };
    const cipher = await readFile(join(root, receipt.objectKey + ".enc"));
    await persistCompletedIntake(i.shareToken, strategy.id, completedResult);
    const after = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    const source = await db.brandDataSource.findUniqueOrThrow({ where: { id: after.sourceId! } });
    expect(source).toMatchObject({ strategyId: strategy.id, sourceType: "FILE", certainty: "DECLARED", processingStatus: "EXTRACTED", rawContent: Buffer.from(f.content, "base64").toString() });
    expect(after.storageReceipt).toEqual(before.storageReceipt);
    expect((await readSourceOriginal(source.id))?.bytes.toString("base64")).toBe(f.content);
    expect((await readIntakeOriginal(i.shareToken, doc.id))?.bytes.toString("base64")).toBe(f.content);
    expect(await readFile(join(root, receipt.objectKey + ".enc"))).toEqual(cipher);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).status).toBe("COMPLETED");
    await db.brandDataSource.update({ where: { id: source.id }, data: { rawContent: "Texte corrigé par la personne.", certainty: "OFFICIAL" } });
    await persistCompletedIntake(i.shareToken, strategy.id, completedResult);
    expect(await db.brandDataSource.count({ where: { strategyId: strategy.id } })).toBe(1);
    expect(await db.brandDataSource.findUnique({ where: { id: source.id } })).toMatchObject({ rawContent: "Texte corrigé par la personne.", certainty: "OFFICIAL" });
  });
  it("does not complete or create documentary sources if any retained original is corrupt", async () => {
    const i = await intake(), strategy = await target(i.companyName);
    const docs = await retainIntakeDocuments(i.shareToken, [file(), file("Autre fichier intact.", "second.txt")]);
    const row = await db.fileUpload.findUniqueOrThrow({ where: { id: first(docs).id } });
    await writeFile(join(root, (row.storageReceipt as { objectKey: string }).objectKey + ".enc"), "corruption");
    await expect(persistCompletedIntake(i.shareToken, strategy.id, completedResult)).rejects.toThrow();
    expect(await db.brandDataSource.count({ where: { strategyId: strategy.id } })).toBe(0);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).status).toBe("IN_PROGRESS");
    expect(await db.fileUpload.count({ where: { entityId: i.id, sourceId: { not: null } } })).toBe(0);
  });
  it("rolls back every attachment and completion if an original is already bound elsewhere", async () => {
    const i = await intake(), strategy = await target(i.companyName), other = await target("Other intake");
    const docs = await retainIntakeDocuments(i.shareToken, [file(), file("Autre source.", "second.txt")]);
    const source = await db.brandDataSource.create({ data: { strategyId: other.id, sourceType: "FILE", rawContent: "Owned elsewhere" } });
    await db.fileUpload.update({ where: { id: first(docs).id }, data: { sourceId: source.id } });
    await expect(persistCompletedIntake(i.shareToken, strategy.id, completedResult)).rejects.toThrow("autre dossier");
    expect(await db.brandDataSource.count({ where: { strategyId: strategy.id } })).toBe(0);
    expect((await db.quickIntake.findUniqueOrThrow({ where: { id: i.id } })).status).toBe("IN_PROGRESS");
    expect((await db.brandDataSource.findUniqueOrThrow({ where: { id: source.id } })).rawContent).toBe("Owned elsewhere");
  });
  it("keeps an unreadable original as a failed documentary source, without inventing extracted text", async () => {
    const i = await intake(), strategy = await target(i.companyName);
    const doc = first(await retainIntakeDocuments(i.shareToken, [{ ...file("Not a PDF.", "broken.pdf"), type: "application/pdf" }]));
    await persistCompletedIntake(i.shareToken, strategy.id, completedResult);
    const upload = await db.fileUpload.findUniqueOrThrow({ where: { id: doc.id } });
    const source = await db.brandDataSource.findUniqueOrThrow({ where: { id: upload.sourceId! } });
    expect(source.processingStatus).toBe("FAILED"); expect(source.rawContent).toBeNull();
    expect((await readSourceOriginal(source.id))?.bytes.toString()).toBe("Not a PDF.");
  });

});
