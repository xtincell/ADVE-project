import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transaction = vi.fn();
vi.mock("@/lib/db", () => ({ db: { $transaction: (...args: unknown[]) => transaction(...args) } }));

import { serialSalesTransaction } from "@/server/services/crm-engine/transaction";

const conflict = () => Object.assign(new Error("Transaction failed due to a write conflict or a deadlock"), { code: "P2034" });

/** Laisse s'écouler les promesses en attente sans avancer l'horloge simulée. */
async function drain() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("serialSalesTransaction", () => {
  beforeEach(() => {
    transaction.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("attend avant de rejouer un conflit de sérialisation, au lieu de rejouer aussitôt", async () => {
    transaction.mockRejectedValueOnce(conflict()).mockResolvedValueOnce("ok");
    const pending = serialSalesTransaction(async () => "ok");
    await drain();
    // Rejouer aussitôt fait se heurter de nouveau les mêmes transactions concurrentes.
    expect(transaction).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("allonge l'attente à chaque nouvel essai et garde la limite de quatre tentatives", async () => {
    transaction.mockRejectedValue(conflict());
    const pending = serialSalesTransaction(async () => "jamais").catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    const error = await pending;
    expect(transaction).toHaveBeenCalledTimes(4);
    expect((error as { code?: string }).code).toBe("P2034");
  });

  it("ne rejoue jamais une erreur qui n'est pas un retour en arrière confirmé", async () => {
    transaction.mockRejectedValueOnce(Object.assign(new Error("connexion perdue"), { code: "P1017" }));
    const pending = serialSalesTransaction(async () => "x").catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    expect(((await pending) as { code?: string }).code).toBe("P1017");
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
