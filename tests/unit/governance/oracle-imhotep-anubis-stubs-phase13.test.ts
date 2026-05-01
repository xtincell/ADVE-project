/**
 * Phase 13 — Imhotep & Anubis Oracle-only stubs (B9, ADRs 0017/0018).
 *
 * Verrouille (assertions structurelles + smoke runtime) :
 * 1. Services imhotep/anubis créés avec ≤ 3 fichiers chacun (HORS scope strict)
 * 2. Handlers retournent ImhotepCrewProgramPlaceholder / AnubisCommsPlanPlaceholder
 * 3. Status DORMANT_PRE_RESERVED explicite (pas d'activation latente)
 * 4. ADR refs documentés (0010+0017 Imhotep, 0011+0018 Anubis)
 * 5. **Cap 7 BRAINS preserved** : Imhotep/Anubis NON ajoutés à BRAINS const
 * 6. Pas de modèle Prisma propre (anti-doublon NEFER §3)
 *
 * Si ce test échoue → drift Phase 13 stubs ou activation prématurée. STOP.
 */

import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { draftCrewProgram } from "@/server/services/imhotep";
import { draftCommsPlan } from "@/server/services/anubis";

describe("Phase 13 Imhotep & Anubis Oracle-only stubs (B9)", () => {
  describe("Imhotep (ADR-0017 sortie partielle Oracle-only)", () => {
    it("draftCrewProgram returns DORMANT_PRE_RESERVED placeholder", async () => {
      const result = await draftCrewProgram({ strategyId: "test-strat" });
      expect(result.status).toBe("DORMANT_PRE_RESERVED");
      expect(result.placeholder).toMatch(/pré-réservé Imhotep/);
      expect(result.placeholder).toContain("ADR-0010");
      expect(result.placeholder).toContain("ADR-0017");
      expect(result.scaffoldedAt).toBeTruthy();
    });

    it("declares both ADR refs (0010 pré-réserve + 0017 sortie partielle)", async () => {
      const result = await draftCrewProgram({ strategyId: "test-strat" });
      expect(result.adrRefs).toContain("ADR-0010");
      expect(result.adrRefs).toContain("ADR-0017");
    });

    it("placeholder is sector-aware when sector provided", async () => {
      const result = await draftCrewProgram({
        strategyId: "test-strat",
        sector: "fintech",
      });
      expect(result.placeholder).toContain("fintech");
    });

    it("services/imhotep/ has ≤ 3 files (scope strict ADR-0017)", async () => {
      const files = await fs.readdir(
        join(process.cwd(), "src/server/services/imhotep"),
      );
      expect(files.length, `imhotep should have ≤ 3 files (got ${files.length})`).toBeLessThanOrEqual(3);
    });

    it("services/imhotep/types.ts documents 'cap 7 BRAINS respecté' invariant", async () => {
      const types = await fs.readFile(
        join(process.cwd(), "src/server/services/imhotep/types.ts"),
        "utf8",
      );
      expect(types).toContain("cap 7 BRAINS");
      expect(types).toMatch(/HORS scope strict/);
    });
  });

  describe("Anubis (ADR-0018 sortie partielle Oracle-only)", () => {
    it("draftCommsPlan returns DORMANT_PRE_RESERVED placeholder", async () => {
      const result = await draftCommsPlan({ strategyId: "test-strat" });
      expect(result.status).toBe("DORMANT_PRE_RESERVED");
      expect(result.placeholder).toMatch(/pré-réservé Anubis/);
      expect(result.placeholder).toContain("ADR-0011");
      expect(result.placeholder).toContain("ADR-0018");
    });

    it("declares both ADR refs (0011 pré-réserve + 0018 sortie partielle)", async () => {
      const result = await draftCommsPlan({ strategyId: "test-strat" });
      expect(result.adrRefs).toContain("ADR-0011");
      expect(result.adrRefs).toContain("ADR-0018");
    });

    it("placeholder is audience-aware when audience provided", async () => {
      const result = await draftCommsPlan({
        strategyId: "test-strat",
        audience: "founders-30s",
      });
      expect(result.placeholder).toContain("founders-30s");
    });

    it("services/anubis/ has ≤ 3 files (scope strict ADR-0018)", async () => {
      const files = await fs.readdir(
        join(process.cwd(), "src/server/services/anubis"),
      );
      expect(files.length, `anubis should have ≤ 3 files (got ${files.length})`).toBeLessThanOrEqual(3);
    });

    it("services/anubis/types.ts documents 'cap 7 BRAINS respecté' invariant", async () => {
      const types = await fs.readFile(
        join(process.cwd(), "src/server/services/anubis/types.ts"),
        "utf8",
      );
      expect(types).toContain("cap 7 BRAINS");
      expect(types).toMatch(/HORS scope strict/);
    });
  });

  describe("Cap 7 BRAINS preserved (anti-drift narratif majeur)", () => {
    it("BRAINS const inchangé par B9 — 5 actifs + 2 pré-réservés (I/A) + INFRASTRUCTURE", async () => {
      const manifest = await fs.readFile(
        join(process.cwd(), "src/server/governance/manifest.ts"),
        "utf8",
      );
      const brainsMatch = manifest.match(/BRAINS:\s*readonly\s+Brain\[\]\s*=\s*\[([\s\S]*?)\]/);
      expect(brainsMatch).toBeTruthy();
      const list = brainsMatch![1]!;
      // 5 actifs
      expect(list).toContain('"MESTOR"');
      expect(list).toContain('"ARTEMIS"');
      expect(list).toContain('"SESHAT"');
      expect(list).toContain('"THOT"');
      expect(list).toContain('"PTAH"');
      // 2 pré-réservés (statut inchangé — toujours dans BRAINS comme avant B9)
      expect(list).toContain('"IMHOTEP"');
      expect(list).toContain('"ANUBIS"');
      // INFRASTRUCTURE
      expect(list).toContain('"INFRASTRUCTURE"');
    });

    it("manifest core does NOT import imhotep/anubis services (no activation)", async () => {
      const manifest = await fs.readFile(
        join(process.cwd(), "src/server/governance/manifest.ts"),
        "utf8",
      );
      // Aucun import direct = pas d'activation runtime des stubs (ils sont
      // appelés via les sequences Phase 13 dormantes IMHOTEP-CREW / ANUBIS-COMMS,
      // pas par le manifest core)
      expect(manifest).not.toMatch(/from\s+["']@\/server\/services\/imhotep["']/);
      expect(manifest).not.toMatch(/from\s+["']@\/server\/services\/anubis["']/);
    });
  });

  describe("Anti-doublon NEFER §3 — pas de modèle Prisma propre", () => {
    it("schema.prisma does not define Imhotep* or Anubis* models", async () => {
      const schema = await fs.readFile(
        join(process.cwd(), "prisma/schema.prisma"),
        "utf8",
      );
      expect(schema).not.toMatch(/^model Imhotep/m);
      expect(schema).not.toMatch(/^model Anubis/m);
      expect(schema).not.toMatch(/^model CrewProgram/m);
      expect(schema).not.toMatch(/^model CommsPlan/m);
    });
  });
});
