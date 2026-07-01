/**
 * Manifest — escrow-arbitration (INFRASTRUCTURE).
 *
 * Séquestre de mission à validation manuelle + payouts mobile money (Guilde,
 * ADR-0116) : hold/release/refund/dispute + capture/échec de payout. L'arbitre
 * (opérateur) valide les conditions. Déterministe.
 */
import { z } from "zod";
import { defineManifest } from "@/server/governance/manifest";

export const manifest = defineManifest({
  service: "escrow-arbitration",
  governor: "INFRASTRUCTURE",
  version: "1.0.0",
  acceptsIntents: [
    "LEGACY_ESCROW_HOLD",
    "LEGACY_ESCROW_MEET_CONDITION",
    "LEGACY_ESCROW_RELEASE",
    "LEGACY_ESCROW_REFUND",
    "LEGACY_ESCROW_DISPUTE",
    "LEGACY_PAYOUT_CAPTURE_MANUAL",
    "LEGACY_PAYOUT_MARK_FAILED",
  ],
  capabilities: [
    { name: "holdEscrowForMission", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: false },
    { name: "meetEscrowCondition", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "releaseEscrow", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "refundEscrow", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "disputeEscrow", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "captureManualPayout", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "markPayoutFailed", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_WRITE"], idempotent: true },
    { name: "listEscrows", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
    { name: "listPayouts", inputSchema: z.unknown(), outputSchema: z.unknown(), sideEffects: ["DB_READ"], idempotent: true },
  ],
  dependencies: [],
  missionContribution: "GROUND_INFRASTRUCTURE",
  groundJustification:
    "Plomberie de l'économie Guilde (ADR-0116) : sécurise le paiement du talent via séquestre à arbitrage opérateur — sans elle, pas de flux de paiement de confiance, donc pas de crew pour exécuter les missions. Aucune génération de marque.",
});
