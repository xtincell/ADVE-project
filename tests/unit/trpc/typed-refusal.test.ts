/**
 * Un service lève `TypedRefusal` sans dépendre de tRPC ; la base des procédures
 * le convertit en `TRPCError` du même code et du même message (6.27.571).
 */
import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

vi.mock("@/lib/auth/types", () => ({}));
vi.mock("@/server/services/error-vault", () => ({ capture: vi.fn(async () => undefined) }));

import { createCallerFactory, createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc/init";
import { TypedRefusal } from "@/domain/typed-refusal";

const router = createTRPCRouter({
  conflict: publicProcedure.query(() => { throw new TypedRefusal("CONFLICT", "SOURCE_CHANGED: relisez ce document."); }),
  hidden: protectedProcedure.mutation(() => { throw new TypedRefusal("NOT_FOUND", "Ce document n’est plus accessible dans ce dossier."); }),
  plain: publicProcedure.query(() => { throw new Error("panne"); }),
});
const caller = createCallerFactory(router)({ session: { user: { id: "u", role: "USER" }, expires: "2099-01-01T00:00:00.000Z" } } as never);

async function refusal(call: Promise<unknown>) {
  const error = await call.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(TRPCError);
  const e = error as TRPCError;
  return { code: e.code, status: getHTTPStatusCodeFromError(e), message: e.message };
}

describe("refus typés des services", () => {
  it("gardent leur code et leur message à travers une procédure publique", async () => {
    expect(await refusal(caller.conflict())).toEqual({ code: "CONFLICT", status: 409, message: "SOURCE_CHANGED: relisez ce document." });
  });
  it("gardent leur code à travers une procédure authentifiée", async () => {
    expect(await refusal(caller.hidden())).toEqual({ code: "NOT_FOUND", status: 404, message: "Ce document n’est plus accessible dans ce dossier." });
  });
  it("ne touchent pas une erreur ordinaire, qui reste une erreur serveur", async () => {
    expect((await refusal(caller.plain())).code).toBe("INTERNAL_SERVER_ERROR");
  });
});
