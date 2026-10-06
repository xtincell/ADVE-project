import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decodeSourceUpload, retainSourceFile, readSourceOriginal } from "@/server/services/ingestion-pipeline/original";
import { sourceOriginalSummary } from "@/domain/source-original";

let root: string;
let sources: any[], uploads: any[], seq: number;
const match = (x: any, w: any) => Object.entries(w).every(([k, v]) => x[k] === v);
const table = (rows: () => any[]) => ({
  findFirst: vi.fn(async ({ where }: any) => rows().find(x => match(x, where)) ?? null),
  findUnique: vi.fn(async ({ where }: any) => rows().find(x => match(x, where)) ?? null),
  findUniqueOrThrow: vi.fn(async ({ where }: any) => { const r = rows().find(x => match(x, where)); if (!r) throw new Error("missing"); return r; }),
  create: vi.fn(async ({ data }: any) => { const r = { id: `r${++seq}`, ...data }; rows().push(r); return r; }),
  update: vi.fn(async ({ where, data }: any) => { const r = rows().find(x => match(x, where)); if (!r) throw new Error("missing"); Object.assign(r, data); return r; }),
});
const client: any = {
  brandDataSource: table(() => sources), fileUpload: table(() => uploads),
  $executeRaw: vi.fn(), $queryRaw: vi.fn(),
  $transaction: async (fn: any) => {
    const old = structuredClone({ sources, uploads });
    try { return await fn(client); }
    catch (e) { sources = old.sources; uploads = old.uploads; throw e; }
  },
};
const file = () => ({ name: "brief.txt", type: "TXT", content: Buffer.from("Le vrai texte reçu reste indépendant de sa correction.").toString("base64") });
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "source-original-test-"));
  sources = []; uploads = []; seq = 0;
  vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "a".repeat(64));
  vi.stubEnv("CREATIVE_MEDIA_ARCHIVE_DIR", root);
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });

describe("received original, distinct from working text", () => {
  it("keeps encrypted bytes and returns the identical original", async () => {
    const f = file(), id = await retainSourceFile("brand-a", f, "owner", client);
    const receipt = uploads[0].storageReceipt;
    expect(receipt.state).toBe("STORED");
    const disk = await readFile(join(root, receipt.objectKey + ".enc"));
    expect(disk.includes(Buffer.from("Le vrai texte"))).toBe(false);
    const recovered = await readSourceOriginal(id, client);
    expect(recovered?.bytes.toString("base64")).toBe(f.content);
    expect(sources[0].rawContent).toBe(Buffer.from(f.content, "base64").toString());
    expect(sourceOriginalSummary(receipt)).not.toHaveProperty("objectKey");
  });
  it("a retry neither duplicates nor resets a manual correction", async () => {
    const id = await retainSourceFile("brand-a", file(), "owner", client);
    sources[0].rawContent = "Texte corrigé manuellement";
    const retry = await retainSourceFile("brand-a", file(), "owner", client);
    expect(retry).toBe(id); expect(sources).toHaveLength(1); expect(uploads).toHaveLength(1);
    expect(sources[0].rawContent).toBe("Texte corrigé manuellement");
  });
  it("repairs a legacy source only when its exact extracted text matches", async () => {
    sources.push({ id: "legacy", strategyId: "brand-a", sourceType: "FILE", rawContent: Buffer.from(file().content, "base64").toString(), processingStatus: "EXTRACTED", certainty: "DECLARED" });
    expect(await retainSourceFile("brand-a", { ...file(), sourceId: "legacy" }, "owner", client)).toBe("legacy");
    expect(sources).toHaveLength(1); expect(sources[0].certainty).toBe("DECLARED");
  });
  it("refuses a similarly named but different legacy document", async () => {
    sources.push({ id: "legacy", strategyId: "brand-a", sourceType: "FILE", rawContent: "autre" });
    await expect(retainSourceFile("brand-a", { ...file(), sourceId: "legacy" }, "owner", client)).rejects.toThrow("diffère");
    expect(uploads).toHaveLength(0); expect(sources[0].rawContent).toBe("autre");
  });
  it("does not assign the same received file to a second legacy source", async () => {
    await retainSourceFile("brand-a", file(), "owner", client);
    sources.push({ id: "legacy", strategyId: "brand-a", sourceType: "FILE", rawContent: Buffer.from(file().content, "base64").toString(), processingStatus: "EXTRACTED" });
    await expect(retainSourceFile("brand-a", { ...file(), sourceId: "legacy" }, "owner", client)).rejects.toThrow("déjà reçu");
    expect(uploads).toHaveLength(1);
    expect(sources.find(s => s.id === "legacy").origin).toBeUndefined();
  });
  it("refuses attaching a different brand's source", async () => {
    sources.push({ id: "other", strategyId: "brand-b", sourceType: "FILE" });
    await expect(retainSourceFile("brand-a", { ...file(), sourceId: "other" }, "owner", client)).rejects.toThrow("introuvable");
    expect(uploads).toHaveLength(0);
  });
  it("resumes PENDING after physical write without a database receipt", async () => {
    const id = await retainSourceFile("brand-a", file(), "owner", client);
    uploads[0].storageReceipt.state = "PENDING";
    const before = await readFile(join(root, uploads[0].storageReceipt.objectKey + ".enc"));
    await retainSourceFile("brand-a", file(), "owner", client);
    expect((await readSourceOriginal(id, client))?.bytes.toString("base64")).toBe(file().content);
    expect(await readFile(join(root, uploads[0].storageReceipt.objectKey + ".enc"))).toEqual(before);
  });
  it("does not overwrite a corrupt pending object to pretend recovery succeeded", async () => {
    await retainSourceFile("brand-a", file(), "owner", client);
    uploads[0].storageReceipt.state = "PENDING";
    const path = join(root, uploads[0].storageReceipt.objectKey + ".enc");
    await writeFile(path, "damaged");
    await expect(retainSourceFile("brand-a", file(), "owner", client)).rejects.toThrow("corrompue");
    expect(await readFile(path, "utf8")).toBe("damaged");
  });
  it("preserves the original when text extraction fails", async () => {
    await expect(retainSourceFile("brand-a", { ...file(), type: "IMG" }, "owner", client)).rejects.toThrow("Original conservé");
    expect(sources[0].processingStatus).toBe("FAILED");
    expect((await readSourceOriginal(sources[0].id, client))?.bytes.toString("base64")).toBe(file().content);
  });
  it("refuses an unconfigured archive before creating a misleading source", async () => {
    vi.stubEnv("CREATIVE_MEDIA_ENCRYPTION_KEY", "");
    await expect(retainSourceFile("brand-a", file(), "owner", client)).rejects.toThrow("stockage privé");
    expect(sources).toHaveLength(0);
  });
  it("rejects empty, invalid and oversized base64", () => {
    for (const bad of ["", "hello!", "YWJj=", "a".repeat(13_981_020)]) expect(() => decodeSourceUpload(bad)).toThrow();
    expect(decodeSourceUpload("YQ==").toString()).toBe("a");
  });
});
