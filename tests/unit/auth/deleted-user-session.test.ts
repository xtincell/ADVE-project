/**
 * Plan 4.11.f — un compte supprimé ne survit pas à son jeton signé.
 *
 * La session tourne en JWT : le jeton reste signé après la suppression de la
 * ligne `User`. Deux défauts en découlaient :
 *  - le callback `jwt` réémettait le jeton sans relire l'existence du compte ;
 *    un administrateur supprimé conservait son rôle jusqu'à l'expiration ;
 *  - `resolveSessionUserId` recréait la ligne depuis les claims du jeton
 *    (email, nom, rôle, équipe), ou la rattachait à un autre compte par email.
 *
 * Le jeton n'est pas une source d'identité : la ligne persistée l'est. Un compte
 * absent invalide la session (`null` est la révocation documentée d'Auth.js) et
 * aucun flux de création ne peut le recréer.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
import { TRPCError } from "@trpc/server";

const state = vi.hoisted(() => ({
  config: null as NextAuthConfig | null,
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: state.findUnique, upsert: state.upsert } } }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    state.config = config;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));

import "@/lib/auth/config";
import { resolveSessionUserId } from "@/server/trpc/resolve-session-user";
import type { Context } from "@/server/trpc/context";

type JwtArgs = Parameters<NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>>[0];

async function jwt(args: Partial<JwtArgs>) {
  const callback = state.config!.callbacks!.jwt!;
  return callback({ token: {}, ...args } as JwtArgs);
}

beforeEach(() => {
  state.findUnique.mockReset();
  state.upsert.mockReset();
});

describe("jwt callback — un compte supprimé perd sa session", () => {
  it("révoque le jeton d'un administrateur dont la ligne a été supprimée", async () => {
    state.findUnique.mockResolvedValue(null);
    const token = await jwt({ token: { id: "deleted-admin", role: "ADMIN", email: "former@example.test" } });
    expect(token).toBeNull();
    expect(state.findUnique).toHaveBeenCalledWith({ where: { id: "deleted-admin" }, select: { role: true } });
  });

  it("n'accorde pas le god-mode à un compte de l'allowlist qui n'existe plus", async () => {
    state.findUnique.mockResolvedValue(null);
    const token = await jwt({ token: { id: "deleted-founder", role: "ADMIN", email: "xtincell@gmail.com" } });
    expect(token).toBeNull();
  });

  it("conserve le jeton et le rôle d'un compte toujours présent", async () => {
    state.findUnique.mockResolvedValue({ role: "USER" });
    const token = await jwt({ token: { id: "live-user", role: "USER", email: "live@example.test" } });
    expect(token).toMatchObject({ id: "live-user", role: "USER" });
  });

  it("applique au jeton déjà émis la rétrogradation enregistrée en base (IN7)", async () => {
    state.findUnique.mockResolvedValue({ role: "USER" });
    const token = await jwt({ token: { id: "demoted-admin", role: "ADMIN", email: "demoted@example.test" } });
    expect(token).toMatchObject({ id: "demoted-admin", role: "USER" });
  });

  it("garde le god-mode au-dessus du rôle relu pour un compte de l'allowlist", async () => {
    state.findUnique.mockResolvedValue({ role: "USER" });
    const token = await jwt({ token: { id: "founder", role: "ADMIN", email: "xtincell@gmail.com" } });
    expect(token).toMatchObject({ role: "ADMIN" });
  });

  it("relit encore le rôle stocké pour un rôle legacy hors canon", async () => {
    state.findUnique.mockResolvedValue({ role: "FOUNDER" });
    const token = await jwt({ token: { id: "legacy-user", role: "BRAND_OWNER", email: "legacy@example.test" } });
    expect(token).toMatchObject({ role: "FOUNDER" });
  });

  it("ne relit pas la base à la connexion, où le compte vient d'être authentifié", async () => {
    const token = await jwt({
      token: {},
      user: { id: "fresh-user", email: "fresh@example.test", role: "USER" } as JwtArgs["user"],
    });
    expect(token).toMatchObject({ id: "fresh-user", role: "USER" });
    expect(state.findUnique).not.toHaveBeenCalled();
  });
});

describe("resolveSessionUserId — aucune recréation depuis les claims", () => {
  function ctx(user: Record<string, unknown>): Context {
    return {
      db: { user: { findUnique: state.findUnique, upsert: state.upsert } },
      session: { user, expires: "2099-01-01" },
    } as unknown as Context;
  }

  it("retourne l'identifiant d'un compte présent", async () => {
    state.findUnique.mockResolvedValue({ id: "live-user" });
    await expect(resolveSessionUserId(ctx({ id: "live-user", email: "live@example.test", role: "USER" })))
      .resolves.toBe("live-user");
  });

  it("refuse un compte supprimé sans recréer la ligne depuis le jeton", async () => {
    state.findUnique.mockResolvedValue(null);
    state.upsert.mockResolvedValue({ id: "recreated-from-jwt" });
    const call = resolveSessionUserId(ctx({
      id: "deleted-admin", email: "former@example.test", name: "Ancien", role: "ADMIN", operatorId: "op-1",
    }));
    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.upsert).not.toHaveBeenCalled();
  });

  it("ne rattache pas un jeton orphelin à un autre compte portant le même email", async () => {
    state.findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) =>
      where.email ? { id: "another-account" } : null);
    await expect(resolveSessionUserId(ctx({ id: "deleted-user", email: "shared@example.test", role: "USER" })))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(state.upsert).not.toHaveBeenCalled();
  });
});
