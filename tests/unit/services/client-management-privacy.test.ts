import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  findUnique: vi.fn(), findFirst: vi.fn(), write: vi.fn(), seed: vi.fn(), pnl: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { client: { findUnique: calls.findUnique, findFirst: calls.findFirst } } }));
vi.mock("@/lib/auth/types", () => ({}));
// Exercise the real resolver guards without making a governed emission.
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: Parameters<typeof protectedProcedure.input>[0] }) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/server/services/client-organization", () => ({ writeClientOrganization: calls.write }));
vi.mock("@/server/services/strategy-bootstrap", () => ({ seedStrategy: calls.seed }));
vi.mock("@/server/services/financial-reconciliation", () => ({ getClientPnL: calls.pnl }));
vi.mock("@/server/trpc/resolve-session-user", () => ({ resolveSessionUserId: async () => "actor" }));

import { clientRouter } from "@/server/trpc/routers/client";

const api = (role: string, operatorId: string | null = "operator-a") => {
  const db = { client: { findUnique: calls.findUnique }, user: { findUnique: async () => ({ operatorId }) },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(db) };
  return clientRouter.createCaller({ db, session: { user: { id: "actor", role, operatorId } } } as never);
};
const management = (caller: ReturnType<typeof api>) => [
  () => caller.update({ id: "client-a", name: "Changed" }),
  () => caller.delete({ id: "client-a" }),
  () => caller.addBrand({ clientId: "client-a", name: "New brand" }),
  () => caller.getPnL({ clientId: "client-a" }),
];

beforeEach(() => {
  vi.clearAllMocks();
  calls.findUnique.mockResolvedValue({ id: "client-a", operatorId: "operator-a", status: "ACTIVE" });
  calls.findFirst.mockResolvedValue({ id: "client-a" }); // possession may allow READ, never MANAGE
  calls.write.mockResolvedValue({ id: "client-a" });
  calls.seed.mockResolvedValue({ id: "new-brand" });
  calls.pnl.mockResolvedValue({ total: 0 });
});

describe("client read access never grants client management", () => {
  it.each(["USER", "CLIENT_RETAINER", "CLIENT_STATIC", "FREELANCE", "CREATOR", "BRAND_MANAGER", "FOUNDER"])(
    "refuses linked %s before changing organization, creating a brand or reading P&L", async role => {
      for (const act of management(api(role))) await expect(act()).rejects.toMatchObject({ code: "FORBIDDEN" });
      for (const effect of [calls.write, calls.seed, calls.pnl]) expect(effect).not.toHaveBeenCalled();
    },
  );
  it.each(["USER", "CLIENT_RETAINER", "CLIENT_STATIC", "FREELANCE", "CREATOR", "BRAND_MANAGER", "FOUNDER"])(
    "does not allow linked %s to create a Client through the historical operator wrapper", async role => {
      await expect(api(role).create({ name: "New organization" })).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(calls.write).not.toHaveBeenCalled();
    },
  );
  it.each(["OPERATOR", "AGENCY", "PARTNER"])("creates Clients for %s only in its own operator", async role => {
    await api(role).create({ name: "New organization", operatorId: "foreign-operator" });
    expect(calls.write.mock.calls[0]![2]).toMatchObject({ operatorId: "operator-a" });
  });
  it.each(["OPERATOR", "AGENCY", "PARTNER"])("allows %s for the same operator but refuses a foreign client even if owned", async role => {
    for (const act of management(api(role))) await expect(act()).resolves.toBeDefined();
    vi.clearAllMocks();
    for (const act of management(api(role, "operator-b"))) await expect(act()).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const effect of [calls.write, calls.seed, calls.pnl]) expect(effect).not.toHaveBeenCalled();
  });
  it("keeps ADMIN management and refuses an operator without a team link", async () => {
    for (const act of management(api("ADMIN", null))) await expect(act()).resolves.toBeDefined();
    vi.clearAllMocks();
    for (const act of management(api("OPERATOR", null))) await expect(act()).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const effect of [calls.write, calls.seed, calls.pnl]) expect(effect).not.toHaveBeenCalled();
  });
});
