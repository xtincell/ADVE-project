import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { marketScopedDb } from "@/server/governance/market-scoped-db";

export async function createContext(opts?: { headers?: Headers }) {
  const session = await auth();
  // ADR-0105 — market kill-switch : rend invisibles les lectures rattachées à un
  // marché SHADOWBANNED/PURGED pour tout appelant non-ADMIN (public inclus).
  const isAdmin = session?.user?.role === "ADMIN";
  const scopedDb = await marketScopedDb(db, isAdmin);
  return {
    db: scopedDb,
    session,
    headers: opts?.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
