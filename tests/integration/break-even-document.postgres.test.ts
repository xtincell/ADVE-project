import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { composeSourcedBreakEven, assertBreakEvenDocumentCurrent } from "@/server/services/financial-brain/break-even-source";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { gloryRouter } from "@/server/trpc/routers/glory";
let brand: string, other: string, actor: string, operatorId: string;
const docs: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.pathname).toBe("/shinkiro_verify");
  const unique = randomUUID();
  const operator = await db.operator.create({ data: { name: "Financial document fixture", slug: `fin-doc-${unique}`,
    status: "ACTIVE", licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86400000) } }); operatorId = operator.id;
  actor = (await db.user.create({ data: { email: `fin-doc-${unique}@example.invalid`, operatorId } })).id;
  brand = (await db.strategy.create({ data: { name: "Financial document fixture", userId: actor, operatorId } })).id;
  other = (await db.strategy.create({ data: { name: "Unrelated fixture", userId: actor } })).id;
  await db.pillar.create({ data: { strategyId: brand, key: "d", content: { personas: [{ id: "payer", actorRoles: ["PAYER"] }] } } });
});
afterAll(async () => {
  if (brand) {
    await db.gloryOutput.deleteMany({ where: { strategyId: { in: [brand, other] } } });
    await db.costDecision.deleteMany({ where: { strategyId: { in: [brand, other] } } });
    await db.intentEmission.deleteMany({ where: { strategyId: { in: [brand, other] } } });
    await db.brandDataSource.deleteMany({ where: { strategyId: { in: [brand, other] } } });
    await db.pillar.deleteMany({ where: { strategyId: { in: [brand, other] } } });
    await db.strategy.deleteMany({ where: { id: { in: [brand, other] } } });
    await db.user.delete({ where: { id: actor } }); await db.operator.delete({ where: { id: operatorId } });
  }
  await db.$disconnect();
});
async function source(payerPersonaId = "payer", strategyId = brand) {
  const amount = (value: number) => ({ value, qualification: "ASSUMPTION", note: "Scénario de recette seulement.", sources: [] });
  const row = await db.brandDataSource.create({ data: { strategyId, sourceType: "FILE", fileName: "synthetic.break-even.json", fileType: "JSON", processingStatus: "EXTRACTED",
    rawContent: JSON.stringify({ schema: "adve-break-even-model-v1", title: "Test synthétique", currency: "XOF", period: "MONTH", payer: "Professionnel", payerPersonaId,
      unit: "abonnement", taxBasis: "HT", scope: "Recette", price: amount(15000), fixedCosts: [{ label: "CF", ...amount(315000) }],
      variableCosts: [{ label: "CV", ...amount(8000) }], assumptions: ["Aucun client réel"], exclusions: [] }),
    rawData: { _document: { schema: "document-edition-v1", family: "Seuil", kind: "FINANCE", label: "v1", status: "PROPOSED", edition: 1,
      changeSummary: "Recette uniquement", recordedAt: new Date().toISOString() } } } }); docs.push(row.id);
  return { sourceId: row.id, expectedSourceHash: sourceFingerprint(row) };
}
describe.sequential("sourced financial document on owned PostgreSQL", () => {
  it("composes only the selected current edition, preserving the proposal and pillar", async () => {
    const input = await source(); const before = await db.pillar.findMany({ where: { strategyId: brand } });
    const output = await composeSourcedBreakEven(brand, input);
    expect(output.base.breakEvenUnits).toBe(45); expect(output.evidence).toHaveLength(1);
    expect(output.evidence[0]!.document?.status).toBe("PROPOSED");
    await db.$transaction(tx => assertBreakEvenDocumentCurrent(tx, brand, output));
    expect(await db.pillar.findMany({ where: { strategyId: brand } })).toEqual(before);
  });
  it("refuses stale, foreign and wrongly assigned payer inputs", async () => {
    const input = await source();
    await expect(composeSourcedBreakEven(brand, { ...input, expectedSourceHash: "a".repeat(64) })).rejects.toThrow("SOURCE_CHANGED");
    await expect(composeSourcedBreakEven(brand, await source("payer", other))).rejects.toThrow("SOURCE_UNAVAILABLE");
    await expect(composeSourcedBreakEven(brand, await source("traffic"))).rejects.toThrow("client payeur");
  });
  it("runs through the actual governed Glory tool and persists a repeatable edition with no model", async () => {
    const caller = gloryRouter.createCaller({ db, headers: undefined, session: { user: { id: actor, role: "USER", operatorId }, expires: new Date(Date.now() + 60000).toISOString() } });
    const result = await caller.execute({ strategyId: brand, toolSlug: "break-even-calculator", input: await source() });
    expect(result.outputId).not.toBe("");
    const edition = await db.gloryOutput.findUniqueOrThrow({ where: { id: result.outputId } });
    expect(edition.output).toMatchObject({ schema: "adve-break-even-document-v1", _provenance: "DETERMINISTIC_COMPOSE", base: { breakEvenUnits: 45 } });
    await db.gloryOutput.delete({ where: { id: edition.id } });
  });
  it("refuses a source or actor definition changed after composition, without saving an obsolete output", async () => {
    const input = await source(); const output = await composeSourcedBreakEven(brand, input);
    await db.brandDataSource.update({ where: { id: input.sourceId }, data: { rawContent: "Changed source" } });
    await expect(db.$transaction(tx => assertBreakEvenDocumentCurrent(tx, brand, output))).rejects.toThrow("SOURCE_CHANGED");
    const next = await composeSourcedBreakEven(brand, await source());
    await db.pillar.update({ where: { strategyId_key: { strategyId: brand, key: "d" } }, data: { currentVersion: { increment: 1 } } });
    await expect(db.$transaction(tx => assertBreakEvenDocumentCurrent(tx, brand, next))).rejects.toThrow("PILLAR_CHANGED");
    expect(await db.gloryOutput.count({ where: { strategyId: brand } })).toBe(0);
  });
});
