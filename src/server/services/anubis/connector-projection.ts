/**
 * Projection canonique d'`ExternalConnector` vers un client (navigateur, MCP).
 *
 * `ExternalConnector.config` porte les **secrets** du Credentials Vault
 * (ADR-0021) : jetons OAuth Meta, clés API Apify, board IDs Monday, refresh
 * tokens Zoho. `errorLog` porte les dernières erreurs du fournisseur — donc,
 * régulièrement, l'URL complète de l'appel qui a échoué, jeton compris.
 *
 * La règle existait déjà, mais en un seul endroit — `anubis.listCredentials`
 * portait le commentaire « ⚠️ JAMAIS `config` ici — sécurité ADR-0021 » et un
 * `select` correct. Quatre autres lectures renvoyaient la ligne entière :
 * `connectors.list` / `.get` / `.stats` (navigateur opérateur),
 * `social.listSocialConnectors` (navigateur, `protectedProcedure`) et
 * `advertis-inbound.getConnectorStatus` (**MCP** — donc une clé API tierce).
 * Une règle appliquée à un seul site n'est pas une règle : c'en est la copie.
 *
 * Ce module est la forme unique. Toute lecture destinée à sortir du serveur
 * passe par `CONNECTOR_PUBLIC_SELECT` ; le test HARD
 * `tests/unit/governance/connector-secret-projection.test.ts` refuse un
 * `externalConnector.find*` sans `select` dans `src/server/trpc/` et
 * `src/server/mcp/`.
 *
 * Les lectures **internes** (adapters `advertis-connectors/*`,
 * `credential-vault.get`) ont évidemment besoin de `config` : elles s'en
 * servent pour appeler le fournisseur, elles ne le renvoient à personne. Elles
 * restent hors de ce chemin — ce sont deux usages distincts, pas une exception.
 */

import { db } from "@/lib/db";

/**
 * Champs d'`ExternalConnector` publiables. Liste blanche : un champ ajouté au
 * modèle n'est pas exposé tant qu'il n'est pas inscrit ici.
 */
export const CONNECTOR_PUBLIC_SELECT = {
  id: true,
  operatorId: true,
  connectorType: true,
  status: true,
  lastSyncAt: true,
  signalCount: true,
  avgConfidence: true,
  pillarMapping: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** La forme rendue par `CONNECTOR_PUBLIC_SELECT`. */
export interface PublicConnector {
  id: string;
  operatorId: string;
  connectorType: string;
  status: string;
  lastSyncAt: Date | null;
  signalCount: number;
  avgConfidence: number | null;
  pillarMapping: unknown;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ce que l'appelant a besoin de savoir de `config` sans en voir la valeur :
 * est-elle posée, et quelles clés porte-t-elle. Les **noms** de clés
 * (`accessToken`, `boardId`…) sont de la structure, pas du secret — c'est ce
 * qui permet à une UI de dire « il manque `apifyToken` » sans jamais afficher
 * un jeton.
 */
export function describeConnectorConfig(config: unknown): {
  configured: boolean;
  configKeys: string[];
} {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { configured: false, configKeys: [] };
  }
  const keys = Object.keys(config as Record<string, unknown>);
  return { configured: keys.length > 0, configKeys: keys.sort() };
}

/**
 * Même problème, deux autres modèles : `SocialConnection` porte
 * `accessToken`/`refreshToken` (chiffrés AES-GCM, ADR-0128 — mais un
 * cryptogramme n'a rien à faire dans un navigateur) et
 * `MediaPlatformConnection` porte `credentials`.
 *
 * `driver.getSocialConnection` / `.getMediaConnection` renvoyaient la ligne
 * entière. La garde d'appartenance (`assertDriverAccess`) était bonne — c'est
 * la projection qui manquait, exactement comme pour `ExternalConnector`.
 */
export const SOCIAL_CONNECTION_PUBLIC_SELECT = {
  id: true,
  strategyId: true,
  platform: true,
  accountId: true,
  accountName: true,
  status: true,
  tokenExpiry: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Lecture publiable d'un connecteur, description de `config` comprise.
 *
 * Vit ici, et pas dans le routeur, pour une raison de couche : décrire la
 * config oblige à la CHARGER. Tant que ce `select: { config: true }` était
 * écrit dans le routeur, le secret transitait par un fichier client-facing —
 * et il ne tenait qu'au `...rest` juste en dessous qu'il n'en sorte pas. Un
 * refactor distrait suffisait. Le service possède le secret ; le routeur reçoit
 * un objet qui n'en contient déjà plus.
 */
export async function readPublicConnector(
  operatorId: string,
  connectorType: string,
): Promise<(PublicConnector & { configured: boolean; configKeys: string[] }) | null> {
  const row = await db.externalConnector.findUnique({
    where: { operatorId_connectorType: { operatorId, connectorType } },
    select: { ...CONNECTOR_PUBLIC_SELECT, config: true },
  });
  if (!row) return null;
  const { config, ...rest } = row;
  return {
    ...(rest as unknown as PublicConnector),
    ...describeConnectorConfig(config),
  };
}

export const MEDIA_CONNECTION_PUBLIC_SELECT = {
  id: true,
  strategyId: true,
  platform: true,
  accountId: true,
  status: true,
  lastSyncAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
