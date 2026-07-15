/**
 * ADR-0149 — démo E2E du scoreur à force révélée. Seed 3 marques dans une ligue
 * (audiovisuel × QUARTIER × CM), leur pose des épreuves (E/T MESURÉES via Identity
 * + Overton, A/D/V au registre), les score et historise le verdict → leaderboard.
 *
 * Prouve l'acceptance C3 : θ reproductibles (2 runs = même sortie), verdict traçant
 * chaque chiffre, palier gaté, couverture affichée. 100 % déterministe, zéro LLM.
 *
 *   npx tsx scripts/seed-scoreur-demo.ts
 */

import { db } from "@/lib/db";
import { seedScoreurCanon } from "@/server/services/seshat/scoreur/anchor-seed";
import { recordEpreuve, scoreBrand } from "@/server/services/seshat/scoreur";
import { upsertPersonIdentifier } from "@/server/services/seshat/identity-graph";
import { registerSuperfanProfile } from "@/server/services/seshat/superfan-ingest";
import {
  upsertOvertonPosition,
  recordZoneTransition,
  linkActorToPosition,
} from "@/server/services/seshat/overton-graph";
import type { LeagueKey } from "@/domain/scoreur";

const LEAGUE: LeagueKey = { sectorSlug: "culture", marketScale: "QUARTIER", countryCode: "CM" };
const NOW = "2026-07-15T00:00:00.000Z";
const OWNER_EMAIL = "scoreur-demo@lafusee.local";

interface DemoBrand {
  key: string;
  name: string;
  superfans: number; // E
  favorableOverton: boolean; // T
  items: string[]; // A/D/V must-have items gagnés (registre)
  duels: { arena: "A" | "D" | "V"; anchor: string; result: "WIN" | "LOSS" }[];
}

const BRANDS: DemoBrand[] = [
  {
    key: "atelier-lumiere",
    name: "Atelier Lumière (démo)",
    superfans: 62, // > plancher QUARTIER (50) → item masse-superfan
    favorableOverton: true,
    items: ["dirigeant-identifiable", "mythe-fondateur", "market-fit", "actif-distinctif"],
    duels: [
      { arena: "D", anchor: "anchor-champion-quartier", result: "WIN" },
      { arena: "V", anchor: "anchor-champion-quartier", result: "WIN" },
      { arena: "A", anchor: "anchor-champion-quartier", result: "WIN" },
    ],
  },
  {
    key: "studio-akwa",
    name: "Studio Akwa (démo)",
    superfans: 24,
    favorableOverton: false,
    items: ["dirigeant-identifiable", "mythe-fondateur", "market-fit"],
    duels: [
      { arena: "D", anchor: "anchor-champion-quartier", result: "WIN" },
      { arena: "V", anchor: "anchor-champion-quartier", result: "LOSS" },
    ],
  },
  {
    key: "kribi-films",
    name: "Kribi Films (démo)",
    superfans: 6,
    favorableOverton: false,
    items: ["dirigeant-identifiable"],
    duels: [{ arena: "D", anchor: "anchor-champion-quartier", result: "LOSS" }],
  },
];

async function ensureOwner(): Promise<{ userId: string; operatorId: string }> {
  const operator = await db.operator.upsert({
    where: { slug: "scoreur-demo" },
    update: {},
    create: {
      slug: "scoreur-demo",
      name: "Scoreur Demo Operator",
      status: "ACTIVE",
      licenseType: "OWNER",
      licensedAt: new Date("2026-01-01T00:00:00.000Z"),
      licenseExpiry: new Date("2030-12-31T00:00:00.000Z"),
    },
    select: { id: true },
  });
  const u = await db.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { operatorId: operator.id },
    create: { email: OWNER_EMAIL, name: "Scoreur Demo", role: "ADMIN", operatorId: operator.id },
    select: { id: true },
  });
  return { userId: u.id, operatorId: operator.id };
}

async function ensureBrand(
  owner: { userId: string; operatorId: string },
  brand: DemoBrand,
): Promise<string> {
  const client = await db.client.upsert({
    where: { id: `demo-client-${brand.key}` },
    update: { sector: "CULTURE" },
    create: {
      id: `demo-client-${brand.key}`,
      name: brand.name,
      sector: "CULTURE",
      operatorId: owner.operatorId,
    },
    select: { id: true },
  });
  const strategy = await db.strategy.upsert({
    where: { id: `demo-strat-${brand.key}` },
    update: { marketScale: "QUARTIER", countryCode: "CM" },
    create: {
      id: `demo-strat-${brand.key}`,
      name: brand.name,
      userId: owner.userId,
      operatorId: owner.operatorId,
      clientId: client.id,
      marketScale: "QUARTIER",
      countryCode: "CM",
    },
    select: { id: true },
  });
  return strategy.id;
}

async function seedMeasuredSignals(strategyId: string, brand: DemoBrand) {
  // ── E : superfans réels dédupliqués par personne (Identity Graph) ───────────
  for (let i = 0; i < brand.superfans; i++) {
    const handle = `${brand.key}-fan-${i}`;
    const up = await upsertPersonIdentifier(db, {
      strategyId,
      kind: "HANDLE",
      value: handle,
      platform: "instagram",
      source: "IMPORT",
      confidence: "DECLARED",
    });
    await registerSuperfanProfile(db, {
      strategyId,
      platform: "INSTAGRAM",
      handle,
      segment: "PARTICIPANT",
      engagementDepth: 0.3,
      source: "MANUAL",
    });
    // rattache le profil à la personne
    await db.superfanProfile.updateMany({
      where: { strategyId, platform: "INSTAGRAM", handle },
      data: { personId: up.personId },
    });
  }

  // ── T : position Overton + transition favorable attribuée à la marque ───────
  if (brand.favorableOverton) {
    const pos = await upsertOvertonPosition(db, {
      strategyId,
      sectorSlug: LEAGUE.sectorSlug,
      marketScale: "QUARTIER",
      countryCode: "CM",
      statement: "le cadrage vidéo au service de l'histoire du quartier, pas du prestige",
      zone: "ACCEPTABLE",
      evidence: [{ source: "demo-seed", at: NOW }],
    });
    await linkActorToPosition(db, {
      positionId: pos.positionId,
      actorKind: "BRAND",
      actorRef: strategyId,
      edgeKind: "HOLDS",
    });
    await recordZoneTransition(db, {
      positionId: pos.positionId,
      fromZone: "RADICAL",
      toZone: "POPULAR",
      occurredAt: "2026-05-01T00:00:00.000Z",
      evidence: [{ source: "demo-seed" }],
      attributedActorKind: "BRAND",
      attributedActorRef: strategyId,
    });
  }
}

async function seedRegistryEpreuves(strategyId: string, brand: DemoBrand) {
  const itemRefs = await db.brandRef.findMany({
    where: { kind: "ITEM", slug: { in: brand.items.map((i) => `item-${i}`) } },
    select: { id: true, slug: true },
  });
  // Items gagnés (A/D/V) au registre → itemsMet.
  for (const ref of itemRefs) {
    const itemId = ref.slug.replace(/^item-/, "");
    const arena = itemId === "market-fit" ? "V" : itemId === "actif-distinctif" ? "D" : "A";
    await recordEpreuve({
      subjectStrategyId: strategyId,
      opponentBrandRefId: ref.id,
      arena,
      league: LEAGUE,
      result: "WIN",
      proofWeight: 0.4,
      source: `demo-seed:item-${itemId}`,
      occurredAt: NOW,
    });
  }
  // Duels A/D/V vs ancre de quartier (sourcés démo).
  const anchors = await db.brandRef.findMany({
    where: { slug: { in: brand.duels.map((d) => d.anchor) } },
    select: { id: true, slug: true },
  });
  const anchorId = new Map(anchors.map((a) => [a.slug, a.id]));
  for (const duel of brand.duels) {
    await recordEpreuve({
      subjectStrategyId: strategyId,
      opponentBrandRefId: anchorId.get(duel.anchor) ?? null,
      arena: duel.arena,
      league: LEAGUE,
      result: duel.result,
      proofWeight: 1,
      source: `demo-seed:duel-${duel.arena.toLowerCase()}`,
      occurredAt: NOW,
    });
  }
}

async function main() {
  console.log("→ seed canon (ancres + items)…");
  const canon = await seedScoreurCanon();
  console.log(`  ✓ ${canon.anchors} ancres, ${canon.items} items`);

  const owner = await ensureOwner();
  const results: { name: string; force: number; tier: string; coverage: number; epreuves: number; superfans: number }[] = [];

  for (const brand of BRANDS) {
    const strategyId = await ensureBrand(owner, brand);
    // Purge des épreuves persistées pour un re-run idempotent.
    await db.epreuve.deleteMany({ where: { subjectStrategyId: strategyId } });
    await seedMeasuredSignals(strategyId, brand);
    await seedRegistryEpreuves(strategyId, brand);

    // Reproductibilité : 2 runs sans persistance doivent être identiques.
    const a = await scoreBrand(strategyId, { nowIso: NOW, persist: false });
    const b = await scoreBrand(strategyId, { nowIso: NOW, persist: false });
    const reproducible = JSON.stringify(a.verdict) === JSON.stringify(b.verdict);

    // Run persistant → historisé au leaderboard.
    const scored = await scoreBrand(strategyId, { nowIso: NOW, persist: true });
    const v = scored.verdict;
    console.log(
      `  ✓ ${brand.name} → ${v.tier} · force ${v.force}/200 · couverture ${v.coveragePct}% · ` +
        `superfans ${scored.superfanCount} · épreuves ${scored.epreuveCount} · reproductible=${reproducible}`,
    );
    if (!reproducible) throw new Error(`NON reproductible: ${brand.name}`);
    results.push({
      name: brand.name, force: v.force, tier: v.tier,
      coverage: v.coveragePct, epreuves: scored.epreuveCount, superfans: scored.superfanCount,
    });
  }

  console.log("\n=== LEADERBOARD (audiovisuel × QUARTIER × CM) ===");
  results
    .sort((x, y) => y.force - x.force)
    .forEach((r, i) => console.log(`  ${i + 1}. ${r.name} — ${r.tier} · ${r.force}/200 · couv ${r.coverage}%`));
  console.log("\n✓ démo scoreur OK");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
