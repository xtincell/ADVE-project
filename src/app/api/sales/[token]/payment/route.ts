export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { requestCustomerSalesPayment, salesPaymentPublicOrigin } from "@/server/services/crm-engine/payments";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  let base: string;
  try { base = salesPaymentPublicOrigin(request.url); } catch { return NextResponse.json({ error: "Le paiement en ligne est momentanément indisponible." }, { status: 503, headers }); }
  if (request.headers.get("origin") && request.headers.get("origin") !== base) return NextResponse.json({ error: "Origine refusée." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Format de demande invalide." }, { status: 415, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new TRPCError({ code: "BAD_REQUEST" });
    const parts: Uint8Array[] = []; let bytes = 0;
    while (true) { const value = await reader.read(); if (value.done) break; bytes += value.value.byteLength; if (bytes > 6000) { await reader.cancel(); throw new TRPCError({ code: "BAD_REQUEST" }); } parts.push(value.value); }
    let input: unknown;
    try { input = JSON.parse(Buffer.concat(parts).toString("utf8")); } catch { throw new TRPCError({ code: "BAD_REQUEST" }); }
    const { returnCookie, dealId: _privateDealId, ...result } = await requestCustomerSalesPayment((await params).token, input as Parameters<typeof requestCustomerSalesPayment>[1], base);
    const response = NextResponse.json(result, { headers });
    response.cookies.set(returnCookie.name, returnCookie.value, { httpOnly: true, secure: new URL(base).protocol === "https:", sameSite: "lax", path: "/api/sales/payment-return", maxAge: 86400 });
    return response;
  } catch (error) {
    const code = error instanceof TRPCError ? error.code : null;
    const status = error instanceof ZodError || code === "BAD_REQUEST" ? 400 : code === "CONFLICT" ? 409 : code === "PRECONDITION_FAILED" ? 412 : 404;
    return NextResponse.json({ error: status === 400 ? "Vérifiez votre adresse e-mail et cette demande de paiement." : status === 409 ? "Cette demande a changé. Reprenez la conversation avant de poursuivre." : status === 412 ? "Le paiement en ligne est momentanément indisponible. L’équipe peut vérifier votre demande ; aucun second paiement n’a été créé." : "Paiement indisponible." }, { status, headers });
  }
}
