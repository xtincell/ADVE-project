import { describe, it, expect } from "vitest";
import {
  scopeToOperator,
  scopeStrategies,
  scopeCampaigns,
  scopeMissions,
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

    it("avec operatorId retourne le filtre operateur", () => {
      const ctx = { operatorId: "op-42", userId: "user-1", role: "USER" };

      const result = scopeStrategies(ctx);

      expect(result).toEqual({ operatorId: "op-42" });
    });

    it("sans operatorId retourne le filtre userId", () => {
      const ctx = { operatorId: null, userId: "user-99", role: "USER" };

      const result = scopeStrategies(ctx);

      expect(result).toEqual({ userId: "user-99" });
    });
  });

  describe("scopeCampaigns", () => {
    it("ADMIN retourne un where vide", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      const result = scopeCampaigns(ctx);

      expect(result).toEqual({});
    });

    it("avec operatorId delegue a scopeStrategies via strategy", () => {
      const ctx = { operatorId: "op-42", userId: "user-1", role: "USER" };

      const result = scopeCampaigns(ctx);

      expect(result).toEqual({ strategy: { operatorId: "op-42" } });
    });

    it("sans operatorId filtre par userId via strategy", () => {
      const ctx = { operatorId: null, userId: "user-5", role: "USER" };

      const result = scopeCampaigns(ctx);

      expect(result).toEqual({ strategy: { userId: "user-5" } });
    });
  });

  describe("scopeMissions", () => {
    it("ADMIN retourne un where vide", () => {
      const ctx = { operatorId: "op-1", userId: "user-1", role: "ADMIN" };

      const result = scopeMissions(ctx);

      expect(result).toEqual({});
    });

    it("avec operatorId delegue a scopeStrategies via strategy", () => {
      const ctx = { operatorId: "op-10", userId: "user-1", role: "USER" };

      const result = scopeMissions(ctx);

      expect(result).toEqual({ strategy: { operatorId: "op-10" } });
    });

    it("sans operatorId filtre par userId via strategy", () => {
      const ctx = { operatorId: null, userId: "user-7", role: "USER" };

      const result = scopeMissions(ctx);

      expect(result).toEqual({ strategy: { userId: "user-7" } });
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
        "Acces refuse"
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
