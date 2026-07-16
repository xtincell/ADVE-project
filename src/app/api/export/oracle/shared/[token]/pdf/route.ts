/**
 * Export PDF de l'Oracle depuis le LIEN PUBLIC — le token EST l'autorisation
 * (même doctrine que /shared/strategy/[token] : resolveShareToken).
 *
 * Audit 2026-07-16 (`shared-oracle-pdf-401`) : le CTA « Export PDF » du
 * livrable partagé pointait la route session-gardée → le destinataire du lien
 * recevait un JSON 401 brut. Le CTA le plus visible du livrable ne marchait
 * jamais pour son destinataire.
 */
import { NextResponse } from "next/server";
import { resolveShareToken } from "@/server/services/strategy-presentation";
import { exportOracleAsPdf } from "@/server/services/strategy-presentation/export-oracle";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const strategyId = await resolveShareToken(token);
  if (!strategyId) {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 404 });
  }

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { name: true },
  });

  try {
    const pdf = await exportOracleAsPdf(strategyId);
    const filename = `strategie-${(strategy?.name ?? "marque").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[shared-oracle-pdf] export failed:", err);
    return NextResponse.json({ error: "Export indisponible" }, { status: 500 });
  }
}
