/**
 * Plan 4.11.g — la collecte Lighthouse mobile ne doit pas échouer sur sa config.
 *
 * `.lighthouserc.json` passait `settings.preset: "mobile"`. Lighthouse n'accepte
 * que les préréglages `perf`, `experimental` et `desktop` : la collecte du run
 * 39319055374 s'arrêtait sur ce choix invalide, sans aucun score mobile, tandis
 * que l'étape non bloquante laissait le job vert. L'émulation mobile est la
 * configuration par défaut de Lighthouse ; elle n'a besoin d'aucun préréglage.
 *
 * Ce verrou ne mesure pas la performance : il garantit seulement que la
 * configuration est acceptée et reste mobile. Les scores restent à recevoir
 * sur un build exact.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
/** Choix acceptés par l'option `--preset` de Lighthouse. */
const LIGHTHOUSE_PRESETS = ["perf", "experimental", "desktop"] as const;

interface CollectSettings {
  preset?: string;
  formFactor?: string;
  screenEmulation?: { mobile?: boolean };
}

const config = JSON.parse(readFileSync(join(ROOT, ".lighthouserc.json"), "utf8")) as {
  ci: { collect: { settings?: CollectSettings } };
};
const settings: CollectSettings = config.ci.collect.settings ?? {};

describe(".lighthouserc.json — collecte mobile acceptée par Lighthouse", () => {
  it("n'utilise qu'un préréglage reconnu par Lighthouse", () => {
    if (settings.preset !== undefined) {
      expect(LIGHTHOUSE_PRESETS as readonly string[]).toContain(settings.preset);
    }
  });

  it("reste une mesure mobile", () => {
    expect(settings.preset).not.toBe("desktop");
    expect([undefined, "mobile"]).toContain(settings.formFactor);
    if (settings.screenEmulation?.mobile !== undefined) expect(settings.screenEmulation.mobile).toBe(true);
  });

  it("est bien la configuration du workflow Lighthouse Mobile", () => {
    const workflow = readFileSync(join(ROOT, ".github", "workflows", "lighthouse.yml"), "utf8");
    expect(workflow).toContain("name: Lighthouse Mobile");
    expect(workflow).toContain("configPath: ./.lighthouserc.json");
  });
});
