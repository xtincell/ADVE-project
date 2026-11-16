/** The disposable receipt database only; never load a developer or production URL. */
export function isOwnedPostgresTarget(value = process.env.DATABASE_URL): boolean {
  if (!value) return false;
  const target = new URL(value);
  const local = target.port === "55439" && target.username === "shinkiro_fixture";
  const ci = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project"
    && target.port === "5432" && target.username === "postgres";
  // Query parameters such as `host` can override the URL authority in pg.
  return target.protocol === "postgresql:" && target.hostname === "127.0.0.1" && target.pathname === "/shinkiro_verify"
    && [...target.searchParams.keys()].every(key => key === "schema") && target.searchParams.getAll("schema").length <= 1
    && (target.searchParams.get("schema") ?? "public") === "public" && (local || ci);
}

export function assertOwnedPostgresTarget(): void {
  if (!isOwnedPostgresTarget()) throw new Error("Expected the owned local PostgreSQL fixture (127.0.0.1:55439/shinkiro_verify, shinkiro_fixture) or this repository's isolated CI service");
}
