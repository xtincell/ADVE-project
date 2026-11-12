export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { resolveSalesPaymentReturn, salesPaymentPublicOrigin } from "@/server/services/crm-engine/payments";
export async function GET(request: Request, { params }: { params: Promise<{ returnId: string }> }) {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  const { returnId } = await params;
  const cookies = request.headers.get("cookie") ?? "";
  const cookie = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`sales-return-${returnId}=`))?.split("=").slice(1).join("=");
  try {
    const { path } = await resolveSalesPaymentReturn(returnId, cookie);
    return NextResponse.redirect(new URL(path, salesPaymentPublicOrigin(request.url)), { status: 303, headers });
  } catch {
    return new NextResponse("Retrouvez le lien de votre conversation pour consulter le règlement. Le retour du prestataire ne constitue pas une confirmation de paiement.", { status: 404, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } });
  }
}
