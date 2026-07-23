/**
 * mobile-app-connect — liens des apps mobiles de la marque (App Store iOS +
 * Play Store Android) posés par le founder, pour préparer le suivi des
 * téléchargements et des avis (mandat opérateur 2026-07-13 : « raccorder les
 * pages de l'app mobile pour traquer les téléchargements / avis ; prépare déjà
 * la surface + l'espace credentials + un message qui invite à les renseigner »).
 *
 * Owning Neter : ANUBIS (connecteurs externes, ADR-0021). Zéro LLM.
 *
 * Anti-doublon : réutilise le modèle générique `MediaPlatformConnection`
 * (comme commerce-connect / social) — plateformes `APP_STORE` / `PLAY_STORE`,
 * accountId = URL de la fiche. Le LIEN est une donnée publique (aucun secret) ;
 * les MÉTRIQUES (téléchargements, avis) exigent des accès API opérateur
 * (App Store Connect / Google Play Developer). Sans eux → état first-class
 * honnête `DEFERRED_AWAITING_CREDENTIALS`, jamais un zéro fabriqué.
 */

import { db } from "@/lib/db";
import { emitIntentTyped } from "@/server/services/mestor/intents";

export const APP_STORE_PLATFORM = "APP_STORE"; // iOS
export const PLAY_STORE_PLATFORM = "PLAY_STORE"; // Android

/** Validation des URLs de fiche (réelles, sinon rejet — pas de garbage stocké). */
export const APP_STORE_URL_RE = /^https:\/\/apps\.apple\.com\/[^\s]+$/i;
export const PLAY_STORE_URL_RE = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[^\s]+$/i;

/** Les accès API de collecte sont-ils branchés (env opérateur) ? */
export function mobileMetricsProviderReady(): { ios: boolean; android: boolean } {
  return {
    ios: Boolean(
      process.env.APP_STORE_CONNECT_KEY_ID &&
        process.env.APP_STORE_CONNECT_ISSUER_ID &&
        process.env.APP_STORE_CONNECT_PRIVATE_KEY,
    ),
    android: Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
  };
}

export interface MobileAppStatus {
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  /** Accès API de collecte branchés ? (sinon métriques différées). */
  metricsReady: { ios: boolean; android: boolean };
  lastSyncAt: string | null;
}

/**
 * Persiste les liens via l'Intent gouverné `ANUBIS_LINK_MOBILE_APP`. Une URL
 * vide/nulle délie la plateforme correspondante. Aucun secret (URLs publiques).
 */
export async function linkMobileApp(params: {
  strategyId: string;
  userId: string;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
}): Promise<void> {
  await emitIntentTyped(
    {
      kind: "ANUBIS_LINK_MOBILE_APP",
      strategyId: params.strategyId,
      userId: params.userId,
      appStoreUrl: params.appStoreUrl,
      playStoreUrl: params.playStoreUrl,
    },
    { caller: "cockpit:mobile-app" },
  );
}

/** Handler de l'Intent — 1 MediaPlatformConnection par store (ou délie). */
export async function handleLinkMobileApp(payload: {
  strategyId: string;
  appStoreUrl: string | null;
  playStoreUrl: string | null;
}): Promise<{ appStore: boolean; playStore: boolean }> {
  const upsertOne = async (platform: string, url: string | null) => {
    // Un seul lien par store : on repart propre puis on (re)crée si fourni.
    await db.mediaPlatformConnection.deleteMany({ where: { strategyId: payload.strategyId, platform } });
    if (url && url.trim()) {
      await db.mediaPlatformConnection.create({
        data: {
          strategyId: payload.strategyId,
          platform,
          accountId: url.trim(),
          status: "ACTIVE",
        },
      });
      return true;
    }
    return false;
  };
  const appStore = await upsertOne(APP_STORE_PLATFORM, payload.appStoreUrl);
  const playStore = await upsertOne(PLAY_STORE_PLATFORM, payload.playStoreUrl);
  return { appStore, playStore };
}

/** État pour l'UI (zéro secret) — liens + disponibilité des métriques. */
export async function getMobileAppStatus(strategyId: string): Promise<MobileAppStatus> {
  const conns = await db.mediaPlatformConnection.findMany({
    where: { strategyId, platform: { in: [APP_STORE_PLATFORM, PLAY_STORE_PLATFORM] }, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: { platform: true, accountId: true, lastSyncAt: true },
  });
  const appStore = conns.find((c) => c.platform === APP_STORE_PLATFORM);
  const playStore = conns.find((c) => c.platform === PLAY_STORE_PLATFORM);
  // `.sort()` nu sur des Date coerce en toString() ("Wed Jul 23…") → tri
  // lexicographique par jour de semaine, pas chronologique. Comparateur explicite.
  const lastSync = conns
    .map((c) => c.lastSyncAt)
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime())
    .at(-1) ?? null;
  return {
    appStoreUrl: appStore?.accountId ?? null,
    playStoreUrl: playStore?.accountId ?? null,
    metricsReady: mobileMetricsProviderReady(),
    lastSyncAt: lastSync ? lastSync.toISOString() : null,
  };
}
