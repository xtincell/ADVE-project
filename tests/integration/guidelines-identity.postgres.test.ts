/** Real readers, disposable DB: old ACTIVE must survive newer drafts. */
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { resolveBrandTheme, hexToRgb } from "@/server/services/brand-theme";
import { sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { generate, exportHtml, exportPdf } from "@/server/services/guidelines-renderer";
let userId: string;
const strategies: string[] = [];
beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  userId = (await db.user.create({ data: { email: `guide-${randomUUID()}@example.test` } })).id;
});
afterAll(async () => {
  if (strategies.length) {
    await db.brandDataSource.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.brandAsset.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.pillar.deleteMany({ where: { strategyId: { in: strategies } } });
    await db.strategy.deleteMany({ where: { id: { in: strategies } } });
  }
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
async function fixture() {
  const strategy = await db.strategy.create({ data: { name: 'Guide <script>alert(1)</script>', userId } });
  strategies.push(strategy.id);
  const active = await db.brandAsset.create({ data: { strategyId: strategy.id, kind: "CHROMATIC_STRATEGY", name: "Palette conservée", state: "ACTIVE", content: { accent: "#2155A4", primary: "#111111" }, createdAt: new Date("2026-01-01") } });
  await db.brandAsset.createMany({ data: Array.from({ length: 6 }, (_, i) => ({ strategyId: strategy.id, kind: "CHROMATIC_STRATEGY", name: `Proposition ${i}`, state: "DRAFT" as const, content: { accent: "#FF0000" }, createdAt: new Date(`2026-02-0${i + 1}`) })) });
  await db.pillar.create({ data: { strategyId: strategy.id, key: "d", content: { directionArtistique: { brandGuidelines: "CHARTE_INVENTEE_NE_PAS_PUBLIER" } } } });
  const source = await db.brandDataSource.create({ data: { strategyId: strategy.id, sourceType: "MANUAL_INPUT", fileName: "Charte conservée <img onerror=evil>", rawContent: "Document de référence, non analysé", certainty: "DECLARED", processingStatus: "EXTRACTED" } });
  return { strategy, active, source };
}
describe("guidelines : identité du coffre et documents, sans remplir le profil", () => {
  it("un export téléchargé conserve une adresse de logo utilisable hors du site", async () => {
    const { strategy } = await fixture();
    const good = await db.brandAsset.create({ data: { strategyId: strategy.id, kind: "LOGO_FINAL", state: "ACTIVE", name: "Logo synthétique", fileUrl: "/fixtures/logo.png", createdAt: new Date("2026-01-01") } });
    await db.brandAsset.create({ data: { strategyId: strategy.id, kind: "LOGO_FINAL", state: "ACTIVE", name: "Adresse refusée", fileUrl: "javascript:alert(1)" } });
    expect((await generate(strategy.id)).identity.logo?.id).toBe(good.id);
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://127.0.0.1:3317");
    try { expect(await exportHtml(strategy.id)).toContain('src="http://127.0.0.1:3317/fixtures/logo.png"'); }
    finally { vi.unstubAllEnvs(); }
  });

  it("qualifie une version documentaire puis signale un changement sans exposer une source étrangère", async () => {
    const { strategy, active, source } = await fixture();
    await db.brandAsset.update({ where: { id: active.id }, data: { metadata: { sourceDataSourceId: source.id, sourceContentHash: sourceFingerprint(source) } } });
    expect((await generate(strategy.id)).identity.chromatic?.provenance.status).toBe("CURRENT");
    await db.brandDataSource.update({ where: { id: source.id }, data: { rawContent: "Document corrigé" } });
    expect((await generate(strategy.id)).identity.chromatic?.provenance.status).toBe("CHANGED");
    const foreign = await db.strategy.create({ data: { name: "Dossier non relié", userId } }); strategies.push(foreign.id);
    const secret = await db.brandDataSource.create({ data: { strategyId: foreign.id, sourceType: "MANUAL_INPUT", fileName: "NOM_CONFIDENTIEL_EXTERNE", rawContent: "NE_PAS_EXPOSER", certainty: "OFFICIAL" } });
    await db.brandAsset.update({ where: { id: active.id }, data: { metadata: { sourceDataSourceId: secret.id, sourceContentHash: sourceFingerprint(secret) } } });
    const doc = await generate(strategy.id);
    expect(doc.identity.chromatic?.provenance).toMatchObject({ status: "UNAVAILABLE", sourceId: null, sourceName: null });
    expect(JSON.stringify(doc.sources)).not.toContain(secret.fileName);
    expect(await exportHtml(strategy.id)).not.toContain(secret.fileName);
  });
  it("un actif signalé périmé ne supplante pas une identité éligible", async () => {
    const { strategy, active } = await fixture();
    await db.brandAsset.update({ where: { id: active.id }, data: { staleAt: new Date() } });
    expect((await generate(strategy.id)).identity.chromatic?.id).not.toBe(active.id);
  });

  it("une palette ACTIVE ancienne prime sur six propositions plus récentes", async () => {
    const { strategy } = await fixture();
    expect((await resolveBrandTheme(strategy.id)).band).toEqual(hexToRgb("#2155A4"));
  });
  it("le lecteur réel expose le coffre et les références, pas une charte inférée", async () => {
    const { strategy, active, source } = await fixture();
    const before = await db.pillar.findMany({ where: { strategyId: strategy.id } });
    const doc = await generate(strategy.id);
    expect(doc).toMatchObject({ identity: { chromatic: { id: active.id, state: "ACTIVE" } }, sources: [{ id: source.id, certainty: "DECLARED" }] });
    for (const html of [await exportHtml(strategy.id), await exportPdf(strategy.id)]) {
      expect(html).toContain("#2155A4");
      expect(html).toContain("Charte conservée &lt;img onerror=evil&gt;");
      expect(html).not.toContain("CHARTE_INVENTEE_NE_PAS_PUBLIER");
      expect(html).not.toContain("<script>alert(1)</script>");
    }
    expect(await db.pillar.findMany({ where: { strategyId: strategy.id } })).toEqual(before);
    expect(await db.aICostLog.count({ where: { strategyId: strategy.id } })).toBe(0);
  });
  it("un remplacé et une palette d’une autre marque ne deviennent pas l’identité courante", async () => {
    const { strategy } = await fixture();
    await db.brandAsset.updateMany({ where: { strategyId: strategy.id }, data: { state: "SUPERSEDED" } });
    const foreign = await db.strategy.create({ data: { name: "Autre marque", userId } }); strategies.push(foreign.id);
    await db.brandAsset.create({ data: { strategyId: foreign.id, name: "Palette externe", kind: "CHROMATIC_STRATEGY", state: "ACTIVE", content: { accent: "#55AA33" } } });
    expect((await resolveBrandTheme(strategy.id)).isFallback).toBe(true);
  });
});
