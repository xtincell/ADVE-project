/** Retry only a database-confirmed rollback, never an unknown commit/transport result. */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function serialSalesTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>, options: { timeout?: number } = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(run, { isolationLevel: "Serializable", ...options }); }
    catch (cause) {
      const error = cause as { code?: string; name?: string; cause?: { kind?: string; originalCode?: string } };
      const adapterConflict = error.name === "DriverAdapterError" && error.cause?.kind === "TransactionWriteConflict" && error.cause.originalCode === "40001";
      if (attempt < 3 && (["P2034", "P2002"].includes(error.code ?? "") || adapterConflict)) continue;
      throw cause;
    }
  }
}
