#!/usr/bin/env tsx
/**
 * Vérification — rattachement en tant que PROPRIÉTAIRE d'une marque
 * (`accounts.createBrandLogin` avec `attachAs: "OWNER"`).
 *
 * Le mécanisme de login par marque ne savait produire que des **collaborateurs
 * délégués** : un compte scopé par `CampaignTeamRole` et soumis au firewall de
 * zones (ADR-0131), qui refuse par défaut toute écriture hors du métier
 * déclaré. C'est juste pour un community manager ; c'est faux pour le dirigeant
 * à qui l'on remet SA marque — il n'est pas le délégué de son propre bien.
 *
 * `attachAs: "OWNER"` pose `Strategy.userId`, la propriété canonique du repo
 * (motif Stéphanie/SPAWT). Ce script le PROUVE plutôt que de l'affirmer :
 *
 *   1. bcrypt.compare(mot de passe)          → l'auth Credentials accepterait
 *   2. Strategy.userId === user.id           → propriétaire, pas délégué
 *   3. canAccessStrategy(user, marque)       → sa marque est dans son cockpit
 *   4. le firewall de zones NE LE VISE PAS   → il écrit partout sur sa marque
 *   5. canAccessStrategy(user, AUTRE marque) → false (aucune fuite)
 *   6. le mot de passe n'est PAS dans l'IntentEmission (payload redacté)
 *
 * Usage : npx tsx scripts/verify-brand-owner.ts [email] [strategyIdOuSlug]
 */

import { db } from "../src/lib/db";
import { appRouter } from "../src/server/trpc/router";
import { canAccessStrategy } from "../src/server/services/operator-isolation";
import { assertCollaboratorMayEmit } from "../src/server/governance/collaborator-firewall";
import bcrypt from "bcryptjs";

const EMAIL = process.argv[2] ?? "jlombat@gmail.com";
const BRAND = process.argv[3] ?? "fantribe";
const PASSWORD = process.env.BRAND_LOGIN_PASSWORD ?? "12345678";

function line(ok: boolean, msg: string) {
  console.log(`${ok ? "✅" : "❌"} ${msg}`);
  return ok;
}

async function main() {
  console.log(`═══ VÉRIF propriétaire de marque (${EMAIL} → ${BRAND}) ═══\n`);

  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, email: true, name: true } });
  if (!admin) throw new Error("Aucun compte ADMIN — impossible d'exercer la procédure.");

  // La marque, par id OU par slug public (les deux sont des entrées légitimes).
  const strategy =
    (await db.strategy.findUnique({ where: { id: BRAND }, select: { id: true, name: true, userId: true } })) ??
    (await db.strategy.findFirst({
      where: { OR: [{ publicSlug: BRAND }, { name: { contains: BRAND, mode: "insensitive" } }] },
      select: { id: true, name: true, userId: true },
    }));
  if (!strategy) throw new Error(`Marque introuvable : « ${BRAND} ». Créez-la avant de lui attribuer un propriétaire.`);
  console.log(`Marque : ${strategy.name} (${strategy.id}) — propriétaire actuel : ${strategy.userId ?? "aucun"}\n`);

  const caller = appRouter.createCaller({
    session: { user: { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" } },
    db,
  } as unknown as Parameters<typeof appRouter.createCaller>[0]);

  const res = await caller.accounts.createBrandLogin({
    strategyId: strategy.id,
    email: EMAIL,
    name: process.env.BRAND_LOGIN_NAME ?? "Hilaire",
    password: PASSWORD,
    teamRole: "DIGITAL_DIRECTOR",
    accountRole: "FOUNDER",
    attachAs: "OWNER",
  });
  console.log(`→ ${res.email} · ${res.brandName} · ${res.isOwner ? "PROPRIÉTAIRE" : res.teamRole}\n`);

  const user = await db.user.findUniqueOrThrow({
    where: { email: EMAIL },
    select: { id: true, hashedPassword: true },
  });

  let allOk = true;
  allOk = line(await bcrypt.compare(PASSWORD, user.hashedPassword ?? ""), "le mot de passe est vérifiable (auth Credentials)") && allOk;

  const after = await db.strategy.findUniqueOrThrow({ where: { id: strategy.id }, select: { userId: true } });
  allOk = line(after.userId === user.id, "Strategy.userId pointe sur lui — PROPRIÉTAIRE, pas délégué") && allOk;

  const ctx = { userId: user.id, role: "USER" as const, operatorId: null };
  allOk = line(await canAccessStrategy(strategy.id, ctx), "sa marque est accessible depuis son cockpit") && allOk;

  // Le firewall de zones sort dès `strategy.userId === userId` : un propriétaire
  // écrit partout sur SA marque. Un collaborateur SOCIAL_MANAGER, lui, serait
  // veto sur une écriture de fondation.
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
  allOk = line(firewallOk, "le firewall de zones ne le restreint pas (il édite sa fondation)") && allOk;

  const other = await db.strategy.findFirst({ where: { id: { not: strategy.id } }, select: { id: true, name: true } });
  if (other) {
    allOk = line(!(await canAccessStrategy(other.id, ctx)), `aucune fuite : « ${other.name} » lui reste invisible`) && allOk;
  }

  const emission = await db.intentEmission.findFirst({
    where: { kind: "ADMIN_CREATE_BRAND_LOGIN" },
    orderBy: { createdAt: "desc" },
    select: { payload: true },
  });
  allOk = line(!JSON.stringify(emission?.payload ?? {}).includes(PASSWORD), "le mot de passe n'apparaît pas dans l'IntentEmission") && allOk;

  console.log(`\n${allOk ? "✅ TOUT VERT — il est propriétaire de sa marque, et de la sienne seulement." : "❌ ÉCHEC"}`);
  if (!allOk) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
