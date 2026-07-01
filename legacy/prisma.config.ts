/**
 * Prisma config — migration depuis `package.json#prisma` (deprecated en 7).
 * Cf. https://pris.ly/prisma-config
 *
 * Prisma 7 requires `datasource.url` here pour les commandes migrate
 * (status/deploy/dev/reset). Sans ça → "datasource.url property is required".
 *
 * Prisma 7 ne charge PLUS `.env` automatiquement avant l'eval du config TS
 * (contrairement aux versions ≤6). On charge donc explicitement `.env.local`
 * puis `.env` (override en faveur du local pour dev).
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
