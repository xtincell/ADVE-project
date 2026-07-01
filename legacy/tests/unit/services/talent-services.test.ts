import { describe, it, expect } from "vitest";

/**
 * talent-services (ADR-0117) : la logique métier est de la persistance simple
 * (CRUD owner-gated) sans helper pur isolable au-delà du garde de propriété —
 * couvert par tsc + le test d'intégration governance. On vérifie ici l'invariant
 * de forme du module (exports attendus présents).
 */
import * as svc from "@/server/services/talent-services";

describe("talent-services — surface du module", () => {
  it("expose le CRUD gigs attendu", () => {
    for (const fn of ["createService", "updateService", "toggleService", "listPublicServices", "listMyServices"]) {
      expect(typeof (svc as Record<string, unknown>)[fn]).toBe("function");
    }
  });
});
