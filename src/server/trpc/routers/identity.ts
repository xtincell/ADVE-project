/**
 * ADR-0147 — Identity Graph : portes gouvernées (domaine SESHAT).
 *
 * `upsertIdentifier` porte de la PII (email/tel) → émission via le SPINE
 * (ADR-0124) avec payload REDACTÉ (fingerprint du matchHash, jamais la valeur en
 * clair — précédent `accounts.createBrandLogin`). `mergePersons` / `splitPerson`
 * ne portent pas de PII → `governedProcedure` classique, requireOperator.
 */

import { z } from "zod";
import { createTRPCRouter, operatorProcedure, protectedProcedure } from "../init";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { openEmission, closeEmission } from "@/server/governance/emission-spine";
import { db } from "@/lib/db";
import {
  IdentifierKindSchema,
  IdentifierSourceSchema,
  ConfidenceLevelSchema,
} from "@/domain/identity-graph";
import {
  upsertPersonIdentifier,
  mergePersons,
  splitPerson,
} from "@/server/services/seshat/identity-graph";
import { hashForMatch } from "@/server/services/seshat/identity-graph/pii-crypto";

export const identityRouter = createTRPCRouter({
  /**
   * Ajoute/résout un identifiant. PII (value) reçue mais JAMAIS journalisée :
   * l'émission gouvernée porte un fingerprint (12 hex du matchHash), pas la valeur.
   */
  upsertIdentifier: operatorProcedure
    .input(
      z.object({
        strategyId: z.string().min(1),
        kind: IdentifierKindSchema,
        value: z.string().min(1),
        platform: z.string().nullish(),
        source: IdentifierSourceSchema,
        confidence: ConfidenceLevelSchema,
        personId: z.string().nullish(),
        displayName: z.string().nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      // Fingerprint non-réversible pour la traçabilité, sans exposer la PII.
      const fingerprint = hashForMatch(`${input.kind}:${input.value}`).slice(0, 12);
      const intentId = await openEmission({
        kind: "SESHAT_UPSERT_PERSON_IDENTIFIER",
        strategyId: input.strategyId,
        payload: {
          strategyId: input.strategyId,
          identifierKind: input.kind,
          platform: input.platform ?? null,
          source: input.source,
          confidence: input.confidence,
          personId: input.personId ?? null,
          valueFingerprint: fingerprint,
        },
        caller: "identity:upsertIdentifier",
      });
      try {
        const result = await upsertPersonIdentifier(db, {
          strategyId: input.strategyId,
          kind: input.kind,
          value: input.value,
          platform: input.platform ?? null,
          source: input.source,
          confidence: input.confidence,
          personId: input.personId ?? null,
          displayName: input.displayName ?? null,
        });
        await closeEmission({
          intentId,
          result: {
            status: result.status,
            personId: result.personId,
            created: result.created ?? false,
            autoMerged: result.autoMerged ?? false,
            hasCandidate: Boolean(result.mergeCandidate),
          },
          status: result.status === "OK" ? "OK" : "FAILED",
        });
        return result;
      } catch (err) {
        await closeEmission({
          intentId,
          result: { error: err instanceof Error ? err.message : String(err) },
          status: "FAILED",
        });
        throw err;
      }
    }),

  /** Fusion explicite d'opérateur (auto-merge VERIFIED est fait dans l'upsert). */
  mergePersons: governedProcedure({
    kind: "SESHAT_MERGE_PERSONS",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: z.string().min(1),
      sourcePersonId: z.string().min(1),
      targetPersonId: z.string().min(1),
      confidence: ConfidenceLevelSchema,
      reason: z.string().min(1),
    }),
    caller: "identity:mergePersons",
  }).mutation(async ({ input }) => {
    return mergePersons(db, input);
  }),

  /** Dé-fusion audit-safe. */
  splitPerson: governedProcedure({
    kind: "SESHAT_SPLIT_PERSON",
    requireOperator: true,
    inputSchema: z.object({
      strategyId: z.string().min(1),
      personId: z.string().min(1),
    }),
    caller: "identity:splitPerson",
  }).mutation(async ({ input }) => {
    return splitPerson(db, input);
  }),

  /** Lecture opérateur : personnes actives + compte d'identifiants (revue). */
  listPersons: protectedProcedure
    .input(z.object({ strategyId: z.string().min(1), limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const persons = await db.personIdentity.findMany({
        where: { strategyId: input.strategyId, mergedIntoId: null },
        orderBy: { updatedAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          displayName: true,
          primaryHandle: true,
          _count: { select: { identifiers: true, profiles: true } },
        },
      });
      return persons;
    }),
});
