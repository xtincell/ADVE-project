/**
 * GET /api/intake/[token]/pdf — server-side rendered .pdf download.
 *
 * Auth model: the intake must have at least one IntakePayment row with
 * status=PAID for this token (or the caller is admin via session).
 * Renders the result page server-side via puppeteer and streams the
 * binary back as `application/pdf`.
 *
 * Security:
 *   - Token-gated like the result page itself (anyone with the share token
 *     can fetch — same posture as the public result URL).
 *   - Free path is admin-only: a non-admin without a paid row gets 402.
 *   - The puppeteer instance navigates to localhost only — no external fetch.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { renderIntakePdf } from "@/server/services/value-report-generator/intake-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, ctx: RouteContext): Promise<Response> {
  const { token } = await ctx.params;

  // ── Validate intake exists + is finalised ──
  const intake = await db.quickIntake.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true, companyName: true },
  });
  if (!intake) {
    return NextResponse.json({ error: "Intake introuvable" }, { status: 404 });
  }
  if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
    return NextResponse.json({ error: "Intake non finalisé" }, { status: 409 });
  }

  // ── Auth: paid OR admin ──
  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === "ADMIN";
  if (!isAdmin) {
    const paid = await db.intakePayment.findFirst({
      where: { intakeToken: token, status: "PAID" },
      select: { id: true },
    });
    if (!paid) {
      return NextResponse.json(
        { error: "PDF verrouillé — déclencher d'abord le paiement (ou être admin)." },
        { status: 402 },
      );
    }
  } else if (!(await db.intakePayment.findFirst({ where: { intakeToken: token, status: "PAID" } }))) {
    // Admin bypass: write a synthetic PAID row so the page renders in paid state.
    // (renderIntakePdf needs an existing paid ref to pass in the page URL.)
    await db.intakePayment.create({
      data: {
        reference: `lafusee_admin_pdf_${Date.now()}`,
        intakeToken: token,
        amount: 0,
        currency: "EUR",
        provider: "ADMIN_BYPASS",
        status: "PAID",
        paidAt: new Date(),
      },
    });
  }

  // ── Build the base URL the puppeteer instance will hit ──
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // ── Render ──
  let result;
  try {
    result = await renderIntakePdf({ token, baseUrl, format: "A4" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec génération PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // ── Stream the buffer ──
  const safeName = intake.companyName.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
  const filename = `rapport-adve-rtis-${safeName}.pdf`;
  return new Response(new Uint8Array(result.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(result.bytes),
      "Cache-Control": "private, no-store",
    },
  });
}
