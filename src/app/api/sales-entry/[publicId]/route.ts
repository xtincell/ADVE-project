export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { publicSalesEntry, publicSalesClientIpHash, startPublicSalesConversation } from "@/server/services/crm-engine/public-entry";
import { resolveClientIp } from "@/server/services/seshat/scan-rate-limit";
import { getPublicBaseUrl } from "@/server/services/oauth-integrations";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const unavailable = "Cette conversation est momentanément indisponible.";
function failure(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Vérifiez votre message avant de commencer." }, { status: 400, headers });
  if (error instanceof TRPCError) {
    const status = error.code === "TOO_MANY_REQUESTS" ? 429 : error.code === "NOT_FOUND" ? 404 :
      error.code === "CONFLICT" ? 409 : error.code === "BAD_REQUEST" ? 400 : error.code === "PRECONDITION_FAILED" || error.code === "FORBIDDEN" ? 409 : 503;
    // Authority errors never reveal personnel, private catalogue or financial details.
    const message = status === 429 ? "Cette équipe a atteint sa capacité de nouvelles conversations. Réessayez plus tard." :
      error.code === "BAD_REQUEST" ? error.message : unavailable;
    return NextResponse.json({ error: message }, { status, headers });
  }
  return NextResponse.json({ error: unavailable }, { status: 503, headers });
}
export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  try { return NextResponse.json(await publicSalesEntry((await params).publicId), { headers }); }
  catch (error) { return failure(error); }
}
async function boundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new TRPCError({ code: "BAD_REQUEST", message: "Écrivez votre message pour commencer." });
  const chunks: Uint8Array[] = []; let bytes = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > 12000) { await reader.cancel(); throw new TRPCError({ code: "BAD_REQUEST", message: "Le message est trop long." }); }
    chunks.push(chunk.value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Vérifiez votre message avant de commencer." }); }
}
export async function POST(request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  if (request.headers.get("origin") && request.headers.get("origin") !== getPublicBaseUrl(request)) return NextResponse.json({ error: "Origine refusée." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Format de message invalide." }, { status: 415, headers });
  if (Number(request.headers.get("content-length") ?? 0) > 12000) return NextResponse.json({ error: "Le message est trop long." }, { status: 413, headers });
  try {
    const body = await boundedJson(request);
    const result = await startPublicSalesConversation((await params).publicId, body as Parameters<typeof startPublicSalesConversation>[1],
      { ipHash: publicSalesClientIpHash(resolveClientIp(request.headers)) });
    return NextResponse.json(result, { headers });
  } catch (error) { return failure(error); }
}
