/** Bundle maintenance code independently from Next's standalone dependency trace.
 * Prisma and its driver are the only runtime packages, already shipped by Docker.
 * This build never reads a source bundle, database, private environment or asset. */
import { build } from "esbuild";
import { resolve } from "node:path";

const external = ["@prisma/client", "@prisma/adapter-pg"];
const outfile = resolve(process.argv[2] ?? "import-editorial-calendar.cjs");
await build({
  entryPoints: ["scripts/release/import-spawt-editorial-october.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external,
  outfile,
  logLevel: "warning",
});
console.log(JSON.stringify({ artifact: outfile, runtimePackages: external }));
