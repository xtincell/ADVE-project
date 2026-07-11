/**
 * src/server/governance/emission-spine.ts — Canonical IntentEmission spine.
 *
 * Layer 2. LA mécanique unique d'ouverture/fermeture des rows `IntentEmission` :
 * hash-chain SHA256 (Loi 1 — conservation de l'altitude), cycle de statut
 * PENDING → OK/FAILED/VETOED/DOWNGRADED/QUEUED, publication event-bus (Q2 —
 * observabilité Seshat/Thot). Consommée par les DEUX chemins d'entrée :
 *
 *   - `governed-procedure.ts` (chemin tRPC — preEmitIntent/postEmitIntent)
 *   - `mestor/intents.ts` `emitIntent()` (chemin bus — services/spawn/boot)
 *
 * # Le trou que ce module ferme (ADR-0122)
 *
 * Avant unification, `emitIntent` écrivait ses rows en best-effort SANS
 * prevHash/selfHash, SANS statut, SANS événement : ses émissions étaient
 * exclues de la vérification anti-tamper, jamais observées par Seshat
 * (`observationStatus` figé PENDING_OBSERVATION), jamais coûtées par Thot.
 * Les invariants Yggdrasil Q1 (traçabilité hash-chaînée) et Q2 (observabilité)
 * n'étaient tenus que sur le chemin tRPC. Ce module rend la mécanique unique.
 *
 * # Sérialisation de la chaîne (advisory lock per-strategy)
 *
 * La chaîne est partitionnée par `strategyId`. Deux émissions concurrentes de
 * la même stratégie (ex. `spawnedIntents` fire-and-forget) liraient le même
 * `last.selfHash` et créeraient une fourche (deux rows partageant le même
 * `prevHash`). `pg_advisory_xact_lock(hashtext(strategyId))` sérialise
 * l'ouverture par stratégie — le verrou tombe au commit. Coût : un
 * aller-retour supplémentaire, uniquement à l'ouverture.
 *
 * # Chaînage par-dessus les rows legacy
 *
 * `prevHash` est lu sur la dernière row HASHÉE (`selfHash != null`) : les rows
 * legacy pré-unification (selfHash null) sont enjambées au lieu de réamorcer
 * la chaîne à null — le walk filtré de `scripts/verify-hash-chain.ts` reste
 * ainsi continu.
 *
 * # Tenant scoping
 *
 * `IntentEmission` est déclaré GLOBAL dans `tenant-scoped-db.ts` (« hash-chain
 * integrity is global ») — le spine utilise le client global `@/lib/db`
 * (lazy-import, aucun effet de bord au chargement du module).
 */

import type { Prisma } from "@prisma/client";
import { eventBus } from "./event-bus";
import { computeSelfHash } from "./hash-chain";

export type EmissionStatus = "OK" | "FAILED" | "VETOED" | "DOWNGRADED" | "QUEUED";

/**
 * Ouverture d'émission impossible (DB down, table absente, transaction
 * échouée). Les callers appliquent la politique Q1 **fail-closed** : pas de
 * trace ⇒ pas de mutation. `governed-procedure` laisse remonter (tRPC 500) ;
 * `mestor.emitIntent` convertit en `IntentResult` FAILED
 * (`EMISSION_PERSIST_FAILED`) SANS dispatcher le handler.
 */
export class EmissionPersistError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EmissionPersistError";
  }
}

/** Vue structurelle minimale du client Prisma — injectable en test. */
export interface EmissionTxLike {
  $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  intentEmission: {
    findFirst(args: {
      where: { strategyId: string; selfHash: { not: null } };
      orderBy: { emittedAt: "desc" };
      select: { selfHash: true };
    }): Promise<{ selfHash: string | null } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

export interface EmissionDbLike {
  $transaction<T>(fn: (tx: EmissionTxLike) => Promise<T>): Promise<T>;
  intentEmission: {
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
  };
}

async function resolveDb(injected?: EmissionDbLike): Promise<EmissionDbLike> {
  if (injected) return injected;
  const mod = await import("@/lib/db");
  return mod.db as unknown as EmissionDbLike;
}

export function cryptoRandomId(): string {
  const a = "0123456789abcdef";
  let out = "c";
  for (let i = 0; i < 24; i++) out += a[Math.floor(Math.random() * 16)];
  return out;
}

export interface OpenEmissionArgs {
  kind: string;
  /** Chaîne partitionnée par stratégie ; absent/vide → bucket "(none)". */
  strategyId?: string | null;
  payload: unknown;
  caller: string;
  /** Test seam — production laisse vide (client global). */
  db?: EmissionDbLike;
}

/**
 * Ouvre une émission : row PENDING hash-chaînée + event `intent.proposed`.
 * Retourne l'id. Jette `EmissionPersistError` si la row ne peut pas être
 * écrite — les callers appliquent fail-closed (Q1 : pas de trace ⇒ pas de
 * mutation).
 */
export async function openEmission(args: OpenEmissionArgs): Promise<string> {
  const db = await resolveDb(args.db);
  const strategyId =
    typeof args.strategyId === "string" && args.strategyId.length > 0
      ? args.strategyId
      : "(none)";
  const id = cryptoRandomId();
  const emittedAt = new Date();

  try {
    await db.$transaction(async (tx) => {
      // Sérialise les ouvertures de la même stratégie — sans quoi deux
      // émissions concurrentes fourchent la chaîne (même prevHash).
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${strategyId}))`;

      // Dernière row HASHÉE — les rows legacy (selfHash null) sont enjambées
      // pour ne pas réamorcer la chaîne à null.
      const last = await tx.intentEmission.findFirst({
        where: { strategyId, selfHash: { not: null } },
        orderBy: { emittedAt: "desc" },
        select: { selfHash: true },
      });
      const prevHash = last?.selfHash ?? null;

      // Le hash scelle la row À L'ÉMISSION (result: null par définition) —
      // cf. hash-chain.ts : le `result`, mutable à la complétion, est hors
      // du périmètre scellé.
      const selfHash = computeSelfHash({
        id,
        intentKind: args.kind,
        strategyId,
        payload: args.payload,
        result: null,
        caller: args.caller,
        emittedAt,
        prevHash,
      });

      await tx.intentEmission.create({
        data: {
          id,
          intentKind: args.kind,
          strategyId,
          payload: args.payload as Prisma.InputJsonValue,
          caller: args.caller,
          emittedAt,
          prevHash,
          selfHash,
          status: "PENDING",
          startedAt: emittedAt,
        },
      });
    });
  } catch (err) {
    throw new EmissionPersistError(
      `[emission-spine] could not persist IntentEmission for '${args.kind}' (strategy=${strategyId}): ${
        err instanceof Error ? err.message : String(err)
      }`,
      err,
    );
  }

  // Publié APRÈS commit — un subscriber ne doit jamais voir un id fantôme.
  eventBus.publish("intent.proposed", {
    intentId: id,
    kind: args.kind,
    ctx: { caller: args.caller, strategyId },
  });
  return id;
}

export interface CloseEmissionArgs {
  intentId: string;
  result: unknown;
  status: EmissionStatus;
  /**
   * Coût RÉALISÉ en USD, uniquement quand il est réellement connu (jamais un
   * estimé — « ne jamais combler un trou en inventant des données »). Persisté
   * sur `IntentEmission.costUsd` + publié sur `intent.completed` pour le
   * ledger Thot (`recordCost`).
   */
  costUsd?: number;
  /** Test seam — production laisse vide (client global). */
  db?: EmissionDbLike;
}

/**
 * Ferme une émission : statut + result + completedAt (+ costUsd si connu),
 * puis publie l'événement terminal correspondant. Jette en cas d'échec
 * d'écriture — la row reste PENDING et le cron staleness la flaggera
 * (échec de trace visible, jamais silencieux).
 */
export async function closeEmission(args: CloseEmissionArgs): Promise<void> {
  const db = await resolveDb(args.db);
  const completedAt = new Date();
  await db.intentEmission.update({
    where: { id: args.intentId },
    data: {
      result: args.result as Prisma.InputJsonValue,
      completedAt,
      status: args.status,
      ...(typeof args.costUsd === "number" ? { costUsd: args.costUsd } : {}),
    },
  });

  if (args.status === "OK") {
    eventBus.publish("intent.completed", {
      intentId: args.intentId,
      result: args.result,
      ...(typeof args.costUsd === "number" ? { costUsd: args.costUsd } : {}),
    });
  } else if (args.status === "FAILED") {
    eventBus.publish("intent.failed", { intentId: args.intentId, error: String(args.result) });
  } else if (args.status === "VETOED") {
    eventBus.publish("intent.vetoed", { intentId: args.intentId, reason: String(args.result) });
  } else if (args.status === "DOWNGRADED") {
    eventBus.publish("intent.downgraded", { intentId: args.intentId, reason: String(args.result) });
  }
  // QUEUED : pas d'événement terminal — la complétion réelle arrivera plus tard.
}
