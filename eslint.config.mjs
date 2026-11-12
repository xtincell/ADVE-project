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

import { fileURLToPath } from "node:url";
import lafusee from "./eslint-plugin-lafusee/index.js";
import layering from "./eslint-plugin-lafusee/boundaries-layering.js";
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
      // Résolution des imports pour eslint-plugin-boundaries. Sans résolveur,
      // `eslint-module-utils` retombait sur `node` (ni `.ts` ni alias `@/*`) :
      // aucun import n'était résolu et la garde de couches était inerte.
      // Le résolveur local lit les alias de tsconfig.json ; `node` reste en
      // second pour les paquets de node_modules.
      "import/resolver": {
        [fileURLToPath(new URL("./eslint-plugin-lafusee/import-resolver.js", import.meta.url))]: {
          project: fileURLToPath(new URL("./tsconfig.json", import.meta.url)),
        },
        node: {},
      },
      // eslint-plugin-boundaries — couches et politiques définies dans
      // eslint-plugin-lafusee/boundaries-layering.js (source unique, partagée
      // avec le verrou de gouvernance).
      "boundaries/elements": layering.LAYER_ELEMENTS,
    },
    rules: {
      "lafusee/no-hardcoded-pillar-enum": "warn",
      "lafusee/no-direct-service-from-router": "warn",
      "lafusee/no-cross-portal-import": "warn",
      "lafusee/no-numbered-duplicates": "error",
      // Invariant d'architecture : un signal externe ne peut pas entrer dans un
      // rapport client sans verdict d'appartenance. `error` d'emblee — la
      // regression que cette regle previent a deja eu lieu trois fois.
      "lafusee/no-ungated-footprint-signal": "error",
      "lafusee/no-adhoc-completion-math": "warn",
      "lafusee/no-vi-mock-toplevel-var": "error",

      // Crash-class : un hook appelé conditionnellement / après un early return
      // casse l'ordre des hooks au rendu suivant (React #310). Error dès j0.
      "react-hooks/rules-of-hooks": "error",

      // Couches — imports strictement descendants vers domain (CLAUDE.md
      // §Conventions). Garde active depuis que le résolveur ci-dessus résout
      // `.ts` et l'alias `@/*` ; auparavant aucune dépendance n'était classée.
      // Sévérité `error` : toute NOUVELLE violation casse le lint (et la CI).
      // Les violations préexistantes sont listées une à une, avec leur motif,
      // dans `eslint-plugin-lafusee/boundaries-allowlist.js` ; cette liste ne
      // peut que décroître (tests/unit/governance/boundaries-layering.test.ts).
      // Syntaxe v7 : `policies` + sélecteurs d'entité `{ element: { type } }`.
      "boundaries/dependencies": ["error", layering.boundariesDependenciesOptions()],
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
