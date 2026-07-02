import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du coffre de marque (WP-019) : CRUD complet audité —
 * création (value canonique), correction (version++, avant/après tracés),
 * archivage/restauration (flips atomiques), tenancy (le coffre d'une marque
 * étrangère est introuvable), charte dérivée depuis l'état réel, chaîne
 * d'audit re-déroulée sans rupture.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`). Skippé en CI et en
 * local sans env — la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`) ; aucun seed requis.
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

describe.skipIf(!SMOKE_URL)("WP-019 smoke DB — coffre de marque de bout en bout", () => {
  // Importés paresseusement pour ne rien instancier quand le smoke est skippé.
  async function services() {
    const [{ getDb }, vault, guidelines] = await Promise.all([
      import("@/lib/db"),
      import("@/server/vault"),
      import("@/domain/guidelines"),
    ]);
    return { getDb, vault, guidelines };
  }

  function stamp() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function makeBrand() {
    const { getDb } = await services();
    const db = getDb();
    const s = stamp();
    const workspace = await db.workspace.create({
      data: { slug: `smoke-vault-${s}`, name: `Smoke vault ${s}`, kind: "BRAND" },
    });
    const brand = await db.brand.create({
      data: { workspaceId: workspace.id, slug: `smoke-vault-${s}`, name: `Marque ${s}` },
    });
    return { workspace, brand, actorId: "smoke-operator" };
  }

  afterAll(async () => {
    const { getDb } = await services();
    await getDb().$disconnect();
  });

  it("CRUD audité + charte dérivée + tenancy + chaîne d'audit re-déroulée", async () => {
    const { getDb, vault, guidelines } = await services();
    const db = getDb();
    const { workspace, brand, actorId } = await makeBrand();

    // 1. Créations — value canonique par kind (hex canonisé, vides omis).
    const corail = await vault.createAsset({
      brandId: brand.id,
      kind: "COULEUR",
      name: "Corail",
      value: vault.buildAssetValue("COULEUR", { hex: "e56458", role: "Primaire — CTA" }),
      actorId,
    });
    expect(corail).toMatchObject({
      kind: "COULEUR",
      status: "ACTIVE",
      version: 1,
      value: { hex: "#E56458", role: "Primaire — CTA" },
      fileRef: null,
    });
    const clash = await vault.createAsset({
      brandId: brand.id,
      kind: "TYPO",
      name: "Clash Display",
      value: vault.buildAssetValue("TYPO", { usage: "Titres", url: "" }),
      actorId,
    });
    expect(clash.value).toEqual({ usage: "Titres" });

    // 2. Correction — version++, gate optimiste, avant/après audités.
    const corrected = await vault.updateAsset({
      brandId: brand.id,
      assetId: corail.id,
      name: "Corail fusée",
      value: vault.buildAssetValue("COULEUR", { hex: "#E56458", role: "" }),
      actorId,
    });
    expect(corrected.version).toBe(2);
    expect(corrected.value).toEqual({ hex: "#E56458" }); // rôle retiré = clé omise

    // 3. Tenancy : depuis une marque étrangère, l'asset est INTROUVABLE.
    const intruder = await makeBrand();
    await expect(
      vault.updateAsset({
        brandId: intruder.brand.id,
        assetId: corail.id,
        name: "Piraté",
        value: { hex: "#000000" },
        actorId: intruder.actorId,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });
    await expect(
      vault.archiveAsset({
        brandId: intruder.brand.id,
        assetId: corail.id,
        actorId: intruder.actorId,
      }),
    ).rejects.toMatchObject({ code: "ASSET_NOT_FOUND" });

    // 4. Archive : flip atomique — la deuxième tentative est refusée ;
    //    un asset archivé ne se corrige pas sans restauration.
    await vault.archiveAsset({ brandId: brand.id, assetId: clash.id, actorId });
    await expect(
      vault.archiveAsset({ brandId: brand.id, assetId: clash.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });
    await expect(
      vault.updateAsset({
        brandId: brand.id,
        assetId: clash.id,
        name: "Clash",
        value: {},
        actorId,
      }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 5. Lectures : groupement par kind, actifs seulement pour la charte.
    const grouped = await vault.listBrandAssets(brand.id);
    expect(grouped.COULEUR.map((a) => a.status)).toEqual(["ACTIVE"]);
    expect(grouped.TYPO.map((a) => a.status)).toEqual(["ARCHIVED"]);
    expect(await vault.countActiveAssets(brand.id)).toBe(1);

    // 6. Charte dérivée de l'état RÉEL : la typo archivée n'y est plus ;
    //    le rôle retiré fait tomber la section usages en manque honnête.
    const active = await vault.listActiveAssets(brand.id);
    const doc = guidelines.composeGuidelines({
      brandName: brand.name,
      pillarE: null,
      assets: active.map((a) => ({
        kind: a.kind as import("@/domain/guidelines").VaultAssetKind,
        name: a.name,
        value: a.value,
        fileRef: a.fileRef,
      })),
    });
    expect(doc.visual.section.status).toBe("ok");
    expect(doc.visual.colors).toEqual([{ name: "Corail fusée", hex: "#E56458", role: null }]);
    expect(doc.visual.typos).toEqual([]);
    expect(doc.usages.section.status).toBe("manquant");
    expect(doc.verbal.section.status).toBe("manquant"); // pilier E jamais écrit

    // 7. Restauration — l'asset revient dans la charte.
    await vault.restoreAsset({ brandId: brand.id, assetId: clash.id, actorId });
    expect(await vault.countActiveAssets(brand.id)).toBe(2);
    await expect(
      vault.restoreAsset({ brandId: brand.id, assetId: clash.id, actorId }),
    ).rejects.toMatchObject({ code: "GATE_REFUSED" });

    // 8. Audit : toutes les mutations, dans l'ordre, chaînées sans rupture,
    //    avant/après porté par la correction.
    const audit = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    expect(audit.map((row) => row.action)).toEqual([
      "vault.asset.create",
      "vault.asset.create",
      "vault.asset.update",
      "vault.asset.archive",
      "vault.asset.restore",
    ]);
    const updateRow = audit.find((row) => row.action === "vault.asset.update")!;
    expect(updateRow.payload).toMatchObject({
      version: 2,
      before: { name: "Corail", value: { hex: "#E56458", role: "Primaire — CTA" } },
      after: { name: "Corail fusée", value: { hex: "#E56458" } },
    });
    expect(audit[0]!.prevHash).toBeNull();
    for (let i = 1; i < audit.length; i++) {
      expect(audit[i]!.prevHash).toBe(audit[i - 1]!.selfHash);
    }
    // Intégrité re-calculée : chaque selfHash se re-dérive des données stockées.
    const { computeSelfHash } = await import("@/server/audit-hash");
    for (const row of audit) {
      expect(
        computeSelfHash(row.prevHash, {
          workspaceId: row.workspaceId,
          actorId: row.actorId,
          action: row.action,
          entity: row.entity,
          entityId: row.entityId,
          payload: row.payload ?? null,
        }),
      ).toBe(row.selfHash);
    }
  });
});
