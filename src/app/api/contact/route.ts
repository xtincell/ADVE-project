export const dynamic = "force-dynamic";
/**
 * POST /api/contact — capture publique d'un lead « démarrer un projet » depuis
 * le site UPgraders. Upsert `CrmContact` (source WEBSITE_CONTACT) + consigne le
 * brief en `CrmMessage` (direction IN). Même pattern public/idempotent que
 * `/api/newsletter/subscribe` — la soumission du formulaire vaut prise de contact.
 *
 * Les leads atterrissent dans `/console/anubis/crm` ; l'opérateur qualifie en Deal.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    brand?: string;
    need?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim().slice(0, 120);
  if (!email || !EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  const phone = body.phone?.trim().slice(0, 40) || null;
  const company = body.brand?.trim().slice(0, 160) || null;
  const need = body.need?.trim().slice(0, 80) || "Autre";
  const message = body.message?.trim().slice(0, 4000) || "";

  const contact = await db.crmContact.upsert({
    where: { email },
    create: { email, name, phone, company, source: "WEBSITE_CONTACT", tags: [need] },
    update: {
      name,
      ...(phone ? { phone } : {}),
      ...(company ? { company } : {}),
    },
  });

  await db.crmMessage.create({
    data: {
      contactId: contact.id,
      direction: "IN",
      channel: "WEB_FORM",
      status: "RECEIVED",
      subject: `Projet — ${company || name} · ${need}`,
      body: message || "(brief vide — relancer via téléphone/WhatsApp)",
      provider: "MANUAL",
    },
  });

  return NextResponse.json({ ok: true, message: "Brief reçu — on revient vers vous sous 24 h." });
}
