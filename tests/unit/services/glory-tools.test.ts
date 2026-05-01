import { describe, it, expect } from "vitest";
import {
  ALL_GLORY_TOOLS,
  getGloryTool,
  getToolsByLayer,
  getToolsByPillar,
  getToolsByDriver,
  getBrandPipeline,
  getBrandPipelineDependencyOrder,
} from "@/server/services/glory-tools/registry";
import { suggestTools } from "@/server/services/glory-tools/index";

// ============================================================
// Registre des outils GLORY (40 legacy + 7 Phase 13 Oracle = 47)
// ============================================================
describe("GLORY Tools — Registre", () => {
  it("doit contenir exactement 49 outils (40 legacy + 9 Phase 13 Oracle)", () => {
    expect(ALL_GLORY_TOOLS).toHaveLength(49);
  });

  it("doit avoir des slugs uniques", () => {
    const slugs = ALL_GLORY_TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(49);
  });

  it("doit avoir un nom non vide pour chaque outil", () => {
    for (const tool of ALL_GLORY_TOOLS) {
      expect(tool.name.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir une description non vide pour chaque outil", () => {
    for (const tool of ALL_GLORY_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir un promptTemplate non vide pour chaque outil", () => {
    for (const tool of ALL_GLORY_TOOLS) {
      expect(tool.promptTemplate.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des inputFields pour chaque outil", () => {
    for (const tool of ALL_GLORY_TOOLS) {
      expect(tool.inputFields.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir un outputFormat non vide pour chaque outil", () => {
    for (const tool of ALL_GLORY_TOOLS) {
      expect(tool.outputFormat.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// 4 Layers avec distribution correcte (post Phase 13 — 7 nouveaux DC tools Oracle)
// ============================================================
describe("GLORY Tools — 4 Layers", () => {
  it("doit avoir 10 outils dans la couche CR (Concepteur-Redacteur)", () => {
    expect(getToolsByLayer("CR")).toHaveLength(10);
  });

  it("doit avoir 18 outils dans la couche DC (Direction de Creation, +9 Phase 13)", () => {
    // 9 legacy DC + 9 Phase 13 Oracle (mckinsey-7s, bcg-portfolio, mckinsey-3-horizons,
    // overton-window, cult-index-scorer, bain-nps-calculator, tarsis-signal-detector,
    // superfan-journey-mapper, engagement-rituals-designer)
    expect(getToolsByLayer("DC")).toHaveLength(18);
  });

  it("doit avoir 11 outils dans la couche HYBRID (Operations)", () => {
    expect(getToolsByLayer("HYBRID")).toHaveLength(11);
  });

  it("doit avoir 10 outils dans la couche BRAND (Pipeline Identite Visuelle, inchangé)", () => {
    expect(getToolsByLayer("BRAND")).toHaveLength(10);
  });

  it("la somme des layers doit egaliser 49 (40 legacy + 9 Phase 13)", () => {
    const total =
      getToolsByLayer("CR").length +
      getToolsByLayer("DC").length +
      getToolsByLayer("HYBRID").length +
      getToolsByLayer("BRAND").length;
    expect(total).toBe(49);
  });

  it("doit trier les outils par ordre au sein de chaque layer", () => {
    for (const layer of ["CR", "DC", "HYBRID", "BRAND"] as const) {
      const tools = getToolsByLayer(layer);
      for (let i = 1; i < tools.length; i++) {
        expect(tools[i - 1]!.order).toBeLessThanOrEqual(tools[i]!.order);
      }
    }
  });
});

// ============================================================
// Lookup par Slug
// ============================================================
describe("GLORY Tools — Lookup par Slug", () => {
  it("doit trouver un outil par son slug", () => {
    const tool = getGloryTool("concept-generator");
    expect(tool).toBeDefined();
    expect(tool!.name).toBe("Générateur de Concepts");
    expect(tool!.layer).toBe("CR");
  });

  it("doit retourner undefined pour un slug inconnu", () => {
    const tool = getGloryTool("outil-inexistant");
    expect(tool).toBeUndefined();
  });

  it("doit trouver le premier outil BRAND", () => {
    const tool = getGloryTool("semiotic-brand-analyzer");
    expect(tool).toBeDefined();
    expect(tool!.layer).toBe("BRAND");
    expect(tool!.order).toBe(31);
  });
});

// ============================================================
// Lookup par Pillar
// ============================================================
describe("GLORY Tools — Lookup par Pilier", () => {
  it("doit trouver des outils pour le pilier D (Distinction)", () => {
    const tools = getToolsByPillar("D");
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.pillarKeys).toContain("D");
    }
  });

  it("doit trouver des outils pour le pilier I (Implementation)", () => {
    const tools = getToolsByPillar("I");
    expect(tools.length).toBeGreaterThan(0);
  });

  it("doit retourner un tableau vide pour un pilier inexistant", () => {
    const tools = getToolsByPillar("Z");
    expect(tools).toHaveLength(0);
  });
});

// ============================================================
// Lookup par Driver
// ============================================================
describe("GLORY Tools — Lookup par Driver", () => {
  it("doit trouver des outils pour le driver INSTAGRAM", () => {
    const tools = getToolsByDriver("INSTAGRAM");
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.requiredDrivers).toContain("INSTAGRAM");
    }
  });

  it("doit trouver des outils pour le driver VIDEO", () => {
    const tools = getToolsByDriver("VIDEO");
    expect(tools.length).toBeGreaterThan(0);
  });

  it("doit retourner un tableau vide pour un driver inexistant", () => {
    const tools = getToolsByDriver("SNAPCHAT");
    expect(tools).toHaveLength(0);
  });
});

// ============================================================
// Pipeline BRAND (dependances sequentielles)
// ============================================================
describe("GLORY Tools — Pipeline BRAND", () => {
  it("doit contenir 10 outils dans le pipeline BRAND", () => {
    const pipeline = getBrandPipeline();
    expect(pipeline).toHaveLength(10);
  });

  it("doit retourner les outils tries par ordre", () => {
    const pipeline = getBrandPipeline();
    for (let i = 1; i < pipeline.length; i++) {
      expect(pipeline[i - 1]!.order).toBeLessThanOrEqual(pipeline[i]!.order);
    }
  });

  it("doit calculer l'ordre de dependance du pipeline BRAND", () => {
    const order = getBrandPipelineDependencyOrder();
    expect(order.length).toBe(10);
  });

  it("doit placer semiotic-brand-analyzer avant visual-landscape-mapper", () => {
    const order = getBrandPipelineDependencyOrder();
    const idxSemiotic = order.indexOf("semiotic-brand-analyzer");
    const idxLandscape = order.indexOf("visual-landscape-mapper");
    expect(idxSemiotic).toBeLessThan(idxLandscape);
  });

  it("doit placer chromatic-strategy-builder avant typography-system-architect", () => {
    const order = getBrandPipelineDependencyOrder();
    const idxChromatic = order.indexOf("chromatic-strategy-builder");
    const idxTypo = order.indexOf("typography-system-architect");
    expect(idxChromatic).toBeLessThan(idxTypo);
  });

  it("doit placer brand-guidelines-generator en dernier", () => {
    const order = getBrandPipelineDependencyOrder();
    expect(order[order.length - 1]).toBe("brand-guidelines-generator");
  });

  it("doit respecter toutes les dependances dans l'ordre", () => {
    const order = getBrandPipelineDependencyOrder();
    const pipeline = getBrandPipeline();
    for (const tool of pipeline) {
      const toolIdx = order.indexOf(tool.slug);
      for (const dep of tool.dependencies) {
        // Les dependances qui sont dans le pipeline doivent etre avant
        const depIdx = order.indexOf(dep);
        if (depIdx !== -1) {
          expect(depIdx).toBeLessThan(toolIdx);
        }
      }
    }
  });
});

// ============================================================
// Algorithme de suggestion d'outils
// ============================================================
describe("GLORY Tools — Algorithme de Suggestion", () => {
  it("doit retourner au maximum 10 suggestions", () => {
    const suggestions = suggestTools(["D", "A"], ["INSTAGRAM"], "ACTIVE");
    expect(suggestions.length).toBeLessThanOrEqual(10);
  });

  it("doit prioriser les outils alignes avec les piliers faibles", () => {
    const suggestions = suggestTools(["D"], [], "ACTIVE");
    // Les outils avec pilier D doivent etre bien classes
    const topTools = suggestions.slice(0, 5);
    const hasPillarD = topTools.some((t) => t.pillarKeys.includes("D"));
    expect(hasPillarD).toBe(true);
  });

  it("doit prioriser les outils BRAND en phase BOOT", () => {
    const suggestions = suggestTools([], [], "BOOT");
    const brandTools = suggestions.filter((t) => t.layer === "BRAND");
    expect(brandTools.length).toBeGreaterThan(0);
  });

  it("doit prioriser les outils CR en phase QUICK_INTAKE", () => {
    const suggestions = suggestTools([], [], "QUICK_INTAKE");
    const crTools = suggestions.filter((t) => t.layer === "CR");
    expect(crTools.length).toBeGreaterThan(0);
  });

  it("doit prioriser les outils HYBRID en phase ACTIVE", () => {
    const suggestions = suggestTools([], [], "ACTIVE");
    const hybridTools = suggestions.filter((t) => t.layer === "HYBRID");
    expect(hybridTools.length).toBeGreaterThan(0);
  });

  it("doit prioriser les outils correspondant aux drivers actifs", () => {
    const suggestions = suggestTools([], ["INSTAGRAM", "TIKTOK"], "ACTIVE");
    const socialTools = suggestions.filter((t) =>
      t.requiredDrivers.some((d) => ["INSTAGRAM", "TIKTOK"].includes(d))
    );
    expect(socialTools.length).toBeGreaterThan(0);
  });

  it("doit retourner des resultats meme sans criteres", () => {
    const suggestions = suggestTools([], [], "ACTIVE");
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
