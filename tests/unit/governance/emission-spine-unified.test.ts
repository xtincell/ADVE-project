/**
 * Anti-drift — ADR-0124 : spine d'émission unifié (Q1/Q2/Loi 1/Loi 3).
 *
 * # Le trou que ce test verrouille
 *
 * Avant unification, il y avait DEUX chemins de mutation de force inégale :
 * `governedProcedure` (hash-chain + cost-gate + événements + post-conditions)
 * et `mestor.emitIntent` (persist best-effort SANS hash, SANS statut, SANS
 * événement — donc jamais vérifié anti-tamper, jamais observé par Seshat,
 * jamais coûté par Thot). La doctrine sacralisait le second. Ce test impose :
 *
 *   1. Les deux chemins consomment le MÊME spine (`governance/emission-spine`).
 *   2. `emitIntent` est fail-closed (EMISSION_PERSIST_FAILED — pas de trace ⇒
 *      pas de mutation) et porte le cost-gate Thot (Loi 3).
 *   3. Le verdict DOWNGRADED du manipulation-gate n'est plus avalé.
 *   4. La chaîne enjambe les rows legacy (selfHash null) au lieu de réamorcer
 *      à null, et `verifyChain` recompute sur le périmètre scellé À L'ÉMISSION
 *      (result: null) — recomputer avec le result post-complétion flaggait
 *      chaque intent complété comme altéré (bug historique du vérificateur).
 *   5. La boucle d'observation Seshat couvre TOUS les états terminaux.
 *   6. Aucun `intentEmission.create` nu hors spine — allowlist « à mes risques
 *      et périls » (pattern C5) : chaque exception porte une raison et
 *      `reroutePlanned` ; une entrée périmée fait échouer le test (purge).
 *
 * Mode HARD (baseline = 0) — toute violation bloque le merge.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  openEmission,
  closeEmission,
  EmissionPersistError,
  type EmissionDbLike,
  type EmissionTxLike,
} from "@/server/governance/emission-spine";
import { computeSelfHash, verifyChain } from "@/server/governance/hash-chain";
import { eventBus } from "@/server/governance/event-bus";

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const read = (p: string) => readFileSync(join(ROOT, p), "utf-8");

// ─────────────────────────────────────────────────────────────────────────────
// Allowlist des `intentEmission.create(` nus hors spine — à mes risques et
// périls. Chaque entrée = { file, count, reason, reroutePlanned }. Ajouter un
// create nu SANS l'inscrire ici casse la CI ; une entrée qui ne matche plus
// la réalité casse aussi (purge des exceptions périmées).
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_BARE_EMISSION_CREATES: ReadonlyArray<{
  file: string;
  count: number;
  reason: string;
  reroutePlanned: boolean;
}> = [
  {
    file: "src/server/services/artemis/tools/engine.ts",
    count: 2,
    reason:
      "Rows synthétiques d'exécution Glory (ledger tool-run) antérieures au spine — hors chaîne, selfHash null assumé.",
    reroutePlanned: true,
  },
  {
    file: "src/server/services/brand-vault/engine.ts",
    count: 5,
    reason:
      "Ledger vault (promotions/dépréciations d'assets) écrit en direct — hors chaîne, selfHash null assumé.",
    reroutePlanned: true,
  },
  {
    file: "src/server/services/founder-psychology/index.ts",
    count: 1,
    reason: "Trace d'analyse psycho founder écrite en direct — hors chaîne, selfHash null assumé.",
    reroutePlanned: true,
  },
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "__generated__") continue;
      walk(p, acc);
    } else if (/\.tsx?$/.test(entry)) {
      acc.push(p);
    }
  }
  return acc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock structurel minimal du client Prisma (aucune DB requise).
// ─────────────────────────────────────────────────────────────────────────────
interface MockCalls {
  findFirstArgs: unknown[];
  created: Array<Record<string, unknown>>;
  updated: Array<{ where: { id: string }; data: Record<string, unknown> }>;
}

function makeMockDb(opts: {
  lastSelfHash?: string | null;
  failCreate?: boolean;
}): { db: EmissionDbLike; calls: MockCalls } {
  const calls: MockCalls = { findFirstArgs: [], created: [], updated: [] };
  const tx: EmissionTxLike = {
    $executeRaw: async () => 1,
    intentEmission: {
      findFirst: async (args) => {
        calls.findFirstArgs.push(args);
        return opts.lastSelfHash ? { selfHash: opts.lastSelfHash } : null;
      },
      create: async (args) => {
        if (opts.failCreate) throw new Error("relation IntentEmission does not exist");
        calls.created.push(args.data);
        return args.data;
      },
    },
  };
  const db: EmissionDbLike = {
    $transaction: async (fn) => fn(tx),
    intentEmission: {
      update: async (args) => {
        calls.updated.push(args as { where: { id: string }; data: Record<string, unknown> });
        return {};
      },
    },
  };
  return { db, calls };
}

function collectEvents(names: string[]): { events: Array<{ name: string; payload: unknown }>; off: () => void } {
  const events: Array<{ name: string; payload: unknown }> = [];
  const offs = names.map((n) =>
    eventBus.subscribe(n as never, ((p: unknown) => {
      events.push({ name: n, payload: p });
    }) as never),
  );
  return { events, off: () => offs.forEach((o) => o()) };
}

describe("ADR-0124 — openEmission (Loi 1 : hash-chain, Q1 : trace d'abord)", () => {
  it("chaîne sur le selfHash de la dernière row HASHÉE et scelle avec result:null", async () => {
    const { db, calls } = makeMockDb({ lastSelfHash: "aaaa1111" });
    const { events, off } = collectEvents(["intent.proposed"]);
    try {
      const id = await openEmission({
        kind: "TEST_KIND",
        strategyId: "strat-1",
        payload: { kind: "TEST_KIND", strategyId: "strat-1" },
        caller: "test",
        db,
      });

      expect(calls.created).toHaveLength(1);
      const row = calls.created[0]!;
      expect(row.id).toBe(id);
      expect(row.prevHash).toBe("aaaa1111");
      expect(row.status).toBe("PENDING");
      expect(row.startedAt).toBeInstanceOf(Date);
      // selfHash recomputable sur le périmètre scellé à l'émission (result:null).
      const recomputed = computeSelfHash({
        id: row.id as string,
        intentKind: row.intentKind as string,
        strategyId: row.strategyId as string,
        payload: row.payload,
        result: null,
        caller: row.caller as string,
        emittedAt: row.emittedAt as Date,
        prevHash: row.prevHash as string,
      });
      expect(row.selfHash).toBe(recomputed);

      // La lecture du chaînage ENJAMBE les rows legacy (selfHash null).
      const ff = calls.findFirstArgs[0] as { where: { selfHash: unknown } };
      expect(ff.where.selfHash).toEqual({ not: null });

      // Q2 : intent.proposed publié après commit.
      expect(events).toHaveLength(1);
      expect((events[0]!.payload as { intentId: string }).intentId).toBe(id);
    } finally {
      off();
    }
  });

  it("bucket '(none)' quand strategyId absent ; prevHash null quand chaîne vierge", async () => {
    const { db, calls } = makeMockDb({ lastSelfHash: null });
    await openEmission({ kind: "TEST_KIND", payload: {}, caller: "test", db });
    expect(calls.created[0]!.strategyId).toBe("(none)");
    expect(calls.created[0]!.prevHash).toBeNull();
  });

  it("jette EmissionPersistError quand la row ne peut pas être écrite (fail-closed)", async () => {
    const { db } = makeMockDb({ failCreate: true });
    await expect(
      openEmission({ kind: "TEST_KIND", strategyId: "s", payload: {}, caller: "test", db }),
    ).rejects.toBeInstanceOf(EmissionPersistError);
  });
});

describe("ADR-0124 — closeEmission (statuts + événements terminaux + costUsd)", () => {
  it("OK → update status/result/completedAt + publie intent.completed (costUsd si connu)", async () => {
    const { db, calls } = makeMockDb({});
    const { events, off } = collectEvents(["intent.completed"]);
    try {
      await closeEmission({ intentId: "em-1", result: { ok: true }, status: "OK", costUsd: 0.42, db });
      expect(calls.updated).toHaveLength(1);
      expect(calls.updated[0]!.data.status).toBe("OK");
      expect(calls.updated[0]!.data.costUsd).toBe(0.42);
      expect(calls.updated[0]!.data.completedAt).toBeInstanceOf(Date);
      expect(events).toHaveLength(1);
      expect((events[0]!.payload as { costUsd?: number }).costUsd).toBe(0.42);
    } finally {
      off();
    }
  });

  it("VETOED/FAILED/DOWNGRADED publient leur événement ; QUEUED reste silencieux", async () => {
    const { db } = makeMockDb({});
    const { events, off } = collectEvents([
      "intent.vetoed",
      "intent.failed",
      "intent.downgraded",
      "intent.completed",
    ]);
    try {
      await closeEmission({ intentId: "e1", result: "veto", status: "VETOED", db });
      await closeEmission({ intentId: "e2", result: "boom", status: "FAILED", db });
      await closeEmission({ intentId: "e3", result: "down", status: "DOWNGRADED", db });
      await closeEmission({ intentId: "e4", result: "queued", status: "QUEUED", db });
      expect(events.map((e) => e.name)).toEqual([
        "intent.vetoed",
        "intent.failed",
        "intent.downgraded",
      ]);
    } finally {
      off();
    }
  });
});

describe("ADR-0124 — verifyChain scelle l'émission, pas la complétion", () => {
  it("une chaîne dont les results ont été écrits à la complétion reste VALIDE", () => {
    // Construire 2 rows comme openEmission le fait (hash sur result:null)…
    const r1 = {
      id: "c1",
      intentKind: "K1",
      strategyId: "s",
      payload: { a: 1 },
      caller: "t",
      emittedAt: new Date("2026-07-11T00:00:00Z"),
      prevHash: null as string | null,
    };
    const h1 = computeSelfHash({ ...r1, result: null });
    const r2 = {
      id: "c2",
      intentKind: "K2",
      strategyId: "s",
      payload: { b: 2 },
      caller: "t",
      emittedAt: new Date("2026-07-11T00:00:01Z"),
      prevHash: h1,
    };
    const h2 = computeSelfHash({ ...r2, result: null });

    // …puis simuler la complétion (result écrit PLUS TARD par closeEmission).
    const completed = [
      { ...r1, result: { status: "OK", output: "x" }, selfHash: h1 },
      { ...r2, result: { status: "FAILED" }, selfHash: h2 },
    ];
    const check = verifyChain(completed);
    expect(check.ok).toBe(true);

    // Et le tamper du périmètre scellé (payload) reste détecté.
    const tampered = [
      { ...completed[0]!, payload: { a: 999 } },
      completed[1]!,
    ];
    expect(verifyChain(tampered).ok).toBe(false);
  });
});

describe("ADR-0124 — les deux chemins consomment le spine (source-scan HARD)", () => {
  const intents = read("src/server/services/mestor/intents.ts");
  const governed = read("src/server/governance/governed-procedure.ts");
  const bootstrap = read("src/server/governance/bootstrap.ts");

  it("mestor.emitIntent ouvre/ferme via le spine, fail-closed, cost-gate, DOWNGRADED tracé", () => {
    expect(intents).toContain("openEmission({");
    expect(intents).toContain("closeEmission({");
    expect(intents).toContain("EMISSION_PERSIST_FAILED");
    expect(intents).toContain("evaluateBusCostGate");
    expect(intents).toContain("mixViolationOverrideCount");
    // Plus AUCUNE écriture IntentEmission nue dans le dispatcher.
    expect(intents).not.toMatch(/db\.intentEmission\.(create|update)/);
  });

  it("governed-procedure ouvre/ferme via le spine (plus de hash local)", () => {
    expect(governed).toContain("openEmission({");
    expect(governed).toContain("closeEmission({");
    expect(governed).not.toContain("computeSelfHash");
    expect(governed).not.toMatch(/intentEmission\.(create|update)/);
  });

  it("la boucle d'observation Seshat couvre les 4 états terminaux", () => {
    for (const evt of ["intent.completed", "intent.failed", "intent.vetoed", "intent.downgraded"]) {
      expect(bootstrap).toContain(`"${evt}"`);
    }
    expect(bootstrap).toContain("observeTerminal");
  });

  it("le ledger Thot recordCost existe (fin du subscriber mort)", () => {
    const fb = read("src/server/services/financial-brain/index.ts");
    expect(fb).toContain('export { recordCost } from "./record-cost"');
  });
});

describe("ADR-0124 — aucun intentEmission.create nu hors spine (allowlist purgeable)", () => {
  it("tout create nu est déclaré « à mes risques et périls », toute entrée périmée est purgée", () => {
    const files = walk(SRC);
    const found = new Map<string, number>();
    for (const f of files) {
      const rel = relative(ROOT, f).replace(/\\/g, "/");
      if (rel === "src/server/governance/emission-spine.ts") continue; // LE spine
      const content = readFileSync(f, "utf-8");
      const matches = content.match(/intentEmission\s*\.\s*create\s*\(/g);
      if (matches && matches.length > 0) found.set(rel, matches.length);
    }

    const allowed = new Map(ALLOWED_BARE_EMISSION_CREATES.map((a) => [a.file, a.count]));

    // 1. Aucune violation non déclarée.
    const violations: string[] = [];
    for (const [file, count] of found) {
      const allowedCount = allowed.get(file);
      if (allowedCount === undefined) {
        violations.push(`${file} : ${count} create(s) nu(s) NON déclaré(s) — passe par openEmission ou inscris-toi à l'allowlist avec raison + reroutePlanned.`);
      } else if (count !== allowedCount) {
        violations.push(`${file} : ${count} create(s) trouvé(s), ${allowedCount} déclaré(s) — mets l'allowlist à jour.`);
      }
    }
    // 2. Purge des exceptions périmées.
    for (const [file] of allowed) {
      if (!found.has(file)) {
        violations.push(`${file} : entrée allowlist périmée (plus aucun create nu) — retire-la.`);
      }
    }

    expect(violations, violations.join("\n")).toEqual([]);
  });
});
