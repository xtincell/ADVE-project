/** Retry only a database-confirmed rollback, never an unknown commit/transport result. */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function serialSalesTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>, options: { timeout?: number } = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(run, { isolationLevel: "Serializable", ...options }); }
    catch (cause) {
      type Adapter = { name?: string; cause?: { kind?: string; originalCode?: string } };
      const error = cause as Adapter & { code?: string; meta?: { code?: string; driverAdapterError?: Adapter } };
      const adapterConflict = error.name === "DriverAdapterError" && error.cause?.kind === "TransactionWriteConflict" && error.cause.originalCode === "40001";
      const rawSerializationRollback = error.code === "P2010" && error.meta?.code === "40001";
      const nested = error.meta?.driverAdapterError;
      const nestedRawRollback = error.code === "P2010" && nested?.name === "DriverAdapterError" &&
        nested.cause?.kind === "TransactionWriteConflict" && nested.cause.originalCode === "40001";
      if (attempt < 3 && (["P2034", "P2002"].includes(error.code ?? "") || adapterConflict || rawSerializationRollback || nestedRawRollback)) {
        // Rejouer aussitôt fait se heurter de nouveau les mêmes transactions concurrentes :
        // une attente croissante et décalée au hasard les sépare.
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
        continue;
      }
      throw cause;
    }
  }
}

/** Attente avant le rejeu n° attempt+1 : 20, 40 puis 80 ms, plus un décalage aléatoire de 0 à 25 ms. */
function retryDelayMs(attempt: number): number {
  return 20 * 2 ** attempt + Math.floor(Math.random() * 25);
}
