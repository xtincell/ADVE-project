/**
 * Anti-drift — god-mode honoré dans getOperatorContext (bug SPAWT 2026-07-13).
 *
 * L'élévation god-mode vit dans le JWT au sign-in (aucune écriture DB). Toute
 * garde qui RELIT le rôle depuis la base (canAccessStrategy/Campaign/Mission,
 * scope*) doit donc consulter l'allowlist god-mode par email — sinon le compte
 * fondateur ne voit QUE ses propres marques et se fait refuser sur toute marque
 * seed/déléguée (SPAWT, détenu par alexandre@upgraders.com, rendait les
 * surfaces vides pour xtincell@gmail.com).
 *
 * Invariant : `getOperatorContext` sélectionne `email` et force role=ADMIN via
 * `isGodModeEmail`. Même classe que le fix tier-gate god-mode du même jour.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isGodModeEmail, GOD_MODE_EMAILS } from "@/lib/auth/god-mode";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("god-mode — getOperatorContext honore l'allowlist par email", () => {
  it("getOperatorContext sélectionne email et élève via isGodModeEmail", () => {
    const src = read("src/server/services/operator-isolation/index.ts");
    expect(src).toContain('import { isGodModeEmail } from "@/lib/auth/god-mode"');
    // Le select DB doit inclure email (sinon isGodModeEmail(undefined) toujours faux).
    expect(src).toMatch(/select: \{ id: true, email: true, role: true, operatorId: true \}/);
    // role = ADMIN quand god-mode, sinon rôle DB.
    expect(src).toContain('isGodModeEmail(user?.email) ? "ADMIN" : (user?.role ?? "USER")');
  });

  it("canAccessStrategy accorde l'accès aux ADMIN (chemin god-mode)", () => {
    const src = read("src/server/services/operator-isolation/index.ts");
    // La garde reste un simple `role === ADMIN` — le god-mode passe par le
    // rôle élevé de getOperatorContext, pas par une exception dispersée.
    expect(src).toMatch(/canAccessStrategy[\s\S]{0,200}ctx\.role === "ADMIN"/);
  });

  it("isGodModeEmail : allowlist non vide, insensible à la casse", () => {
    expect(GOD_MODE_EMAILS.length).toBeGreaterThan(0);
    const sample = GOD_MODE_EMAILS[0]!;
    expect(isGodModeEmail(sample.toUpperCase())).toBe(true);
    expect(isGodModeEmail("  " + sample + "  ")).toBe(false); // pas de trim implicite côté appelant
    expect(isGodModeEmail(null)).toBe(false);
    expect(isGodModeEmail("random@example.com")).toBe(false);
  });
});
