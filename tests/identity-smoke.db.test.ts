import { afterAll, describe, expect, it } from "vitest";

/**
 * Smoke Postgres RÉEL du WP-022 — cycle complet de réinitialisation :
 * demande publique → file opérateur → émission du lien (rotation) →
 * consommation (usage unique) + réglages du compte (nom / email re-vérifié /
 * mot de passe), audit chaîné vérifié par présence des actions.
 *
 * Gated par `SMOKE_DATABASE_URL` (jamais `DATABASE_URL`) — skippé en CI et en
 * local sans env, la suite `npm run test` reste verte partout. Pré-requis :
 * base jetable poussée (`prisma db push`).
 */

const SMOKE_URL = process.env.SMOKE_DATABASE_URL;
if (SMOKE_URL) process.env.DATABASE_URL = SMOKE_URL;

const RUN = `smoke-identity-${Date.now()}`;
const EMAIL_A = `${RUN}-a@test.local`;
const EMAIL_B = `${RUN}-b@test.local`;

describe.skipIf(!SMOKE_URL)("WP-022 smoke DB — reset de mot de passe + réglages", () => {
  async function services() {
    const [{ getDb }, identity] = await Promise.all([
      import("@/lib/db"),
      import("@/server/identity"),
    ]);
    return { getDb, identity };
  }

  afterAll(async () => {
    if (!SMOKE_URL) return;
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const users = await db.user.findMany({
      where: { email: { startsWith: RUN } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const memberships = await db.membership.findMany({
      where: { userId: { in: userIds } },
      select: { workspaceId: true },
    });
    const wsIds = memberships.map((m) => m.workspaceId);
    await db.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.membership.deleteMany({ where: { userId: { in: userIds } } });
    await db.brand.deleteMany({ where: { workspaceId: { in: wsIds } } });
    await db.workspace.deleteMany({ where: { id: { in: wsIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  });

  // Timeout large : le cycle enchaîne ~7 hachages bcrypt à 12 rounds (voulu —
  // on teste le VRAI coût de hachage, pas un mock).
  it("cycle complet : demande → file → émission → reset → usage unique", { timeout: 60_000 }, async () => {
    const { getDb, identity } = await services();
    const db = getDb();

    // Compte réel (fondateur) + un second pour le conflit d'email.
    const session = await identity.registerUser({
      name: "Awa Test",
      email: EMAIL_A,
      password: "ancien-mdp-8",
      brandName: `Marque ${RUN}`,
    });
    await identity.registerUser({
      name: "Bintou Test",
      email: EMAIL_B,
      password: "autre-mdp-8",
      brandName: `Marque B ${RUN}`,
    });

    // 1. Demande publique — email inconnu : silencieux, aucune ligne.
    await identity.requestPasswordReset(`${RUN}-inconnu@test.local`);
    expect(await db.passwordResetToken.count({ where: { userId: session.userId } })).toBe(0);

    // 2. Demande réelle : une ligne, hash 64 hex (jamais de clair), TTL ~1 h.
    await identity.requestPasswordReset(EMAIL_A.toUpperCase()); // normalisation
    const first = await db.passwordResetToken.findFirstOrThrow({
      where: { userId: session.userId },
    });
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.usedAt).toBeNull();
    const ttl = first.expiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(identity.RESET_TOKEN_TTL_MS - 60_000);
    expect(ttl).toBeLessThanOrEqual(identity.RESET_TOKEN_TTL_MS);

    // 3. Nouvelle demande = remplace la précédente (une seule active par compte).
    await identity.requestPasswordReset(EMAIL_A);
    const rows = await db.passwordResetToken.findMany({ where: { userId: session.userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).not.toBe(first.id);

    // 4. File opérateur : la demande y est.
    const queue = await identity.listResetRequests();
    const mine = queue.find((r) => r.email === EMAIL_A);
    expect(mine?.state).toBe("VALID");

    // 5. Émission opérateur (rotation) : le lien contient un token dont le
    //    hash est EXACTEMENT celui en base ; une ré-émission invalide l'ancien.
    const issued1 = await identity.issueResetLink(mine!.id, session.userId);
    const token1 = decodeURIComponent(issued1.url.split("/reinitialiser/")[1]!);
    expect(await identity.getResetTokenState(token1)).toBe("VALID");

    const issued2 = await identity.issueResetLink(mine!.id, session.userId);
    const token2 = decodeURIComponent(issued2.url.split("/reinitialiser/")[1]!);
    expect(await identity.getResetTokenState(token1)).toBe("UNKNOWN"); // ancien lien mort
    const stored = await db.passwordResetToken.findUniqueOrThrow({ where: { id: mine!.id } });
    expect(stored.tokenHash).toBe(identity.hashResetToken(token2));

    // 6. Consommation : nouveau mot de passe actif, ancien refusé.
    await identity.resetPasswordWithToken(token2, "nouveau-mdp-8");
    expect(await identity.verifyCredentials(EMAIL_A, "ancien-mdp-8")).toBeNull();
    expect(await identity.verifyCredentials(EMAIL_A, "nouveau-mdp-8")).not.toBeNull();
    expect(await identity.getResetTokenState(token2)).toBe("USED");

    // 7. Usage unique : rejouer le token OU ré-émettre la demande échoue.
    await expect(identity.resetPasswordWithToken(token2, "encore-un-mdp")).rejects.toMatchObject({
      code: "RESET_TOKEN_INVALID",
    });
    await expect(identity.issueResetLink(mine!.id, session.userId)).rejects.toMatchObject({
      code: "RESET_REQUEST_USED",
    });
    expect((await identity.listResetRequests()).find((r) => r.email === EMAIL_A)).toBeUndefined();

    // 8. Audit : les trois temps du cycle sont tracés sur la chaîne système.
    for (const action of [
      "user.password_reset.request",
      "user.password_reset.link_issue",
      "user.password_reset.complete",
    ]) {
      const line = await db.auditLog.findFirst({
        where: { action, actorId: session.userId, workspaceId: null },
      });
      expect(line, `ligne d'audit ${action}`).not.toBeNull();
      expect(line!.selfHash).toMatch(/^[0-9a-f]{64}$/);
    }

    // 9. Réglages : nom, email (re-vérification), mot de passe.
    await identity.updateAccountName(session, "Awa Renommée");
    await expect(
      identity.changeUserEmail(session, `${RUN}-nouvelle@test.local`, "mauvais-mdp"),
    ).rejects.toMatchObject({ code: "BAD_PASSWORD" });
    await expect(
      identity.changeUserEmail(session, EMAIL_B, "nouveau-mdp-8"),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    await identity.changeUserEmail(session, `${RUN}-nouvelle@test.local`, "nouveau-mdp-8");
    await identity.changeUserPassword(session, "nouveau-mdp-8", "dernier-mdp-8");
    const settled = await identity.verifyCredentials(
      `${RUN}-nouvelle@test.local`,
      "dernier-mdp-8",
    );
    expect(settled?.userId).toBe(session.userId);

    const overview = await identity.getAccountOverview(session);
    expect(overview?.user.name).toBe("Awa Renommée");
    expect(overview?.memberships.some((m) => m.current)).toBe(true);

    // Les mutations de réglages sont tracées sur la chaîne du workspace.
    for (const action of ["user.profile.update", "user.email.change", "user.password.change"]) {
      const line = await db.auditLog.findFirst({
        where: { action, actorId: session.userId, workspaceId: session.workspaceId },
      });
      expect(line, `ligne d'audit ${action}`).not.toBeNull();
    }
  });
});
