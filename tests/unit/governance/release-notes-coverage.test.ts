/**
 * Anti-drift CI — notes de version CLIENT (`src/lib/release-notes.ts`).
 *
 * Normalisé dans NEFER (nefer-docs §6.0) : toute livraison porteuse d'un bénéfice
 * visible du dirigeant ajoute une entrée EN TÊTE de `RELEASE_NOTES`, `version` =
 * `APP_VERSION` au ship. Cet écran de connexion (`WhatsNewModal`) et le récap console
 * (`/console/socle/release-notes`) consomment la MÊME source — ce test en verrouille
 * la forme, l'ordre, la cohérence de version et le vocable client (ADR-0123).
 *
 * NB : le fichier de données vit sous `src/lib/`, hors du périmètre du verrou
 * `cockpit-vocabulary` (qui ne scanne que les surfaces `src/app/(cockpit)` +
 * `src/components/cockpit`). C'est ICI que le vocable des notes est gardé.
 */
import { describe, it, expect } from "vitest";
import { RELEASE_NOTES, LATEST_RELEASE, releaseToShow, compareVersions } from "@/lib/release-notes";
import { APP_VERSION } from "@/lib/version";

const VERSION_RE = /^\d+\.\d+\.\d+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Même philosophie que `cockpit-vocabulary.test.ts` FORBIDDEN : aucun nom
// mythologique/mécanisme interne, aucune plomberie, aucun « RTIS » ni réf ADR
// dans une chaîne CLIENT. « ADVE » reste permis (méthode vendue, glosée).
const FORBIDDEN: Array<{ name: string; re: RegExp }> = [
  { name: "mythologie/mécanisme", re: /\b(ADVERTIS|APOGEE|Jehuty|Notoria|Mestor|Artemis|Seshat|Ptah|Anubis|Imhotep|Thot|Tarsis|NETERU|Neter)\b/ },
  { name: "plomberie", re: /\b(IntentEmission|writePillar|gateway|Prisma|tRPC)\b/i },
  { name: "réf ADR", re: /\bADR-\d{4}\b/ },
  { name: "jargon interne", re: /\b(pilier|Pillar|ADVE-RTIS|RTIS|function-calling|Glory tool|emitIntent)\b/ },
];

describe("release-notes — forme & normalisation NEFER", () => {
  it("le registre n'est pas vide (au moins la note courante)", () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0);
    expect(LATEST_RELEASE).not.toBeNull();
  });

  it("la note en tête n'est jamais en avance sur APP_VERSION", () => {
    // Invariant de sûreté : on ne présente jamais une nouveauté d'une version
    // non encore livrée. (== APP_VERSION au ship d'un bénéfice ; < sinon.)
    expect(VERSION_RE.test(APP_VERSION)).toBe(true);
    expect(compareVersions(LATEST_RELEASE!.version, APP_VERSION)).toBeLessThanOrEqual(0);
  });

  it("chaque note a une forme complète (version, date, headline, ≥1 highlight)", () => {
    for (const note of RELEASE_NOTES) {
      expect(VERSION_RE.test(note.version), `version invalide: ${note.version}`).toBe(true);
      expect(DATE_RE.test(note.date), `date invalide: ${note.date}`).toBe(true);
      expect(note.headline.trim().length).toBeGreaterThan(0);
      expect(note.highlights.length).toBeGreaterThan(0);
      for (const h of note.highlights) {
        expect(h.emoji.trim().length, `emoji vide (${note.version})`).toBeGreaterThan(0);
        expect(h.title.trim().length, `titre vide (${note.version})`).toBeGreaterThan(0);
        expect(h.body.trim().length, `corps vide (${note.version})`).toBeGreaterThan(0);
      }
    }
  });

  it("les versions sont strictement décroissantes (la plus récente en tête)", () => {
    for (let i = 1; i < RELEASE_NOTES.length; i++) {
      const cmp = compareVersions(RELEASE_NOTES[i - 1]!.version, RELEASE_NOTES[i]!.version);
      expect(cmp, `ordre cassé entre ${RELEASE_NOTES[i - 1]!.version} et ${RELEASE_NOTES[i]!.version}`).toBeGreaterThan(0);
    }
  });

  it("aucune version dupliquée", () => {
    const versions = RELEASE_NOTES.map((n) => n.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it("vocable 100 % client — aucun terme interne (ADR-0123)", () => {
    const violations: string[] = [];
    for (const note of RELEASE_NOTES) {
      const texts = [note.headline, ...note.highlights.flatMap((h) => [h.title, h.body])];
      for (const text of texts) {
        for (const { name, re } of FORBIDDEN) {
          const m = text.match(re);
          if (m) violations.push(`v${note.version} [${name}] → « ${m[0]} » dans « ${text.slice(0, 70)} »`);
        }
      }
    }
    expect(
      violations,
      `Vocabulaire interne dans une note CLIENT (traduire en bénéfice business) :\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});

describe("release-notes — releaseToShow (gate anti-nag)", () => {
  it("première connexion (rien vu) → présente la dernière note", () => {
    expect(releaseToShow(null)).toBe(LATEST_RELEASE);
    expect(releaseToShow(undefined)).toBe(LATEST_RELEASE);
  });

  it("déjà à jour → aucune note (pas de nag)", () => {
    expect(releaseToShow(LATEST_RELEASE!.version)).toBeNull();
    // Une version future (au cas où le device aurait vu plus récent) → null.
    expect(releaseToShow("999.0.0")).toBeNull();
  });

  it("a vu une version antérieure → présente la dernière", () => {
    expect(releaseToShow("0.0.1")).toBe(LATEST_RELEASE);
  });
});
