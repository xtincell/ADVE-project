/**
 * Runner autonome du seed Motion19 (marque de test opérateur, ADR-0128).
 * Usage : `npm run db:seed:motion19` (DATABASE_URL requis — .env.local chargé).
 * Prérequis : l'opérateur "upgraders" + un user ADMIN seedés (npm run db:seed).
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedMotion19, seedMotion19BrandVault, seedMotion19Guild } from "./seed-motion19";

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const prisma = makeClient();

seedMotion19(prisma)
  .then(() => seedMotion19BrandVault(prisma))
  .then(() => seedMotion19Guild(prisma))
  .then(async () => {
    await prisma.$disconnect();
    console.log("[seed-motion19] Terminé (marque + guilde + Maximus).");
  })
  .catch(async (e) => {
    console.error("[seed-motion19] Échec :", e);
    await prisma.$disconnect();
    process.exit(1);
  });
