/**
 * Worker d'embeddings Seshat : un passage à la fois, borné, rythmé, sans
 * recalcul ni vecteur vide enregistré.
 *
 * Constaté du 2026-10-19 au 23 en production : chaque source indexée lançait
 * son propre passage sur toute la file de sa marque. Des dizaines de passages
 * calculaient les mêmes ~7 000 fragments en même temps, jusqu'à ce que
 * l'hébergeur bride le VPS entier.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Node = {
  id: string;
  strategyId: string;
  kind: string;
  pillarKey: string | null;
  field: string | null;
  payload: unknown;
  contentHash: string | null;
  embedding: number[];
  embeddingProvider: string | null;
  embeddingModel: string | null;
  embeddingDim: number | null;
  embeddedAt: Date | null;
  createdAt: Date;
};

const h = vi.hoisted(() => {
  const state = {
    nodes: [] as Node[],
    embedImpl: (async (input: string[]) => ({
      embeddings: input.map((t) => [t.length, 1]),
      provider: "ollama",
      model: "nomic-embed-text",
      dim: 2,
      inputTokens: 0,
    })) as (input: string[]) => Promise<{ embeddings: number[][]; provider: string; model: string }>,
  };

  function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
    return Object.entries(where).every(([key, cond]) => {
      const value = row[key];
      if (cond === null) return value === null;
      if (cond && typeof cond === "object" && !Array.isArray(cond)) {
        const c = cond as Record<string, unknown>;
        if ("in" in c) return (c.in as unknown[]).includes(value);
        if ("notIn" in c) return !(c.notIn as unknown[]).includes(value);
        if ("not" in c) return value !== c.not;
        if ("isEmpty" in c) return ((value as unknown[]).length === 0) === c.isEmpty;
      }
      return value === cond;
    });
  }

  const db = {
    brandContextNode: {
      findMany: vi.fn(async (args: { where: Record<string, unknown>; take?: number; orderBy?: unknown }) => {
        let rows = state.nodes.filter((n) => matches(n as unknown as Record<string, unknown>, args.where));
        if (args.orderBy) {
          rows = rows.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
        }
        return structuredClone(rows.slice(0, args.take ?? rows.length));
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Node> }) => {
        const node = state.nodes.find((n) => n.id === where.id)!;
        Object.assign(node, data);
        return node;
      }),
    },
  };
  const embed = vi.fn(async ({ input }: { input: string[] }) => state.embedImpl(input));
  return { state, db, embed };
});

vi.mock("@/lib/db", () => ({ db: h.db }));
vi.mock("@/server/services/llm-gateway", () => ({ embed: h.embed }));

import {
  _drainEmbedWorkerForTest,
  _resetEmbedWorkerForTest,
  embedBrandContext,
} from "@/server/services/seshat/context-store/embedder";

let seq = 0;
function node(strategyId: string, payload: unknown, extra: Partial<Node> = {}): Node {
  seq++;
  return {
    id: `n${String(seq).padStart(4, "0")}`,
    strategyId,
    kind: "BRAND_SOURCE",
    pillarKey: null,
    field: `chunk-${seq}`,
    payload,
    contentHash: `h-${JSON.stringify(payload)}`,
    embedding: [],
    embeddingProvider: null,
    embeddingModel: null,
    embeddingDim: null,
    embeddedAt: null,
    createdAt: new Date(1_700_000_000_000 + seq),
    ...extra,
  };
}

const FAST = { paceRatio: 0 } as const;
const sentTexts = () => h.embed.mock.calls.flatMap(([arg]) => (arg as { input: string[] }).input);

beforeEach(() => {
  _resetEmbedWorkerForTest();
  h.state.nodes = [];
  h.embed.mockClear();
  h.db.brandContextNode.findMany.mockClear();
  h.db.brandContextNode.update.mockClear();
  h.state.embedImpl = async (input) => ({ embeddings: input.map((t) => [t.length, 1]), provider: "ollama", model: "nomic-embed-text" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(async () => {
  // Une reprise lancée en fond ne doit pas déborder sur le test suivant.
  await _drainEmbedWorkerForTest();
  vi.restoreAllMocks();
});

describe("un seul passage à la fois", () => {
  it("un appel concurrent rejoint le passage en cours : chaque fragment est calculé une fois", async () => {
    h.state.nodes = Array.from({ length: 20 }, (_, i) => node("s1", { text: `fragment ${i}` }));

    const [first, second, third] = await Promise.all([
      embedBrandContext("s1", FAST),
      embedBrandContext("s1", FAST),
      embedBrandContext("s1", FAST),
    ]);

    expect(first.embedded).toBe(20);
    expect(second.coalesced).toBe(true);
    expect(third.coalesced).toBe(true);
    expect(sentTexts()).toHaveLength(20);
    expect(h.state.nodes.every((n) => n.embeddedAt !== null)).toBe(true);
  });

  it("une marque demandée pendant un passage est reprise une fois celui-ci terminé", async () => {
    h.state.nodes = [
      ...Array.from({ length: 5 }, (_, i) => node("s1", { text: `a${i}` })),
      ...Array.from({ length: 3 }, (_, i) => node("s2", { text: `b${i}` })),
    ];

    const [first, joined] = await Promise.all([embedBrandContext("s1", FAST), embedBrandContext("s2", FAST)]);

    expect(first.embedded).toBe(5);
    expect(joined.coalesced).toBe(true);
    await vi.waitFor(() => {
      expect(h.state.nodes.filter((n) => n.strategyId === "s2").every((n) => n.embeddedAt !== null)).toBe(true);
    });
  });
});

describe("un vecteur vide n'est jamais enregistré", () => {
  it("fournisseur indisponible : rien n'est marqué, le passage s'arrête, puis pause", async () => {
    h.state.nodes = Array.from({ length: 30 }, (_, i) => node("s1", { text: `f${i}` }));
    h.state.embedImpl = async (input) => ({ embeddings: input.map(() => []), provider: "none", model: "x" });

    const result = await embedBrandContext(null, FAST);

    expect(result.stoppedBy).toBe("provider-unavailable");
    expect(h.embed).toHaveBeenCalledTimes(1);
    expect(h.state.nodes.every((n) => n.embeddedAt === null && n.embedding.length === 0)).toBe(true);

    const during = await embedBrandContext(null, FAST);
    expect(during.stoppedBy).toBe("cooldown");
    expect(h.embed).toHaveBeenCalledTimes(1);
  });

  it("lot partiel : ce qui a un vecteur est enregistré, le reste reste en file", async () => {
    h.state.nodes = Array.from({ length: 8 }, (_, i) => node("s1", { text: `f${i}` }));
    h.state.embedImpl = async (input) => ({
      embeddings: input.map((t, i) => (i < 3 ? [t.length, 1] : [])),
      provider: "ollama",
      model: "nomic-embed-text",
    });

    const result = await embedBrandContext("s1", FAST);

    expect(result.embedded).toBe(3);
    expect(result.skipped).toBe(5);
    expect(result.stoppedBy).toBe("provider-unavailable");
    const done = h.state.nodes.filter((n) => n.embeddedAt !== null);
    expect(done).toHaveLength(3);
    expect(done.every((n) => n.embedding.length > 0)).toBe(true);
    expect(h.state.nodes.filter((n) => n.embeddedAt === null).every((n) => n.embedding.length === 0)).toBe(true);
  });
});

describe("un passage est borné", () => {
  it("par un nombre de fragments", async () => {
    h.state.nodes = Array.from({ length: 30 }, (_, i) => node("s1", { text: `f${i}` }));

    const result = await embedBrandContext("s1", { ...FAST, safetyLimit: 10 });

    expect(result.scanned).toBe(10);
    expect(result.embedded).toBe(10);
    expect(result.stoppedBy).toBe("safety-limit");
  });

  it("par une durée", async () => {
    h.state.nodes = Array.from({ length: 5 }, (_, i) => node("s1", { text: `f${i}` }));

    const result = await embedBrandContext("s1", { ...FAST, maxDurationMs: 0 });

    expect(result.stoppedBy).toBe("time-budget");
    expect(h.embed).not.toHaveBeenCalled();
  });

  it("traite les fragments les plus anciens d'abord", async () => {
    h.state.nodes = Array.from({ length: 6 }, (_, i) => node("s1", { text: `f${i}` }));
    h.state.nodes.reverse();

    await embedBrandContext("s1", { ...FAST, safetyLimit: 2, batch: 2 });

    const done = h.state.nodes.filter((n) => n.embeddedAt !== null).map((n) => n.id).sort();
    expect(done).toEqual(["n" + String(seq - 5).padStart(4, "0"), "n" + String(seq - 4).padStart(4, "0")]);
  });
});

describe("pas de recalcul", () => {
  it("un texte identique n'est envoyé qu'une fois dans un passage", async () => {
    const dup = { text: "même contenu" };
    h.state.nodes = [
      node("s1", dup, { field: "same" }),
      node("s1", dup, { field: "same" }),
      node("s1", { text: "autre" }),
    ];

    const result = await embedBrandContext("s1", FAST);

    expect(result.embedded).toBe(3);
    expect(sentTexts()).toHaveLength(2);
  });

  it("le vecteur d'un fragment déjà vectorisé de même contenu est repris tel quel", async () => {
    const payload = { text: "déjà vu" };
    const donor = node("s0", payload, {
      field: "same",
      embedding: [9, 9, 9],
      embeddingProvider: "ollama",
      embeddingModel: "nomic-embed-text:latest",
      embeddingDim: 3,
      embeddedAt: new Date(),
    });
    const pending = node("s1", payload, { field: "same" });
    const otherField = node("s1", payload, { field: "different" });
    h.state.nodes = [donor, pending, otherField];

    const result = await embedBrandContext("s1", FAST);

    expect(result.embedded).toBe(2);
    expect(h.state.nodes.find((n) => n.id === pending.id)!.embedding).toEqual([9, 9, 9]);
    expect(h.state.nodes.find((n) => n.id === pending.id)!.embeddingModel).toBe("nomic-embed-text:latest");
    // Champ différent = texte envoyé différent : calculé, pas repris.
    expect(sentTexts()).toHaveLength(1);
  });
});
