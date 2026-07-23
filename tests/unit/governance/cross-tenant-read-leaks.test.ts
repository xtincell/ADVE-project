/**
 * Verrou HARD — fuites de lecture cross-tenant via Prisma include/select (round-8 c).
 *
 * Classe (audit adversarial round-8) : une READ dont le WHERE est scopé/gardé mais
 * dont un `include`/`select` imbriqué remonte de la donnée d'un AUTRE tenant, OU
 * dont le scope manque quand un paramètre optionnel est omis.
 *
 *  - `campaignManager.search` (HIGH) : sans `strategyId`, `searchCampaigns`
 *    renvoyait TOUTES les campagnes cross-marque + identités des membres d'équipe.
 *  - `TalentProfile.payoutPhone` (MED) : numéro mobile-money de payout (PII) sorti
 *    par des lectures ouvertes (`guilde.list`/`getProfile`, `membership.list`).
 *  - `mission.listForCreator` (LOW-MED) : le vecteur ADVE interne de la marque
 *    (`advertis_vector`) exposé aux créateurs sur le mur des missions ouvertes.
 *
 * Analyse TEXTUELLE — la revue reste responsable de la sémantique.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const R = join(process.cwd(), "src/server/trpc/routers");
const S = join(process.cwd(), "src/server/services");
const read = (rel: string, base = R) => readFileSync(join(base, rel), "utf8");

describe("campaignManager.search — scopé aux marques accessibles (round-8 HIGH)", () => {
  it("le router passe scopeCampaigns(opCtx) à searchCampaigns", () => {
    const src = read("campaign-manager.ts");
    expect(src).toMatch(/searchCampaigns\(\{\s*\.\.\.input,\s*scope:\s*scopeCampaigns\(/);
  });
  it("searchCampaigns AND le scope dans le where (jamais un where non scopé)", () => {
    const src = read("campaign-manager/index.ts", S);
    expect(src).toMatch(/scope\?:\s*Prisma\.CampaignWhereInput/);
    expect(src).toMatch(/AND:\s*\[params\.scope/);
  });
});

describe("payoutPhone (PII payout) jamais exposé en lecture ouverte (round-8 MED)", () => {
  it("guilde.ts omet payoutPhone sur list ET getProfile", () => {
    const src = read("guilde.ts");
    const omits = [...src.matchAll(/omit:\s*\{\s*payoutPhone:\s*true\s*\}/g)];
    expect(omits.length, "list + getProfile doivent omettre payoutPhone").toBeGreaterThanOrEqual(2);
  });
  it("membership.list omet payoutPhone sur le talentProfile inclus", () => {
    const src = read("membership.ts");
    expect(src).toMatch(/talentProfile:\s*\{\s*omit:\s*\{\s*payoutPhone:\s*true\s*\}\s*\}/);
  });
});

describe("mission.listForCreator — pas de fuite advertis_vector (round-8 LOW-MED)", () => {
  it("le mur des missions ouvertes ne sélectionne pas advertis_vector", () => {
    const src = read("mission.ts");
    const block = src.match(/listForCreator[\s\S]*?take:\s*50,/);
    expect(block, "bloc listForCreator introuvable").toBeTruthy();
    // On teste l'usage réel dans un select (`advertis_vector: true`), pas les
    // mentions en commentaire.
    expect(block![0]).not.toMatch(/advertis_vector:\s*true/);
  });
});
