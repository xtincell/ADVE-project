/** Real tRPC authorization middleware; persistence stops at the emission boundary. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn() }));
vi.mock("next-auth", () => ({}));
const fixture = vi.hoisted(() => ({
  actor: { id: "staff", email: "staff@example.invalid", role: "OPERATOR", operatorId: "agency" as string | null },
  strategy: { userId: "founder", operatorId: "agency" },
  collaborator: null as { status: string } | null,
  open: vi.fn(),
  user: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: {
  user: { findUnique: fixture.user },
  strategy: { findUnique: vi.fn(async () => fixture.strategy) },
  strategyCollaborator: { findUnique: vi.fn(async () => fixture.collaborator) },
} }));
vi.mock("@/server/governance/emission-spine", () => ({ openEmission: fixture.open, closeEmission: vi.fn() }));
import { db } from "@/lib/db";
import { createTRPCRouter } from "@/server/trpc/init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import type { Context } from "@/server/trpc/context";

const router = createTRPCRouter({
  write: governedProcedure({ kind: "PTAH_MATERIALIZE_BRIEF", requireOperator: true,
    inputSchema: z.object({ strategyId: z.string() }) }).mutation(() => "must not reach handler"),
  founderWrite: governedProcedure({ kind: "PTAH_MATERIALIZE_BRIEF",
    inputSchema: z.object({ strategyId: z.string() }) }).mutation(() => "must not reach handler"),
});
function caller(sessionOperator?: string) {
  return router.createCaller({ db, session: { expires: "2099-01-01", user: {
    id: fixture.actor.id, role: fixture.actor.role, email: fixture.actor.email,
    ...(sessionOperator ? { operatorId: sessionOperator } : {}),
  } } } as Context);
}
beforeEach(() => {
  fixture.actor = { id: "staff", email: "staff@example.invalid", role: "OPERATOR", operatorId: "agency" };
  fixture.strategy = { userId: "founder", operatorId: "agency" };
  fixture.collaborator = null;
  fixture.user.mockReset().mockImplementation(async () => fixture.actor);
  fixture.open.mockReset().mockRejectedValue(new Error("SCOPE_ACCEPTED_AT_EMISSION_BOUNDARY"));
});
async function accepted(call: Promise<unknown>) {
  await expect(call).rejects.toThrow("SCOPE_ACCEPTED_AT_EMISSION_BOUNDARY");
  expect(fixture.open).toHaveBeenCalledTimes(1);
}
async function refused(call: Promise<unknown>) {
  await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(fixture.open).not.toHaveBeenCalled();
}
describe("governed operator context", () => {
  it("admits current operator staff on a founder-owned brand without operatorId in JWT", async () => {
    await accepted(caller().write({ strategyId: "brand" }));
  });
  it("refuses staff from another operator before any emission", async () => {
    fixture.strategy.operatorId = "other-agency";
    await refused(caller().write({ strategyId: "foreign-brand" }));
  });
  it("does not grant access from an obsolete operator binding in the session", async () => {
    fixture.actor.operatorId = "other-agency";
    await refused(caller("agency").write({ strategyId: "brand" }));
  });
  it("refuses a founder from the operator-only production lane even on their own brand", async () => {
    fixture.actor = { id: "founder", email: "founder@example.invalid", role: "USER", operatorId: null };
    await refused(caller().write({ strategyId: "brand" }));
  });
  it("preserves owner access on the ordinary governed lane", async () => {
    fixture.actor = { id: "founder", email: "founder@example.invalid", role: "USER", operatorId: null };
    await accepted(caller().founderWrite({ strategyId: "brand" }));
  });
  it("preserves active collaboration on the ordinary governed lane", async () => {
    fixture.actor.operatorId = null;
    fixture.collaborator = { status: "ACTIVE" };
    await accepted(caller().founderWrite({ strategyId: "brand" }));
  });
  it("refuses revoked collaboration before any emission", async () => {
    fixture.actor.operatorId = null;
    fixture.collaborator = { status: "REVOKED" };
    await refused(caller().founderWrite({ strategyId: "brand" }));
  });
});
