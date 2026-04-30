/**
 * Prisma config — migration depuis `package.json#prisma` (deprecated en 7).
 * Cf. https://pris.ly/prisma-config
 */
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
