/**
 * Anti-drift — propriétaire d'une marque ≠ collaborateur délégué.
 *
 * Ce sont deux choses différentes et le repo les confondait à l'écriture :
 *
 *  - **Propriétaire** = `Strategy.userId`. `canAccessStrategy` y court-circuite
 *    (`operator-isolation:157`) et le firewall de zones aussi
 *    (`collaborator-firewall:51`) — il a la main sur toute sa marque.
 *  - **Collaborateur** = `StrategyCollaborator` (ADR-0129), scopé par
 *    `CampaignTeamRole` et soumis au firewall de zones (ADR-0131), qui refuse
 *    par DÉFAUT toute écriture hors du métier déclaré.
 *
 * Or les deux voies de provisionnement (`accounts.createBrandLogin` et
 * `/api/admin/prod-finish`) ne savaient produire QUE des collaborateurs. Les
 * dirigeants à qui l'on remettait leur marque — Lionel sur Motion19 — sont
 * restés les délégués de leur propre bien, sans que rien ne le signale.
 *
 * Ce test verrouille les trois mécanismes qui referment l'écart :
 * `attachAs: "OWNER"` à la création, `transferBrandOwnership` pour un compte
 * déjà existant (que la création REFUSE par construction), et le fait que
 * l'ancien propriétaire n'est jamais éjecté en silence.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { INTENT_KIND_BY_NAME } from "@/server/governance/intent-kinds";

const ROOT = join(__dirname, "..", "..", "..");
const accounts = readFileSync(join(ROOT, "src", "server", "trpc", "routers", "accounts.ts"), "utf8");

describe("la propriété d'une marque est atteignable", () => {
  it("`createBrandLogin` sait attacher en PROPRIÉTAIRE, pas seulement en délégué", () => {
    expect(accounts).toMatch(/attachAs:\s*z\.enum\(\["COLLABORATOR",\s*"OWNER"\]\)/);
    // Le défaut reste COLLABORATOR : aucun appel existant ne change de sens.
    expect(accounts).toMatch(/attachAs:\s*z\.enum\(\["COLLABORATOR",\s*"OWNER"\]\)\.default\("COLLABORATOR"\)/);
  });

  it("attacher en OWNER écrit bien `Strategy.userId` (la propriété canonique)", () => {
    const seg = accounts.slice(accounts.indexOf('if (input.attachAs === "OWNER")'));
    expect(seg.slice(0, 800)).toMatch(/db\.strategy\.update\(\{[\s\S]*?data:\s*\{\s*userId:\s*user\.id\s*\}/);
  });

  it("un compte EXISTANT peut devenir propriétaire (voie séparée)", () => {
    // `createBrandLogin` lève CONFLICT sur un email déjà pourvu d'un mot de
    // passe : sans cette seconde voie, un dirigeant déjà provisionné ne pouvait
    // par AUCUN chemin devenir propriétaire de sa marque.
    expect(accounts).toMatch(/transferBrandOwnership:\s*governedProcedure/);
    expect(accounts).toMatch(/kind:\s*"ADMIN_TRANSFER_BRAND_OWNERSHIP"/);
  });

  it("le transfert est gouverné et réservé à l'opérateur", () => {
    const seg = accounts.slice(accounts.indexOf("transferBrandOwnership:"));
    expect(seg.slice(0, 400)).toMatch(/requireOperator:\s*true/);
    const entry = INTENT_KIND_BY_NAME.get("ADMIN_TRANSFER_BRAND_OWNERSHIP");
    expect(entry, "kind absent du registre").toBeTruthy();
    expect(entry!.governor).toBe("INFRASTRUCTURE");
  });

  it("l'ancien propriétaire n'est jamais éjecté en silence", () => {
    // Motif du seed SPAWT : il devient DIGITAL_DIRECTOR, la paternité de la
    // stratégie est conservée.
    const seg = accounts.slice(accounts.indexOf("transferBrandOwnership:"));
    expect(seg.slice(0, 3_000)).toMatch(/previousOwnerId/);
    expect(seg.slice(0, 3_000)).toMatch(/DIGITAL_DIRECTOR/);
  });

  it("le transfert est idempotent (re-jouer ne dégrade personne)", () => {
    const seg = accounts.slice(accounts.indexOf("transferBrandOwnership:"));
    expect(seg.slice(0, 2_000)).toMatch(/alreadyOwner:\s*true/);
  });

  it("le provisionnement prod attache en PROPRIÉTAIRE", () => {
    const prodFinish = readFileSync(
      join(ROOT, "src", "app", "api", "admin", "prod-finish", "route.ts"),
      "utf8",
    );
    expect(prodFinish).toMatch(/db\.strategy\.update\(\{\s*where:\s*\{\s*id:\s*brand\.id\s*\},\s*data:\s*\{\s*userId/);
    // Un mot de passe déjà posé ne doit PAS faire sauter le transfert : c'est
    // précisément le cas d'un compte déjà provisionné, donc resté délégué.
    expect(prodFinish).toMatch(/password-kept-ownership-ensured/);
  });
});
