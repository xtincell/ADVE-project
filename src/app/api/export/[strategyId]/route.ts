export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { exportStrategyData, exportAsCsv, exportPublicBrand } from "@/server/services/data-export";
import { canAccessStrategy } from "@/server/services/operator-isolation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  const url = new URL(request.url);
  const { strategyId } = await params;
  if (["public-brand", "public-brand-v2"].includes(url.searchParams.get("format") ?? "")) {
    const edition = await exportPublicBrand(strategyId, url.searchParams.get("format") === "public-brand-v2");
    const origin = request.headers.get("origin");
    const allowed = origin === "https://spawt.online" || origin === "https://www.spawt.online" || origin === "https://portail.spawt.online";
    const headers = {
      "Cache-Control": "public, max-age=0, s-maxage=30",
      "Vary": "Origin",
      ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    };
    if (!edition) return NextResponse.json({ error: "Publication introuvable" }, { status: 404, headers });
    const etag = `"${edition.edition}-${edition.digest}"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...headers, ETag: etag } });
    return NextResponse.json(edition, { headers: { ...headers, ETag: etag } });
  }
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Operator isolation — prevent IDOR: only ADMIN, the strategy owner, or the
  // same operator may export this brand's data. Mirrors the strategy router.
  const hasAccess = await canAccessStrategy(strategyId, {
    operatorId: (session.user as unknown as Record<string, unknown>).operatorId as string | null ?? null,
    userId: session.user.id,
    role: session.user.role ?? "USER",
  });
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const format = url.searchParams.get("format") ?? "json";

  try {
    if (format === "csv") {
      const csvFiles = await exportAsCsv(strategyId);

      // If a specific file is requested, return just that file as text/csv
      const file = url.searchParams.get("file");
      if (file && csvFiles[file]) {
        return new Response(csvFiles[file], {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${file}"`,
          },
        });
      }

      return NextResponse.json(csvFiles);
    }

    const data = await exportStrategyData(strategyId);
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="strategy-${strategyId}.json"`,
      },
    });
  } catch (error) {
    console.error("[export] Failed to export strategy:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
