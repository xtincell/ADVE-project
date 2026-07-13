/**
 * Version UNIQUE de l'app — source de vérité runtime (NEFER §9.2 version-unique).
 *
 * Maintenue par `scripts/bump-version.mjs` (bump atomique avec package.json +
 * package-lock.json). NE PAS éditer à la main. Le footer marketing et
 * l'endpoint `/api/version` la consomment — le watcher de déploiement de
 * `/console/socle/prod-ops` compare cette valeur à la version servie en ligne.
 */
export const APP_VERSION = "6.27.145";
