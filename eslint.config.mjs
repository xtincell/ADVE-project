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
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["src/**/*.{ts,tsx,js,mjs}"],
    plugins: {
      lafusee,
      boundaries,
      // Registered (but not enforced) so that inline `eslint-disable-next-line`
      // directives referencing these rules don't fail with "Definition not found".
      // Severity is fully governed by `next lint` / project conventions; this
      // governance config keeps them silent.
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
      // Rules of Hooks — ENFORCED. Le job CI « Lint » exécute CE fichier (pas
      // `next lint`), et `react-hooks` n'y était pas enregistré → la classe
      // « hook après un early return » (React #310, crash runtime) passait la
      // CI. Incident 2026-07-12 : /cockpit/operate/newsletter + 6 autres
      // surfaces. On enregistre le plugin et on met rules-of-hooks en error.
      "react-hooks": reactHooks,
    },
    languageOptions: {
      // Phase 11.1 (ADR-0022) — flat config requires explicit TS parser.
      // Without this, ESLint 9 falls back to ESPree which doesn't understand
      // `interface`, type imports, etc. and aborts the pre-commit hook.
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      // Honour pre-existing inline disable directives without forcing the
      // codebase into strict typescript-eslint rules right now (out-of-scope
      // for ADR-0022).
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
      "lafusee/no-vi-mock-toplevel-var": "error",

      // Crash-class : un hook appelé conditionnellement / après un early return
      // casse l'ordre des hooks au rendu suivant (React #310). Error dès j0.
      "react-hooks/rules-of-hooks": "error",

      // Layering — strict downward imports only. Severity is "warn" until
      // end-of-Phase-4, then escalates to "error" via the override above.
      // v6 syntax : `{ from: { type }, allow: { to: { type: [...] } } }`
      // (migration v5→v6 effectuée v6.18.13, cf. CHANGELOG).
      "boundaries/dependencies": [
        "warn",
        {
          default: "disallow",
          rules: [
            { from: { type: "domain" }, disallow: { to: { type: "*" } } },
            { from: { type: "lib" }, allow: { to: { type: ["domain", "lib"] } } },
            { from: { type: "governance" }, allow: { to: { type: ["domain", "lib", "governance"] } } },
            { from: { type: "services" }, allow: { to: { type: ["domain", "lib", "governance", "services"] } } },
            { from: { type: "trpc" }, allow: { to: { type: ["domain", "lib", "governance", "services", "trpc"] } } },
            { from: { type: "neteru-ui" }, allow: { to: { type: ["domain", "lib", "hooks", "neteru-ui"] } } },
            { from: { type: "components" }, allow: { to: { type: ["domain", "lib", "hooks", "components", "neteru-ui"] } } },
            { from: { type: "hooks" }, allow: { to: { type: ["domain", "lib", "hooks"] } } },
            {
              from: { type: "app" },
              allow: { to: { type: ["domain", "lib", "hooks", "components", "neteru-ui", "trpc", "styles", "app"] } },
            },
            { from: { type: "styles" }, disallow: { to: { type: "*" } } },
          ],
        },
      ],
    },
  },
  {
    // Storybook CSF : `render: () => { const [s] = useState() }` déclenche le
    // heuristique de nommage de rules-of-hooks (fonction `render` non-PascalCase)
    // sans être un composant runtime shippé. Hors périmètre de la garde.
    files: ["**/*.stories.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "off" },
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
