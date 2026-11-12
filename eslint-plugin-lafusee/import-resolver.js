"use strict";

/**
 * Résolveur d'imports pour la garde de couches `boundaries/dependencies`.
 *
 * eslint-plugin-boundaries ne classe une dépendance que si `eslint-module-utils`
 * sait résoudre l'import vers un fichier. Sans `import/resolver`, il emploie le
 * résolveur `node` par défaut, qui ne connaît ni les extensions `.ts`/`.tsx` ni
 * l'alias `@/*` de tsconfig.json : aucun import du dépôt n'était résolu, et la
 * règle de couches ne signalait rien (constat du lot 556, RESIDUAL-DEBT).
 *
 * Ce module implémente l'interface v2 des résolveurs `import/resolver`
 * (`interfaceVersion` + `resolve(source, file, config)`), sans dépendance :
 *   - chemins relatifs (`./x`, `../x`) et absolus ;
 *   - alias déclarés dans `compilerOptions.paths` du tsconfig (motif `p/*`) ;
 *   - extensions TypeScript, fichiers `index.*`, et `./x.js` écrit pour `./x.ts`
 *     (`moduleResolution: bundler`).
 * Les spécifiants nus (`react`, `next/link`, `@prisma/client`) ne sont pas
 * traités ici : `found: false` laisse le résolveur suivant de la chaîne
 * (`node`) les résoudre comme aujourd'hui.
 *
 * Un tsconfig illisible lève une erreur : eslint-module-utils la rapporte comme
 * « Resolve error » dans le lint, au lieu de rendre la garde muette.
 */

const fs = require("node:fs");
const path = require("node:path");

const EXTENSIONS = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const JS_TO_TS = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
};

/** @type {Map<string, { baseDir: string, aliases: Array<{ prefix: string, targets: string[] }> }>} */
const projectCache = new Map();

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Lit `compilerOptions.paths` et `baseUrl` du tsconfig. Seuls les motifs à une
 * étoile finale (`@/*` → `./src/*`) sont pris en charge ; tout autre motif lève
 * une erreur explicite plutôt que d'être ignoré.
 */
function loadProject(projectPath) {
  const cached = projectCache.get(projectPath);
  if (cached) return cached;

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(projectPath, "utf8"));
  } catch (err) {
    throw new Error(
      `lafusee import-resolver : tsconfig illisible (${projectPath}) — ${err && err.message ? err.message : err}`,
    );
  }
  const options = (parsed && parsed.compilerOptions) || {};
  const projectDir = path.dirname(projectPath);
  const baseDir = path.resolve(projectDir, options.baseUrl || ".");
  const aliases = [];
  for (const [pattern, targets] of Object.entries(options.paths || {})) {
    if (!pattern.endsWith("/*") || pattern.indexOf("*") !== pattern.length - 1) {
      throw new Error(`lafusee import-resolver : motif paths non pris en charge « ${pattern} »`);
    }
    aliases.push({
      prefix: pattern.slice(0, -1),
      targets: targets.map((target) => {
        if (!target.endsWith("/*") || target.indexOf("*") !== target.length - 1) {
          throw new Error(`lafusee import-resolver : cible paths non prise en charge « ${target} »`);
        }
        return path.resolve(baseDir, target.slice(0, -1));
      }),
    });
  }
  // Le préfixe le plus long l'emporte, comme dans TypeScript.
  aliases.sort((a, b) => b.prefix.length - a.prefix.length);
  const project = { baseDir, aliases };
  projectCache.set(projectPath, project);
  return project;
}

/** Résout un chemin de base vers un fichier existant, ou `null`. */
function resolveFile(base) {
  if (isFile(base)) return base;
  for (const ext of EXTENSIONS) {
    if (isFile(base + ext)) return base + ext;
  }
  const ext = path.extname(base);
  if (JS_TO_TS[ext]) {
    const stem = base.slice(0, -ext.length);
    for (const tsExt of JS_TO_TS[ext]) {
      if (isFile(stem + tsExt)) return stem + tsExt;
    }
  }
  if (isDirectory(base)) {
    for (const indexExt of EXTENSIONS) {
      const candidate = path.join(base, `index${indexExt}`);
      if (isFile(candidate)) return candidate;
    }
  }
  return null;
}

/** Candidats de chemin pour un spécifiant, avant extensions. */
function candidates(source, file, project) {
  if (source.startsWith("./") || source.startsWith("../") || source === "." || source === "..") {
    return [path.resolve(path.dirname(file), source)];
  }
  if (path.isAbsolute(source)) return [source];
  if (project) {
    for (const alias of project.aliases) {
      if (source.startsWith(alias.prefix)) {
        const rest = source.slice(alias.prefix.length);
        return alias.targets.map((target) => path.join(target, rest));
      }
    }
  }
  return [];
}

exports.interfaceVersion = 2;

/**
 * @param {string} source spécifiant de l'import
 * @param {string} file fichier qui importe (chemin absolu)
 * @param {{ project?: string }} [config] `project` : chemin absolu du tsconfig
 */
exports.resolve = function resolve(source, file, config) {
  const project = config && config.project ? loadProject(config.project) : null;
  // `./icone.svg?url` → `./icone.svg`
  const cleanSource = source.split("?")[0].split("#")[0];
  for (const base of candidates(cleanSource, file, project)) {
    const resolved = resolveFile(base);
    if (resolved) return { found: true, path: resolved };
  }
  return { found: false };
};
