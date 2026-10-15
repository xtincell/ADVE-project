import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(join(__dirname, "../../../.github/workflows/ci.yml"), "utf8");
const job = workflow.split("  feedback-postgres:\n")[1]!.split("\n  prisma-validate:")[0]!;
const digest = "sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d";
const primary = `public.ecr.aws/docker/library/postgres:16@${digest}`;
const fallback = `docker.io/library/postgres:16@${digest}`;

// Extract this existing literal shell block, not a second implementation of it.
function startupScript(): string {
  const block = job.split("      - name: Start pinned PostgreSQL (official registry fallback)\n")[1];
  expect(block, "Registry recovery must run inside a step, after job initialization").toBeDefined();
  const script = block!.split("        run: |\n")[1]!.split("\n      - ")[0]!;
  return script.split("\n").map((line) => line.slice(10)).join("\n");
}

type Scenario = "primary" | "fallback" | "both-fail" | "unhealthy" | "delayed";

function exercise(scenario: Scenario) {
  const dir = mkdtempSync(join(tmpdir(), "shinkiro-ci-postgres-"));
  const logPath = join(dir, "docker.jsonl");
  try {
    writeFileSync(join(dir, "docker"), `#!${process.execPath}\n` + String.raw`
const fs = require("node:fs");
const args = process.argv.slice(2);
const log = process.env.PG_FIXTURE_LOG;
const previous = fs.existsSync(log)
  ? fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse)
  : [];
fs.appendFileSync(log, JSON.stringify(args) + "\n");
const scenario = process.env.PG_FIXTURE_SCENARIO;
if (args[0] === "pull") {
  const refused = scenario === "both-fail" ||
    (scenario === "fallback" && args[1].startsWith("public.ecr.aws/"));
  if (refused) {
    process.stderr.write("toomanyrequests: Data limit exceeded\n");
    process.exit(1);
  }
}
if (args[0] === "exec" && (scenario === "unhealthy" ||
  (scenario === "delayed" && previous.filter((entry) => entry[0] === "exec").length < 2))) {
  process.exit(1);
}
`, { mode: 0o700 });
    writeFileSync(join(dir, "sleep"), "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    const result = spawnSync("/bin/bash", ["-c", startupScript()], {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        NODE_ENV: "test",
        PATH: `${dir}:${dirname(process.execPath)}:/usr/bin:/bin`,
        PG_FIXTURE_LOG: logPath,
        PG_FIXTURE_SCENARIO: scenario,
      },
    });
    const calls: string[][] = readFileSync(logPath, "utf8").trim().split("\n")
      .map((line) => JSON.parse(line) as string[]);
    return { ...result, calls };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("PostgreSQL CI — execute the existing shell without Docker or a network", () => {
  it("uses the pinned primary registry when available", () => {
    const result = exercise("primary");
    expect(result.status).toBe(0);
    expect(result.calls.filter((call) => call[0] === "pull")).toEqual([["pull", primary]]);
    const run = result.calls.find((call) => call[0] === "run")!;
    expect(run).toContain(primary);
    expect(run).toContain("127.0.0.1:5432:5432");
    expect(run).toContain("POSTGRES_DB=shinkiro_verify");
    expect(run).toContain("pg_isready -U postgres -d shinkiro_verify");
  });

  it("recovers the observed ECR quota using the identical official image", () => {
    const result = exercise("fallback");
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("toomanyrequests: Data limit exceeded");
    expect(result.calls.filter((call) => call[0] === "pull")).toEqual([
      ["pull", primary], ["pull", fallback],
    ]);
    expect(result.calls.find((call) => call[0] === "run")).toContain(fallback);
  });

  it("refuses to start when both registries fail", () => {
    const result = exercise("both-fail");
    expect(result.status).not.toBe(0);
    expect(result.calls.filter((call) => call[0] === "pull")).toHaveLength(2);
    expect(result.calls.some((call) => call[0] === "run")).toBe(false);
  });

  it("waits for database readiness before migrations can run", () => {
    const result = exercise("delayed");
    expect(result.status).toBe(0);
    expect(result.calls.filter((call) => call[0] === "exec")).toHaveLength(3);
  });

  it("fails with logs after the bounded readiness window", () => {
    const result = exercise("unhealthy");
    expect(result.status).not.toBe(0);
    expect(result.calls.filter((call) => call[0] === "exec")).toHaveLength(10);
    expect(result.calls.at(-1)).toEqual(["logs", "shinkiro-ci-postgres"]);
  });

  it("retains the actual migrations, schema comparison and PostgreSQL tests", () => {
    expect(job).not.toMatch(/^    services:/m);
    expect(job).toContain("npx prisma migrate deploy");
    expect(job).toContain("--from-config-datasource");
    expect(job).toContain("--to-schema prisma/schema.prisma");
    expect(job).toContain("--exit-code");
    expect(job).toContain("npx vitest run --config vitest.feedback-postgres.config.mts");
    expect(job).toMatch(/name: Remove the isolated PostgreSQL container\n        if: always\(\)/);
    expect(job).toContain("docker rm --force shinkiro-ci-postgres");
  });
});
