import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    // Integration tests require live API keys — run via `npm run test:llm` only.
    exclude: ["node_modules/**", "tests/integration/**", ".next/**"],
    globals: true,
    // quick-intake LLM-fallback path ~24s without ANTHROPIC_API_KEY in CI.
    // Default 5s timeout caused 4 false-negative timeouts.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Prisma 7 : the driver adapter requires DATABASE_URL at client
    // construction. Tests mock DB queries but the import-time
    // instantiation still needs *some* string. Stub it.
    env: {
      DATABASE_URL: "postgresql://stub:stub@localhost:5432/stub",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
