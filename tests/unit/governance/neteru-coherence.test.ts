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

  it("LEXICON.md mentions all 7 active Neter (septuor, ADR-0010/0011 implemented mai 2026)", () => {
    const lexicon = read("docs/governance/LEXICON.md");
    for (const neter of EXPECTED_NETERU) {
      const titleCase = neter.charAt(0) + neter.slice(1).toLowerCase();
      expect(lexicon).toMatch(new RegExp(titleCase, "i"));
    }
    expect(lexicon).toMatch(/septuor/i);
    expect(lexicon).not.toMatch(/\bquartet\b/);
    expect(lexicon).not.toMatch(/\bTrio Divin\b/);
    // Phase 7+/8+ promotion : pré-réservé doit avoir disparu (sauf archives ADR)
    expect(lexicon).not.toMatch(/Imhotep[\s\S]{0,80}pré-réservé/i);
    expect(lexicon).not.toMatch(/Anubis[\s\S]{0,80}pré-réservé/i);
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
});
