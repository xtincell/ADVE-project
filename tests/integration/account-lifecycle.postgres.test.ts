/**
 * IN7 — rétrogradation, suppression et réaffectation des comptes ordinaires.
 *
 * Réception sur PostgreSQL réel, par les vraies procédures et la vraie route
 * `/api/trpc` (`src/app/api/trpc/[trpc]/route.ts`). La session est celle
 * d'Auth.js : connexion par le formulaire credentials, jeton signé, callbacks
 * `jwt`/`session` de `src/lib/auth/config.ts`. Seul l'accès Next.js aux en-têtes
 * de la requête courante (`next/headers`) est substitué, parce qu'il n'existe
 * qu'à l'intérieur du serveur Next : il rend les en-têtes de la requête envoyée
 * à la route, sans rien décider.
 *
 * Chaque geste est éprouvé avec une session ouverte AVANT lui, puis avec une
 * nouvelle connexion : un droit retiré l'est dès l'appel suivant, refusé par un
 * 401/403 typé, jamais par une 500.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const env = vi.hoisted(() => {
  const keys = ["AUTH_SECRET", "AUTH_URL", "NEXTAUTH_URL"] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  // Secret propre à ce fichier ; origine HTTP locale, donc cookie `authjs.session-token`.
  process.env.AUTH_SECRET = `in7-${Math.random().toString(36).slice(2)}-${Date.now()}-receipt-secret`;
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
  return { saved, request: { headers: new Headers() } };
});
vi.mock("next/headers", () => ({
  headers: async () => env.request.headers,
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false, set: () => undefined, delete: () => undefined }),
}));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handlers } from "@/lib/auth/config";
import { GET as trpcGet, POST as trpcPost } from "@/app/api/trpc/[trpc]/route";
import { canAccessStrategy, getOperatorContext, scopeStrategies } from "@/server/services/operator-isolation";
import { PURGE_RESTRICTING_TABLES } from "@/server/trpc/routers/accounts";

const ORIGIN = "http://localhost:3000";
const PASSWORD = "in7-owned-fixture-password";
const userIds: string[] = [], strategyIds: string[] = [], operatorIds: string[] = [], metrics: string[] = [];

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
  expect(url.pathname).toBe("/shinkiro_verify");
  vi.stubGlobal("fetch", async () => { throw new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_LOCAL_FIXTURE"); });
});
afterAll(async () => {
  await db.brandAction.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.pillar.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.scoreSnapshot.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.strategyCollaborator.deleteMany({ where: { strategyId: { in: strategyIds } } });
  await db.strategy.deleteMany({ where: { id: { in: strategyIds } } });
  await db.marketCostSnapshot.deleteMany({ where: { metric: { in: metrics } } });
  await db.talentProfile.deleteMany({ where: { userId: { in: userIds } } });
  await db.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { entityId: { in: [...userIds, ...strategyIds] } }] } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.operator.deleteMany({ where: { id: { in: operatorIds } } });
  for (const [key, value] of Object.entries(env.saved)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  vi.unstubAllGlobals();
  await db.$disconnect();
});

// ── Fixtures ────────────────────────────────────────────────────────────────
type Role = "USER" | "FOUNDER" | "FREELANCE" | "OPERATOR" | "ADMIN";
async function account(role: Role, operatorId: string | null = null) {
  const row = await db.user.create({ data: {
    email: `in7-${role.toLowerCase()}-${randomUUID()}@example.invalid`, name: `IN7 ${role}`, role, operatorId,
    hashedPassword: await bcrypt.hash(PASSWORD, 4),
  } });
  userIds.push(row.id);
  return row;
}
async function operator() {
  const row = await db.operator.create({ data: { name: "IN7 équipe fictive", slug: `in7-${randomUUID()}`, status: "ACTIVE",
    licenseType: "TRIAL", licensedAt: new Date(), licenseExpiry: new Date(Date.now() + 86_400_000) } });
  operatorIds.push(row.id);
  return row;
}
async function brand(ownerId: string, operatorId: string | null = null) {
  const row = await db.strategy.create({ data: { name: `IN7 marque fictive ${randomUUID().slice(0, 8)}`, userId: ownerId, operatorId } });
  strategyIds.push(row.id);
  return row;
}

// ── Auth.js réel : connexion credentials, session, cookies ─────────────────
function cookieFrom(res: Response, name: string): string | null {
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const index = pair!.indexOf("=");
    if (pair!.slice(0, index) === name) return pair!.slice(index + 1);
  }
  return null;
}
/** Formulaire credentials réel : csrf, authorize (bcrypt sur la ligne), jeton signé. */
async function signIn(email: string, password = PASSWORD): Promise<string | null> {
  const csrf = await handlers.GET(new NextRequest(`${ORIGIN}/api/auth/csrf`));
  const { csrfToken } = await csrf.json() as { csrfToken: string };
  const res = await handlers.POST(new NextRequest(`${ORIGIN}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: `authjs.csrf-token=${cookieFrom(csrf, "authjs.csrf-token")}` },
    body: new URLSearchParams({ csrfToken, email, password, callbackUrl: ORIGIN }),
  }));
  const token = cookieFrom(res, "authjs.session-token");
  return token ? `authjs.session-token=${token}` : null;
}
/** Ce que l'endpoint session d'Auth.js rend pour ce cookie (null = plus de session). */
async function session(cookie: string) {
  const res = await handlers.GET(new NextRequest(`${ORIGIN}/api/auth/session`, { headers: { cookie } }));
  return { status: res.status, body: await res.json() as { user?: { id: string; role: string; operatorId: string | null } } | null,
    cleared: cookieFrom(res, "authjs.session-token") === "" };
}

// ── La vraie route /api/trpc ────────────────────────────────────────────────
type TrpcReply = { status: number; data?: unknown; code?: string; message?: string };
async function trpc(cookie: string | null, path: string, input?: unknown, kind: "query" | "mutation" = "query"): Promise<TrpcReply> {
  const headers = new Headers({ host: "localhost:3000", "x-forwarded-proto": "http" });
  if (cookie) headers.set("cookie", cookie);
  let req: Request;
  if (kind === "query") {
    const qs = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    req = new Request(`${ORIGIN}/api/trpc/${path}${qs}`, { headers });
  } else {
    headers.set("content-type", "application/json");
    req = new Request(`${ORIGIN}/api/trpc/${path}`, { method: "POST", headers, body: JSON.stringify({ json: input ?? null }) });
  }
  env.request.headers = req.headers;
  const res = await (kind === "query" ? trpcGet(req) : trpcPost(req));
  const body = await res.json() as { result?: { data?: { json?: unknown } }; error?: { json?: { message?: string; data?: { code?: string } } } };
  return { status: res.status, data: body.result?.data?.json, code: body.error?.json?.data?.code, message: body.error?.json?.message };
}
const mutate = (cookie: string | null, path: string, input: unknown) => trpc(cookie, path, input, "mutation");
function refused(reply: TrpcReply, status: 401 | 403, code: "UNAUTHORIZED" | "FORBIDDEN") {
  expect(reply, JSON.stringify(reply)).toMatchObject({ status, code });
}
function ok(reply: TrpcReply) {
  expect(reply.status, JSON.stringify(reply)).toBe(200);
  return reply.data;
}

// ── Rétrogradation ──────────────────────────────────────────────────────────
describe.sequential("IN7 — rétrogradation d'un compte", () => {
  it("retire immédiatement le rôle ADMIN, sur la session déjà ouverte comme sur la suivante", async () => {
    const actor = await account("ADMIN"), target = await account("ADMIN");
    const actorCookie = (await signIn(actor.email))!, before = (await signIn(target.email))!;
    expect(before).toBeTruthy();
    ok(await trpc(before, "accounts.roleStats"));
    ok(await trpc(before, "argos.list"));

    expect(ok(await mutate(actorCookie, "accounts.setRole", { userId: target.id, role: "USER", reason: "IN7 rétrogradation" })))
      .toMatchObject({ id: target.id, role: "USER" });
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe("USER");

    // Session ouverte avant le geste : même jeton, le rôle retiré n'y survit pas.
    expect((await session(before)).body?.user).toMatchObject({ id: target.id, role: "USER" });
    refused(await trpc(before, "accounts.roleStats"), 403, "FORBIDDEN");
    refused(await trpc(before, "argos.list"), 403, "FORBIDDEN");
    refused(await mutate(before, "accounts.setRole", { userId: actor.id, role: "USER", reason: "IN7 retour interdit" }), 403, "FORBIDDEN");
    expect((await db.user.findUniqueOrThrow({ where: { id: actor.id } })).role).toBe("ADMIN");

    // Nouvelle connexion : même verdict.
    const after = (await signIn(target.email))!;
    expect((await session(after)).body?.user).toMatchObject({ role: "USER" });
    refused(await trpc(after, "accounts.roleStats"), 403, "FORBIDDEN");
  });

  it("refuse par des erreurs typées les gestes invalides de rétrogradation, sans rien écrire", async () => {
    const actor = await account("ADMIN"), team = await operator(), staff = await account("OPERATOR", team.id);
    const actorCookie = (await signIn(actor.email))!, staffCookie = (await signIn(staff.email))!;
    const target = await account("USER");
    refused(await mutate(staffCookie, "accounts.setRole", { userId: target.id, role: "ADMIN", reason: "IN7 non ADMIN" }), 403, "FORBIDDEN");
    expect(await mutate(actorCookie, "accounts.setRole", { userId: actor.id, role: "USER", reason: "IN7 soi-même" }))
      .toMatchObject({ status: 400, code: "BAD_REQUEST" });
    expect(await mutate(actorCookie, "accounts.setRole", { userId: `absent-${randomUUID()}`, role: "USER", reason: "IN7 absent" }))
      .toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect((await db.user.findUniqueOrThrow({ where: { id: target.id } })).role).toBe("USER");
    expect((await db.user.findUniqueOrThrow({ where: { id: actor.id } })).role).toBe("ADMIN");
  });

  it("retire le rôle OPERATOR : les gestes réservés au rôle sont refusés (403), sans effet en base", async () => {
    const actor = await account("ADMIN"), team = await operator(), staff = await account("OPERATOR", team.id);
    const actorCookie = (await signIn(actor.email))!, before = (await signIn(staff.email))!;
    const metric = `in7-receipt-${randomUUID().slice(0, 8)}`; metrics.push(metric);
    const cost = (p50: number) => ({ countryCode: "ZZ", metric, period: "2026", p50 });
    ok(await mutate(before, "marketCost.upsert", cost(10)));

    ok(await mutate(actorCookie, "accounts.setRole", { userId: staff.id, role: "USER", reason: "IN7 retrait du rôle" }));
    refused(await mutate(before, "marketCost.upsert", cost(99)), 403, "FORBIDDEN");
    refused(await mutate(await signIn(staff.email), "marketCost.upsert", cost(98)), 403, "FORBIDDEN");
    expect((await db.marketCostSnapshot.findMany({ where: { metric } })).map((row) => row.p50)).toEqual([10]);

    // setRole ne touche que le rôle : l'appartenance à l'équipe (operatorId) reste,
    // donc les lectures de l'équipe restent ouvertes. Son retrait est un autre geste.
    expect((await db.user.findUniqueOrThrow({ where: { id: staff.id } })).operatorId).toBe(team.id);
    ok(await trpc(before, "argos.list"));
  });

  it("relit l'appartenance à l'équipe à chaque appel quand elle est retirée en base", async () => {
    // Aucune procédure ne modifie User.operatorId : la ligne est changée directement,
    // pour éprouver seulement la relecture par une session déjà ouverte.
    const team = await operator(), staff = await account("USER", team.id);
    const teamBrand = await brand((await account("FOUNDER")).id, team.id);
    const before = (await signIn(staff.email))!;
    ok(await trpc(before, "argos.list"));
    ok(await trpc(before, "actions.byStrategy", { strategyId: teamBrand.id }));

    await db.user.update({ where: { id: staff.id }, data: { operatorId: null } });
    expect((await session(before)).body?.user).toMatchObject({ id: staff.id, operatorId: null });
    refused(await trpc(before, "argos.list"), 403, "FORBIDDEN");
    refused(await trpc(before, "actions.byStrategy", { strategyId: teamBrand.id }), 403, "FORBIDDEN");
    const listed = ok(await trpc(before, "strategy.list", {})) as Array<{ id: string }>;
    expect(listed.map((row) => row.id)).not.toContain(teamBrand.id);
  });
});

// ── Suppression ─────────────────────────────────────────────────────────────
describe.sequential("IN7 — suppression d'un compte", () => {
  it("supprime un compte ordinaire : sa session tombe, sa connexion est refusée, ses délégations suivent", async () => {
    const actor = await account("ADMIN"), owner = await account("FOUNDER"), target = await account("FREELANCE");
    const delegated = await brand(owner.id);
    await db.strategyCollaborator.create({ data: { strategyId: delegated.id, userId: target.id, role: "SOCIAL_MANAGER", status: "ACTIVE", grantedByUserId: actor.id } });
    const trace = await db.auditLog.create({ data: { userId: target.id, action: "UPDATE", entityType: "User", entityId: target.id } });
    const actorCookie = (await signIn(actor.email))!, before = (await signIn(target.email))!;
    ok(await trpc(before, "actions.byStrategy", { strategyId: delegated.id }));

    expect(ok(await mutate(actorCookie, "accounts.purgeAccount", { email: target.email, reason: "IN7 compte créé par erreur" })))
      .toMatchObject({ deleted: true, collaborationsRemoved: 1 });

    expect(await db.user.findUnique({ where: { id: target.id } })).toBeNull();
    expect(await db.strategyCollaborator.count({ where: { userId: target.id } })).toBe(0);
    // Journal conservé, détaché du compte disparu (SET NULL).
    expect(await db.auditLog.findUniqueOrThrow({ where: { id: trace.id } })).toMatchObject({ userId: null, entityId: target.id });
    expect(await db.strategy.findUniqueOrThrow({ where: { id: delegated.id } })).toMatchObject({ userId: owner.id });

    const revoked = await session(before);
    expect(revoked).toMatchObject({ status: 200, body: null, cleared: true });
    refused(await trpc(before, "strategy.myDelegatedBrands"), 401, "UNAUTHORIZED");
    refused(await trpc(before, "actions.byStrategy", { strategyId: delegated.id }), 401, "UNAUTHORIZED");
    expect(await signIn(target.email)).toBeNull();
  });

  it("refuse de supprimer un compte qui porte des données liées, par une erreur typée et sans rien effacer", async () => {
    const actor = await account("ADMIN"), talent = await account("FREELANCE"), owner = await account("FOUNDER");
    await db.talentProfile.create({ data: { userId: talent.id, displayName: "IN7 profil fictif" } });
    const owned = await brand(owner.id);
    const actorCookie = (await signIn(actor.email))!;

    expect(await mutate(actorCookie, "accounts.purgeAccount", { email: talent.email, reason: "IN7 profil lié" }))
      .toMatchObject({ status: 400, code: "BAD_REQUEST" });
    expect(await db.user.findUnique({ where: { id: talent.id } })).not.toBeNull();
    expect(await db.talentProfile.count({ where: { userId: talent.id } })).toBe(1);
    expect(await signIn(talent.email)).toBeTruthy();

    expect(await mutate(actorCookie, "accounts.purgeAccount", { email: owner.email, reason: "IN7 propriétaire" }))
      .toMatchObject({ status: 400, code: "BAD_REQUEST" });
    expect(await db.strategy.findUniqueOrThrow({ where: { id: owned.id } })).toMatchObject({ userId: owner.id });
  });

  it("vérifie avant l'écriture chaque table dont la base interdit d'orpheliner le compte", async () => {
    // Catalogue réel : clés étrangères vers "User" en RESTRICT ou NO ACTION.
    const rows = await db.$queryRaw<Array<{ table: string }>>`
      SELECT DISTINCT c.conrelid::regclass::text AS table FROM pg_constraint c
      WHERE c.contype = 'f' AND c.confrelid = '"User"'::regclass AND c.confdeltype IN ('r', 'a')`;
    expect(rows.map((row) => row.table.replaceAll('"', "")).sort()).toEqual([...PURGE_RESTRICTING_TABLES].sort());
  });
});

// ── Réaffectation ───────────────────────────────────────────────────────────
describe.sequential("IN7 — réaffectation d'une marque ou d'un accès délégué", () => {
  it("transfère la propriété : le nouveau titulaire écrit, l'ancien ne garde que l'accès délégué puis le perd", async () => {
    const actor = await account("ADMIN"), previous = await account("FOUNDER"), next = await account("FOUNDER");
    const s = await brand(previous.id);
    const actorCookie = (await signIn(actor.email))!, prevCookie = (await signIn(previous.email))!, nextCookie = (await signIn(next.email))!;
    ok(await trpc(prevCookie, "strategy.get", { id: s.id }));
    refused(await trpc(nextCookie, "strategy.get", { id: s.id }), 403, "FORBIDDEN");
    refused(await mutate(nextCookie, "strategy.update", { id: s.id, name: "IN7 avant", recalculateScore: false }), 403, "FORBIDDEN");

    expect(ok(await mutate(actorCookie, "accounts.transferBrandOwnership", { strategyId: s.id, email: next.email })))
      .toMatchObject({ alreadyOwner: false, userId: next.id, previousOwnerId: previous.id });

    // Nouveau titulaire, session ouverte avant le transfert.
    expect(ok(await trpc(nextCookie, "strategy.getMyAccess", { strategyId: s.id }))).toMatchObject({ access: "owner" });
    ok(await trpc(nextCookie, "strategy.get", { id: s.id }));
    ok(await mutate(nextCookie, "strategy.update", { id: s.id, name: "IN7 nouveau titulaire", recalculateScore: false }));
    expect((ok(await trpc(nextCookie, "strategy.list", {})) as Array<{ id: string }>).map((row) => row.id)).toContain(s.id);

    // Ancien titulaire : délégué DIGITAL_DIRECTOR (choix documenté du transfert) —
    // lecture conservée, l'écriture de propriétaire lui est refusée.
    expect(ok(await trpc(prevCookie, "strategy.getMyAccess", { strategyId: s.id }))).toMatchObject({ access: "collaborator", role: "DIGITAL_DIRECTOR" });
    refused(await mutate(prevCookie, "strategy.update", { id: s.id, name: "IN7 ancien titulaire", recalculateScore: false }), 403, "FORBIDDEN");
    expect((await db.strategy.findUniqueOrThrow({ where: { id: s.id } })).name).toBe("IN7 nouveau titulaire");

    const collab = await db.strategyCollaborator.findUniqueOrThrow({ where: { strategyId_userId: { strategyId: s.id, userId: previous.id } } });
    expect(ok(await mutate(actorCookie, "strategy.revokeCollaborator", { strategyId: s.id, collaboratorId: collab.id }))).toEqual({ revoked: true });
    refused(await trpc(prevCookie, "strategy.get", { id: s.id }), 403, "FORBIDDEN");
    refused(await trpc(prevCookie, "actions.byStrategy", { strategyId: s.id }), 403, "FORBIDDEN");
    refused(await mutate(prevCookie, "strategy.update", { id: s.id, name: "IN7 révoqué", recalculateScore: false }), 403, "FORBIDDEN");
    expect(ok(await trpc(prevCookie, "strategy.getMyAccess", { strategyId: s.id }))).toMatchObject({ access: "none" });
    expect((ok(await trpc(prevCookie, "strategy.list", {})) as Array<{ id: string }>).map((row) => row.id)).not.toContain(s.id);
    // Le chokepoint et le filtre de liste disent la même chose que la route.
    expect(await canAccessStrategy(s.id, await getOperatorContext(previous.id))).toBe(false);
    expect(await db.strategy.count({ where: { AND: [{ id: s.id }, scopeStrategies(await getOperatorContext(previous.id))] } })).toBe(0);
    expect(await db.strategy.count({ where: { AND: [{ id: s.id }, scopeStrategies(await getOperatorContext(next.id))] } })).toBe(1);
  });

  it("réaffecte un accès délégué : l'ancien délégué perd lecture et écriture, le nouveau les obtient", async () => {
    const actor = await account("ADMIN"), owner = await account("FOUNDER");
    const oldDelegate = await account("FREELANCE"), newDelegate = await account("FREELANCE");
    const s = await brand(owner.id);
    const actorCookie = (await signIn(actor.email))!, oldCookie = (await signIn(oldDelegate.email))!, newCookie = (await signIn(newDelegate.email))!;
    const propose = (title: string) => ({ strategyId: s.id, mode: "MANUAL", manualActions: [{ title }] });

    const granted = ok(await mutate(actorCookie, "strategy.grantCollaborator", { strategyId: s.id, userEmail: oldDelegate.email, role: "SOCIAL_MANAGER" })) as { id: string };
    ok(await trpc(oldCookie, "actions.byStrategy", { strategyId: s.id }));
    ok(await mutate(oldCookie, "actions.propose", propose("IN7 action de l'ancien délégué")));
    refused(await trpc(newCookie, "actions.byStrategy", { strategyId: s.id }), 403, "FORBIDDEN");
    refused(await mutate(newCookie, "actions.propose", propose("IN7 refusée avant attribution")), 403, "FORBIDDEN");

    expect(ok(await mutate(actorCookie, "strategy.revokeCollaborator", { strategyId: s.id, collaboratorId: granted.id }))).toEqual({ revoked: true });
    ok(await mutate(actorCookie, "strategy.grantCollaborator", { strategyId: s.id, userEmail: newDelegate.email, role: "SOCIAL_MANAGER" }));

    refused(await trpc(oldCookie, "actions.byStrategy", { strategyId: s.id }), 403, "FORBIDDEN");
    refused(await mutate(oldCookie, "actions.propose", propose("IN7 refusée après retrait")), 403, "FORBIDDEN");
    expect(ok(await trpc(oldCookie, "strategy.getMyAccess", { strategyId: s.id }))).toMatchObject({ access: "none" });
    expect((ok(await trpc(oldCookie, "strategy.myDelegatedBrands")) as { cockpits: Array<{ strategyId: string }> }).cockpits
      .map((row) => row.strategyId)).not.toContain(s.id);

    ok(await trpc(newCookie, "actions.byStrategy", { strategyId: s.id }));
    ok(await mutate(newCookie, "actions.propose", propose("IN7 action du nouveau délégué")));
    expect(ok(await trpc(newCookie, "strategy.getMyAccess", { strategyId: s.id }))).toMatchObject({ access: "collaborator", role: "SOCIAL_MANAGER" });
    expect((ok(await trpc(newCookie, "strategy.list", {})) as Array<{ id: string }>).map((row) => row.id)).toContain(s.id);

    const titles = (await db.brandAction.findMany({ where: { strategyId: s.id }, select: { title: true } })).map((row) => row.title).sort();
    expect(titles).toEqual(["IN7 action de l'ancien délégué", "IN7 action du nouveau délégué"]);
    // L'historique de délégation est conservé (Loi 1) : la ligne révoquée reste.
    expect(await db.strategyCollaborator.findUniqueOrThrow({ where: { id: granted.id } })).toMatchObject({ status: "REVOKED" });
  });
});
