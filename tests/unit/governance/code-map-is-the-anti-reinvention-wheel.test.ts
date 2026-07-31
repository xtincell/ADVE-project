/**
 * VERROU — la carte anti-réinvention reste fraîche, couvrante et greppable.
 *
 * ── L'enseignement de la session du 2026-07-31 ──
 *
 * Une même journée a vu se (re)construire : un axe percentile (le Scoreur
 * ADR-0149 existait — épreuves, ligues, θ Bradley-Terry) ; un plafond de
 * preuve (ADR-0126 en portait un au composite, ADR-0167 un gate de promotion) ;
 * une fonction de recalcul (`regenerateAnalysis` existait) ; et une carte de
 * concepts (CODE-MAP.md existait, avec sa règle ANTI-DRIFT).
 *
 * La cause n'était pas l'absence d'artefacts — c'était leur INTROUVABILITÉ :
 * les greps du jour (« percentile », « rang », « force marché ») ne matchaient
 * aucun nom interne (« épreuve », « ligue », « palier »), et RIEN ne signalait
 * la machinerie DORMANTE (construite mais non branchée, invisible au runtime).
 *
 * Loi opérateur : « je ne cautionne pas la réinvention de la roue — tout
 * court. » Ce verrou rend la carte OBLIGATOIREMENT à jour et greppable ; le
 * reste est de la discipline de lecture (CLAUDE.md § ANTI-DRIFT).
 */

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MAP = join(ROOT, "docs/governance/CODE-MAP.md");

describe("CODE-MAP — la roue anti-réinvention", () => {
  const map = readFileSync(MAP, "utf-8");

  it("est à jour vis-à-vis du générateur (jamais éditée à la main sans regen)", () => {
    // Le générateur est déterministe : le régénérer ne doit RIEN changer.
    // S'il change quelque chose, soit la carte a été éditée à la main, soit le
    // code a bougé sans regen — dans les deux cas, la carte mentait.
    execFileSync("npx", ["tsx", "scripts/gen-code-map.ts"], { cwd: ROOT, stdio: "pipe" });
    const regenerated = readFileSync(MAP, "utf-8");
    expect(
      regenerated === map,
      "CODE-MAP.md diverge du générateur — exécuter `npx tsx scripts/gen-code-map.ts` et committer",
    ).toBe(true);
  });

  it("répond aux mots du MÉTIER, pas seulement aux noms internes", () => {
    // Les greps qui ont ÉCHOUÉ le 2026-07-31 doivent désormais matcher. Chaque
    // entrée est un mot qu'un concepteur emploierait spontanément — si l'un
    // d'eux cesse de matcher, la prochaine réinvention est déjà en route.
    const MOTS_DU_METIER = [
      "percentile", // → Scoreur, pas un axe à côté
      "classement",
      "force marché",
      "ligue",
      "must-have du rang",
      "palier officiel",
      "plafond de preuve",
      "plancher de visibilité",
      "rescan",
      "corpus",
    ];
    for (const mot of MOTS_DU_METIER) {
      expect(map.toLowerCase(), `« ${mot} » introuvable dans CODE-MAP — le grep métier ratera`).toContain(
        mot.toLowerCase(),
      );
    }
  });

  it("déclare l'état de câblage — le DORMANT est visible avant conception", () => {
    // « Prévu mais non effectué » ne se voit ni au runtime ni dans un grep de
    // symptôme. La carte doit le dire en toutes lettres.
    expect(map).toContain("Machines & état de câblage");
    expect(map).toContain("WIRED");
    expect(map).toContain("Dormant");
    // La loi, écrite là où l'on conçoit :
    expect(map).toContain("on ne réinvente jamais");
  });

  it("indexe chaque module du domaine (rien d'ungoverné sous src/domain)", () => {
    // Un module de domaine absent de la carte est une machine que personne ne
    // trouvera — l'étape zéro de la prochaine réinvention.
    const domainFiles = execFileSync("ls", [join(ROOT, "src/domain")], { encoding: "utf-8" })
      .split("\n")
      .filter((f) => f.endsWith(".ts") && f !== "index.ts");
    const missing = domainFiles.filter((f) => !map.includes(f.replace(".ts", "")));
    expect(
      missing,
      `modules de domaine absents de CODE-MAP : ${missing.join(", ")} — les ajouter au générateur`,
    ).toEqual([]);
  });
});
