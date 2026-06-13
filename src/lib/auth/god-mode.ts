/**
 * God-mode (founder) accounts.
 *
 * Emails listed here are ALWAYS treated as full ADMIN — regardless of the
 * role stored in the DB — and bypass paid-tier gates. This lets the founder
 * operate the OS with unrestricted access even on a prod DB that was never
 * re-seeded (no DB write needed; the elevation happens in the NextAuth JWT
 * callback at every sign-in).
 *
 * Override per deployment via `GOD_MODE_EMAILS` (comma-separated). When the
 * codebase is resold, the buyer sets this env var to their own founder
 * emails — the in-code default is only a convenience for the UPgraders
 * operator.
 */
const DEFAULT_GOD_EMAILS = [
  "alexandre@upgraders.com",
  "x-tincell@hotmail.fr",
  "nefer@upgraders.io",
];

export const GOD_MODE_EMAILS: readonly string[] = (
  process.env.GOD_MODE_EMAILS ?? DEFAULT_GOD_EMAILS.join(",")
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isGodModeEmail(email: string | null | undefined): boolean {
  return !!email && GOD_MODE_EMAILS.includes(email.toLowerCase());
}
