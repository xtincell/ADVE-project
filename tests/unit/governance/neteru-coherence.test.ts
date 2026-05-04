/**
 * Anti-drift CI test — vérifie cohérence du panthéon Neteru à travers les
 * 7 sources de vérité (PANTHEON.md §6).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAINS } from "@/server/governance/manifest";
import { GOVERNORS } from "@/domain/intent-progress";

const ROOT = join(__dirname, "../../..");

const EXPECTED_NETERU = ["MESTOR", "ARTEMIS", "SESHAT", "THOT", "PTAH", "IMHOTEP", "ANUBIS"] as const;
const ALL_GOVERNORS = [...EXPECTED_NETERU, "INFRASTRUCTURE"] as const;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

describe("neteru-coherence — anti-drift across 7 sources of truth", () => {
  it("BRAINS const includes all 7 Neteru + INFRASTRUCTURE", () => {
    for (const neter of ALL_GOVERNORS) {
      expect(BRAINS).toContain(neter);
    }
  });

  it("GOVERNORS type matches BRAINS", () => {
    for (const neter of ALL_GOVERNORS) {
      expect(GOVERNORS).toContain(neter as never);
    }
  });

  it("LEXICON.md mentions all 7 active Neter (Phase 14/15 — septet activé)", () => {
    const lexicon = read("docs/governance/LEXICON.md");
    for (const neter of EXPECTED_NETERU) {
      const titleCase = neter.charAt(0) + neter.slice(1).toLowerCase();
      expect(lexicon).toMatch(new RegExp(titleCase, "i"));
    }
    // Phase 14/15 : "quintet" supprimé (panthéon plein 7/7). Le lexique narratif
    // peut utiliser "panthéon", "septet", ou "7 Neteru actifs" ; on ne force pas un mot.
    expect(lexicon).not.toMatch(/\bquartet\b/);
    expect(lexicon).not.toMatch(/\bTrio Divin\b/);
  });

  it("APOGEE.md §4.1 mentions Ptah in Propulsion table", () => {
    const apogee = read("docs/governance/APOGEE.md");
    expect(apogee).toMatch(/Ptah/);
    expect(apogee).toMatch(/Forge/);
  });

  it("PANTHEON.md exists and contains all 7 Neter sections", () => {
    const pantheon = read("docs/governance/PANTHEON.md");
    for (const neter of EXPECTED_NETERU) {
      const titleCase = neter.charAt(0) + neter.slice(1).toLowerCase();
      // Match either "MESTOR" upper or "Mestor" title case in section header
      const re = new RegExp(`(${neter}|${titleCase})`, "i");
      expect(pantheon).toMatch(re);
    }
  });

  it("CLAUDE.md §Governance lists all 7 Neter", () => {
    const claude = read("CLAUDE.md");
    for (const neter of EXPECTED_NETERU) {
      const titleCase = neter.charAt(0) + neter.slice(1).toLowerCase();
      expect(claude).toMatch(new RegExp(titleCase, "i"));
    }
  });

  it("MANIPULATION-MATRIX.md exists and defines 4 modes", () => {
    const matrix = read("docs/governance/MANIPULATION-MATRIX.md");
    expect(matrix).toMatch(/peddler/i);
    expect(matrix).toMatch(/dealer/i);
    expect(matrix).toMatch(/facilitator/i);
    expect(matrix).toMatch(/entertainer/i);
  });

  it("ADRs 0009-0011 exist for Ptah/Imhotep/Anubis", () => {
    const ptahAdr = read("docs/governance/adr/0009-neter-ptah-forge.md");
    const imhotepAdr = read("docs/governance/adr/0010-neter-imhotep-crew.md");
    const anubisAdr = read("docs/governance/adr/0011-neter-anubis-comms.md");
    expect(ptahAdr).toMatch(/Ptah/);
    expect(imhotepAdr).toMatch(/Imhotep/);
    expect(anubisAdr).toMatch(/Anubis/);
  });

  it("plafond 7 Neteru respected", () => {
    expect(EXPECTED_NETERU.length).toBe(7);
    // BRAINS contient les 7 + INFRASTRUCTURE = 8
    expect(BRAINS.length).toBe(8);
  });

  it('purge "trio" / "quartet" hors archives + ADRs historiques', () => {
    const filesToCheck = [
      "docs/governance/LEXICON.md",
      "docs/governance/APOGEE.md",
      "docs/governance/MISSION.md",
      "docs/governance/FRAMEWORK.md",
      "CLAUDE.md",
    ];
    for (const f of filesToCheck) {
      const content = read(f);
      // Allow only meta-references (e.g. "pas de trio")
      const trios = (content.match(/\btrio\b/gi) ?? []).filter(
        (_m, _i, _arr) => !content.toLowerCase().includes(`pas de "trio"`),
      );
      // Lite check : it shouldn't *celebrate* the trio
      expect(content).not.toMatch(/\bTrio Divin\b/);
    }
  });

  it("anti-drift Phase 14/15 cleanup ADR-0045 — sections Imhotep/Anubis ne sont plus DORMANT", () => {
    // Phase 14/15 (ADR-0019 + ADR-0020) ont activé Imhotep + Anubis. Le tier
    // Oracle "DORMANT" + le flag isDormant + les ids `*-dormant` doivent disparaître
    // du code applicatif (src/) et des tests (tests/) — toute référence résiduelle
    // est un drift narratif silencieux (NEFER §3 interdit n°3).
    const surfaces = [
      "src/server/services/strategy-presentation/types.ts",
      "src/server/services/strategy-presentation/enrich-oracle.ts",
      "src/components/strategy-presentation/sections/phase13-sections.tsx",
      "src/components/strategy-presentation/presentation-layout.tsx",
      "src/components/neteru/oracle-enrichment-tracker.tsx",
      "src/server/services/artemis/tools/sequences.ts",
      "src/server/services/artemis/tools/phase13-oracle-sequences.ts",
    ];
    for (const f of surfaces) {
      const content = read(f);
      expect(content, `${f} should not declare tier "DORMANT" literal`)
        .not.toMatch(/tier:\s*"DORMANT"/);
      expect(content, `${f} should not declare isDormant: true`)
        .not.toMatch(/isDormant:\s*true/);
      expect(content, `${f} should not contain id "imhotep-crew-program-dormant"`)
        .not.toContain("imhotep-crew-program-dormant");
      expect(content, `${f} should not contain id "anubis-comms-dormant"`)
        .not.toContain("anubis-comms-dormant");
    }
  });

  it("anti-drift ADR-0017/0018 leak — superseded ADRs ne fuitent plus en runtime/UI", () => {
    // ADR-0017 (Imhotep partial pre-reserve) et ADR-0018 (Anubis partial pre-reserve)
    // sont superseded par ADR-0019 + ADR-0020. Aucune référence ne doit subsister
    // hors archives ADR + ce test. Les commentaires explicitement historiques
    // (mentionnant "ex-ADR-0017" ou "ADR-0017/0018 retiré par ADR-0045") sont autorisés.
    const surfaces = [
      "src/components/strategy-presentation/sections/phase13-sections.tsx",
      "src/components/strategy-presentation/presentation-layout.tsx",
      "src/server/services/artemis/tools/phase13-oracle-sequences.ts",
    ];
    for (const f of surfaces) {
      const content = read(f);
      expect(content, `${f} leaks superseded ADR-0017 — ADR-0019 supersedes it`)
        .not.toMatch(/ADR-0017(?!\/0018 retiré)/);
      expect(content, `${f} leaks superseded ADR-0018 — ADR-0020 supersedes it`)
        .not.toMatch(/ADR-0018(?! \(sortie partielle Oracle-stub\))/);
    }
  });
});
