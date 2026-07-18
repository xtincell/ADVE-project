/**
 * Auto-découverte du site officiel (ADR-0149 revealed-gates precondition).
 * Le générateur de candidats est PUR + déterministe. La probe réseau
 * (`discoverOfficialSite`) n'est pas testée ici (I/O) — sa garde anti-faux-
 * positif (mention de marque) est couverte par revue.
 */

import { describe, it, expect } from "vitest";
import { brandDomainSlug, candidateDomains } from "@/server/services/quick-intake/web-footprint";

describe("brandDomainSlug", () => {
  it("compacte nom + retire suffixes juridiques + diacritiques", () => {
    expect(brandDomainSlug("Chococam SA")).toBe("chococam");
    expect(brandDomainSlug("Société Générale")).toBe("societegenerale"); // "sa" seul retiré, pas dans un mot
    expect(brandDomainSlug("MTN Group")).toBe("mtn");
    expect(brandDomainSlug("Café  Noir!")).toBe("cafenoir");
  });
});

describe("candidateDomains", () => {
  it("génère .com + TLD pays + génériques, déterministe, max 5", () => {
    const c = candidateDomains("Chococam", "CM");
    expect(c[0]).toBe("https://chococam.com"); // .com d'abord (préférence)
    expect(c).toContain("https://chococam.cm"); // TLD Cameroun
    expect(c.length).toBeLessThanOrEqual(5);
    expect(candidateDomains("Chococam", "CM")).toEqual(c); // variance = 0
  });

  it("sans pays connu → .com + génériques", () => {
    const c = candidateDomains("Chococam", null);
    expect(c[0]).toBe("https://chococam.com");
    expect(c.every((u) => u.startsWith("https://chococam."))).toBe(true);
  });

  it("nom trop court → aucun candidat (pas de devinette hasardeuse)", () => {
    expect(candidateDomains("X", "CM")).toEqual([]);
  });
});
