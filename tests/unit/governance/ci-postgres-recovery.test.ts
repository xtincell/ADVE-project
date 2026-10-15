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
  const logPath = join(dir, "docker.argv");
  try {
    // Keep the real shell and its ten readiness probes. The mock uses shell
    // functions so a loaded runner does not spend the outer deadline starting
    // a process for every mock command. NUL framing preserves argv exactly.
    const fixture = join(dir, "mock-commands.sh");
    writeFileSync(fixture, String.raw`
docker() {
printf '%s\0' "$#" "$@" >> "$PG_FIXTURE_LOG"
if [ "$1" = "pull" ]; then
  refused=0
  if [ "$PG_FIXTURE_SCENARIO" = "both-fail" ]; then refused=1; fi
  if [ "$PG_FIXTURE_SCENARIO" = "fallback" ]; then
    case "$2" in public.ecr.aws/*) refused=1 ;; esac
  fi
  if [ "$refused" = "1" ]; then
    printf 'toomanyrequests: Data limit exceeded\n' >&2
    return 1
  fi
fi
if [ "$1" = "exec" ]; then
  if [ "$PG_FIXTURE_SCENARIO" = "unhealthy" ]; then return 1; fi
  if [ "$PG_FIXTURE_SCENARIO" = "delayed" ]; then
    previous=0
    if [ -f "$PG_FIXTURE_LOG.execs" ]; then read -r previous < "$PG_FIXTURE_LOG.execs"; fi
    attempt=$((previous + 1))
    printf '%s\n' "$attempt" > "$PG_FIXTURE_LOG.execs"
    if [ "$attempt" -lt 3 ]; then return 1; fi
  fi
fi
return 0
}
sleep() { return 0; }
`, { mode: 0o600 });
    const result = spawnSync("/bin/bash", ["-c", '. "$1"\n' + startupScript(), "postgres-fixture", fixture], {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        NODE_ENV: "test",
        PATH: `${dir}:${dirname(process.execPath)}:/usr/bin:/bin`,
        PG_FIXTURE_LOG: logPath,
        PG_FIXTURE_SCENARIO: scenario,
      },
    });
    const framed = readFileSync(logPath, "utf8").split("\0");
    expect(framed.pop()).toBe("");
    const calls: string[][] = [];
    for (let cursor = 0; cursor < framed.length;) {
      const count = Number(framed[cursor++]);
      expect(Number.isSafeInteger(count) && count > 0 && cursor + count <= framed.length).toBe(true);
      calls.push(framed.slice(cursor, cursor + count));
      cursor += count;
    }
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
