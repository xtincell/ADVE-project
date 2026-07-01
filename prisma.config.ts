/**
 * Prisma 7 exige `datasource.url` ici pour db push / migrate (le schéma n'a
 * plus d'url — driver adapter côté runtime). Prisma 7 ne charge pas .env
 * automatiquement : en dev, exporter DATABASE_URL ou utiliser un .env chargé
 * par le shell ; en prod (Docker) l'env est déjà posée.
 */
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    seed: "node prisma/seed.mjs",
  },
});
