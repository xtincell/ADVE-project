"use strict";

/**
 * Modèle de couches appliqué par `boundaries/dependencies` (eslint.config.mjs).
 *
 * Source unique pour la configuration ESLint ET pour le verrou
 * `tests/unit/governance/boundaries-layering.test.ts` : le test reconstruit les
 * options sans liste d'exceptions pour vérifier que chaque exception correspond
 * encore à une violation réelle.
 *
 * Cascade (CLAUDE.md §Conventions) : domain → lib → server/governance →
 * server/services → server/trpc → components/neteru → app ; un fichier
 * n'importe que vers le bas. Les dix politiques ci-dessous sont celles de la
 * configuration d'origine (Phase 4), réécrites en syntaxe v7 sans changer
 * leur portée. Les dépendances internes à une couche ne sont pas contrôlées.
 */

const ALLOWLIST = require("./boundaries-allowlist");

/** Ordre significatif : le premier motif qui correspond donne la couche. */
const LAYER_ELEMENTS = [
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
];

const el = (type) => ({ element: { type } });

const BASE_POLICIES = [
  { from: el("domain"), disallow: { to: el("*") } },
  { from: el("lib"), allow: { to: el(["domain", "lib"]) } },
  { from: el("governance"), allow: { to: el(["domain", "lib", "governance"]) } },
  { from: el("services"), allow: { to: el(["domain", "lib", "governance", "services"]) } },
  { from: el("trpc"), allow: { to: el(["domain", "lib", "governance", "services", "trpc"]) } },
  { from: el("neteru-ui"), allow: { to: el(["domain", "lib", "hooks", "neteru-ui"]) } },
  { from: el("components"), allow: { to: el(["domain", "lib", "hooks", "components", "neteru-ui"]) } },
  { from: el("hooks"), allow: { to: el(["domain", "lib", "hooks"]) } },
  {
    from: el("app"),
    allow: { to: el(["domain", "lib", "hooks", "components", "neteru-ui", "trpc", "styles", "app"]) },
  },
  { from: el("styles"), disallow: { to: el("*") } },
];

/** Couche d'un chemin relatif à la racine du dépôt (`src/...`), ou `null`. */
function layerOf(file) {
  for (const { type, pattern } of LAYER_ELEMENTS) {
    const prefix = pattern.replace(/\*\*$/, "");
    if (file.startsWith(prefix)) return type;
  }
  return null;
}

/**
 * Échappe un chemin pour qu'il soit lu littéralement par micromatch : les
 * routes Next.js contiennent `(groupe)`, `[param]` et `[[...slug]]`.
 */
function literalGlob(file) {
  return file.replace(/[\\*?[\](){}!+@|^$]/g, (c) => `\\${c}`);
}

/**
 * Une politique `allow` par couple (couche source, couche cible), limitée aux
 * fichiers listés : une exception n'ouvre que l'arête déjà existante de ce
 * fichier, jamais une autre couche ni un autre fichier.
 */
function allowlistPolicies(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const from = layerOf(entry.file);
    if (!from) throw new Error(`boundaries-allowlist : ${entry.file} n'appartient à aucune couche`);
    const key = `${from}→${entry.to}`;
    if (!groups.has(key)) groups.set(key, { from, to: entry.to, files: [] });
    groups.get(key).files.push(literalGlob(entry.file));
  }
  return [...groups.values()].map(({ from, to, files }) => ({
    // Sélecteur de fichier v7 : `file.path` est relatif à la racine du dépôt.
    from: { element: { type: from }, file: { path: files } },
    allow: { to: el(to) },
  }));
}

/**
 * Options de `boundaries/dependencies`.
 * @param {{ allowlist?: boolean }} [opts] `allowlist: false` → politiques de
 *   base seules (utilisé par le verrou pour mesurer les violations réelles).
 */
function boundariesDependenciesOptions(opts = {}) {
  const withAllowlist = opts.allowlist !== false;
  return {
    default: "disallow",
    policies: withAllowlist
      ? [...BASE_POLICIES, ...allowlistPolicies(ALLOWLIST.ENTRIES)]
      : [...BASE_POLICIES],
  };
}

module.exports = {
  LAYER_ELEMENTS,
  BASE_POLICIES,
  layerOf,
  literalGlob,
  boundariesDependenciesOptions,
};
