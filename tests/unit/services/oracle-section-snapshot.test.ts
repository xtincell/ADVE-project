/**
 * Plan 4.11.e — l'instantané de l'Oracle (tRPC `oracle.snapshotStrategy`, outil
 * MCP `oracle.snapshot`) distingue la fin de rédaction du contenu rédigé.
 *
 * `complete` compte le STATUT de rédaction terminée. Une rédaction peut se
 * terminer sans contenu (`{}`) : l'instantané annonçait alors « N complètes »
 * pour un Oracle sans aucune section rédigée. `written` et `current` portent
 * désormais le contenu réellement enregistré.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { status: string; payload: unknown };
const f = vi.hoisted(() => ({ rows: [] as Row[] }));

vi.mock("@/lib/db", () => ({
  db: {
    oracleSection: {
      findMany: async () => f.rows,
      groupBy: async () => {
        const counts = new Map<string, number>();
        for (const r of f.rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
        return [...counts].map(([status, n]) => ({ status, _count: { _all: n } }));
      },
    },
  },
}));

import { snapshotStrategy } from "@/server/services/oracle-section";

beforeEach(() => { f.rows = []; });

describe("snapshotStrategy — contenu rédigé distinct du statut", () => {
  it("ne compte aucune section rédigée quand les rédactions terminées sont vides", async () => {
    f.rows = [
      ...Array.from({ length: 6 }, () => ({ status: "COMPLETE", payload: {} })),
      ...Array.from({ length: 29 }, () => ({ status: "PENDING", payload: null })),
    ];
    expect(await snapshotStrategy("synthetic")).toMatchObject({
      total: 35, complete: 6, pending: 29, written: 0, current: 0,
    });
  });

  it("compte les sections rédigées, y compris périmées, et seules les terminées comme à jour", async () => {
    f.rows = [
      { status: "COMPLETE", payload: { thesis: "Une marque de quartier" } },
      { status: "STALE", payload: { thesis: "Ancienne lecture" } },
      { status: "FAILED", payload: null },
      { status: "COMPLETE", payload: [] },
    ];
    expect(await snapshotStrategy("synthetic")).toMatchObject({
      total: 4, complete: 2, stale: 1, failed: 1, written: 2, current: 1,
    });
  });
});
