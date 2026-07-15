/**
 * ADR-0145 — Identity Graph : LE single-writer de `PersonIdentity` /
 * `PersonIdentifier` (sous-domaine SESHAT, mesure). Réconcilie une personne à
 * travers ses réseaux, ferme le double-comptage superfan et ouvre le gate PAID
 * par email de commande.
 *
 * 100 % déterministe, zéro LLM (LOI 9). PII : hash pour matcher + chiffrement
 * pour afficher (jamais en clair, jamais dans une IntentEmission). Toute fusion
 * est réversible (mergedIntoId = tombstone), auditée par l'émission gouvernée.
 *
 * Verrou HARD `identity-graph-single-writer.test.ts` : aucun `personIdentity.
 * create` / `personIdentifier.create` / `superfanProfile.update({ personId })`
 * hors de ce fichier.
 */

import { db } from "@/lib/db";
import {
  isStrongConflict,
  matchKey,
  mergePreservesMonotonicity,
  mergeVerdictForSharedIdentifier,
  normalizeIdentifierValue,
  strongerConfidence,
  type ConfidenceLevel,
  type IdentifierKind,
  type MergePersonsInput,
  type SplitPersonInput,
  type UpsertPersonIdentifierInput,
} from "@/domain/identity-graph";
import type { DevotionLadderTier } from "@/domain/devotion-ladder";
import { encryptForDisplay, hashForMatch } from "./pii-crypto";
import { registerSuperfanProfile } from "../superfan-ingest";

type IdentityDbClient = typeof db;

export interface UpsertIdentifierResult {
  status: "OK" | "INVALID";
  personId?: string;
  created?: boolean;
  autoMerged?: boolean;
  /** Candidat de fusion (signal faible) — NON fusionné, à revue opérateur. */
  mergeCandidate?: { fromPersonId: string; toPersonId: string; reason: string };
  reason?: string;
}

/**
 * Ajoute/résout un identifiant. Cœur de la résolution :
 *  - matchHash déjà présent + personId cible différent + fort/vérifié → AUTO_MERGE ;
 *  - matchHash déjà présent + faible → CANDIDATE (pas de fusion) ;
 *  - matchHash déjà présent, pas de cible → renvoie la personne (bridge PAID) ;
 *  - matchHash absent → attache à la cible, sinon crée une personne fraîche.
 */
export async function upsertPersonIdentifier(
  client: IdentityDbClient,
  input: UpsertPersonIdentifierInput,
): Promise<UpsertIdentifierResult> {
  const kind = input.kind as IdentifierKind;
  const normalized = normalizeIdentifierValue(kind, input.value);
  if (!normalized) {
    return { status: "INVALID", reason: `valeur ${kind} non normalisable` };
  }
  const matchHash = hashForMatch(matchKey(kind, normalized, input.platform));
  const confidence = input.confidence as ConfidenceLevel;
  const target = input.personId ?? null;

  const existing = await client.personIdentifier.findUnique({
    where: {
      strategyId_kind_matchHash: { strategyId: input.strategyId, kind, matchHash },
    },
    select: { id: true, personId: true, confidence: true },
  });

  if (existing) {
    const owner = existing.personId;
    // Renforce la confiance stockée si la nouvelle est plus haute (jamais-dégrader).
    const merged = strongerConfidence(existing.confidence as ConfidenceLevel, confidence);
    if (merged !== existing.confidence) {
      await client.personIdentifier.update({
        where: { id: existing.id },
        data: { confidence: merged, source: input.source },
      });
    }
    if (target && target !== owner) {
      const verdict = mergeVerdictForSharedIdentifier({
        kind,
        shared: true,
        confidence: merged,
      });
      if (verdict === "AUTO_MERGE") {
        await mergePersons(client, {
          strategyId: input.strategyId,
          sourcePersonId: target,
          targetPersonId: owner,
          confidence: merged,
          reason: `auto-merge sur identifiant fort partagé (${kind})`,
        });
        return { status: "OK", personId: owner, autoMerged: true };
      }
      return {
        status: "OK",
        personId: owner,
        mergeCandidate: {
          fromPersonId: target,
          toPersonId: owner,
          reason: `signal ${kind} partagé, confiance ${merged} — revue requise`,
        },
      };
    }
    return { status: "OK", personId: owner };
  }

  // Pas de match : attacher à la cible, sinon créer une personne.
  const personId =
    target ??
    (
      await client.personIdentity.create({
        data: {
          strategyId: input.strategyId,
          displayName: input.displayName ?? null,
          primaryHandle: kind === "HANDLE" ? normalized : null,
        },
        select: { id: true },
      })
    ).id;

  await client.personIdentifier.create({
    data: {
      personId,
      strategyId: input.strategyId,
      kind,
      matchHash,
      displayCipher: encryptForDisplay(normalized),
      platform: input.platform ?? null,
      source: input.source,
      confidence,
    },
  });

  return { status: "OK", personId, created: target == null };
}

/**
 * Fusionne `source` dans `target` : re-pointe identifiants + profils, pose le
 * tombstone `mergedIntoId` (réversible). Anti-inflation (ADR-0126) : le compte de
 * personnes actives ne peut que BAISSER — vérifié en transaction.
 */
export async function mergePersons(
  client: IdentityDbClient,
  input: MergePersonsInput,
): Promise<{ status: "OK" | "NOOP" | "CONFLICT"; reason?: string }> {
  const { strategyId, sourcePersonId, targetPersonId } = input;
  if (sourcePersonId === targetPersonId) return { status: "NOOP" };

  return client.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.personIdentity.findFirst({
        where: { id: sourcePersonId, strategyId },
        select: { id: true, mergedIntoId: true },
      }),
      tx.personIdentity.findFirst({
        where: { id: targetPersonId, strategyId },
        select: { id: true, mergedIntoId: true },
      }),
    ]);
    if (!source || !target) return { status: "NOOP" as const, reason: "personne absente" };
    if (source.mergedIntoId) return { status: "NOOP" as const, reason: "source déjà fusionnée" };

    // Conflit : deux emails/tels forts vérifiés DIFFÉRENTS → drapeau, pas de fusion.
    const [srcStrong, tgtStrong] = await Promise.all([
      tx.personIdentifier.findMany({
        where: { personId: sourcePersonId, kind: { in: ["EMAIL", "PHONE"] } },
        select: { kind: true, matchHash: true, confidence: true },
      }),
      tx.personIdentifier.findMany({
        where: { personId: targetPersonId, kind: { in: ["EMAIL", "PHONE"] } },
        select: { kind: true, matchHash: true, confidence: true },
      }),
    ]);
    for (const s of srcStrong) {
      for (const t of tgtStrong) {
        if (
          s.kind === t.kind &&
          isStrongConflict(
            s.kind as IdentifierKind,
            s.matchHash,
            s.confidence as ConfidenceLevel,
            t.matchHash,
            t.confidence as ConfidenceLevel,
          )
        ) {
          return {
            status: "CONFLICT" as const,
            reason: `deux ${s.kind} vérifiés distincts — fusion refusée`,
          };
        }
      }
    }

    const activeBefore = await tx.personIdentity.count({
      where: { strategyId, mergedIntoId: null },
    });

    await tx.personIdentifier.updateMany({
      where: { personId: sourcePersonId },
      data: { personId: targetPersonId },
    });
    await tx.superfanProfile.updateMany({
      where: { personId: sourcePersonId },
      data: { personId: targetPersonId },
    });
    await tx.personIdentity.update({
      where: { id: sourcePersonId },
      data: { mergedIntoId: targetPersonId },
    });

    const activeAfter = await tx.personIdentity.count({
      where: { strategyId, mergedIntoId: null },
    });
    if (!mergePreservesMonotonicity(activeBefore, activeAfter)) {
      throw new Error(
        `ADR-0126 violé : fusion a augmenté le compte (${activeBefore}→${activeAfter})`,
      );
    }
    return { status: "OK" as const };
  });
}

/** Dé-fusionne : ré-active la personne fusionnée (ne re-scinde pas les arêtes déjà
 * re-pointées manuellement — audit-safe minimal, dette ADR-0145 pour split fin). */
export async function splitPerson(
  client: IdentityDbClient,
  input: SplitPersonInput,
): Promise<{ status: "OK" | "NOOP" }> {
  const person = await client.personIdentity.findFirst({
    where: { id: input.personId, strategyId: input.strategyId },
    select: { id: true, mergedIntoId: true },
  });
  if (!person || !person.mergedIntoId) return { status: "NOOP" };
  await client.personIdentity.update({
    where: { id: person.id },
    data: { mergedIntoId: null },
  });
  return { status: "OK" };
}

/**
 * Bridge PAID : un email de commande connu → pose le gate PAID sur la PERSONNE
 * (tous ses profils superfan), via le single-writer superfan existant. Aucun email
 * inconnu ne fabrique de profil (P22-2 : absence = absence).
 */
export async function bridgePaidFromCommerceEmail(
  client: IdentityDbClient,
  input: { strategyId: string; email: string; source?: string; at?: string },
): Promise<{ matched: boolean; personId?: string; profilesUpdated: number }> {
  const normalized = normalizeIdentifierValue("EMAIL", input.email);
  if (!normalized) return { matched: false, profilesUpdated: 0 };
  const matchHash = hashForMatch(matchKey("EMAIL", normalized));
  const identifier = await client.personIdentifier.findUnique({
    where: {
      strategyId_kind_matchHash: {
        strategyId: input.strategyId,
        kind: "EMAIL",
        matchHash,
      },
    },
    select: { personId: true },
  });
  if (!identifier) return { matched: false, profilesUpdated: 0 };

  // Résout la personne survivante (suit le tombstone).
  let personId = identifier.personId;
  for (let hops = 0; hops < 8; hops++) {
    const p = await client.personIdentity.findUnique({
      where: { id: personId },
      select: { mergedIntoId: true },
    });
    if (!p?.mergedIntoId) break;
    personId = p.mergedIntoId;
  }

  const profiles = await client.superfanProfile.findMany({
    where: { personId },
    select: { strategyId: true, platform: true, handle: true, segment: true, engagementDepth: true },
  });
  let updated = 0;
  for (const prof of profiles) {
    await registerSuperfanProfile(client, {
      strategyId: prof.strategyId,
      platform: prof.platform,
      handle: prof.handle,
      segment: prof.segment as DevotionLadderTier,
      engagementDepth: prof.engagementDepth,
      source: "CRM",
      conditions: {
        PAID: { source: input.source ?? "COMMERCE", at: input.at },
      },
    });
    updated++;
  }
  return { matched: true, personId, profilesUpdated: updated };
}
