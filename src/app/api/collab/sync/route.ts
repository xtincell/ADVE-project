/**
 * /api/collab/sync — load + save handler for StrategyDoc collaborative
 * documents (Tier 3.2 of the residual debt).
 *
 * GET  ?strategyId=&docKind=&docKey=     → returns { yState, version, lastEditor, updatedAt }
 * POST { strategyId, docKind, docKey, yState (base64), baseVersion } → applies and returns new version
 *
 * Authority for merge rules lives client-side (Yjs or any CRDT). The server
 * stores opaque bytes with optimistic-concurrency on `version`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import {
  ConflictError,
  loadDoc,
  saveDoc,
  type DocKind,
} from "@/server/services/collab-doc";

const VALID_KINDS: ReadonlySet<DocKind> = new Set([
  "PILLAR_CONTENT",
  "ORACLE_SECTION",
  "MESTOR_CHAT",
] as const);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const strategyId = req.nextUrl.searchParams.get("strategyId");
  const docKind = req.nextUrl.searchParams.get("docKind") as DocKind | null;
  const docKey = req.nextUrl.searchParams.get("docKey");
  if (!strategyId || !docKind || !docKey || !VALID_KINDS.has(docKind)) {
    return NextResponse.json({ error: "missing or invalid params" }, { status: 400 });
  }
  const snap = await loadDoc(strategyId, docKind, docKey);
  if (!snap) {
    return NextResponse.json({
      yState: null,
      version: 0,
      lastEditor: null,
      updatedAt: null,
    });
  }
  return NextResponse.json({
    yState: Buffer.from(snap.yState).toString("base64"),
    version: snap.version,
    lastEditor: snap.lastEditor,
    updatedAt: snap.updatedAt.toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as
    | { strategyId?: string; docKind?: DocKind; docKey?: string; yState?: string; baseVersion?: number }
    | null;
  if (
    !body ||
    !body.strategyId ||
    !body.docKind ||
    !VALID_KINDS.has(body.docKind) ||
    !body.docKey ||
    typeof body.yState !== "string" ||
    typeof body.baseVersion !== "number"
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  let yBytes: Uint8Array;
  try {
    yBytes = new Uint8Array(Buffer.from(body.yState, "base64"));
  } catch {
    return NextResponse.json({ error: "invalid yState (base64)" }, { status: 400 });
  }
  if (yBytes.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "yState too large (>5MB)" }, { status: 413 });
  }
  try {
    const snap = await saveDoc({
      strategyId: body.strategyId,
      docKind: body.docKind,
      docKey: body.docKey,
      yState: yBytes,
      baseVersion: body.baseVersion,
      editorId: session.user.id,
    });
    return NextResponse.json({
      version: snap.version,
      lastEditor: snap.lastEditor,
      updatedAt: snap.updatedAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { error: "conflict", currentVersion: err.currentVersion },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "save failed" },
      { status: 500 },
    );
  }
}
