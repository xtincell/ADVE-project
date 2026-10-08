/** Real gateway transactions on a named disposable database; no providers. */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
vi.mock("@/server/services/oracle-section", () => ({ markAllSectionsStale: vi.fn(async () => ({})) }));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
import { db } from "@/lib/db";
import { writePillar } from "@/server/services/pillar-gateway";
import { pillarRouter } from "@/server/trpc/routers/pillar";
let userId: string;
const strategies: string[] = [];
const product = (nom: string) => ({ nom, categorie: "PLATEFORME", prix: 0,
  gainClientConcret: "Accès à un service de recette", gainClientAbstrait: "Liberté de découverte",
  lienPromesse: "Découvrir selon son goût", segmentCible: "Public de recette",
  phaseLifecycle: "LAUNCH", canalDistribution: ["WEBSITE"] });
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname); expect(url.pathname).toBe("/shinkiro_verify");
  userId = (await db.user.create({ data: { email: `catalogue-${randomUUID()}@example.test`, role: "ADMIN" } })).id;
});
afterAll(async () => {
  if (strategies.length) {
    await db.scoreSnapshot.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.intentEmission.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.pillar.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
async function fixture(content: Record<string, unknown> = {}) {
  const strategy = await db.strategy.create({ data: { name: "Identité catalogue — recette isolée", userId } });
  strategies.push(strategy.id);
  const pillar = await db.pillar.create({ data: { strategyId: strategy.id, key: "v", currentVersion: 1,
    content: content as Prisma.InputJsonValue } });
  return { strategyId: strategy.id, pillarId: pillar.id };
}
const author = { system: "OPERATOR" as const, reason: "Recette identité catalogue" };
const caller = () => pillarRouter.createCaller({ db, headers: undefined, session: {
  user: { id: userId, role: "ADMIN" }, expires: new Date(Date.now() + 60_000).toISOString(),
} });
type Operation = Parameters<typeof writePillar>[0]["operation"];
describe("catalogue identity through every common writer", () => {
  const catalogue = [product("Libre de recette"), product("Libre de recette")];
  const operations: Array<[string, Operation]> = [
    ["SET_FIELDS", { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue", value: catalogue }] }],
    ["REPLACE_FULL", { type: "REPLACE_FULL", content: { produitsCatalogue: catalogue } }],
    ["MERGE_DEEP", { type: "MERGE_DEEP", patch: { produitsCatalogue: catalogue } }],
    ["APPLY_RECOS_RESOLVED", { type: "APPLY_RECOS_RESOLVED", operations: [
      { field: "produitsCatalogue", operation: "SET", proposedValue: catalogue, recoId: "fixture" },
    ] }],
  ];
  it.each(operations)("assigns unique references through %s and archives the previous state", async (_name, operation) => {
    const f = await fixture();
    const result = await writePillar({ ...f, pillarKey: "v", operation: structuredClone(operation), author });
    expect(result.success).toBe(true);
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    const products = (row.content as Record<string, unknown>).produitsCatalogue as Array<Record<string, unknown>>;
    expect(products.map((p) => p.id)).toEqual([expect.any(String), expect.any(String)]);
    expect(new Set(products.map((p) => p.id)).size).toBe(2);
    expect(products.map(({ id: _id, ...rest }) => rest)).toEqual(catalogue);
    expect(row.currentVersion).toBe(2);
    expect((await db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.pillarId } })).content).toEqual({});
  });
  it("keeps an acquired id when a product is renamed and preserves the archived name", async () => {
    const original = { ...product("Nom initial"), id: "identite-acquise" };
    const f = await fixture({ produitsCatalogue: [original] });
    const result = await writePillar({ ...f, pillarKey: "v", author,
      operation: { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue[0].nom", value: "Nom révisé" }] } });
    expect(result.success).toBe(true);
    expect((result.newContent.produitsCatalogue as Record<string, unknown>[])[0]).toMatchObject({ id: original.id, nom: "Nom révisé" });
    expect((result.previousContent.produitsCatalogue as Record<string, unknown>[])[0]?.nom).toBe("Nom initial");
    const snapshot = await db.pillarVersion.findFirstOrThrow({ where: { pillarId: f.pillarId } });
    expect((snapshot.content as Record<string, unknown>).produitsCatalogue).toEqual([original]);
  });
  it("binds legacy names to the same product across catalogue acquisition and rename", async () => {
    const original = product("Nom initial");
    const bindings = { productLadder: [{ tier: "Gamme", produitIds: ["Nom initial", "Absent"] }],
      personaSegmentMap: [{ personaName: "Public", productNames: ["Nom initial"] }],
      productSystem: { anchorProductIds: ["Nom initial"], modes: [{ relatedProductIds: ["Nom initial"] }] },
      _fieldProvenance: { produitsCatalogue: "HUMAN", productLadder: "HUMAN", personaSegmentMap: "SOURCE" } };
    const f = await fixture({ produitsCatalogue: [original], ...bindings });
    const acquired = await writePillar({ ...f, pillarKey: "v", author, operation: { type: "SET_FIELDS", fields: [
      { path: "produitsCatalogue[0].conditionsTarifaires", value: "Condition relue" },
    ] } });
    expect(acquired.success).toBe(true);
    expect(acquired.newContent.productLadder).toEqual([{ tier: "Gamme", produitIds: ["nom-initial", "Absent"] }]);
    expect(acquired.newContent.personaSegmentMap).toEqual(bindings.personaSegmentMap);
    const renamed = await writePillar({ ...f, pillarKey: "v", author, operation: { type: "SET_FIELDS", fields: [
      { path: "produitsCatalogue[0].nom", value: "Nom relu" },
    ] } });
    expect(renamed.success).toBe(true);
    expect(renamed.newContent.productLadder).toEqual(acquired.newContent.productLadder);
    expect(renamed.newContent.productSystem).toEqual({ anchorProductIds: ["nom-initial"], modes: [{ relatedProductIds: ["nom-initial"] }] });
    expect(renamed.newContent.personaSegmentMap).toEqual([{ personaName: "Public", productNames: ["Nom relu"] }]);
    expect(renamed.newContent._fieldProvenance).toEqual(bindings._fieldProvenance);
    expect(renamed.previousContent.personaSegmentMap).toEqual(bindings.personaSegmentMap);
  });
  it("assigns ids through legacy pending recommendations too", async () => {
    const f = await fixture();
    await db.pillar.update({ where: { id: f.pillarId }, data: { pendingRecos: [
      { field: "produitsCatalogue", operation: "SET", proposedValue: [product("Produit recommandé")] },
    ] } });
    const result = await writePillar({ ...f, pillarKey: "v", author, operation: { type: "APPLY_RECOS", recoIndices: [0] } });
    expect(result.success).toBe(true);
    expect(result.newContent.produitsCatalogue).toEqual([{ ...product("Produit recommandé"), id: expect.any(String) }]);
  });
  it("recovers an omitted id only for an unambiguous exact name and never by array position", async () => {
    const f = await fixture({ produitsCatalogue: [
      { ...product("À garder"), id: "identite-acquise" }, { ...product("Ancien"), id: "nouveau" },
    ] });
    const result = await writePillar({ ...f, pillarKey: "v", author, operation: { type: "SET_FIELDS", fields: [
      { path: "produitsCatalogue", value: [product("Nouveau"), product("À garder")] },
    ] } });
    expect(result.success).toBe(true);
    expect((result.newContent.produitsCatalogue as Record<string, unknown>[]).map(p => p.id)).toEqual(["nouveau-2", "identite-acquise"]);
  });
  it("rejects duplicate acquired ids without archiving or persisting a partial change", async () => {
    const f = await fixture();
    const result = await writePillar({ ...f, pillarKey: "v", author, operation: { type: "SET_FIELDS", fields: [
      { path: "produitsCatalogue", value: [ { ...product("Un"), id: "commun" }, { ...product("Deux"), id: "commun" } ] },
    ] } });
    expect(result.success).toBe(false); expect(result.error).toContain("CATALOGUE_ID_CONFLICT");
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } })).currentVersion).toBe(1);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(0);
  });
  it("does not backfill an untouched legacy catalogue on an unrelated edit", async () => {
    const original = [product("Legacy sans id")]; const f = await fixture({ produitsCatalogue: original });
    const result = await writePillar({ ...f, pillarKey: "v", author,
      operation: { type: "SET_FIELDS", fields: [{ path: "promesseDeValeur", value: "Une promesse de recette" }] } });
    expect(result.success).toBe(true); expect(result.newContent.produitsCatalogue).toEqual(original);
  });
  it("does not backfill or alter a human catalogue after a source replacement is refused", async () => {
    const original = [product("Humain sans id")];
    const f = await fixture({ produitsCatalogue: original, _fieldProvenance: { produitsCatalogue: "HUMAN" } });
    const result = await writePillar({ ...f, pillarKey: "v", author: { system: "INGESTION", reason: "Recette refus source" },
      operation: { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue", value: [product("Remplacement source")] }] } });
    expect(result.success).toBe(true); expect(result.newContent.produitsCatalogue).toEqual(original);
    expect(result.challenged).toContain("produitsCatalogue");
  });
  it("cannot bypass human authority by editing a nested product leaf", async () => {
    const original = [{ ...product("Produit humain"), id: "produit-humain", conditionsTarifaires: "Conditions déclarées" }];
    const f = await fixture({ produitsCatalogue: original, _fieldProvenance: { produitsCatalogue: "HUMAN" } });
    const result = await writePillar({ ...f, pillarKey: "v", author: { system: "INGESTION", reason: "Recette refus imbriqué" },
      operation: { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue[0].conditionsTarifaires", value: "Hypothèse entrante" }] } });
    expect(result.success).toBe(true); expect(result.newContent.produitsCatalogue).toEqual(original);
    expect(result.previousContent.produitsCatalogue).toEqual(original);
    expect(result.challenged).toContain("produitsCatalogue");
  });
  it("refuses a stale caller version before snapshots or content change", async () => {
    const f = await fixture({ promesseDeValeur: "Actuelle" });
    const result = await writePillar({ ...f, pillarKey: "v", author, options: { expectedVersion: 0 },
      operation: { type: "SET_FIELDS", fields: [{ path: "promesseDeValeur", value: "Périmée" }] } });
    expect(result.success).toBe(false); expect(result.error).toContain("PILLAR_VERSION_CONFLICT");
    expect((await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } })).content).toEqual({ promesseDeValeur: "Actuelle" });
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(0);
  });
  it("confirms canonical-only inference atomically and resists a following source", async () => {
    const f = await fixture({ promesseDeValeur: "À relire", _fieldProvenance: { promesseDeValeur: "INFERRED" } });
    const confirmation = await caller().confirmInferredField({ strategyId: f.strategyId, pillarKey: "v", fieldPath: "promesseDeValeur", expectedVersion: 1 });
    expect(confirmation).toMatchObject({ ok: true, alreadyConfirmed: false, provenanceLocked: "promesseDeValeur" });
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(row.currentVersion).toBe(2);
    expect(row.content).toEqual({ promesseDeValeur: "À relire", _fieldProvenance: { promesseDeValeur: "HUMAN" } });
    const result = await writePillar({ ...f, pillarKey: "v", author: { system: "INGESTION", reason: "Source après confirmation" },
      operation: { type: "SET_FIELDS", fields: [{ path: "promesseDeValeur", value: "Source contradictoire" }] } });
    expect(result.newContent.promesseDeValeur).toBe("À relire");
    expect(result.challenged).toContain("promesseDeValeur");
  });
  it("confirms one top-level field and retires qualified nested legacy markers together", async () => {
    const f = await fixture({ unitEconomics: { pointMort: "Décrit par l'humain" }, _fieldProvenance: { unitEconomics: "INFERRED" } });
    await db.pillar.update({ where: { id: f.pillarId }, data: { fieldCertainty: {
      "v.unitEconomics.pointMort": "INFERRED", "unitEconomics.pointMort": "INFERRED", "autreChamp": "INFERRED",
    } } });
    await caller().confirmInferredField({ strategyId: f.strategyId, pillarKey: "v", fieldPath: "v.unitEconomics.pointMort", expectedVersion: 1 });
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(row.fieldCertainty).toEqual({ autreChamp: "INFERRED" });
    expect((row.content as Record<string, unknown>)._fieldProvenance).toEqual({ unitEconomics: "HUMAN" });
  });
  it("refuses confirmation from an old screen and leaves both authorities unchanged", async () => {
    const original = { promesseDeValeur: "Version relue", _fieldProvenance: { promesseDeValeur: "INFERRED" } };
    const f = await fixture(original);
    await writePillar({ ...f, pillarKey: "v", author, operation: { type: "SET_FIELDS", fields: [{ path: "autreChamp", value: "Édition concurrente" }] } });
    const before = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    const snapshots = await db.pillarVersion.count({ where: { pillarId: f.pillarId } });
    await expect(caller().confirmInferredField({ strategyId: f.strategyId, pillarKey: "v", fieldPath: "promesseDeValeur", expectedVersion: 1 }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    const after = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(after.content).toEqual(before.content); expect(after.fieldCertainty).toEqual(before.fieldCertainty);
    expect(after.currentVersion).toBe(before.currentVersion);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(snapshots);
  });
  it.each(["HUMAN", "SOURCE"])("does not confirm legacy inference over canonical %s", async (origin) => {
    const f = await fixture({ promesseDeValeur: "Origine réelle", _fieldProvenance: { promesseDeValeur: origin } });
    await db.pillar.update({ where: { id: f.pillarId }, data: { fieldCertainty: { "v.promesseDeValeur": "INFERRED" } } });
    expect(await caller().confirmInferredField({ strategyId: f.strategyId, pillarKey: "v", fieldPath: "promesseDeValeur", expectedVersion: 1 }))
      .toMatchObject({ ok: true, alreadyConfirmed: true });
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(row.currentVersion).toBe(1);
    expect((row.content as Record<string, unknown>)._fieldProvenance).toEqual({ promesseDeValeur: origin });
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(0);
  });
  it.each(["unitEconomics.pointMort", "v.unitEconomics.pointMort"])("confirms legacy-only nested inference %s at the same grain", async (path) => {
    const f = await fixture({ unitEconomics: { pointMort: "Hypothèse à relire" } });
    await db.pillar.update({ where: { id: f.pillarId }, data: { fieldCertainty: { [path]: "INFERRED" } } });
    expect(await caller().confirmInferredField({ strategyId: f.strategyId, pillarKey: "v", fieldPath: path, expectedVersion: 1 }))
      .toMatchObject({ alreadyConfirmed: false, provenanceLocked: "unitEconomics" });
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(row.fieldCertainty).toEqual({}); expect(row.currentVersion).toBe(2);
    expect((row.content as Record<string, unknown>)._fieldProvenance).toEqual({ unitEconomics: "HUMAN" });
  });
  it("accepts exactly one concurrent catalogue edit and creates one previous-state snapshot", async () => {
    const f = await fixture();
    const results = await Promise.all(["Un", "Deux", "Trois"].map(nom => writePillar({ ...f, pillarKey: "v", author,
      options: { expectedVersion: 1 }, operation: { type: "SET_FIELDS", fields: [{ path: "produitsCatalogue", value: [product(nom)] }] } })));
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(results.filter(r => !r.success).every(r => r.error?.includes("PILLAR_VERSION_CONFLICT"))).toBe(true);
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(row.currentVersion).toBe(2);
    expect((row.content as Record<string, unknown>).produitsCatalogue).toEqual(results.find(r => r.success)!.newContent.produitsCatalogue);
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(1);
  });
  it("races confirmation with an edit without separating authority from the content version", async () => {
    const f = await fixture({ promesseDeValeur: "Relue", _fieldProvenance: { promesseDeValeur: "INFERRED" } });
    const [confirmation, edition] = await Promise.allSettled([
      caller().confirmInferredField({ strategyId: f.strategyId, pillarKey: "v", fieldPath: "promesseDeValeur", expectedVersion: 1 }),
      writePillar({ ...f, pillarKey: "v", author, options: { expectedVersion: 1 }, operation: {
        type: "SET_FIELDS", fields: [{ path: "autreChamp", value: "Édition concurrente" }],
      } }),
    ]);
    const confirmed = confirmation.status === "fulfilled";
    const edited = edition.status === "fulfilled" && edition.value.success;
    expect(Number(confirmed) + Number(edited)).toBe(1);
    const row = await db.pillar.findUniqueOrThrow({ where: { id: f.pillarId } });
    expect(row.currentVersion).toBe(2);
    expect((row.content as Record<string, unknown>)._fieldProvenance).toMatchObject({ promesseDeValeur: confirmed ? "HUMAN" : "INFERRED" });
    expect(await db.pillarVersion.count({ where: { pillarId: f.pillarId } })).toBe(1);
  });
});
