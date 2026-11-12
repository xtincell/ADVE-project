export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { linkCustomerSalesDiagnostic, linkCustomerSalesDiagnosticInput } from "@/server/services/crm-engine/intake-report";
import { getPublicBaseUrl } from "@/server/services/oauth-integrations";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const base = getPublicBaseUrl(request);
  if (request.headers.get("origin") && request.headers.get("origin") !== base) return NextResponse.json({ error: "Origine refusée." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Format de demande invalide." }, { status: 415, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new TRPCError({ code: "BAD_REQUEST" });
    const parts: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const value = await reader.read(); if (value.done) break;
      bytes += value.value.byteLength; if (bytes > 6000) { await reader.cancel(); throw new TRPCError({ code: "BAD_REQUEST" }); }
      parts.push(value.value);
    }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(parts).toString("utf8")); } catch { throw new TRPCError({ code: "BAD_REQUEST" }); }
    return NextResponse.json(await linkCustomerSalesDiagnostic((await params).token, linkCustomerSalesDiagnosticInput.parse(raw), base), { headers });
  } catch (error) {
    const code = error instanceof TRPCError ? error.code : null;
    const status = error instanceof ZodError || code === "BAD_REQUEST" ? 400 : code === "CONFLICT" ? 409 : code === "PRECONDITION_FAILED" ? 412 : code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: status === 400 ? "Vérifiez le lien de votre diagnostic, votre adresse e-mail et votre accord." : status === 409
      ? "Le diagnostic ou cette proposition a changé. Relisez la conversation avant de continuer." : status === 412 && error instanceof TRPCError
        ? error.message : status === 404 ? "Conversation indisponible." : "L’association n’a pas pu être confirmée. Vérifiez son état avant de réessayer." }, { status, headers });
  }
}
