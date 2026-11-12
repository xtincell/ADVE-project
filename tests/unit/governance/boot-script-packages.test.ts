/**
 * Le script exécuté au démarrage de l'image (`public-brand-migration.cjs`) est
 * bundlé par le Dockerfile avec `--packages=external` : chaque paquet qu'il
 * demande doit exister dans `node_modules` de l'image standalone, sinon le
 * démarrage échoue (smoke-test de build-image, 6.27.570 : `@trpc/server`
 * importé par `ingestion-pipeline/source-usage.ts`).
 *
 * Ce test rejoue le même bundle et compare ses `require` à la liste des paquets
 * présents à l'exécution. Ajouter un paquet ici exige de vérifier qu'il est
 * tracé par Next ou copié explicitement dans l'étape `runner` du Dockerfile.
 */
import { describe, expect, it } from "vitest";
import { build } from "esbuild";
import { builtinModules } from "node:module";

const RUNTIME_PACKAGES = new Set([
  "@prisma/adapter-pg", // tracé par Next (client Prisma de l'application)
  "@prisma/client",
  "sharp", // tracé par Next (images)
  "zod", // copié explicitement dans l'étape runner
]);

const builtin = (name: string) => name.startsWith("node:") || builtinModules.includes(name);
const packageOf = (specifier: string) =>
  specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]!;

// Scripts bundlés par le Dockerfile et lancés dans l'image : celui du démarrage,
// l'inventaire ADVE en lecture seule (4.11.k), lancé à la main en production,
// et le contrôle SLO (1.4), lancé toutes les 6 h par la tâche Coolify `slo-check`.
const IMAGE_SCRIPTS = [
  "scripts/freeze-public-brands.ts",
  "scripts/inventory-adve-strict-shapes.ts",
  "scripts/check-slos.ts",
];

describe("scripts bundlés dans l'image", () => {
  it.each(IMAGE_SCRIPTS)("%s ne demande que des paquets présents dans l'image", async (entry) => {
    const result = await build({
      entryPoints: [entry],
      bundle: true,
      platform: "node",
      packages: "external",
      format: "cjs",
      write: false,
      logLevel: "silent",
    });
    const code = result.outputFiles[0]!.text;
    const required = new Set(
      [...code.matchAll(/require\("([^"]+)"\)/g)].map(m => m[1]!).filter(s => !builtin(s)).map(packageOf),
    );
    const missing = [...required].filter(p => !RUNTIME_PACKAGES.has(p)).sort();
    expect(missing).toEqual([]);
  }, 60_000);
});
