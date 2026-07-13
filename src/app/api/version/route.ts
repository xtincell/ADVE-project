/**
 * GET /api/version — sonde publique de version (zéro secret).
 *
 * Sert la version de l'instance qui répond. Le watcher de déploiement du
 * console `/console/socle/prod-ops` poll cette route (même origine) : après le
 * swap de conteneur Coolify, la valeur avance → le déploiement est en ligne.
 */
import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
