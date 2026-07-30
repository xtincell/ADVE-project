/**
 * Étage LLM proposeur (2026-07-30) — propose-then-verify.
 *
 * Ce qui est testé ici est la partie PURE : l'assainissement des propositions.
 * C'est la frontière de sécurité du module — un LLM renvoie parfois une
 * phrase, du markdown, une URL complète ou une plateforme sociale là où on
 * attend un nom d'hôte. Rien de tout cela ne doit ressortir comme un host
 * exploitable (la vérification réseau qui suit ne doit pas être nourrie de
 * n'importe quoi).
 *
 * Les chemins avec I/O (`proposeBrandIdentity`) ne sont pas testés ici :
 * leurs garde-fous — no-op sans clé, vérification déterministe obligatoire de
 * chaque piste — vivent dans `public-enrichment` et sont couverts par revue.
 */

import { describe, it, expect } from "vitest";
import { sanitizeProposedHost } from "@/server/services/quick-intake/llm-proposer";

describe("sanitizeProposedHost", () => {
  it("accepte un host propre et le normalise", () => {
    expect(sanitizeProposedHost("chococam.com")).toBe("chococam.com");
    expect(sanitizeProposedHost("  WWW.Chococam.CM  ")).toBe("chococam.cm");
    expect(sanitizeProposedHost("sub.marque.co.uk")).toBe("sub.marque.co.uk");
  });

  it("tolère une URL complète (le modèle en renvoie souvent une)", () => {
    expect(sanitizeProposedHost("https://www.chococam.com/produits?a=1#x")).toBe("chococam.com");
    expect(sanitizeProposedHost("http://chococam.cm/")).toBe("chococam.cm");
  });

  it("rejette une plateforme sociale : jamais le site officiel d'une marque", () => {
    expect(sanitizeProposedHost("facebook.com")).toBeNull();
    expect(sanitizeProposedHost("https://www.instagram.com")).toBeNull();
    expect(sanitizeProposedHost("youtube.com")).toBeNull();
  });

  it("rejette tout ce qui n'est pas un host (phrase, markdown, vide)", () => {
    expect(sanitizeProposedHost("Je n'ai pas trouvé de site officiel")).toBeNull();
    expect(sanitizeProposedHost("[chococam.com](https://chococam.com)")).toBeNull();
    expect(sanitizeProposedHost("chococam")).toBeNull(); // pas de TLD
    expect(sanitizeProposedHost("")).toBeNull();
    expect(sanitizeProposedHost(null)).toBeNull();
    expect(sanitizeProposedHost(undefined)).toBeNull();
  });

  it("rejette les formes malformées (tirets et points en bordure)", () => {
    expect(sanitizeProposedHost("-marque.com")).toBeNull();
    expect(sanitizeProposedHost("marque-.com")).toBeNull();
    expect(sanitizeProposedHost(".marque.com")).toBeNull();
    expect(sanitizeProposedHost("marque..com")).toBeNull();
  });
});
