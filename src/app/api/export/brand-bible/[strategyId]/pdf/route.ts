export const dynamic = "force-dynamic";
/**
 * /api/export/brand-bible/[strategyId]/pdf — Bible de Marque PDF (deck 16:9).
 *
 * Endpoint auth-gardé qui streame la Bible de Marque (2ᵉ livrable, compilation
 * de la séquence BRANDBOOK-D). Délègue à `exportBrandBibleAsPdf` (jsPDF
 * serverless-safe, comme l'Oracle — pas de Chromium, pas de page publique).
 * Appelé depuis le bouton « Télécharger la bible » du Cockpit.
 *
 * Mission contribution : CHAIN_VIA:value-report-generator (Propulsion — le
 * livrable BRAND remonte à l'ADVE via les Glory tools BRANDBOOK-D).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  exportBrandBibleAsPdf,
  exportComposedBrandBibleAsPdf,
} from "@/server/services/value-report-generator/brand-bible-pdf";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { strategyId } = await params;

  // Isolation opérateur — anti-IDOR : seul ADMIN / propriétaire / même opérateur
  // / collaborateur peut télécharger la Bible de cette marque. Les routes sœurs
  // (Oracle PDF, export) posaient déjà cette garde ; celle-ci l'omettait → tout
  // compte authentifié téléchargeait la Bible complète de n'importe quelle marque.
  const hasAccess = await canAccessStrategy(strategyId, {
    operatorId: (session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
    userId: session.user.id,
    role: session.user.role ?? "USER",
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: { id: true, name: true },
  });
  if (!strategy) {
    return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  }

  try {
    // Par défaut : le LIVRE composé (ADR-0185) — ce que la marque déclare + ce
    // que ses documents en disent, avec l'origine de chaque élément. C'est lui
    // qui fait référence. `?deck=1` sert l'ancien deck créatif BRANDBOOK-D,
    // qui reste un livrable à part entière.
    const wantsDeck = new URL(request.url).searchParams.get("deck") === "1";
    const { pdf } = wantsDeck
      ? await exportBrandBibleAsPdf(strategyId)
      : await exportComposedBrandBibleAsPdf(strategyId);
    const filename = `${wantsDeck ? "deck-de-marque" : "livre-de-marque"}-${slugify(strategy.name)}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    const body = new Uint8Array(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    console.error("[export/brand-bible/pdf] Failed:", error);
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "marque"
  );
}
