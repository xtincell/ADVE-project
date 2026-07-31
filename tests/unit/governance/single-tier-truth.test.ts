/**
 * V5 « un seul palier » — le palier OFFICIEL fait foi partout.
 *
 * ── La dette (registre RESIDUAL-DEBT, « Cohérence de palier — partielle ») ──
 *
 * `Strategy.apogeeTier` est un ratchet mû par transition gouvernée (ADR-0167,
 * Loi 1 « conservation d'altitude »). Une douzaine de surfaces dérivaient
 * pourtant le palier du SEUL score via `classifyTier` : après une promotion
 * gouvernée suivie d'une baisse de score, elles affichaient l'ancien palier
 * pendant que les autres affichaient le nouveau. La Loi 1 ne tenait que sur
 * une partie des écrans — et le verrou CI n'interdisait `classifyTier` que
 * sous `src/server/mcp`.
 *
 * Le pire cas était le **widget public** : la régression silencieuse était
 * visible chez le client, sur son propre site.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/**
 * Surfaces qui AFFICHENT un palier de marque : elles doivent servir
 * `effectiveTier` (officiel s'il est posé, dérivé sinon), jamais `classifyTier`
 * nu. Ajouter une entrée ici quand un nouvel écran affiche un palier.
 */
const TIER_DISPLAY_SURFACES = [
  "src/app/api/widget/score/route.ts",
  "src/app/(console)/console/strategy-portfolio/brands/page.tsx",
  "src/components/cockpit/strategy-selector.tsx",
];

describe("un seul palier — les surfaces d'affichage servent l'officiel", () => {
  it.each(TIER_DISPLAY_SURFACES)("%s consomme effectiveTier", (rel) => {
    const src = readFileSync(join(ROOT, rel), "utf-8");
    expect(src, `${rel} doit importer/appeler effectiveTier`).toContain("effectiveTier");
  });

  it.each(TIER_DISPLAY_SURFACES)("%s n'appelle plus classifyTier nu", (rel) => {
    const src = readFileSync(join(ROOT, rel), "utf-8");
    // `classifyTier` reste légitime DANS `effectiveTier` (domain) — pas ici.
    expect(src).not.toMatch(/\bclassifyTier\s*\(/);
  });

  it("le widget PUBLIC lit le palier officiel de la stratégie", () => {
    // Le cas le plus visible : la régression s'affichait chez le client.
    const src = readFileSync(join(ROOT, "src/app/api/widget/score/route.ts"), "utf-8");
    expect(src).toContain("apogeeTier");
  });
});
