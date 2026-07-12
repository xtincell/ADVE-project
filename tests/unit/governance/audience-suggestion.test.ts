/**
 * Amendement ADR-0126 — suggestion d'audience adressable : verrous.
 *
 *   (1) le calcul est PUR et honnête : relevés réels uniquement, somme +
 *       plancher (recouvrement inconnu), null sans donnée — zéro invention ;
 *   (2) la déclaration reste au porteur : la suggestion PRÉ-REMPLIT le champ
 *       (setAudience), et il n'existe qu'UN chemin d'écriture (Enregistrer →
 *       strategy.update) — jamais d'auto-write depuis la suggestion ;
 *   (3) la query est une lecture protégée tenant-gardée, pas une mutation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeAudienceSuggestion } from "@/domain";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("suggestion d'audience adressable (ADR-0126 amendée)", () => {
  it("(1) calcul pur : somme + plancher, tri décroissant, null sans relevé", () => {
    expect(computeAudienceSuggestion([])).toBeNull();
    expect(computeAudienceSuggestion([{ platform: "FACEBOOK", followerCount: 0 }])).toBeNull();

    const out = computeAudienceSuggestion([
      { platform: "INSTAGRAM", followerCount: 1753 },
      { platform: "FACEBOOK", followerCount: 4252 },
      { platform: "TIKTOK", followerCount: 1308 },
    ]);
    expect(out).not.toBeNull();
    expect(out!.suggested).toBe(4252 + 1753 + 1308);
    expect(out!.floor).toBe(4252);
    expect(out!.perPlatform[0]!.platform).toBe("FACEBOOK");
    // Le module domaine reste pur — aucune dépendance base/serveur.
    const domain = read("src/domain/market-scale.ts");
    expect(domain).not.toMatch(/@\/lib\/db|@prisma\/client|prisma/);
  });

  it("(2) la suggestion pré-remplit, la déclaration reste le clic Enregistrer", () => {
    const card = read("src/components/cockpit/market-scale-card.tsx");
    // Le bouton de suggestion ne fait QUE remplir l'état local.
    expect(card).toMatch(/onClick=\{\(\) => setAudience\(String\(suggestion\.data!\.suggested\)\)\}/);
    // Un seul point d'écriture dans la carte : la mutation d'enregistrement.
    const mutateCalls = card.match(/updateMutation\.mutate\(/g) ?? [];
    expect(mutateCalls.length).toBe(1);
    // Et la suggestion n'apparaît que tant que rien n'est déclaré.
    expect(card).toMatch(/addressableAudience == null/);
  });

  it("(3) query = lecture protégée tenant-gardée (jamais une mutation)", () => {
    const router = read("src/server/trpc/routers/strategy.ts");
    expect(router).toMatch(/getAudienceSuggestion: protectedProcedure/);
    expect(router).toMatch(/getAudienceSuggestion[\s\S]{0,600}canAccessStrategy/);
    expect(router).toMatch(/getAudienceSuggestion[\s\S]{0,900}\.query\(/);
  });
});
