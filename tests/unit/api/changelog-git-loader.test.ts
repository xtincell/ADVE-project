import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChangelogPage from "@/app/(public)/changelog/page";

let fixture: string;
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
});
