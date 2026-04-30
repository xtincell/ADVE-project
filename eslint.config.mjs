// ESLint 9 flat config — La Fusée governance rules.
//
// This file is consumed by `npm run lint:governance` (added in package.json).
// It does not replace `next lint` (which keeps its own implicit config); it
// adds the custom rules that enforce REFACTOR-CODE-OF-CONDUCT.md §3 and §4.
//
// Severity policy (Phase 0 → end Phase 3):
//   - no-hardcoded-pillar-enum:    warn  → error end of Phase 1
//   - no-direct-service-from-router: warn → error end of Phase 3
//   - no-cross-portal-import:      warn  → error end of Phase 3
//   - no-numbered-duplicates:      error from day one
//
// The Phase markers above are tracked in REFONTE-PLAN.md.

import lafusee from "./eslint-plugin-lafusee/index.js";
import boundaries from "eslint-plugin-boundaries";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["src/**/*.{ts,tsx,js,mjs}"],
    plugins: { lafusee, boundaries, "@typescript-eslint": tsPlugin },
    languageOptions: {
      // Phase 11.1 (ADR-0014) — flat config requires explicit TS parser.
      // Without this, ESLint 9 falls back to ESPree which doesn't understand
      // `interface`, type imports, etc. and aborts the pre-commit hook.
      // The @typescript-eslint plugin is loaded too so that pre-existing
      // `/* eslint-disable @typescript-eslint/no-explicit-any */` directives
      // in code don't trigger "Definition for rule was not found".
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      // Honour pre-existing inline disable directives without forcing the
      // codebase into strict typescript-eslint rules right now (out-of-scope
      // for ADR-0014).
      reportUnusedDisableDirectives: false,
    },
    settings: {
      // eslint-plugin-boundaries — Phase 4 layering enforcement.
      // Layer order: domain < lib < server/governance < server/services <
      // server/trpc < components/neteru < app/components.
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "governance", pattern: "src/server/governance/**" },
        { type: "services", pattern: "src/server/services/**" },
        { type: "trpc", pattern: "src/server/trpc/**" },
        { type: "neteru-ui", pattern: "src/components/neteru/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "hooks", pattern: "src/hooks/**" },
        { type: "app", pattern: "src/app/**" },
        { type: "styles", pattern: "src/styles/**" },
      ],
    },
    rules: {
      "lafusee/no-hardcoded-pillar-enum": "warn",
      "lafusee/no-direct-service-from-router": "warn",
      "lafusee/no-cross-portal-import": "warn",
      "lafusee/no-numbered-duplicates": "error",
      "lafusee/no-adhoc-completion-math": "warn",

      // Layering — strict downward imports only. Severity is "warn" until
      // end-of-Phase-4, then escalates to "error" via the override above.
      "boundaries/element-types": [
        "warn",
        {
          default: "disallow",
          rules: [
            { from: "domain", allow: [] },
            { from: "lib", allow: ["domain", "lib"] },
            { from: "governance", allow: ["domain", "lib", "governance"] },
            { from: "services", allow: ["domain", "lib", "governance", "services"] },
            { from: "trpc", allow: ["domain", "lib", "governance", "services", "trpc"] },
            { from: "neteru-ui", allow: ["domain", "lib", "hooks", "neteru-ui"] },
            { from: "components", allow: ["domain", "lib", "hooks", "components", "neteru-ui"] },
            { from: "hooks", allow: ["domain", "lib", "hooks"] },
            {
              from: "app",
              allow: [
                "domain",
                "lib",
                "hooks",
                "components",
                "neteru-ui",
                "trpc",
                "styles",
                "app",
              ],
            },
            { from: "styles", allow: [] },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "playwright-report/**",
      "test-results/**",
      "tsconfig.tsbuildinfo",
    ],
  },
];
