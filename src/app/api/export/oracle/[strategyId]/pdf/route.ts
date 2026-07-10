export const dynamic = "force-dynamic";
/**
 * /api/export/oracle/[strategyId]/pdf — Oracle PDF download (Phase 13 ADR-0014).
 *
 * Auth-required HTTP endpoint that streams the Oracle as PDF for download.
 * Called from the cockpit `Export PDF` button (cf. cockpit/brand/proposition).
 *
 * Why this exists : the legacy `Export PDF` button called `window.print()` on
 * the *proposition* index page (checklist + buttons), not on the Oracle render
 * itself. That printed the wrong document. This route delegates to
 * `exportOracleAsPdf` (server-side jspdf walk over the 35-section
 * SECTION_REGISTRY via assemblePresentation), so the founder always gets the
 * actual Oracle as a downloadable artifact regardless of which page they
 * triggered the export from.
 *
 * Mission contribution : CHAIN_VIA:strategy-presentation (sustainment of the
 * Oracle livrable across export channels).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { exportOracleAsPdf } from "@/server/services/strategy-presentation/export-oracle";
import { canAccessStrategy } from "@/server/services/operator-isolation";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ strategyId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { strategyId } = await params;

  // Operator isolation — prevent IDOR: only ADMIN, the strategy owner, or the
  // same operator may download this brand's Oracle. Mirrors the strategy router.
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
    const buffer = await exportOracleAsPdf(strategyId);
    const filename = `oracle-${slugify(strategy.name)}-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    const body = new Uint8Array(buffer);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    console.error("[export/oracle/pdf] Failed:", error);
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "strategy";
}
