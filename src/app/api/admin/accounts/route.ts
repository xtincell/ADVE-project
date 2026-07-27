export const dynamic = "force-dynamic";
/**
 * Inventaire et réparation des comptes (utilitaire opérateur, guardé CRON_SECRET).
 *
 * Même esprit que `/api/admin/prod-finish` : la base de prod a un hostname
 * interne, donc inatteignable depuis un poste extérieur — les actes ponctuels
 * s'exécutent côté serveur. Trois opérations, toutes idempotentes :
 *
 *   GET  /api/admin/accounts
 *     → inventaire : qui existe, qui POSSÈDE quelle marque, qui n'y est que
 *       délégué, et qui peut seulement se connecter (`hasPassword`).
 *
 *   POST /api/admin/accounts?reset=<email>[&password=<mdp>]
 *     → pose un mot de passe PROVISOIRE et le rend UNE fois.
 *
 *   POST /api/admin/accounts?purge=<email>&reason=<...>
 *     → supprime un compte créé par erreur. Fail-closed s'il possède une marque.
 *
 * Header : Authorization: Bearer <CRON_SECRET>
 *
 * **Un mot de passe existant ne peut pas être relu.** La base ne stocke que des
 * empreintes bcrypt (coût 12), à sens unique — c'est le point du hachage. La
 * seule réponse honnête à « redonne-moi le mot de passe de X » est d'en poser
 * un nouveau, ce que fait `?reset=`.
 *
 * Les mutations passent par les MÊMES procédures que la console (parité
 * manual-first ADR-0060) : rien n'est réimplémenté ici, donc rien ne peut
 * diverger. Le secret sort par la réponse, jamais par l'`IntentEmission`
 * (payload redacté, ADR-0124/0140) ni par l'audit.
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { appRouter } from "@/server/trpc/router";

type AdminCaller = ReturnType<typeof appRouter.createCaller>;

/** Exerce les procédures réelles sous l'identité d'un ADMIN existant. */
async function adminCaller(): Promise<AdminCaller> {
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true },
  });
  if (!admin) throw new Error("Aucun compte ADMIN — impossible d'exercer les procédures gouvernées.");
  return appRouter.createCaller({
    session: { user: { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" } },
    db,
  } as unknown as Parameters<typeof appRouter.createCaller>[0]);
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const caller = await adminCaller();
  const accounts = await caller.accounts.inventory({ search, limit: 500 });

  // Les marques sans propriétaire lisible ne se voient pas dans un inventaire
  // par compte : on les surface à part plutôt que de les laisser hors champ.
  const brands = await db.strategy.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, publicSlug: true, user: { select: { email: true } } },
  });

  return NextResponse.json({
    ok: true,
    note: "Les mots de passe existants sont des empreintes bcrypt : irrécupérables. Utiliser ?reset=<email> pour en poser un nouveau.",
    accounts,
    brands: brands.map((b) => ({ id: b.id, name: b.name, slug: b.publicSlug, owner: b.user?.email ?? null })),
    at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const reset = params.get("reset");
  const purge = params.get("purge");

  if (!reset && !purge) {
    return NextResponse.json(
      { error: "Rien à faire — passer ?reset=<email> ou ?purge=<email>&reason=<...>" },
      { status: 400 },
    );
  }

  const caller = await adminCaller();

  try {
    if (reset) {
      const out = await caller.accounts.resetPassword({
        email: reset,
        ...(params.get("password") ? { password: params.get("password")! } : {}),
      });
      return NextResponse.json({ ok: true, reset: out, at: new Date().toISOString() });
    }
    const out = await caller.accounts.purgeAccount({
      email: purge!,
      reason: params.get("reason") ?? "Compte créé par erreur (opérateur).",
    });
    return NextResponse.json({ ok: true, purge: out, at: new Date().toISOString() });
  } catch (e) {
    // Message court : les refus fail-closed de `purgeAccount` sont explicites
    // et destinés à être lus (« X est PROPRIÉTAIRE de Y »).
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
