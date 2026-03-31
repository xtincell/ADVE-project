import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { exportStrategyData, exportAsCsv } from "@/server/services/data-export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ strategyId: string }> }
) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { strategyId } = await params;
  const url = new URL(request.url);
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
