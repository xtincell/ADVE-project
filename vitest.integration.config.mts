import { defineConfig } from "vitest/config";
import path from "path";

// Config pour les tests d'intégration en SITUATION RÉELLE (DB live + réseau).
// Les appels LLM sont stubbés DANS le test (vi.mock) → aucune clé API requise.
//   DATABASE_URL=postgresql://user:pass@host:5432/db \
//   npx vitest run --config vitest.integration.config.mts
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 200_000,
    hookTimeout: 200_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://stub:stub@localhost:5432/stub",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "integration-stub-secret",
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
