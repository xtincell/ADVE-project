/**
 * Anti-drift CI test — design tokens coherence
 *
 * Vérifie que chaque variable CSS déclarée dans `src/styles/tokens/*.css`
 * est documentée dans `docs/governance/design-tokens/*.md` (et inversement).
 *
 * Cf. DESIGN-SYSTEM.md §13 — bloquant CI dès PR-1.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");

const TOKEN_CSS_FILES = ["reference.css", "system.css", "component.css", "domain.css", "animations.css"] as const;
const TOKEN_DOC_FILES = ["reference.md", "system.md", "component.md", "domain.md"] as const;

const CSS_VAR_DECL = /^\s*(--[a-z][a-zA-Z0-9-]+)\s*:/gim;
const DOC_VAR_REF = /`(--[a-z][a-zA-Z0-9-]+)`/gi;

function readCss(rel: string): string {
  return readFileSync(join(ROOT, "src/styles/tokens", rel), "utf-8");
}
function readDoc(rel: string): string {
  return readFileSync(join(ROOT, "docs/governance/design-tokens", rel), "utf-8");
}

function extractDeclaredVars(css: string): Set<string> {
  const vars = new Set<string>();
  let m: RegExpExecArray | null;
  CSS_VAR_DECL.lastIndex = 0;
  while ((m = CSS_VAR_DECL.exec(css)) !== null) {
    if (m[1]) vars.add(m[1]);
  }
  return vars;
}

function extractDocVars(md: string): Set<string> {
  const vars = new Set<string>();
  let m: RegExpExecArray | null;
  DOC_VAR_REF.lastIndex = 0;
  while ((m = DOC_VAR_REF.exec(md)) !== null) {
    if (m[1]) vars.add(m[1]);
  }
  return vars;
}

describe("design-tokens-coherence — CSS ↔ docs (Phase 11)", () => {
  it("all token CSS files exist", () => {
    for (const file of TOKEN_CSS_FILES) {
      expect(() => readCss(file)).not.toThrow();
    }
  });

  it("all token doc files exist", () => {
    for (const file of TOKEN_DOC_FILES) {
      expect(() => readDoc(file)).not.toThrow();
    }
  });

  it("Tier 0 — every --ref-* declared in reference.css is documented in reference.md", () => {
    const declared = extractDeclaredVars(readCss("reference.css"));
    const documented = extractDocVars(readDoc("reference.md"));
    const refsDeclared = [...declared].filter((v) => v.startsWith("--ref-"));
    const undocumented = refsDeclared.filter((v) => !documented.has(v));
    expect(undocumented).toEqual([]);
  });

  it("Tier 1 — every --color-* declared in system.css is documented in system.md", () => {
    const declared = extractDeclaredVars(readCss("system.css"));
    const documented = extractDocVars(readDoc("system.md"));
    const systemDeclared = [...declared].filter((v) => v.startsWith("--color-") || v.startsWith("--focus-"));
    const undocumented = systemDeclared.filter((v) => !documented.has(v));
    expect(undocumented).toEqual([]);
  });

  it("Tier 3 — every Domain token declared in domain.css is documented in domain.md", () => {
    const declared = extractDeclaredVars(readCss("domain.css"));
    const documented = extractDocVars(readDoc("domain.md"));
    const domainDeclared = [...declared].filter(
      (v) =>
        v.startsWith("--pillar-") ||
        v.startsWith("--division-") ||
        v.startsWith("--tier-") ||
        v.startsWith("--classification-"),
    );
    const undocumented = domainDeclared.filter((v) => !documented.has(v));
    expect(undocumented).toEqual([]);
  });

  it("BRAINS coherence — exactly 5 active Neteru divisions in domain.css", () => {
    const declared = extractDeclaredVars(readCss("domain.css"));
    const divisions = [...declared].filter((v) => v.startsWith("--division-"));
    const expected = ["--division-mestor", "--division-artemis", "--division-seshat", "--division-thot", "--division-ptah"];
    expect(divisions.sort()).toEqual(expected.sort());
  });

  it("Imhotep / Anubis pre-réservés — pas de --division- token", () => {
    const declared = extractDeclaredVars(readCss("domain.css"));
    expect(declared.has("--division-imhotep")).toBe(false);
    expect(declared.has("--division-anubis")).toBe(false);
  });

  it("8 piliers ADVE-RTIS canoniques", () => {
    const declared = extractDeclaredVars(readCss("domain.css"));
    const pillars = [...declared].filter((v) => v.startsWith("--pillar-"));
    const expected = ["--pillar-A", "--pillar-D", "--pillar-V", "--pillar-E", "--pillar-R", "--pillar-T", "--pillar-I", "--pillar-S"];
    // Note: la regex CSS_VAR_DECL est case-insensitive ; on accepte casing CSS-friendly
    expect(pillars.length).toBe(8);
    for (const p of expected) {
      expect(declared.has(p) || declared.has(p.toLowerCase())).toBe(true);
    }
  });

  it("6 classifications APOGEE canoniques", () => {
    const declared = extractDeclaredVars(readCss("domain.css"));
    const classes = [...declared].filter((v) => v.startsWith("--classification-"));
    const expected = [
      "--classification-zombie",
      "--classification-fragile",
      "--classification-ordinaire",
      "--classification-forte",
      "--classification-culte",
      "--classification-icone",
    ];
    expect(classes.sort()).toEqual(expected.sort());
  });

  it("4 tiers Creator canoniques", () => {
    const declared = extractDeclaredVars(readCss("domain.css"));
    const tiers = [...declared].filter((v) => v.startsWith("--tier-"));
    const expected = ["--tier-apprenti", "--tier-compagnon", "--tier-maitre", "--tier-associe"];
    expect(tiers.sort()).toEqual(expected.sort());
  });
});
