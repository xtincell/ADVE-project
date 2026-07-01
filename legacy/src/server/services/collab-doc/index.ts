/**
 * collab-doc — Persistence layer for collaborative documents (StrategyDoc).
 *
 * Tier 3.2 of the residual debt — wires the StrategyDoc table into a
 * load/save loop with optimistic-concurrency on `version`. Full Yjs CRDT
 * merging happens client-side; this layer is the durable snapshot.
 *
 * Wire format: `yState Bytes` contains an opaque payload (Yjs update or
 * raw JSON snapshot). The server treats it as bytes and never
 * deserializes. Authority for merge rules lives client-side.
 *
 * Concurrency: each save bumps `version`; conflicting writes (stale
 * version) return ConflictError so the client can re-fetch + re-apply.
 */

import type { PrismaClient } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";

export type DocKind = "PILLAR_CONTENT" | "ORACLE_SECTION" | "MESTOR_CHAT";

export interface CollabDocSnapshot {
  readonly strategyId: string;
  readonly docKind: DocKind;
  readonly docKey: string;
  readonly yState: Uint8Array;
  readonly version: number;
  readonly lastEditor: string | null;
  readonly updatedAt: Date;
}

export class ConflictError extends Error {
  constructor(public readonly currentVersion: number) {
    super(`StrategyDoc version conflict — current=${currentVersion}`);
    this.name = "ConflictError";
  }
}

export async function loadDoc(
  strategyId: string,
  docKind: DocKind,
  docKey: string,
  db: PrismaClient = defaultDb,
): Promise<CollabDocSnapshot | null> {
  const row = await db.strategyDoc.findUnique({
    where: { strategyId_docKind_docKey: { strategyId, docKind, docKey } },
  });
  if (!row) return null;
  return {
    strategyId: row.strategyId,
    docKind: row.docKind as DocKind,
    docKey: row.docKey,
    yState: new Uint8Array(row.yState),
    version: row.version,
    lastEditor: row.lastEditor,
    updatedAt: row.updatedAt,
  };
}

export interface SaveDocInput {
  readonly strategyId: string;
  readonly docKind: DocKind;
  readonly docKey: string;
  readonly yState: Uint8Array;
  /** Expected version (the version the client started from). */
  readonly baseVersion: number;
  readonly editorId: string | null;
}

export async function saveDoc(
  input: SaveDocInput,
  db: PrismaClient = defaultDb,
): Promise<CollabDocSnapshot> {
  const buf = Buffer.from(input.yState);
  const existing = await db.strategyDoc.findUnique({
    where: {
      strategyId_docKind_docKey: {
        strategyId: input.strategyId,
        docKind: input.docKind,
        docKey: input.docKey,
      },
    },
    select: { version: true },
  });

  if (existing && existing.version !== input.baseVersion) {
    throw new ConflictError(existing.version);
  }

  const row = await db.strategyDoc.upsert({
    where: {
      strategyId_docKind_docKey: {
        strategyId: input.strategyId,
        docKind: input.docKind,
        docKey: input.docKey,
      },
    },
    update: {
      yState: buf,
      version: { increment: 1 },
      lastEditor: input.editorId,
    },
    create: {
      strategyId: input.strategyId,
      docKind: input.docKind,
      docKey: input.docKey,
      yState: buf,
      version: 1,
      lastEditor: input.editorId,
    },
  });

  return {
    strategyId: row.strategyId,
    docKind: row.docKind as DocKind,
    docKey: row.docKey,
    yState: new Uint8Array(row.yState),
    version: row.version,
    lastEditor: row.lastEditor,
    updatedAt: row.updatedAt,
  };
}
