import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    // Account handover exercises the existing auth and activation against owned PostgreSQL.
    environment: "node", include: ["tests/integration/break-even-document.postgres.test.ts", "tests/integration/oracle-freshness.postgres.test.ts", "tests/integration/scoreur-pipeline.postgres.test.ts", "tests/integration/payment-init-proof.postgres.test.ts", "tests/integration/cinetpay-proof.postgres.test.ts", "tests/integration/intake-admission.postgres.test.ts", "tests/integration/intake-cost-attribution.postgres.test.ts", "tests/integration/intake-account-handover.postgres.test.ts", "tests/integration/intake-report-access.postgres.test.ts", "tests/integration/intake-original.postgres.test.ts", "tests/integration/document-representations.postgres.test.ts", "tests/integration/asset-original.postgres.test.ts", "tests/integration/document-versions.postgres.test.ts", "tests/integration/action-decision-flow.postgres.test.ts", "tests/integration/action-projection-access.postgres.test.ts", "tests/integration/synthesis-write.postgres.test.ts", "tests/integration/synthesis-validation.postgres.test.ts", "tests/integration/emission-seals.postgres.test.ts", "tests/integration/ptah-admission.postgres.test.ts", "tests/integration/public-brand.postgres.test.ts", "tests/integration/brand-vault-lifecycle.postgres.test.ts", "tests/integration/pillar-compensation.postgres.test.ts", "tests/integration/guidelines-identity.postgres.test.ts", "tests/integration/change-requests.postgres.test.ts", "tests/integration/feedback-drift.postgres.test.ts", "tests/integration/portfolio-references.postgres.test.ts", "tests/integration/portfolio-write-history.postgres.test.ts", "tests/integration/intervention-lifecycle.postgres.test.ts", "tests/integration/mission-visibility.postgres.test.ts", "tests/integration/catalogue-identity.postgres.test.ts", "tests/integration/amend-source.postgres.test.ts", "tests/integration/external-metric-receipt.postgres.test.ts"],
    // Files share one owned database and some assertions count whole tables.
    // Keep interleaved operations inside each test, not between unrelated suites.
    fileParallelism: false,
    testTimeout: 30_000, hookTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
