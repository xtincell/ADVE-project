/**
 * Anti-drift HARD — secteurs et pays : UNE liste, pas deux.
 *
 * `INTAKE_SECTORS` / `INTAKE_COUNTRIES` (`lib/constants/intake-options.ts`)
 * sont le canon : l'intake public s'en sert, `SECTOR_TAXONOMY` s'y aligne, et
 * le secteur canonisé est **la clé de ligue du scoreur** (ADR-0149).
 *
 * Le wizard interne `/cockpit/new` portait pourtant SES PROPRES listes — 17
 * secteurs contre 24, 11 pays contre 23. Ce n'était pas un décalage
 * d'affichage. Le préremplissage depuis l'intake faisait :
 *
 *     setSector(SECTORS.includes(s) ? s : "AUTRE")
 *
 * Un dirigeant qui déclarait Culture, Tourisme, Logistique, Agro, Alimentation,
 * Conseil, Services, B2B, ONG, Public ou Assurance dans l'intake public voyait
 * donc son secteur **réécrit en « AUTRE »** à la création de sa marque, en
 * silence — et sa marque atterrissait dans la ligue des inclassables. Même
 * traitement pour tout pays hors des onze retenus.
 *
 * Quatre valeurs n'existaient QUE dans la liste du wizard (`HOSPITALITY`,
 * `AGRICULTURE`, `BEAUTE`, `TRANSPORT`) là où le canon dit `TOURISME`, `AGRO`,
 * `MODE`, `LOGISTIQUE` ; et `RCA` n'est pas un code ISO-2 (Centrafrique = `CF`),
 * donc il ne pouvait correspondre à rien en aval.
 *
 * Ce test refuse la RÉAPPARITION d'une liste rivale, pas seulement celle-là.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { INTAKE_SECTORS, INTAKE_SECTOR_VALUES, INTAKE_COUNTRIES } from "@/lib/constants/intake-options";
import { SECTOR_TAXONOMY } from "@/domain/sector-taxonomy";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("le canon des secteurs est unique", () => {
  it("la taxonomie du scoreur couvre TOUS les secteurs de l'intake", () => {
    // Sans ça, un secteur choisissable à l'intake n'aurait pas de ligue.
    const taxo = new Set(SECTOR_TAXONOMY.map((s) => s.code));
    const missing = INTAKE_SECTOR_VALUES.filter((v) => !taxo.has(v));
    expect(missing, `secteurs sans ligue : ${missing.join(", ")}`).toEqual([]);
  });

  it("les pays sont des codes ISO-2 (RCA n'en est pas un)", () => {
    // `AUTRE` est l'échappatoire assumée du canon (même rôle que le secteur
    // `AUTRE`) : un dirigeant hors des 22 pays listés doit pouvoir se déclarer.
    // Tout le RESTE doit être un vrai code ISO-2, sinon rien en aval — routage
    // de paiement (`CINETPAY_COUNTRIES`), zone économique, ligue — ne peut
    // s'y raccrocher. `RCA` (au lieu de `CF`) était exactement ce cas.
    const bad = INTAKE_COUNTRIES.filter((c) => c.value !== "AUTRE" && !/^[A-Z]{2}$/.test(c.value));
    expect(bad.map((c) => c.value), "codes non ISO-2").toEqual([]);
  });

  it("les libellés sont accentués — ce sont des chaînes rendues au client", () => {
    // Le wizard affichait les CODES bruts (« SANTE », « ENERGIE ») : les
    // libellés canon portent les accents, encore faut-il les afficher.
    const accented = INTAKE_SECTORS.filter((s) => /[éèêëàâîïôöûüç]/i.test(s.label));
    expect(accented.length, "aucun libellé accentué — le canon a été dé-accentué ?").toBeGreaterThan(3);
  });
});

describe("HARD — aucune liste de secteurs/pays rivale", () => {
  const files = walk(SRC);

  it("trouve bien les sources à scanner (garde anti-scan-vide)", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("le wizard interne consomme le canon, il ne le recopie pas", () => {
    const wizard = readFileSync(join(SRC, "app", "(cockpit)", "cockpit", "new", "page.tsx"), "utf8");
    expect(wizard).toMatch(/from "@\/lib\/constants\/intake-options"/);
    expect(wizard).toMatch(/const SECTORS = INTAKE_SECTORS/);
    expect(wizard).toMatch(/const COUNTRIES = INTAKE_COUNTRIES/);
  });

  it("personne ne redéclare une liste de secteurs en dur", () => {
    // Signature d'une liste rivale : un tableau littéral contenant au moins
    // trois codes de secteur canon. Le fichier canon lui-même est exclu, ainsi
    // que la taxonomie (qui les mappe par construction).
    const CANON_FILES = [
      join(SRC, "lib", "constants", "intake-options.ts"),
      join(SRC, "domain", "sector-taxonomy.ts"),
    ];
    const CODES = ["FMCG", "TELECOM", "IMMOBILIER", "LOGISTIQUE", "TOURISME", "ASSURANCE", "BANQUE"];
    const offenders: string[] = [];
    for (const file of files) {
      if (CANON_FILES.includes(file)) continue;
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        const quoted = line.match(/"([A-Z]{3,})"/g);
        if (!quoted) return;
        const hits = quoted.map((q) => q.replace(/"/g, "")).filter((c) => CODES.includes(c));
        if (hits.length >= 3) {
          offenders.push(`${file.replace(`${SRC}/`, "")}:${i + 1} — ${hits.join(", ")}`);
        }
      });
    }
    expect(
      offenders,
      `${offenders.length} liste(s) de secteurs en dur — importer INTAKE_SECTORS :\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

describe("créer une marque l'OUVRE (elle, pas une autre)", () => {
  const wizard = readFileSync(join(SRC, "app", "(cockpit)", "cockpit", "new", "page.tsx"), "utf8");

  it("la redirection porte l'id de la marque créée", () => {
    // Le sélecteur retient la DERNIÈRE marque active (`lf-active-strategy`) et
    // ignore tout de celle qu'on vient de créer : sans `?strategy=`, on
    // atterrissait sur la marque précédente. C'est le « je n'arrivais pas à
    // l'ouvrir » rapporté par l'opérateur.
    expect(wizard).toMatch(/router\.push\(`\/cockpit\/brand\/fondation\?strategy=\$\{result\.id\}`\)/);
  });

  it("un échec d'initialisation ne laisse plus le dirigeant bloqué", () => {
    // La redirection vivait DANS le `try` du boot : boot en échec = aucune
    // navigation, avec une marque pourtant déjà créée.
    const seg = wizard.slice(wizard.indexOf("catch (bootErr)"));
    expect(seg.slice(0, 900)).toMatch(/votre marque est créée/i);
    expect(wizard).toMatch(/createdId \? `\/cockpit\/brand\/fondation\?strategy=\$\{createdId\}`/);
  });

  it("on atterrit sur le hub des 4 piliers, pas sur un pilier isolé", () => {
    expect(wizard).not.toMatch(/router\.push\("\/cockpit\/brand\/identity"\)/);
  });
});
