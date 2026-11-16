import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChangelogPage from "@/app/(public)/changelog/page";

let fixture: string;
const ROOT = join(__dirname, "../../..");
const workflow = readFileSync(join(ROOT, ".github/workflows/build-image.yml"), "utf8");
const generatorStep = workflow.match(/- name: Snapshot du journal public\r?\n\s+run: node (scripts\/[^\s]+\.mjs)/);
const gitIn = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" });
const commit = (cwd: string, summary: string) => gitIn(cwd, "-c", "user.name=Local fixture", "-c", "user.email=fixture@example.test",
  "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", summary);
beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), "lafusee-changelog-")); });
afterEach(() => { vi.restoreAllMocks(); rmSync(fixture, { recursive: true, force: true }); });

describe("public changelog reads git without shell parsing", () => {
  it("renders real commits in reverse order, retaining dates, scopes and literal pipes", async () => {
    const git = (...args: string[]) => execFileSync("git", args, { cwd: fixture, encoding: "utf8", stdio: "pipe" });
    git("init");
    for (const summary of ["feat(email): Expéditeur confirmé", "fix(payments): Reçu | montant & devise"]) {
      git("-c", "user.name=Local fixture", "-c", "user.email=fixture@example.test", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", summary);
    }
    const date = git("log", "-1", "--format=%ad", "--date=short").trim();
    const hash = git("rev-parse", "--short", "HEAD").trim();
    vi.spyOn(process, "cwd").mockReturnValue(fixture);
    const html = renderToStaticMarkup(await ChangelogPage());
    expect(html).toContain("Expéditeur confirmé");
    expect(html).toContain("Reçu | montant &amp; devise");
    expect(html).toContain("payments");
    expect(html).toContain(date);
    expect(html).toContain(hash);
    expect(html.indexOf("Reçu |")).toBeLessThan(html.indexOf("Expéditeur confirmé"));
    expect(html).not.toContain("Aucune entrée disponible");
  });
  it("keeps the generated JSON fallback when the source checkout is unavailable", async () => {
    mkdirSync(join(fixture, "public"));
    writeFileSync(join(fixture, "public", "changelog.json"), JSON.stringify([
      { hash: "abc123", date: "2026-11-16", type: "fix", scope: "email", summary: "Entrée préconstruite" },
    ]));
    vi.spyOn(process, "cwd").mockReturnValue(fixture);
    const html = renderToStaticMarkup(await ChangelogPage());
    expect(html).toContain("Entrée préconstruite");
    expect(html).toContain("2026-11-16");
  });
  it("generates the image snapshot from the shallow checkout and renders it without Git", async () => {
    expect(generatorStep, "snapshot must run immediately after checkout and before building").not.toBeNull();
    const checkoutIndex = workflow.indexOf("uses: actions/checkout@");
    const snapshotIndex = generatorStep!.index!;
    expect(snapshotIndex).toBeGreaterThan(checkoutIndex);
    expect(workflow.slice(checkoutIndex, snapshotIndex)).not.toMatch(/fetch-depth|\n\s+- (?:name|uses):/);
    expect(snapshotIndex).toBeLessThan(workflow.indexOf("uses: docker/build-push-action@"));

    const source = join(fixture, "source");
    const checkout = join(fixture, "checkout");
    const runtime = join(fixture, "runtime");
    mkdirSync(source); mkdirSync(join(runtime, "public"), { recursive: true });
    gitIn(source, "init");
    commit(source, "feat(email): Ancienne évolution hors checkout");
    commit(source, "fix(payments): Reçu | montant & devise");
    gitIn(fixture, "clone", "--depth=1", pathToFileURL(source).href, checkout);
    expect(gitIn(checkout, "rev-list", "--count", "HEAD").trim()).toBe("1");
    const hash = gitIn(checkout, "rev-parse", "--short", "HEAD").trim();
    const date = gitIn(checkout, "log", "-1", "--format=%ad", "--date=short").trim();
    execFileSync(process.execPath, [join(ROOT, generatorStep![1]!)], { cwd: checkout, stdio: "pipe" });
    const snapshot = join(checkout, "public", "changelog.json");
    expect(JSON.parse(readFileSync(snapshot, "utf8"))).toEqual([
      { hash, date, type: "fix", scope: "payments", summary: "Reçu | montant & devise" },
    ]);
    copyFileSync(snapshot, join(runtime, "public", "changelog.json"));
    vi.spyOn(process, "cwd").mockReturnValue(runtime);
    const html = renderToStaticMarkup(await ChangelogPage());
    expect(html).toContain(hash);
    expect(html).toContain("Reçu | montant &amp; devise");
    expect(html).not.toContain("Ancienne évolution");
    expect(html).not.toContain("Aucune entrée disponible");
    expect(html).not.toContain("Toutes les évolutions");
    expect(html).toContain("Journal mis à jour à chaque déploiement");
  });
  it("fails snapshot generation without a checkout instead of overwriting it with an empty success", () => {
    expect(generatorStep).not.toBeNull();
    mkdirSync(join(fixture, "public"));
    const snapshot = join(fixture, "public", "changelog.json");
    writeFileSync(snapshot, "previous snapshot");
    const result = spawnSync(process.execPath, [join(ROOT, generatorStep![1]!)], { cwd: fixture, encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(readFileSync(snapshot, "utf8")).toBe("previous snapshot");
  });
  it("executes the exact image smoke verdict and refuses missing or stale JSON and HTML before push", () => {
    const smoke = workflow.match(/node --input-type=module -e '([\s\S]*?)' \/tmp\/lafusee-changelog.json \/tmp\/lafusee-changelog.html "\$\{GITHUB_SHA:0:7\}"/);
    expect(smoke).not.toBeNull();
    expect(smoke!.index!).toBeLessThan(workflow.indexOf("- name: Push ghcr"));
    const preceding = workflow.slice(0, smoke!.index!);
    expect(preceding).toMatch(/curl --fail --silent --show-error http:\/\/localhost:3000\/changelog.json -o \/tmp\/lafusee-changelog.json/);
    expect(preceding).toMatch(/curl --fail --silent --show-error http:\/\/localhost:3000\/changelog -o \/tmp\/lafusee-changelog.html/);
    const json = join(fixture, "changelog.json");
    const html = join(fixture, "changelog.html");
    const verify = (sha = "abc1234") => spawnSync(process.execPath, ["--input-type=module", "-e", smoke![1]!, json, html, sha], { encoding: "utf8" });
    writeFileSync(json, JSON.stringify([{ hash: "abc1234", date: "2026-11-16", type: "fix", scope: null, summary: "Current" }]));
    writeFileSync(html, "<li>abc1234 Current</li>");
    expect(verify().status).toBe(0);
    expect(verify("def5678").status).not.toBe(0);
    expect(verify("").status).not.toBe(0);
    writeFileSync(html, "<p>Aucune entrée disponible</p>");
    expect(verify().status).not.toBe(0);
    writeFileSync(html, "<li>abc1234 Current</li>");
    writeFileSync(json, "[]");
    expect(verify().status).not.toBe(0);
  });
});
