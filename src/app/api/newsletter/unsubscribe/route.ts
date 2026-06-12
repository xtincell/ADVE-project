export const dynamic = "force-dynamic";
/**
 * GET/POST /api/newsletter/unsubscribe?token=… — désinscription un-clic
 * (Vague 10). GET = lien du footer email ; POST = List-Unsubscribe-Post
 * (RFC 8058, un-clic côté clients mail). Idempotent.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function unsubscribe(token: string | null): Promise<NextResponse> {
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  const contact = await db.crmContact.findUnique({ where: { unsubscribeToken: token } });
  if (!contact) return NextResponse.json({ error: "Token inconnu" }, { status: 404 });
  if (contact.newsletterOptIn) {
    await db.crmContact.update({
      where: { id: contact.id },
      data: { newsletterOptIn: false, unsubscribedAt: new Date() },
    });
  }
  return new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Désinscription — La Fusée</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:80px auto;padding:0 20px;color:#1a1a1a">
<h1 style="font-size:22px">Désinscription confirmée</h1>
<p>${contact.email} ne recevra plus The Upgrade. Vous pouvez vous réinscrire à tout moment depuis lafusee — sans rancune, la porte reste ouverte.</p>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  return unsubscribe(new URL(request.url).searchParams.get("token"));
}

export async function POST(request: Request) {
  return unsubscribe(new URL(request.url).searchParams.get("token"));
}
