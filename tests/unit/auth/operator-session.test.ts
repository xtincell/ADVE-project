/** Exercise the actual auth callback: persisted assignment, never stale JWT scope. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
const state = vi.hoisted(() => ({ config: null as NextAuthConfig | null, findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: state.findUnique } } }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("next-auth", () => ({ default: (config: NextAuthConfig) => {
  state.config = config; return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
} }));
import "@/lib/auth/config";
async function session() {
  const callback = state.config!.callbacks!.session!;
  return callback({ session: { user: { id: "synthetic-user", role: "OPERATOR" }, expires: "2099-01-01" },
    token: { id: "synthetic-user", role: "OPERATOR", operatorId: "obsolete-operator" },
  } as unknown as Parameters<typeof callback>[0]);
}
beforeEach(() => state.findUnique.mockReset());
describe("current operator session", () => {
  it("transmits the stored operator assignment", async () => {
    state.findUnique.mockResolvedValue({ operatorId: "current-operator" });
    expect((await session()).user?.operatorId).toBe("current-operator");
    expect(state.findUnique).toHaveBeenCalledWith({ where: { id: "synthetic-user" }, select: { operatorId: true } });
  });
  it("reflects reassignment and revocation while the signed session remains the same", async () => {
    state.findUnique.mockResolvedValueOnce({ operatorId: "first-operator" })
      .mockResolvedValueOnce({ operatorId: "second-operator" }).mockResolvedValueOnce({ operatorId: null });
    expect((await session()).user?.operatorId).toBe("first-operator");
    expect((await session()).user?.operatorId).toBe("second-operator");
    expect((await session()).user?.operatorId).toBeNull();
  });
  it("does not carry forward a tenant for a missing user or unavailable database", async () => {
    state.findUnique.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("synthetic-db-unavailable"));
    expect((await session()).user?.operatorId).toBeNull();
    await expect(session()).rejects.toThrow("synthetic-db-unavailable");
  });
});
