export const dynamic = "force-dynamic";
/**
 * POST /api/newsletter/subscribe — inscription publique à The Upgrade
 * (Vague 10). Opt-in EXPLICITE : l'appel vaut consentement (formulaire
 * dédié). Upsert CrmContact source NEWSLETTER, idempotent.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: { email?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  await db.crmContact.upsert({
    where: { email },
    create: {
      email,
      name: body.name?.trim().slice(0, 120) || null,
      source: "NEWSLETTER",
      newsletterOptIn: true,
      subscribedAt: new Date(),
    },
    update: { newsletterOptIn: true, subscribedAt: new Date(), unsubscribedAt: null },
  });

  return NextResponse.json({ ok: true, message: "Inscription confirmée — bienvenue à bord de The Upgrade." });
}
