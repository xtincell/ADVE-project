/**
 * Phase 13 R6 — I18n FR/EN câblage t() keys (closure résidu B8/B5).
 *
 * Verrouille :
 * 1. fr.ts + en.ts contiennent les ~17 clés Phase 13 (oracle.forge.*, oracle.tier.*,
 *    oracle.dormant.*, oracle.section.*)
 * 2. Parité FR/EN : chaque clé FR existe en EN (pas de drift translation)
 * 3. PtahForgeButton consomme useT() et utilise les clés t("oracle.forge.*")
 *
 * Si ce test échoue → drift Phase 13 R6. STOP, retour Phase 2 NEFER.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fr } from "@/lib/i18n/fr";
import { en } from "@/lib/i18n/en";

const PHASE13_KEYS = [
  "oracle.forge.button.image",
  "oracle.forge.button.video",
  "oracle.forge.button.audio",
  "oracle.forge.button.icon",
  "oracle.forge.button.design",
  "oracle.forge.button.pending",
  "oracle.forge.dialog.title",
  "oracle.forge.dialog.cancel",
  "oracle.forge.dialog.confirm",
  "oracle.forge.result.heading",
  "oracle.forge.result.async_note",
  "oracle.section.empty",
  "oracle.tier.core",
  "oracle.tier.big4",
  "oracle.tier.distinctive",
  "oracle.tier.dormant",
  "oracle.dormant.imhotep.title",
  "oracle.dormant.imhotep.activation",
  "oracle.dormant.anubis.title",
  "oracle.dormant.anubis.activation",
  "oracle.dormant.cap_warning",
] as const;

describe("Phase 13 R6 — i18n FR/EN keys", () => {
  describe("FR canonique (fr.ts)", () => {
    it("contient les 21 clés Phase 13", () => {
      for (const key of PHASE13_KEYS) {
        expect((fr as Record<string, string>)[key], `missing FR key: ${key}`).toBeTruthy();
      }
    });

    it("forge button keys correspond aux 5 forgeKind possibles", () => {
      const forgeKinds = ["image", "video", "audio", "icon", "design"] as const;
      for (const kind of forgeKinds) {
        const key = `oracle.forge.button.${kind}`;
        expect((fr as Record<string, string>)[key]).toMatch(/^Forger /);
      }
    });

    it("dormant keys référencent les bonnes activations Phase 7+/8+", () => {
      expect((fr as Record<string, string>)["oracle.dormant.imhotep.activation"]).toMatch(
        /Phase 7\+/,
      );
      expect((fr as Record<string, string>)["oracle.dormant.anubis.activation"]).toMatch(
        /Phase 8\+/,
      );
    });

    it("cap_warning mentionne explicitement 'cap 7 BRAINS'", () => {
      expect((fr as Record<string, string>)["oracle.dormant.cap_warning"]).toContain(
        "cap 7 BRAINS",
      );
    });
  });

  describe("EN parité (en.ts)", () => {
    it("contient les 21 clés Phase 13 (parité FR)", () => {
      for (const key of PHASE13_KEYS) {
        expect((en as Record<string, string>)[key], `missing EN key: ${key}`).toBeTruthy();
      }
    });

    it("forge button keys traduits", () => {
      expect((en as Record<string, string>)["oracle.forge.button.image"]).toBe("Forge image");
      expect((en as Record<string, string>)["oracle.forge.button.design"]).toBe("Forge deck");
    });

    it("EN cap_warning mentionne '7 BRAINS cap preserved'", () => {
      expect((en as Record<string, string>)["oracle.dormant.cap_warning"]).toContain(
        "7 BRAINS cap preserved",
      );
    });
  });

  describe("Pas de clé Phase 13 manquante (FR ⇄ EN)", () => {
    it("toutes les clés FR Phase 13 existent en EN", () => {
      for (const key of PHASE13_KEYS) {
        expect((fr as Record<string, string>)[key], `FR ${key}`).toBeTruthy();
        expect((en as Record<string, string>)[key], `EN ${key} (parity drift)`).toBeTruthy();
      }
    });
  });

  describe("PtahForgeButton consomme useT() (B8 + R6)", () => {
    let buttonSource = "";

    it("loads ptah-forge-button.tsx source", async () => {
      buttonSource = await fs.readFile(
        join(process.cwd(), "src/components/neteru/ptah-forge-button.tsx"),
        "utf8",
      );
      expect(buttonSource.length).toBeGreaterThan(0);
    });

    it("imports useT from i18n module", () => {
      expect(buttonSource).toMatch(/import\s+\{\s*useT\s*\}\s+from\s+["']@\/lib\/i18n\/use-t["']/);
    });

    it("appelle useT() au début du composant", () => {
      expect(buttonSource).toMatch(/const\s*\{\s*t\s*\}\s*=\s*useT\(\)/);
    });

    it("utilise t() pour les 5 strings i18n principaux (button.<kind>, button.pending, dialog.title/cancel/confirm)", () => {
      expect(buttonSource).toMatch(/t\(`oracle\.forge\.button\.\$\{forgeKind\}`\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.button\.pending["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.dialog\.title["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.dialog\.cancel["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.dialog\.confirm["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.result\.heading["']\)/);
      expect(buttonSource).toMatch(/t\(["']oracle\.forge\.result\.async_note["']\)/);
    });
  });
});
