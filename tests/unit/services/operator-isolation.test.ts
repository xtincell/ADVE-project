import { describe, it, expect } from "vitest";
import {
  scopeToOperator,
  scopeStrategies,
  scopeCampaigns,
  scopeMissions,
  scopeClients,
  hasOperatorPortfolioAccess,
  enforceOperatorIsolation,
} from "@/server/services/operator-isolation";

describe("Operator Isolation", () => {
  describe("scopeToOperator", () => {
    it("ADMIN contourne le scoping (retourne le where original)", () => {
      const where = { status: "ACTIVE" };
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      const result = scopeToOperator(where, ctx);

      expect(result).toEqual({ status: "ACTIVE" });
      expect(result).not.toHaveProperty("operatorId");
    });

    it("non-ADMIN ajoute operatorId au where", () => {
      const where = { status: "ACTIVE" };
      const ctx = { operatorId: "op-42", userId: "user-1", role: "USER" };

      const result = scopeToOperator(where, ctx);

      expect(result).toEqual({ status: "ACTIVE", operatorId: "op-42" });
    });

    it("sans operatorId retourne le where original", () => {
      const where = { status: "ACTIVE" };
      const ctx = { operatorId: null, userId: "user-1", role: "USER" };

      const result = scopeToOperator(where, ctx);

      expect(result).toEqual({ status: "ACTIVE" });
      expect(result).not.toHaveProperty("operatorId");
    });

    it("preserve les proprietes existantes du where", () => {
      const where = { status: "ACTIVE", name: "test" };
      const ctx = { operatorId: "op-1", userId: "user-1", role: "OPERATOR" };

      const result = scopeToOperator(where, ctx);

      expect(result.status).toBe("ACTIVE");
      expect(result.name).toBe("test");
      expect(result.operatorId).toBe("op-1");
    });
  });

  describe("scopeStrategies", () => {
    it("ADMIN retourne un where vide", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      const result = scopeStrategies(ctx);

      expect(result).toEqual({});
    });

    it("un rôle portefeuille avec operatorId conserve les bras owner/collaborateur (aligné canAccessStrategy)", () => {
      // Régression prod 2026-07-16 « les missions ne remontent pas » : un compte
      // rattaché à un opérateur perdait ses marques possédées EN PROPRE —
      // canAccessStrategy accordait l'accès (owner), scopeStrategies le filtrait.
      const ctx = { operatorId: "op-42", userId: "user-1", role: "OPERATOR" };

      const result = scopeStrategies(ctx);

      expect(result).toEqual({
        OR: [
          { client: { operatorId: "op-42" } },
          { operatorId: "op-42" },
          { userId: "user-1" },
          { collaborators: { some: { userId: "user-1", status: "ACTIVE" } } },
        ],
      });
    });

    it("sans operatorId retourne owner OU collaboration ACTIVE (ADR-0129)", () => {
      const ctx = { operatorId: null, userId: "user-99", role: "USER" };

      const result = scopeStrategies(ctx);

      expect(result).toEqual({
        OR: [
          { userId: "user-99" },
          { collaborators: { some: { userId: "user-99", status: "ACTIVE" } } },
        ],
      });
    });
  });

  describe("scopeCampaigns", () => {
    it("ADMIN retourne un where vide", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      const result = scopeCampaigns(ctx);

      expect(result).toEqual({});
    });

    it("avec operatorId delegue a scopeStrategies via strategy (bras owner/collab inclus)", () => {
      const ctx = { operatorId: "op-42", userId: "user-1", role: "OPERATOR" };

      const result = scopeCampaigns(ctx);

      expect(result).toEqual({
        strategy: {
          OR: [
            { client: { operatorId: "op-42" } },
            { operatorId: "op-42" },
            { userId: "user-1" },
            { collaborators: { some: { userId: "user-1", status: "ACTIVE" } } },
          ],
        },
      });
    });

    it("sans operatorId filtre owner/collaborateur via strategy (ADR-0129)", () => {
      const ctx = { operatorId: null, userId: "user-5", role: "USER" };

      const result = scopeCampaigns(ctx);

      expect(result).toEqual({
        strategy: {
          OR: [
            { userId: "user-5" },
            { collaborators: { some: { userId: "user-5", status: "ACTIVE" } } },
          ],
        },
      });
    });
  });

  describe("scopeMissions", () => {
    it("ADMIN retourne un where vide", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      const result = scopeMissions(ctx);

      expect(result).toEqual({});
    });

    it("avec operatorId delegue a scopeStrategies via strategy (bras owner/collab inclus)", () => {
      const ctx = { operatorId: "op-10", userId: "user-1", role: "OPERATOR" };

      const result = scopeMissions(ctx);

      expect(result).toEqual({
        strategy: {
          OR: [
            { client: { operatorId: "op-10" } },
            { operatorId: "op-10" },
            { userId: "user-1" },
            { collaborators: { some: { userId: "user-1", status: "ACTIVE" } } },
          ],
        },
      });
    });

    it("sans operatorId filtre owner/collaborateur via strategy (ADR-0129)", () => {
      const ctx = { operatorId: null, userId: "user-7", role: "USER" };

      const result = scopeMissions(ctx);

      expect(result).toEqual({
        strategy: {
          OR: [
            { userId: "user-7" },
            { collaborators: { some: { userId: "user-7", status: "ACTIVE" } } },
          ],
        },
      });
    });
  });

  describe("portfolio authority is distinct from a historical operator link", () => {
    it.each(["USER", "CLIENT_RETAINER", "CLIENT_STATIC", "FREELANCE", "CREATOR", "BRAND_MANAGER", "FOUNDER", "UNKNOWN"])(
      "does not expand %s brand/client scopes when an operator link exists", role => {
        const ctx = { operatorId: "op-42", userId: "user-1", role };
        expect(hasOperatorPortfolioAccess(ctx)).toBe(false);
        expect(scopeStrategies(ctx)).toEqual(scopeStrategies({ ...ctx, operatorId: null }));
        expect(scopeClients(ctx)).toEqual({ strategies: { some: { userId: "user-1" } } });
      },
    );
    it.each(["OPERATOR", "AGENCY", "PARTNER"])("requires a team link for %s portfolio access", role => {
      const ctx = { operatorId: "op-42", userId: "user-1", role };
      expect(hasOperatorPortfolioAccess(ctx)).toBe(true);
      expect(hasOperatorPortfolioAccess({ ...ctx, operatorId: null })).toBe(false);
      expect(hasOperatorPortfolioAccess({ ...ctx, operatorId: "" })).toBe(false);
      expect(scopeClients(ctx)).toEqual({ OR: [{ operatorId: "op-42" }, { strategies: { some: { userId: "user-1" } } }] });
    });
  });

  describe("enforceOperatorIsolation", () => {
    it("ADMIN ne leve jamais d'exception", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      expect(() => enforceOperatorIsolation(ctx, "op-autre")).not.toThrow();
    });

    it("operateur correspondant ne leve pas d'exception", () => {
      const ctx = { operatorId: "op-42", userId: "user-1", role: "USER" };

      expect(() => enforceOperatorIsolation(ctx, "op-42")).not.toThrow();
    });

    it("operateur non correspondant leve une exception", () => {
      const ctx = { operatorId: "op-42", userId: "user-1", role: "USER" };

      expect(() => enforceOperatorIsolation(ctx, "op-999")).toThrow(
        "Accès refusé: cette ressource appartient à un autre opérateur"
      );
    });

    it("sans operatorId dans le contexte ne leve pas d'exception", () => {
      const ctx = { operatorId: null, userId: "user-1", role: "USER" };

      expect(() => enforceOperatorIsolation(ctx, "op-42")).not.toThrow();
    });

    it("strategyOperatorId null ne leve pas d'exception", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "USER" };

      expect(() => enforceOperatorIsolation(ctx, null)).not.toThrow();
    });
  });
});
