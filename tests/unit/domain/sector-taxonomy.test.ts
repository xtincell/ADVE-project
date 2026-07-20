/**
 * Taxonomie de secteurs canonique — la clé de ligue universelle (mots-clés).
 * Deux concurrents réels partagent une ligue ; le texte libre n'y fragmente rien.
 */
import { describe, it, expect } from "vitest";
import {
  classifyCanonicalSector,
  canonicalSectorSlug,
  SECTOR_TAXONOMY,
} from "@/domain/sector-taxonomy";
import { INTAKE_SECTOR_VALUES } from "@/lib/constants/intake-options";

describe("classifyCanonicalSector — mots-clés pertinents, déterministe", () => {
  it("texte libre Motion19 → culture (audiovisuel + créateurs)", () => {
    expect(canonicalSectorSlug("Équipement audiovisuel & créateurs")).toBe("culture");
  });
  it("deux graphies du même secteur → la même ligue", () => {
    expect(canonicalSectorSlug("Équipement audiovisuel & créateurs")).toBe(
      canonicalSectorSlug("equipement audiovisuel et createurs"),
    );
  });
  it("Panzani (pâtes) → food", () => {
    expect(canonicalSectorSlug("Pâtes alimentaires")).toBe("food");
    expect(canonicalSectorSlug("Alimentation & boissons")).toBe("food");
  });
  it("code canon direct → ce secteur (idempotent)", () => {
    expect(classifyCanonicalSector("FOOD").slug).toBe("food");
    expect(classifyCanonicalSector("TELECOM").slug).toBe("telecom");
  });
  it("secteurs distincts → slugs distincts", () => {
    expect(canonicalSectorSlug("Banque & microfinance")).toBe("banque");
    expect(canonicalSectorSlug("Opérateur mobile / fibre")).toBe("telecom");
    expect(canonicalSectorSlug("École de formation")).toBe("education");
  });
  it("mot entier — pas de faux positif (art ⊄ carte)", () => {
    // "carte" ne doit PAS matcher le mot-clé "artiste"/"art…" de CULTURE.
    expect(canonicalSectorSlug("Cartes bancaires")).not.toBe("culture");
  });
  it("inconnu / vide → autre (jamais de clé libre)", () => {
    expect(canonicalSectorSlug("zzz qqq")).toBe("autre");
    expect(canonicalSectorSlug(null)).toBe("autre");
    expect(canonicalSectorSlug("")).toBe("autre");
  });
  it("déterministe : deux appels = même sortie", () => {
    const a = canonicalSectorSlug("Distribution & retail e-commerce");
    const b = canonicalSectorSlug("Distribution & retail e-commerce");
    expect(a).toBe(b);
    expect(a).toBe("retail");
  });
});

describe("sync taxonomie ⊇ INTAKE_SECTORS (pas de code orphelin)", () => {
  it("chaque code d'intake existe dans la taxonomie canon", () => {
    const codes = new Set(SECTOR_TAXONOMY.map((s) => s.code));
    const missing = INTAKE_SECTOR_VALUES.filter((v) => !codes.has(v));
    expect(missing, `codes INTAKE absents de la taxonomie : ${missing.join(", ")}`).toEqual([]);
  });
  it("slugs uniques", () => {
    const slugs = SECTOR_TAXONOMY.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

// ── Fix 2026-07-20 (test qualité 5 marques) : pluriels/dérivés + libellé ──
import { sectorDisplayLabel } from "@/domain/sector-taxonomy";

describe("classifyCanonicalSector — préfixe de mot (pluriels/dérivés)", () => {
  it("« Télécommunications » → TELECOM (dérivé de `telecom`)", () => {
    expect(classifyCanonicalSector("Télécommunications").code).toBe("TELECOM");
  });
  it("« Boissons » → FOOD (pluriel de `boisson`)", () => {
    expect(classifyCanonicalSector("Boissons").code).toBe("FOOD");
  });
  it("les keywords courts restent mot-entier : « modèle business » ne matche pas MODE", () => {
    expect(classifyCanonicalSector("modèle business").code).not.toBe("MODE");
  });
});

describe("sectorDisplayLabel — jamais de code brut sur une surface client", () => {
  it("code canon → libellé humain", () => {
    expect(sectorDisplayLabel("RETAIL")).toBe("Retail & distribution");
  });
  it("AUTRE → null (l'appelant choisit sa périphrase)", () => {
    expect(sectorDisplayLabel("un truc introuvable xyz")).toBeNull();
    expect(sectorDisplayLabel(null)).toBeNull();
  });
});
