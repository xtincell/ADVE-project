/**
 * Onboarding minimal d'une marque externe (non-cliente) → une Strategy shell
 * scorable. Ferme la friction « une marque doit être une Strategy pour atteindre
 * le leaderboard » (le scoreur ne score pas encore un pur BrandRef). Réutilise le
 * modèle « Shell Strategy auto » (ADR-0098). Secteur canonicalisé à l'écriture.
 *
 *   npx tsx scripts/onboard-external-brand.ts "<nom>" "<secteur libre|code>" <pays>
 *
 * Idempotent : réutilise Client+Strategy si déjà présents sous UPgraders.
 * Imprime le strategyId (à passer à run-moulinette.ts). Zéro LLM.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { classifyCanonicalSector } from "@/domain/sector-taxonomy";

async function main() {
  const [name, sectorRaw, country] = process.argv.slice(2);
  if (!name) {
    console.error('usage: onboard-external-brand.ts "<nom>" "<secteur>" <pays>');
    process.exit(1);
  }
  const sector = sectorRaw ? classifyCanonicalSector(sectorRaw).code : null;
  const countryCode = country?.trim().slice(0, 2).toUpperCase() || null;

  const operator = await db.operator.findUnique({ where: { slug: "upgraders" }, select: { id: true } });
  if (!operator) throw new Error("Operator 'upgraders' absent — lance `npm run db:seed` d'abord.");
  const owner = await db.user.findFirst({ where: { operatorId: operator.id }, select: { id: true } });
  if (!owner) throw new Error("Aucun user sous 'upgraders' — seed users d'abord.");

  let client = await db.client.findFirst({ where: { operatorId: operator.id, name }, select: { id: true } });
  if (!client) {
    client = await db.client.create({
      data: { name, operatorId: operator.id, sector },
      select: { id: true },
    });
    console.log(`  ✓ Client créé : ${name} (secteur canon=${sector ?? "—"})`);
  } else {
    await db.client.update({ where: { id: client.id }, data: { sector } });
    console.log(`  ✓ Client réutilisé : ${name} (secteur canon=${sector ?? "—"})`);
  }

  let strategy = await db.strategy.findFirst({ where: { clientId: client.id }, select: { id: true } });
  if (!strategy) {
    strategy = await db.strategy.create({
      data: {
        name,
        userId: owner.id,
        operatorId: operator.id,
        clientId: client.id,
        status: "ACTIVE",
        countryCode,
        businessContext: { origin: "EXTERNAL_ONBOARD", sector } as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    console.log(`  ✓ Strategy shell créée`);
  } else {
    await db.strategy.update({ where: { id: strategy.id }, data: { countryCode } });
    console.log(`  ✓ Strategy réutilisée`);
  }

  console.log(`\nstrategyId=${strategy.id}`);
  console.log(`→ npx tsx scripts/run-moulinette.ts ${strategy.id} <SCALE> [audience]`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
