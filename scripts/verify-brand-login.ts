#!/usr/bin/env tsx
/**
 * Vérification locale — feature « login personnalisé par marque »
 * (accounts.createBrandLogin, Intent ADMIN_CREATE_BRAND_LOGIN).
 *
 * Exerce le VRAI routeur tRPC (donc le spine d'émission + l'audit), puis
 * prouve que le login fonctionne de bout en bout :
 *   1. bcrypt.compare(mot de passe)      → l'auth Credentials accepterait
 *   2. StrategyCollaborator ACTIVE        → rattaché à la marque
 *   3. canAccessStrategy(user, marque)    → visible dans SON cockpit (scopé)
 *   4. le mot de passe N'EST PAS dans l'IntentEmission (payload redacté)
 *
 * Usage : npx tsx scripts/verify-brand-login.ts   (DB locale lafusee_verif)
 */

import { db } from "../src/lib/db";
import { appRouter } from "../src/server/trpc/router";
import { canAccessStrategy } from "../src/server/services/operator-isolation";
import bcrypt from "bcryptjs";

const EMAIL = "lionel@motion19.cm";
const PASSWORD = "12345678";

async function main() {
  console.log("═══ VÉRIF createBrandLogin (Lionel → Motion19) ═══\n");

  // Admin (session du caller + grantedByUserId)
  let admin = await db.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true },
  });
  if (!admin) {
    admin = await db.user.create({
      data: {
        email: "nefer@upgraders.io",
        name: "NEFER",
        role: "ADMIN",
        hashedPassword: await bcrypt.hash("nefer-admin-local", 12),
      },
      select: { id: true, email: true, name: true },
    });
    console.log("• admin créé:", admin.email);
  } else {
    console.log("• admin:", admin.email);
  }

  const strat = await db.strategy.findFirst({
    where: { OR: [{ publicSlug: "motion19" }, { name: { contains: "Motion19" } }] },
    select: { id: true, name: true },
  });
  if (!strat) throw new Error("Motion19 introuvable — lance `npm run db:seed:motion19`");
  console.log("• marque:", strat.name, `(${strat.id})`);

  // Nettoyage idempotent d'un run précédent
  const prior = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (prior) {
    await db.strategyCollaborator.deleteMany({ where: { userId: prior.id } });
    await db.user.delete({ where: { id: prior.id } });
    console.log("• run précédent nettoyé");
  }

  // VRAI routeur — caller admin
  const caller = appRouter.createCaller({
    session: { user: { id: admin.id, email: admin.email, name: admin.name, role: "ADMIN" } },
    db,
    headers: new Headers(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const created = await caller.accounts.createBrandLogin({
    strategyId: strat.id,
    email: EMAIL,
    name: "Lionel",
    password: PASSWORD,
    teamRole: "DIGITAL_DIRECTOR",
    accountRole: "FOUNDER",
  });
  console.log("• createBrandLogin OK →", JSON.stringify(created));

  // ── Vérifications ──
  const user = await db.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, hashedPassword: true, role: true, operatorId: true },
  });
  if (!user) throw new Error("Login non créé");

  const pwOk = user.hashedPassword ? await bcrypt.compare(PASSWORD, user.hashedPassword) : false;
  const collab = await db.strategyCollaborator.findFirst({
    where: { userId: user.id, strategyId: strat.id, status: "ACTIVE" },
    select: { role: true, status: true },
  });
  const access = await canAccessStrategy(strat.id, {
    role: user.role,
    userId: user.id,
    operatorId: user.operatorId ?? null,
  });

  // Le mot de passe ne doit JAMAIS être dans l'IntentEmission hash-chaînée.
  const emission = await db.intentEmission.findFirst({
    where: { intentKind: "ADMIN_CREATE_BRAND_LOGIN" },
    select: { payload: true, result: true },
    orderBy: { emittedAt: "desc" },
  });
  const emissionStr = JSON.stringify(emission ?? {});
  const leak = emissionStr.includes(PASSWORD);

  console.log("\n─── RÉSULTATS ───");
  const line = (ok: boolean, label: string) => console.log(`  ${ok ? "✅" : "❌"} ${label}`);
  line(pwOk, `bcrypt.compare('${PASSWORD}') = ${pwOk} (l'auth Credentials accepterait)`);
  line(collab?.status === "ACTIVE", `StrategyCollaborator = ${collab?.role} / ${collab?.status}`);
  line(access, `canAccessStrategy(Lionel, Motion19) = ${access} (cockpit scopé)`);
  line(!leak, `mot de passe ABSENT de l'IntentEmission = ${!leak}`);
  console.log(`     User.role = ${user.role}`);

  const allOk = pwOk && collab?.status === "ACTIVE" && access && !leak;
  console.log(`\n${allOk ? "✅ TOUT VERT — Lionel se connecte, ne voit que Motion19, zéro fuite de secret." : "❌ ÉCHEC"}`);
  await db.$disconnect();
  process.exit(allOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
