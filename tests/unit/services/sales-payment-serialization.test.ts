import { beforeEach, describe, expect, it, vi } from "vitest";
import { DriverAdapterError } from "@prisma/driver-adapter-utils";
const database = vi.hoisted(() => ({ $transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: database }));
vi.mock("@/server/services/crm-engine/outbound-authority", () => ({ assertSalesEffectIn: vi.fn() }));
import { requestSalesPayment } from "@/server/services/crm-engine/payments";

const actor = { id: "owned-finance-owner", admin: false };
const requestId = "2a89caf3-8961-45da-b78a-08a3ea71bb01";
const request = () => requestSalesPayment("owned-synthetic-deal", requestId, 0, actor);
const serializationConflict = () => new DriverAdapterError({ kind: "TransactionWriteConflict", originalCode: "40001", originalMessage: "could not serialize access due to read/write dependencies among transactions" });
beforeEach(() => { database.$transaction.mockReset(); });

describe("commercial payment serialization boundary", () => {
  it("retries a confirmed PostgreSQL rollback surfaced directly by the driver at commit", async () => {
    const receipt = { reference: "owned-synthetic-payment", status: "PENDING" };
    database.$transaction.mockRejectedValueOnce(serializationConflict()).mockResolvedValueOnce(receipt);
    await expect(request()).resolves.toEqual(receipt);
    expect(database.$transaction).toHaveBeenCalledTimes(2);
    expect(database.$transaction).toHaveBeenLastCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it("retains the existing retry handling for normalized Prisma conflicts", async () => {
    for (const code of ["P2034", "P2002"]) {
      database.$transaction.mockReset().mockRejectedValueOnce({ code }).mockResolvedValueOnce({ status: "PENDING" });
      await expect(request()).resolves.toEqual({ status: "PENDING" });
      expect(database.$transaction).toHaveBeenCalledTimes(2);
    }
  });
  it("stops after four attempts when the database keeps aborting serialization", async () => {
    const error = serializationConflict(); database.$transaction.mockRejectedValue(error);
    const failure = await request().catch(cause => cause);
    expect(failure).toBe(error);
    expect(database.$transaction).toHaveBeenCalledTimes(4);
  });
  it("does not retry an unclassified transport or commit outcome", async () => {
    const error = new DriverAdapterError({ kind: "ConnectionClosed", originalCode: "ECONNRESET", originalMessage: "connection lost at commit" });
    database.$transaction.mockRejectedValue(error);
    const failure = await request().catch(cause => cause);
    expect(failure).toBe(error);
    expect(database.$transaction).toHaveBeenCalledTimes(1);
  });
});
