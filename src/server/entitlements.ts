import { getDb } from "@/lib/db";
import { hasActiveSubscription } from "./finance";

/**
 * Entitlements — gating par plan (WP-007). Un seul droit en V1 : composer
 * l'Oracle. Règle : abonnement actif, OU compte de moins de 15 jours
 * (« grâce découverte » — le fondateur fraîchement converti voit la valeur
 * complète avant de payer). La lecture d'un Oracle DÉJÀ composé n'est
 * jamais gated — on ne confisque pas un livrable produit.
 */

export const DISCOVERY_GRACE_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fin de la grâce découverte d'un compte — pure. */
export function graceEndsAt(workspaceCreatedAt: Date): Date {
  return new Date(workspaceCreatedAt.getTime() + DISCOVERY_GRACE_DAYS * DAY_MS);
}

export type OracleEntitlement = {
  allowed: boolean;
  /** Ce qui ouvre le droit — null si refusé (ou workspace introuvable). */
  via: "subscription" | "grace" | null;
  /** Échéance de la grâce découverte (affichable), null si workspace introuvable. */
  graceEndsAt: Date | null;
};

/**
 * Le workspace peut-il composer / recomposer l'Oracle ?
 * `hasActiveSubscription` OU workspace créé il y a moins de 15 jours.
 */
export async function canComposeOracle(workspaceId: string): Promise<OracleEntitlement> {
  const db = getDb();
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { createdAt: true },
  });
  if (!workspace) return { allowed: false, via: null, graceEndsAt: null };

  const graceEnd = graceEndsAt(workspace.createdAt);

  if (await hasActiveSubscription(workspaceId)) {
    return { allowed: true, via: "subscription", graceEndsAt: graceEnd };
  }
  if (Date.now() < graceEnd.getTime()) {
    return { allowed: true, via: "grace", graceEndsAt: graceEnd };
  }
  return { allowed: false, via: null, graceEndsAt: graceEnd };
}
