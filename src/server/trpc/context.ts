import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";

export async function createContext(opts?: { headers?: Headers }) {
  const session = await auth();
  return {
    db,
    session,
    headers: opts?.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
