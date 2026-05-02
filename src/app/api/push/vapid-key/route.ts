/**
 * VAPID public key endpoint — exposé à la UI pour la subscription Web Push.
 *
 * Cf. ADR-0024. Lit ExternalConnector connectorType="vapid" pour l'operator
 * du user courant. Retourne `{ publicKey: null }` si pas configuré (la UI
 * affiche alors un CTA "Configure VAPID dans /console/anubis/credentials").
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { credentialVault } from "@/server/services/anubis/credential-vault";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { operatorId: true },
  });
  if (!user?.operatorId) {
    return NextResponse.json({ publicKey: null, reason: "No operator" });
  }

  const cred = await credentialVault.get(user.operatorId, "vapid");
  if (!cred) {
    return NextResponse.json({ publicKey: null, reason: "VAPID not configured" });
  }

  const config = cred.config as { publicKey?: string };
  return NextResponse.json({ publicKey: config.publicKey ?? null });
}
