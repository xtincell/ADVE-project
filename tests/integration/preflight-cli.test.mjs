// Exercise the actual Bash CLI on disposable projects. tsc, ESLint and Vitest
// run for real; database, build, browser and network commands are local fixtures.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const bash = process.env.PREFLIGHT_TEST_BASH ?? (process.platform === "win32"
  ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash");
const shellQuote = value => `'${value.replaceAll("'", "'\\''")}'`;

function runCase({ failure = "", envFile, localFile, processValue, expectedValue, mode = "--quick" } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "lafusee-preflight-"));
  const put = (name, content) => {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  };
  try {
    put("package.json", '{"type":"module"}');
    put(".nvmrc", "22\n");
    put(".gitignore", ".env\nnode_modules\n.next\n.prisma\n");
    put("prisma/schema.prisma", "// database validation is a local fixture\n");
    put("node_modules/.prisma/client/index.js", "// generated-client fixture\n");
    for (const module of ["dotenv", "vitest"]) {
      symlinkSync(path.join(root, "node_modules", module), path.join(dir, "node_modules", module), "junction");
    }
    put("tsconfig.json", JSON.stringify({ compilerOptions: { noEmit: true, types: [], skipLibCheck: true }, include: ["src/check.ts"] }));
    put("src/check.ts", failure === "tsc" ? "const count: number = 'wrong';\n" : "const count: number = 1;\n");
    put("src/check.js", failure === "eslint" ? "undeclared();\n" : "const count = 1;\n");
    put("eslint.config.mjs", "export default [{ignores:['**/*.ts']},{files:['**/*.js'], rules:{'no-undef':'error'}}];\n");
    put("next.config.ts", "export default {};\n");
    put("vitest.config.ts", "export default {test:{include:['sample.test.js'], maxWorkers:1}};\n");
    put("sample.test.js", `import {test,expect} from 'vitest'; test('fixture',()=>expect(1).toBe(${failure === "vitest" ? 2 : 1}));\n`);
    put("scripts/preflight-analyzer.ts", "// analyzer transport fixture\n");
    if (envFile !== undefined) put(".env", `DATABASE_URL=${envFile}\n`);
    if (localFile !== undefined) put(".env.local", `DATABASE_URL=${localFile}\n`);
    copyFileSync(path.join(root, "scripts/preflight.sh"), path.join(dir, "scripts/preflight.sh"));
    put("tool-fixture.cjs", `
      const {spawnSync} = require('node:child_process');
      const path = require('node:path');
      const args = process.argv.slice(2);
      const tool = args.shift();
      const failure = process.env.PREFLIGHT_CASE;
      const binaries = {
        tsc: 'typescript/bin/tsc', eslint: 'eslint/bin/eslint.js', vitest: 'vitest/vitest.mjs'
      };
      if (binaries[tool]) {
        if (failure === tool + '-startup') { console.log('Cannot initialize command'); process.exit(2); }
        const result = spawnSync(process.execPath, [path.join(${JSON.stringify(root)}, 'node_modules', binaries[tool]), ...args], {stdio:'inherit'});
        process.exit(result.status ?? 1);
      }
      if (tool === 'prisma') {
        if (process.env.PREFLIGHT_EXPECTED_DB && process.env.DATABASE_URL !== process.env.PREFLIGHT_EXPECTED_DB) {
          console.log('Environment precedence failed'); process.exit(1);
        }
        console.log('Schema is valid'); process.exit(0);
      }
      if (tool === 'tsx') {
        if (failure === 'analyzer') { console.log('Cannot initialize analyzer'); process.exit(2); }
        console.log('pass|Analyzer fixture|No findings'); process.exit(0);
      }
      if (tool === 'next') {
        console.log('Compiled successfully');
        process.exit(failure === 'build' ? 1 : 0);
      }
      if (tool === 'playwright') {
        if (args[0] === '--version') {console.log('Playwright fixture'); process.exit(0);}
        if (failure === 'playwright') {console.log('Cannot launch browser'); process.exit(1);}
        console.log(JSON.stringify({stats:{expected:1,unexpected:0}})); process.exit(0);
      }
      if (tool === 'audit') {
        if (failure === 'audit') {console.log(JSON.stringify({error:{code:'NETWORK_UNAVAILABLE'}})); process.exit(1);}
        console.log(JSON.stringify({metadata:{vulnerabilities:{high:0,critical:0}}})); process.exit(0);
      }
      process.exit(99);
    `);
    for (const command of ["npx", "npm"]) {
      put(`bin/${command}`, '#!/usr/bin/env bash\nexec node "$PREFLIGHT_FIXTURE_TOOL" "$@"\n');
    }
    put("playwright.config.ts", "export default {};\n");
    const env = { ...process.env, PREFLIGHT_CASE: failure, PREFLIGHT_EXPECTED_DB: expectedValue ?? "",
      PREFLIGHT_FIXTURE_TOOL: path.join(dir, "tool-fixture.cjs") };
    delete env.DATABASE_URL;
    delete env.PREFLIGHT_ENV_LOADED;
    if (processValue !== undefined) env.DATABASE_URL = processValue;
    const command = `export PATH="$PWD/bin:$PATH"; chmod +x bin/npx bin/npm; bash scripts/preflight.sh ${shellQuote(mode)}`;
    const result = spawnSync(bash, ["-c", command], { cwd: dir, env, encoding: "utf8", timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    assert.equal(result.error, undefined, output);
    const reportFile = readdirSync(dir).find(name => name.startsWith("preflight-report-") && name.endsWith(".md"));
    assert.ok(reportFile, output);
    return { status: result.status, output, report: readFileSync(path.join(dir, reportFile), "utf8") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("process environment works without any env file and green JSON tests stay green", () => {
  const result = runCase({ processValue: "process-fixture", expectedValue: "process-fixture" });
  assert.equal(result.status, 0, result.output);
  assert.match(result.report, /\[pass\] Vitest: 1\/1 tests OK/);
  assert.doesNotMatch(result.output + result.report, /process-fixture/);
});

test(".env.local takes precedence over .env and never replaces a process variable", () => {
  for (const processValue of [undefined, "process-fixture"]) {
    const result = runCase({ envFile: "env-fixture", localFile: "local-fixture", processValue,
      expectedValue: processValue ?? "local-fixture" });
    assert.equal(result.status, 0, result.output);
    assert.doesNotMatch(result.output + result.report, /(?:env|local|process)-fixture/);
  }
});

test(".env alone works; absent required configuration fails without demanding optional keys", () => {
  const configured = runCase({ envFile: "env-fixture", expectedValue: "env-fixture" });
  assert.equal(configured.status, 0, configured.output);
  const missing = runCase();
  assert.equal(missing.status, 1, missing.output);
  assert.match(missing.report, /\[fail\] Environnement Prisma: DATABASE_URL absente/);
});

for (const [failure, label] of [["tsc", "TypeScript compilation"], ["eslint", "ESLint"], ["vitest", "Vitest"],
  ["tsc-startup", "TypeScript compilation"], ["eslint-startup", "ESLint"], ["vitest-startup", "Vitest"],
  ["analyzer", "Deep analyzer"], ["audit", "npm audit"]]) {
  test(`${failure} failure reaches the report and exit status`, () => {
    const result = runCase({ failure, processValue: "process-fixture" });
    assert.equal(result.status, 1, result.output);
    assert.ok(result.report.includes(`[fail] ${label}:`), result.report);
  });
}

test("build success text followed by an error remains failed; E2E is not run", () => {
  const result = runCase({ failure: "build", processValue: "process-fixture", mode: "--full" });
  assert.equal(result.status, 1, result.output);
  assert.match(result.report, /\[fail\] next build:/);
  assert.match(result.report, /\[skip\] Playwright E2E: Build échoué/);
});

test("a browser launch failure without JSON stats remains failed", () => {
  const result = runCase({ failure: "playwright", processValue: "process-fixture", mode: "--full" });
  assert.equal(result.status, 1, result.output);
  assert.match(result.report, /\[fail\] Playwright E2E:/);
});
