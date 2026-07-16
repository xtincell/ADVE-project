/**
 * Bridge PAID — module SÉPARÉ de l'index identity-graph pour casser le cycle
 * d'import identity-graph ↔ superfan-ingest (audit 2026-07-16
 * `identity-graph-sans-porte-ni-bridge` : superfan-ingest enregistre désormais
 * chaque handle au graphe ; le pont PAID, qui va dans l'autre sens, vit ici).
 */

import { db } from "@/lib/db";
import {
  normalizeIdentifierValue,
  matchKey,
} from "@/domain/identity-graph";
import { hashForMatch } from "./pii-crypto";
import { registerSuperfanProfile } from "../superfan-ingest";
import type { DevotionLadderTier } from "@/domain/devotion-ladder";

type IdentityDbClient = typeof db;

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
