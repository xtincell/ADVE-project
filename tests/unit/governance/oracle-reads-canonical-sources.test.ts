/**
 * Verrous de gouvernance sur le livrable Oracle — deux classes de défaut
 * mesurées en production le 2026-07-30, toutes deux INVISIBLES à `tsc`.
 *
 * ── 1. La clé fantôme ──
 *
 * `dispatchRunner` lisait le vecteur ADVE-RTIS via
 * `strategy.pillars.find(p => p.key === "vector")`. Ce pilier N'EXISTE PAS :
 * les clés sont a/d/v/e/r/t/i/s. `find` rendait donc `undefined`, le repli
 * `createEmptyVector()` s'appliquait, et l'Executive Summary — la PREMIÈRE
 * section du livrable payant — annonçait 0 partout pour une marque dont
 * `advertis_vector.composite` valait 160/200 (vérifié en base sur SPAWT).
 *
 * TypeScript ne peut pas attraper ça : `find` sur un prédicat toujours faux
 * est parfaitement typé. Seule la lecture de la SOURCE canonique le garantit.
 * Même classe que les « lecteurs de la clé fantôme `compositeScore` »
 * (scope-drift #646) — d'où un verrou, pas seulement un correctif.
 *
 * ── 2. Le livrable invisible ──
 *
 * `oracle.getSection` existait côté serveur sans un seul appel dans l'UI : 35
 * sections rédigées (3 à 34 Ko chacune) qu'aucun écran ne permettait de lire.
 * Une procédure de LECTURE que personne ne consomme est une donnée que le
 * client paie sans jamais la voir.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function readAllSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) readAllSources(p, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(readFileSync(p, "utf-8"));
  }
  return acc;
}

describe("Oracle — le vecteur vient de sa source canonique", () => {
  const handler = readFileSync(
    join(ROOT, "src/server/services/oracle-section/handler.ts"),
    "utf-8",
  );

  it("lit `strategy.advertis_vector`, comme assemblePresentation", () => {
    expect(handler).toContain("strategy.advertis_vector");
  });

  it("ne cherche JAMAIS un pilier de clé « vector » (il n'en existe aucun)", () => {
    // Le prédicat était syntaxiquement valide et sémantiquement toujours faux.
    expect(handler).not.toMatch(/key\s*===\s*["'`]vector["'`]/);
  });

  it("assemblePresentation reste la référence lue par le handler", () => {
    const presentation = readFileSync(
      join(ROOT, "src/server/services/strategy-presentation/index.ts"),
      "utf-8",
    );
    // Les deux lecteurs doivent viser la même colonne : c'est la divergence
    // entre eux qui a produit le défaut.
    expect(presentation).toContain("strategy.advertis_vector");
  });
});

describe("Oracle — une lecture non consommée est un livrable invisible", () => {
  const ui = [
    ...readAllSources(join(ROOT, "src/app")),
    ...readAllSources(join(ROOT, "src/components")),
  ].join("\n");

  /**
   * Procédures de LECTURE dont l'absence à l'écran signifie qu'un contenu
   * produit (et facturé) reste invisible. Ajouter une entrée ici quand une
   * nouvelle lecture porte du contenu destiné au client.
   */
  const MUST_BE_CONSUMED = ["oracle.listSections", "oracle.getSection"];

  it.each(MUST_BE_CONSUMED)("%s est appelée par au moins un écran", (proc) => {
    expect(ui).toContain(`trpc.${proc}.`);
  });

  it("le lecteur de section rend le contenu, pas seulement un statut", () => {
    const reader = readFileSync(
      join(ROOT, "src/components/cockpit/oracle/section-reader.tsx"),
      "utf-8",
    );
    // Le rendu doit s'appuyer sur les libellés partagés plutôt que de
    // déverser des clés techniques à l'écran.
    expect(reader).toContain("getFieldLabel");
    // Et proposer la donnée brute — vérifiable, jamais imposée.
    expect(reader).toContain("donnée brute");
  });
});
