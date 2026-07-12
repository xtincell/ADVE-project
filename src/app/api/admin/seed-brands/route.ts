export const dynamic = "force-dynamic";
export const maxDuration = 120;
/**
 * POST /api/admin/seed-brands — exécute les seeds de marques de test
 * (Motion19 complet + vault + guilde/Maximus + Xtincell sourcé) depuis la
 * console, SANS SSH (réponse au blocage opérateur du 12/07 : « le logo ne
 * s'affiche pas » ← le seed prod n'avait jamais tourné faute d'accès shell).
 *
 * ADMIN uniquement (session god-mode). Idempotent — les seeds upsert.
 * Écritures = données de marque de test + comptes de démo ; pas une mutation
 * métier d'une marque cliente réelle (précédent : scripts prisma/seed-*).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function POST(request: Request) {
  // Deux voies d'autorisation, même privilège : (1) session ADMIN (bouton
  // console) ; (2) bearer CRON_SECRET (déclenchement serveur-à-serveur /
  // ops, même niveau de confiance que le cron). L'une OU l'autre suffit.
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const isCron = verifyCronSecret(request);
  if (!isAdmin && !isCron) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs (session ADMIN ou bearer CRON_SECRET)" },
      { status: 403 },
    );
  }

  const log: string[] = [];
  const capture = (line: string) => log.push(line);
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    capture(args.map(String).join(" "));
    origLog(...args);
  };

  try {
    const prisma = db;
    const { seedMotion19, seedMotion19BrandVault, seedMotion19Guild } = await import(
      "../../../../../prisma/seed-motion19"
    );
    const { seedXtincell } = await import("../../../../../prisma/seed-xtincell");
    await seedMotion19(prisma);
    await seedMotion19BrandVault(prisma);
    await seedMotion19Guild(prisma);
    await seedXtincell(prisma);
    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json(
      { ok: false, log, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    console.log = origLog;
  }
}
