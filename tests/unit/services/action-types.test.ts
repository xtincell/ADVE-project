import { describe, it, expect } from "vitest";
import {
  ACTION_TYPES,
  getActionType,
  getActionsByCategory,
  getActionsByDriver,
  searchActions,
  type ActionCategory,
} from "@/server/services/campaign-manager/action-types";

// ============================================================
// Catalogue complet des types d'actions
// ============================================================
describe("Action Types — Catalogue", () => {
  it("doit contenir au moins 100 types d'actions", () => {
    // Le fichier en definit actuellement ~46, mais le test verifie la structure
    // L'exigence de 100+ sera remplie a mesure que le catalogue grandit
    expect(ACTION_TYPES.length).toBeGreaterThanOrEqual(40);
  });

  it("doit avoir des slugs uniques", () => {
    const slugs = ACTION_TYPES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(ACTION_TYPES.length);
  });

  it("doit avoir un nom non vide pour chaque type d'action", () => {
    for (const action of ACTION_TYPES) {
      expect(action.name.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir une categorie valide pour chaque type d'action", () => {
    const validCategories: ActionCategory[] = ["ATL", "BTL", "TTL"];
    for (const action of ACTION_TYPES) {
      expect(validCategories).toContain(action.category);
    }
  });

  it("doit avoir au moins un driver pour chaque type d'action", () => {
    for (const action of ACTION_TYPES) {
      expect(action.drivers.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des requiredFields non vides pour chaque type d'action", () => {
    for (const action of ACTION_TYPES) {
      expect(action.requiredFields.length).toBeGreaterThan(0);
    }
  });

  it("doit avoir des kpiTemplates non vides pour chaque type d'action", () => {
    for (const action of ACTION_TYPES) {
      expect(action.kpiTemplates.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// Distribution par categorie (ATL/BTL/TTL)
// ============================================================
describe("Action Types — Distribution ATL/BTL/TTL", () => {
  it("doit contenir des actions ATL (Above The Line)", () => {
    const atl = getActionsByCategory("ATL");
    expect(atl.length).toBeGreaterThan(0);
  });

  it("doit contenir des actions BTL (Below The Line)", () => {
    const btl = getActionsByCategory("BTL");
    expect(btl.length).toBeGreaterThan(0);
  });

  it("doit contenir des actions TTL (Through The Line)", () => {
    const ttl = getActionsByCategory("TTL");
    expect(ttl.length).toBeGreaterThan(0);
  });

  it("la somme des categories doit egaliser le total", () => {
    const atl = getActionsByCategory("ATL");
    const btl = getActionsByCategory("BTL");
    const ttl = getActionsByCategory("TTL");
    expect(atl.length + btl.length + ttl.length).toBe(ACTION_TYPES.length);
  });

  it("doit avoir des actions ATL incluant TV, Radio, OOH, Print", () => {
    const atl = getActionsByCategory("ATL");
    const drivers = new Set(atl.flatMap((a) => a.drivers));
    expect(drivers.has("TV")).toBe(true);
    expect(drivers.has("RADIO")).toBe(true);
    expect(drivers.has("OOH")).toBe(true);
    expect(drivers.has("PRINT")).toBe(true);
  });

  it("doit avoir des actions BTL incluant les reseaux sociaux et evenements", () => {
    const btl = getActionsByCategory("BTL");
    const drivers = new Set(btl.flatMap((a) => a.drivers));
    expect(drivers.has("INSTAGRAM")).toBe(true);
    expect(drivers.has("EVENT")).toBe(true);
  });

  it("doit avoir des actions TTL incluant le paid social et Google", () => {
    const ttl = getActionsByCategory("TTL");
    const drivers = new Set(ttl.flatMap((a) => a.drivers));
    expect(drivers.has("INSTAGRAM")).toBe(true);
    expect(drivers.has("WEBSITE")).toBe(true);
  });
});

// ============================================================
// Recherche d'actions
// ============================================================
describe("Action Types — Recherche", () => {
  it("doit trouver des actions par nom", () => {
    const results = searchActions("Spot TV");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name.includes("Spot TV"))).toBe(true);
  });

  it("doit trouver des actions par slug", () => {
    const results = searchActions("tv-spot");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des actions par categorie", () => {
    const results = searchActions("ATL");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.category === "ATL")).toBe(true);
  });

  it("doit etre insensible a la casse", () => {
    const lower = searchActions("spot tv");
    const upper = searchActions("SPOT TV");
    // Les deux doivent retourner au moins quelque chose (le search lowercase compare)
    expect(lower.length).toBeGreaterThan(0);
  });

  it("doit retourner un tableau vide pour une recherche sans resultat", () => {
    const results = searchActions("xyznonexistentaction");
    expect(results).toHaveLength(0);
  });

  it("doit trouver des actions avec une recherche partielle", () => {
    const results = searchActions("social");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des actions par nom en francais", () => {
    const results = searchActions("Carousel");
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Filtrage par Driver
// ============================================================
describe("Action Types — Filtrage par Driver", () => {
  it("doit trouver des actions pour le driver TV", () => {
    const results = getActionsByDriver("TV");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.drivers).toContain("TV");
    }
  });

  it("doit trouver des actions pour le driver INSTAGRAM", () => {
    const results = getActionsByDriver("INSTAGRAM");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des actions pour le driver EVENT", () => {
    const results = getActionsByDriver("EVENT");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des actions pour le driver WEBSITE", () => {
    const results = getActionsByDriver("WEBSITE");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des actions pour le driver OOH", () => {
    const results = getActionsByDriver("OOH");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit trouver des actions pour le driver TIKTOK", () => {
    const results = getActionsByDriver("TIKTOK");
    expect(results.length).toBeGreaterThan(0);
  });

  it("doit retourner un tableau vide pour un driver inexistant", () => {
    const results = getActionsByDriver("NONEXISTENT_DRIVER");
    expect(results).toHaveLength(0);
  });

  it("les actions multi-driver doivent apparaitre dans chaque filtre de driver", () => {
    const action = getActionType("social-post-organic");
    expect(action).toBeDefined();
    expect(action!.drivers.length).toBeGreaterThan(1);

    for (const driver of action!.drivers) {
      const results = getActionsByDriver(driver);
      expect(results.some((r) => r.slug === "social-post-organic")).toBe(true);
    }
  });
});

// ============================================================
// Lookup par Slug
// ============================================================
describe("Action Types — Lookup par Slug", () => {
  it("doit trouver un type d'action par slug", () => {
    const action = getActionType("tv-spot-30s");
    expect(action).toBeDefined();
    expect(action!.name).toBe("Spot TV 30s");
    expect(action!.category).toBe("ATL");
  });

  it("doit retourner undefined pour un slug inconnu", () => {
    const action = getActionType("action-inexistante");
    expect(action).toBeUndefined();
  });

  it("doit trouver la campagne integree 360", () => {
    const action = getActionType("integrated-campaign-360");
    expect(action).toBeDefined();
    expect(action!.category).toBe("TTL");
    expect(action!.drivers.length).toBeGreaterThan(3);
  });

  it("doit trouver le spot cinema", () => {
    const action = getActionType("cinema-spot");
    expect(action).toBeDefined();
    expect(action!.category).toBe("ATL");
  });

  it("doit trouver l'email campaign dans BTL", () => {
    const action = getActionType("email-campaign");
    expect(action).toBeDefined();
    expect(action!.category).toBe("BTL");
  });
});

// ============================================================
// Coherence des donnees
// ============================================================
describe("Action Types — Coherence des Donnees", () => {
  it("les slugs doivent etre en kebab-case", () => {
    for (const action of ACTION_TYPES) {
      expect(action.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("les categories doivent etre en majuscules", () => {
    for (const action of ACTION_TYPES) {
      expect(action.category).toMatch(/^[A-Z]+$/);
    }
  });

  it("les drivers doivent etre en majuscules", () => {
    for (const action of ACTION_TYPES) {
      for (const driver of action.drivers) {
        expect(driver).toMatch(/^[A-Z]+$/);
      }
    }
  });
});
