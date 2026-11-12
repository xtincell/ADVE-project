import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);

it("starts from a Node-only directory with no application packages except Prisma", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "editorial-cli-distribution-"));
  try {
    const artifact = join(scratch, "calendar.cjs");
    await execute(process.execPath, ["scripts/release/build-editorial-calendar-cli.mjs", artifact], {
      cwd: process.cwd(), timeout: 30_000,
    });
    await mkdir(join(scratch, "node_modules", "@prisma"), { recursive: true });
    for (const name of ["client", "adapter-pg"]) {
      await symlink(await realpath(resolve("node_modules", "@prisma", name)), join(scratch, "node_modules", "@prisma", name), "dir");
    }
    // Permit Prisma's own dependency closure, but reject any runtime dependency
    // requested by the CLI bundle itself other than the two declared packages.
    const guard = join(scratch, "guard.cjs");
    await writeFile(guard, `const M=require('node:module'),p=require('node:path');const old=M._resolveFilename;
M._resolveFilename=function(s,parent,...args){
if(parent?.filename===p.join(__dirname,'calendar.cjs')&&!M.isBuiltin(s)&&!['@prisma/client','@prisma/adapter-pg'].includes(s))throw Error('Undeclared CLI runtime dependency: '+s);
return old.call(this,s,parent,...args)};`);
    const result = await execute(process.execPath, ["--require", guard, artifact], {
      cwd: scratch,
      env: { PATH: process.env.PATH, DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused", NODE_ENV: "test" },
      timeout: 15_000,
    }).catch(error => error as { code: number; stdout: string; stderr: string });
    expect(result).toMatchObject({ code: 1, stdout: "" });
    expect(result.stderr.trim()).toBe("Indiquer le dossier des quatre originaux et l’identifiant exact de la véritable marque SPAWT.");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}, 45_000);
