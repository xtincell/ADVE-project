import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Singleton PrismaClient — Prisma 7 driver adapter (@prisma/adapter-pg).
 * La connexion passe par le constructeur (jamais d'url dans schema.prisma).
 *
 * LAZY par doctrine : aucun accès DB (ni lecture de DATABASE_URL) au
 * module-load — `next build` doit rester vert SANS DATABASE_URL. Le client
 * n'est instancié qu'au premier appel de `getDb()`, c'est-à-dire au runtime
 * d'une requête. Pattern globalThis dev-safe : le HMR de Next recharge les
 * modules mais pas globalThis → une seule pool pg par process.
 */

const globalForPrisma = globalThis as unknown as { __lafuseePrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL manquant — impossible d'ouvrir la connexion Postgres. " +
        "Définir la variable d'environnement (jamais dans le code).",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function getDb(): PrismaClient {
  if (!globalForPrisma.__lafuseePrisma) {
    globalForPrisma.__lafuseePrisma = createClient();
  }
  return globalForPrisma.__lafuseePrisma;
}
