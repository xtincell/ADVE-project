/**
 * Migration idempotente des `Strategy.publicSlug` vers le format canonique
 * `LFA-<brandshortname>` (src/domain/brand-slug.ts). Mandat go-live opérateur.
 *
 * - Ne touche QUE les strategies avec un `publicSlug` non nul et non canonique.
 * - Nouveau slug = `brandPublicSlug(ancienSlug)` (« motion19 » → « LFA-motion19 »).
 * - Collision-safe : si la cible est déjà prise par une AUTRE strategy, on suffixe
 *   un fragment d'id (déterministe pour une même row).
 * - Idempotent : relancer ne fait rien de plus (les slugs déjà `LFA-…` sont sautés).
 *
 * Les `Mission.publicSlug` (La Guilde) ne sont PAS concernés (format libre lisible).
 *
 * Usage : `npm run db:migrate:brand-slugs` (contre la DATABASE_URL courante).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { brandPublicSlug, isBrandPublicSlug } from "../src/domain/brand-slug";

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function main(): Promise<void> {
  const db = makeClient();
  const rows = await db.strategy.findMany({
    where: { publicSlug: { not: null } },
    select: { id: true, name: true, publicSlug: true },
  });

  const taken = new Set(rows.map((r) => r.publicSlug!).filter(isBrandPublicSlug));
  let changed = 0;

  for (const r of rows) {
    const current = r.publicSlug!;
    if (isBrandPublicSlug(current)) continue; // déjà canonique

    let next: string;
    try {
      next = brandPublicSlug(current);
    } catch {
      next = brandPublicSlug(r.name || r.id);
    }
    // Collision avec une autre row → suffixe déterministe.
    if (taken.has(next)) {
      const owner = rows.find((x) => x.publicSlug === next);
      if (!owner || owner.id !== r.id) next = `${next}-${r.id.slice(0, 6)}`;
    }

    await db.strategy.update({ where: { id: r.id }, data: { publicSlug: next } });
    taken.add(next);
    changed += 1;
    console.log(`  ${current} → ${next}  (${r.name})`);
  }

  console.log(`\n[OK] ${changed} slug(s) migré(s) vers le format LFA- · ${rows.length} row(s) inspectée(s)`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error("[migrate-brand-slugs] échec:", e);
  process.exit(1);
});
