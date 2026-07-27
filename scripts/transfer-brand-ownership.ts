#!/usr/bin/env tsx
/**
 * Transfert de PROPRIÉTÉ d'une marque vers un compte EXISTANT, puis preuve.
 *
 * Pourquoi ce script existe : `createBrandLogin` refuse un email déjà pourvu
 * d'un mot de passe — donc, par construction, il ne peut rien pour un dirigeant
 * DÉJÀ provisionné. Or l'ancien chemin de provisionnement ne posait qu'un
 * `StrategyCollaborator` : Lionel (Motion19) et tout compte créé de la même
 * façon sont restés des **délégués** de leur propre marque, soumis au firewall
 * de zones (ADR-0131).
 *
 * Exerce le VRAI routeur tRPC (donc le spine d'émission + l'audit), puis
 * vérifie :
 *   1. Strategy.userId === user.id            → propriétaire, pas délégué
 *   2. le firewall de zones ne le vise plus   → il écrit partout sur SA marque
 *   3. canAccessStrategy(user, marque)        → sa marque est dans son cockpit
 *   4. aucune autre marque ne lui est visible → pas de fuite
 *   5. l'ancien propriétaire garde un accès   → personne n'est éjecté en silence
 *
 * Usage :
 *   npm run transfer:owner -- lionel@motion19.cm motion19
 *   npm run transfer:owner -- jlombat@gmail.com fantribe
 */

import { db } from "../src/lib/db";
import { appRouter } from "../src/server/trpc/router";
import { canAccessStrategy } from "../src/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "../src/server/governance/collaborator-firewall";

const EMAIL = (process.argv[2] ?? "").toLowerCase();
const BRAND = process.argv[3] ?? "";

function line(ok: boolean, msg: string) {
  console.log(`${ok ? "✅" : "❌"} ${msg}`);
  return ok;
}

async function main() {
  if (!EMAIL || !BRAND) {
    throw new Error("Usage : npm run transfer:owner -- <email> <strategyId|slug|nom>");
  }
  console.log(`═══ TRANSFERT DE PROPRIÉTÉ (${EMAIL} → ${BRAND}) ═══\n`);

  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true },
  });
  if (!admin) throw new Error("Aucun compte ADMIN — impossible d'exercer la procédure gouvernée.");

  const strategy =
    (await db.strategy.findUnique({ where: { id: BRAND }, select: { id: true, name: true, userId: true } })) ??
    (await db.strategy.findFirst({
      where: { OR: [{ publicSlug: BRAND }, { name: { contains: BRAND, mode: "insensitive" } }] },
      select: { id: true, name: true, userId: true },
    }));
  if (!strategy) throw new Error(`Marque introuvable : « ${BRAND} ».`);

  const previousOwnerId = strategy.userId;
  console.log(`Marque : ${strategy.name} (${strategy.id})`);
  console.log(`Propriétaire actuel : ${previousOwnerId ?? "aucun"}\n`);

  const caller = appRouter.createCaller({
    session: { user: { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" } },
    db,
  } as unknown as Parameters<typeof appRouter.createCaller>[0]);

  const res = await caller.accounts.transferBrandOwnership({ strategyId: strategy.id, email: EMAIL });
  console.log(
    res.alreadyOwner
      ? `→ ${res.email} était déjà propriétaire de ${res.brandName}\n`
      : `→ ${res.email} est désormais PROPRIÉTAIRE de ${res.brandName}\n`,
  );

  const user = await db.user.findUniqueOrThrow({ where: { email: EMAIL }, select: { id: true } });
  let allOk = true;

  const after = await db.strategy.findUniqueOrThrow({
    where: { id: strategy.id },
    select: { userId: true },
  });
  allOk = line(after.userId === user.id, "Strategy.userId pointe sur lui — propriétaire, pas délégué") && allOk;

  let firewallOk = true;
  try {
    await assertCollaboratorMayEmit({
      userId: user.id,
      role: "USER",
      strategyId: strategy.id,
      kind: "OPERATOR_AMEND_PILLAR",
    });
  } catch {
    firewallOk = false;
  }
  allOk = line(firewallOk, "le firewall de zones ne le restreint plus (il édite sa fondation)") && allOk;

  const ctx = { userId: user.id, role: "USER" as const, operatorId: null };
  allOk = line(await canAccessStrategy(strategy.id, ctx), "sa marque est accessible depuis son cockpit") && allOk;

  const other = await db.strategy.findFirst({
    where: { id: { not: strategy.id } },
    select: { id: true, name: true },
  });
  if (other) {
    allOk =
      line(!(await canAccessStrategy(other.id, ctx)), `aucune fuite : « ${other.name} » lui reste invisible`) && allOk;
  }

  if (previousOwnerId && previousOwnerId !== user.id) {
    const kept = await db.strategyCollaborator.findUnique({
      where: { strategyId_userId: { strategyId: strategy.id, userId: previousOwnerId } },
      select: { status: true, role: true },
    });
    allOk =
      line(
        kept?.status === "ACTIVE",
        `l'ancien propriétaire garde un accès (${kept?.role ?? "—"}) — personne n'est éjecté en silence`,
      ) && allOk;
  }

  console.log(`\n${allOk ? "✅ TOUT VERT" : "❌ ÉCHEC"}`);
  if (!allOk) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
