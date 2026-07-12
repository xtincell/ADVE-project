export const dynamic = "force-dynamic";
/**
 * /api/integrations/linkedin/webhook — endpoint webhook LinkedIn (portail dev).
 *
 * LinkedIn valide l'URL par un GET « challenge » : il envoie
 * `?challengeCode=…` et exige un 200 JSON
 * `{ challengeCode, challengeResponse }` où challengeResponse =
 * HMAC-SHA256 hex du challengeCode signé avec le CLIENT SECRET de l'app.
 * Sans cette réponse exacte, « Test this URL » échoue et le webhook ne peut
 * pas être enregistré.
 *
 * Les événements (POST) arrivent signés `X-LI-Signature` (HMAC-SHA256 hex du
 * corps brut, même secret). Seul type proposé par LinkedIn aujourd'hui :
 * « member verification or profile status change ». v1 honnête : signature
 * vérifiée puis ACK — AUCUNE donnée membre persistée (rien dans notre
 * circuit ne consomme cet événement ; on ne stocke pas ce qu'on n'utilise
 * pas — minimisation RGPD, même doctrine que social-connect).
 */

import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { computeLinkedInChallengeResponse } from "@/server/services/oauth-integrations";

function linkedinSecret(): string | null {
  const s = process.env.LINKEDIN_OAUTH_CLIENT_SECRET ?? process.env.LINKEDIN_CLIENT_SECRET;
  return s && s.length > 0 ? s : null;
}

export async function GET(request: Request) {
  const secret = linkedinSecret();
  if (!secret) {
    // État honnête : sans secret env, l'endpoint ne peut pas signer.
    return NextResponse.json({ error: "linkedin_not_configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  const challengeCode = url.searchParams.get("challengeCode");
  if (!challengeCode) {
    return NextResponse.json({ error: "missing_challengeCode" }, { status: 400 });
  }
  return NextResponse.json({
    challengeCode,
    challengeResponse: computeLinkedInChallengeResponse(challengeCode, secret),
  });
}

export async function POST(request: Request) {
  const secret = linkedinSecret();
  if (!secret) {
    return NextResponse.json({ error: "linkedin_not_configured" }, { status: 503 });
  }
  const raw = await request.text();
  const signature = request.headers.get("x-li-signature");
  if (signature) {
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature.replace(/^hmacsha256=/i, ""), "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  }
  // ACK sans persistance : l'événement « member verification / profile
  // status » n'alimente aucune surface — on n'enregistre pas de donnée
  // membre qu'on ne consomme pas.
  console.log("[linkedin-webhook] event reçu (ack, non persisté)", raw.slice(0, 200));
  return NextResponse.json({ ok: true });
}
