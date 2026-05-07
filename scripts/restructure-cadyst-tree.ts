/**
 * Phase 18 — Restructure de l'arbre Cadyst Group + Fokou + SAFVIS.
 *
 * User correction (2026-05-07) sur la hiérarchie réelle :
 *
 *   Cadyst Group (CORPORATE — marque ombrelle)
 *   ├── Cadyst Grain (MASTER_BRAND — filiale)
 *   │     ├── Amigo (MASTER_BRAND — farine de beignet, brand platform)
 *   │     ├── La Camerounaise (PRODUCT_LINE — farine pour le pain)
 *   │     ├── Pelican Rouge (PRODUCT_LINE)
 *   │     └── La Colombe (PRODUCT_LINE)
 *   ├── Cadyst Farming (MASTER_BRAND — filiale)
 *   │     └── Robuste (MASTER_BRAND — brand platform) [existait déjà]
 *   └── Panzani / LaPasta (MASTER_BRAND — filiale)
 *         ├── LaPasta (MASTER_BRAND — spaghetti, brand platform) [renommé depuis "Panzani"]
 *         └── Delys & Barka (MASTER_BRAND — biscuit, brand platform) [renommé depuis "DELYS"]
 *
 *   Fokou (CORPORATE)
 *   └── Cap Esterias (MASTER_BRAND — brand platform)
 *
 *   SAFVIS (CORPORATE — nouveau)
 *   └── Frutas (MASTER_BRAND — brand platform)
 *
 * Notes :
 *   - MASTER_BRAND sous MASTER_BRAND viole le strict cascade PRODUCT
 *     (cf. brand-nature-archetypes.ts). On l'autorise ici parce que la
 *     hiérarchie réelle exige 3 niveaux pilotables (ombrelle / filiale /
 *     produit-marque). Le schéma n'enforce pas la transition au niveau
 *     DB (nodeKind est String) — seul le code service le fait.
 *   - Idempotent : peut se ré-exécuter sans casser.
 *   - Préserve les Strategy attachées aux REGIONAL_BRAND existants.
 *
 * Usage :
 *   npx tsx --env-file=.env scripts/restructure-cadyst-tree.ts
 */

import { db } from "@/lib/db";

interface UpsertSpec {
  slug: string;
  name: string;
  nodeKind: "CORPORATE" | "MASTER_BRAND" | "PRODUCT_LINE" | "STANDALONE_BRAND";
  nodeNature?: "PRODUCT";
  parentSlug: string | null;
  /** Si fourni, l'entité existante avec ce slug sera renommée + re-slugée. */
  fromSlug?: string;
}

async function main() {
  // 1. Get operator from existing Cadyst Farming
  const seedNode = await db.brandNode.findFirst({ where: { slug: "cadyst-farming" } });
  if (!seedNode) throw new Error("[restructure] Cadyst Farming not found in DB — abort");
  const operatorId = seedNode.operatorId;
  if (!operatorId) throw new Error("[restructure] operatorId missing on Cadyst Farming");
  console.log(`[restructure] Using operatorId=${operatorId}`);

  // 2. Sequence of upserts (idempotent, in dependency order)
  const specs: UpsertSpec[] = [
    // Cadyst umbrella
    { slug: "cadyst-group",   name: "Cadyst Group",      nodeKind: "CORPORATE",    parentSlug: null },
    // Filiales — convert existing CORPORATE → MASTER_BRAND, reparent
    { slug: "cadyst-grain",   name: "Cadyst Grain",      nodeKind: "MASTER_BRAND", parentSlug: "cadyst-group" },
    { slug: "cadyst-farming", name: "Cadyst Farming",    nodeKind: "MASTER_BRAND", parentSlug: "cadyst-group" },
    { slug: "panzani-lapasta", fromSlug: "panzani-cadyst-group", name: "Panzani / LaPasta", nodeKind: "MASTER_BRAND", parentSlug: "cadyst-group" },

    // Cadyst Grain product brands
    { slug: "amigo",                name: "Amigo",          nodeKind: "MASTER_BRAND", parentSlug: "cadyst-grain" },
    { slug: "la-camerounaise",      name: "La Camerounaise", nodeKind: "PRODUCT_LINE", parentSlug: "cadyst-grain" },
    { slug: "pelican-rouge",        name: "Pelican Rouge",  nodeKind: "PRODUCT_LINE", parentSlug: "cadyst-grain" },
    { slug: "la-colombe",           name: "La Colombe",     nodeKind: "PRODUCT_LINE", parentSlug: "cadyst-grain" },

    // Cadyst Farming product brand (Robuste already exists as MASTER_BRAND, just confirm parent)
    { slug: "cf-robuste",           name: "Robuste",        nodeKind: "MASTER_BRAND", parentSlug: "cadyst-farming" },

    // Panzani / LaPasta product brands — rename existing
    { slug: "pz-lapasta",           fromSlug: "pz-panzani",  name: "LaPasta",        nodeKind: "MASTER_BRAND", parentSlug: "panzani-lapasta" },
    { slug: "pz-delys-barka",       fromSlug: "pz-delys",    name: "Delys & Barka",  nodeKind: "MASTER_BRAND", parentSlug: "panzani-lapasta" },

    // Fokou — new product brand
    { slug: "fk-cap-esterias",      name: "Cap Esterias",   nodeKind: "MASTER_BRAND", parentSlug: "fokou" },

    // SAFVIS umbrella + product brand
    { slug: "safvis",               name: "SAFVIS",         nodeKind: "CORPORATE",    parentSlug: null },
    { slug: "sv-frutas",            name: "Frutas",         nodeKind: "MASTER_BRAND", parentSlug: "safvis" },

    // FrieslandCampina — Bonnet Rouge sub-brands (chacune a sa propre
    // plateforme de marque qui hérite de Bonnet Rouge mais avec ses propres
    // éléments et conditions de marché). Cf. user note 2026-05-07 :
    //   - IMP : cible prioritaire = enfants ; KV signature "Le secret pour
    //     bien grandir" sauf au Congo (RDC) où ça reprend la signature
    //     "énergie dès le matin" comme les autres variantes.
    //   - EVAP, SCM : plateformes de marque distinctes.
    // Les pillarOverrides locaux seront configurés via cockpit UI / Intent
    // OPERATOR_AMEND_PILLAR — ce script crée seulement la structure.
    { slug: "br-imp",  name: "Bonnet Rouge IMP",  nodeKind: "MASTER_BRAND", parentSlug: "fc-bonnet-rouge" },
    { slug: "br-evap", name: "Bonnet Rouge EVAP", nodeKind: "MASTER_BRAND", parentSlug: "fc-bonnet-rouge" },
    { slug: "br-scm",  name: "Bonnet Rouge SCM",  nodeKind: "MASTER_BRAND", parentSlug: "fc-bonnet-rouge" },
  ];

  // Apply specs in order
  for (const spec of specs) {
    const parentNodeId = spec.parentSlug
      ? (await db.brandNode.findFirst({ where: { slug: spec.parentSlug }, select: { id: true } }))?.id
      : null;
    if (spec.parentSlug && !parentNodeId) {
      console.warn(`[restructure] WARN parent slug=${spec.parentSlug} not found, skipping ${spec.slug}`);
      continue;
    }

    // Try fromSlug rename first, then target slug (idempotent on re-runs).
    let existing = spec.fromSlug
      ? await db.brandNode.findFirst({ where: { slug: spec.fromSlug } })
      : null;
    if (!existing) {
      existing = await db.brandNode.findFirst({ where: { slug: spec.slug } });
    }

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (existing.slug !== spec.slug) updates.slug = spec.slug;
      if (existing.name !== spec.name) updates.name = spec.name;
      if (existing.nodeKind !== spec.nodeKind) updates.nodeKind = spec.nodeKind;
      if (existing.parentNodeId !== parentNodeId) updates.parentNodeId = parentNodeId;
      if (Object.keys(updates).length > 0) {
        await db.brandNode.update({ where: { id: existing.id }, data: updates });
        console.log(`[restructure] UPDATED ${existing.slug} →`, updates);
      } else {
        console.log(`[restructure] NOOP ${existing.slug} (already correct)`);
      }
    } else {
      await db.brandNode.create({
        data: {
          operatorId,
          name: spec.name,
          slug: spec.slug,
          nodeKind: spec.nodeKind,
          nodeNature: "PRODUCT",
          parentNodeId,
        },
      });
      console.log(`[restructure] CREATED ${spec.slug} (${spec.nodeKind})`);
    }
  }

  // 3. Patch follow-ups :
  //    a. Rename "Panzani / Cadyst Group – Cameroun" REGIONAL → "Panzani / LaPasta – Cameroun"
  //    b. Move "La Pasta First" / "La Pasta Gold" (legacy MASTER) → PRODUCT_LINE under LaPasta
  //    c. Archive legacy out-of-scope nodes "Farine" + "Whisky" (ne correspondent
  //       pas au modèle métier exposé par l'opérateur)
  const legacyRegional = await db.brandNode.findFirst({
    where: { slug: "pz-cm" },
    select: { id: true, name: true },
  });
  if (legacyRegional && legacyRegional.name === "Panzani / Cadyst Group – Cameroun") {
    await db.brandNode.update({
      where: { id: legacyRegional.id },
      data: { name: "Panzani / LaPasta – Cameroun" },
    });
    console.log(`[restructure] RENAMED REGIONAL pz-cm → "Panzani / LaPasta – Cameroun"`);
  }

  const lapastaNode = await db.brandNode.findFirst({ where: { slug: "pz-lapasta" }, select: { id: true } });
  if (lapastaNode) {
    const variants = await db.brandNode.findMany({
      where: { name: { in: ["La Pasta First", "La Pasta Gold"] } },
      select: { id: true, name: true, nodeKind: true, parentNodeId: true },
    });
    for (const v of variants) {
      if (v.nodeKind !== "PRODUCT_LINE" || v.parentNodeId !== lapastaNode.id) {
        await db.brandNode.update({
          where: { id: v.id },
          data: { nodeKind: "PRODUCT_LINE", parentNodeId: lapastaNode.id },
        });
        console.log(`[restructure] DEMOTED ${v.name} → PRODUCT_LINE under LaPasta`);
      }
    }
  }

  const legacyOrphans = await db.brandNode.findMany({
    where: { name: { in: ["Farine", "Whisky"] }, archivedAt: null },
    select: { id: true, name: true },
  });
  for (const o of legacyOrphans) {
    await db.brandNode.update({
      where: { id: o.id },
      data: { archivedAt: new Date() },
    });
    console.log(`[restructure] ARCHIVED legacy node "${o.name}"`);
  }

  // 4. Final verification dump
  const tree = await db.brandNode.findMany({
    where: {
      OR: [
        { slug: { startsWith: "cadyst-" } },
        { slug: { startsWith: "cf-" } },
        { slug: { startsWith: "cg-" } },
        { slug: { startsWith: "pz-" } },
        { slug: { startsWith: "panzani-" } },
        { slug: { startsWith: "fokou" } },
        { slug: { startsWith: "fk-" } },
        { slug: { startsWith: "safvis" } },
        { slug: { startsWith: "sv-" } },
        { slug: { startsWith: "br-" } },
        { slug: { startsWith: "fc-" } },
        { name: "FrieslandCampina" },
        { slug: { in: ["amigo", "la-camerounaise", "pelican-rouge", "la-colombe"] } },
      ],
    },
    select: { id: true, name: true, slug: true, nodeKind: true, parentNodeId: true, strategyId: true },
    orderBy: [{ nodeKind: "asc" }, { name: "asc" }],
  });
  console.log("\n[restructure] === FINAL TREE ===");
  for (const n of tree) {
    const parentName = n.parentNodeId ? tree.find((p) => p.id === n.parentNodeId)?.name ?? "?" : "(racine)";
    const strat = n.strategyId ? " [Strategy attachée]" : "";
    console.log(`  ${n.nodeKind.padEnd(16)} ${n.name.padEnd(30)} ← ${parentName}${strat}`);
  }
  console.log("[restructure] DONE.");
  await db.$disconnect();
}

main().catch((err) => {
  console.error("[restructure] FATAL", err);
  process.exit(1);
});
