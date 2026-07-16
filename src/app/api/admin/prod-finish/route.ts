export const dynamic = "force-dynamic";
/**
 * Finaliseur d'installation prod (utilitaire opérateur, guardé CRON_SECRET).
 *
 * Même esprit que `/api/admin/seed-brands` : exécute des actes ponctuels
 * côté serveur (fin du SSH / accès DB direct impossible depuis un sandbox
 * — la base Coolify a un hostname interne). Idempotent, honnête (aucune
 * fabrication : si la page FB n'est pas connectée, on le DIT).
 *
 * POST /api/admin/prod-finish?delayMin=3&loginBrand=motion19&postBrand=xtincell
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * 1. Crée (idempotent) le login `Lionel` (mdp bcrypt) rattaché à la marque
 *    `loginBrand` via StrategyCollaborator ACTIVE (ADR-0129/0131).
 * 2. Planifie un POST TEXTE sur la page Facebook de `postBrand` — via
 *    l'Intent GOUVERNÉ `ANUBIS_PUBLISH_SOCIAL_POST` (scheduleAt futur → le
 *    cron `social-sync?mode=publish` le publie à l'échéance : le pipe est
 *    respecté). Skip honnête si la page n'est pas connectée.
 */

import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { brandPublicSlug } from "@/domain/brand-slug";

const DEFAULT_TEXT =
  "🚀 Test de publication automatisée via La Fusée — chaîne ADVE → calendrier → publication planifiée. Ce message part à l'heure fixée par le système.";

async function resolveBrand(slugOrName: string) {
  // brandPublicSlug est idempotent : gère « motion19 » comme « LFA-motion19 »
  // (audit 2026-07-16 `prod-finish-lowercase-slug-lookup` : le toLowerCase brut
  // ne matchait plus jamais un slug canon `LFA-…`). Lève sur entrée non-sluggable
  // → on retombe sur la recherche par nom.
  let canonicalSlug: string | null = null;
  try { canonicalSlug = brandPublicSlug(slugOrName); } catch { canonicalSlug = null; }
  return db.strategy.findFirst({
    where: {
      OR: [
        ...(canonicalSlug ? [{ publicSlug: canonicalSlug }] : []),
        { name: { contains: slugOrName, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, userId: true },
  });
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const loginBrand = url.searchParams.get("loginBrand") ?? "motion19";
  const postBrand = url.searchParams.get("postBrand") ?? "xtincell";
  const loginEmail = (url.searchParams.get("loginEmail") ?? "lionel@motion19.cm").toLowerCase();
  const loginName = url.searchParams.get("loginName") ?? "Lionel";
  const loginPassword = url.searchParams.get("loginPassword") ?? "12345678";
  const delayMin = Math.max(2, Number(url.searchParams.get("delayMin") ?? 3));
  const text = url.searchParams.get("text") ?? DEFAULT_TEXT;

  const log: string[] = [];
  const report: Record<string, unknown> = {};

  // ── 1. Login de marque (Lionel → Motion19) — idempotent, direct ops ──
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const brand = await resolveBrand(loginBrand);
    if (!brand) {
      log.push(`[SKIP] login : marque "${loginBrand}" introuvable`);
      report.login = { done: false, reason: "brand-not-found" };
    } else {
      const existing = await db.user.findUnique({
        where: { email: loginEmail },
        select: { id: true, hashedPassword: true },
      });
      if (existing?.hashedPassword) {
        log.push(`[SKIP] login ${loginEmail} existe déjà (mot de passe non réécrit)`);
        report.login = { done: false, reason: "already-has-password", email: loginEmail, brand: brand.name };
      } else {
        const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
        const hashedPassword = await bcrypt.hash(loginPassword, 12);
        const user = existing
          ? await db.user.update({
              where: { id: existing.id },
              data: { name: loginName, hashedPassword, role: "FOUNDER", passwordChangeInvited: true },
              select: { id: true },
            })
          : await db.user.create({
              data: { name: loginName, email: loginEmail, hashedPassword, role: "FOUNDER", passwordChangeInvited: true },
              select: { id: true },
            });
        await db.strategyCollaborator.upsert({
          where: { strategyId_userId: { strategyId: brand.id, userId: user.id } },
          update: { role: "DIGITAL_DIRECTOR", status: "ACTIVE", revokedAt: null, grantedByUserId: admin?.id ?? user.id },
          create: {
            strategyId: brand.id,
            userId: user.id,
            role: "DIGITAL_DIRECTOR",
            scopes: [],
            status: "ACTIVE",
            grantedByUserId: admin?.id ?? user.id,
          },
        });
        log.push(`[OK] login ${loginEmail} créé → ${brand.name} (DIGITAL_DIRECTOR)`);
        report.login = { done: true, email: loginEmail, brand: brand.name };
      }
    }
  } catch (e) {
    log.push(`[ERR] login : ${e instanceof Error ? e.message : String(e)}`);
    report.login = { done: false, reason: "error" };
  }

  // ── 2. Post texte planifié (Xtincell FB) — via Intent GOUVERNÉ ──
  try {
    const brand = await resolveBrand(postBrand);
    if (!brand) {
      log.push(`[SKIP] post : marque "${postBrand}" introuvable`);
      report.post = { done: false, reason: "brand-not-found" };
    } else {
      const fb = await db.socialConnection.findFirst({
        where: { strategyId: brand.id, platform: "FACEBOOK", status: "ACTIVE" },
        select: { accountId: true, metadata: true },
      });
      if (!fb) {
        log.push(`[SKIP] post : ${brand.name} n'a pas de page Facebook connectée (ACTIVE)`);
        report.post = { done: false, reason: "facebook-not-connected", brand: brand.name };
      } else {
        // Idempotence : ne pas empiler des posts en attente sur re-trigger.
        const pending = await db.brandAction.findFirst({
          where: {
            strategyId: brand.id,
            status: "SCHEDULED",
            metadata: { path: ["socialPublish", "pending"], equals: true },
          },
          select: { id: true },
        });
        if (pending) {
          log.push(`[SKIP] post : une publication est déjà planifiée (${pending.id})`);
          report.post = { done: false, reason: "already-scheduled", brandActionId: pending.id };
        } else {
          const { emitIntentTyped } = await import("@/server/services/mestor/intents");
          const fireAt = new Date(Date.now() + delayMin * 60_000).toISOString();
          const out = await emitIntentTyped<{ mode: string; brandActionId: string }>(
            {
              kind: "ANUBIS_PUBLISH_SOCIAL_POST",
              strategyId: brand.id,
              userId: brand.userId,
              targets: ["FACEBOOK"],
              text,
              linkUrl: null,
              imageUrl: null,
              scheduleAt: fireAt,
              brandActionId: null,
            },
            { caller: "admin:prod-finish:schedule" },
          );
          log.push(`[OK] post texte planifié sur ${brand.name} (+${delayMin}min, ${fireAt}) → ${out.brandActionId}`);
          report.post = {
            done: true,
            brand: brand.name,
            page: fb.accountId,
            brandActionId: out.brandActionId,
            fireAt,
            note: `Déclencher /api/cron/social-sync?mode=publish après ${fireAt} pour publier (ou attendre le cron).`,
          };
        }
      }
    }
  } catch (e) {
    log.push(`[ERR] post : ${e instanceof Error ? e.message : String(e)}`);
    report.post = { done: false, reason: "error" };
  }

  return NextResponse.json({ ok: true, log, report, at: new Date().toISOString() });
}
