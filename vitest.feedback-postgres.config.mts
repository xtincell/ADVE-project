import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    environment: "node", include: ["tests/integration/ptah-admission.postgres.test.ts", "tests/integration/public-brand.postgres.test.ts", "tests/integration/brand-vault-lifecycle.postgres.test.ts", "tests/integration/pillar-compensation.postgres.test.ts", "tests/integration/guidelines-identity.postgres.test.ts", "tests/integration/change-requests.postgres.test.ts", "tests/integration/feedback-drift.postgres.test.ts", "tests/integration/portfolio-references.postgres.test.ts", "tests/integration/portfolio-write-history.postgres.test.ts", "tests/integration/intervention-lifecycle.postgres.test.ts", "tests/integration/mission-visibility.postgres.test.ts", "tests/integration/catalogue-identity.postgres.test.ts", "tests/integration/amend-source.postgres.test.ts"],
    testTimeout: 30_000, hookTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
