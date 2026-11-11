import { defineConfig } from "vitest/config";
import path from "node:path";
// The social-sync cron reads every due publication in the database, so this
// receipt requires an empty dedicated database (shinkiro_social_receipt_*).
export default defineConfig({
  test: {
    environment: "node", include: ["tests/integration/social-publication-receipt.postgres.test.ts"],
    fileParallelism: false, testTimeout: 30_000, hookTimeout: 30_000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
