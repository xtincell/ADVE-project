#!/bin/sh
# La Fusée OS — container entrypoint.
#
# Applique les migrations Prisma AVANT de démarrer le serveur : sur les cibles
# non-Vercel (Coolify/self-host), il n'y a aucun autre point d'accroche — une
# migration manquée = erreurs de schéma au runtime.
#
# ⚠️ INCIDENTS 2026-07-10 (503 money-path #442) + 2026-07-11 (dashboard cockpit
# vide, colonne marketScale non migrée) : le CLI Prisma N'EST PAS fonctionnel
# dans l'image standalone Next. Le trace élague `node_modules` → il manque (a)
# le WASM (`.bin/prisma` est un symlink déréférencé par Docker COPY → cherche
# `prisma_schema_build_bg.wasm` au mauvais endroit) ET (b) les deps de
# `@prisma/config` que `prisma.config.ts` charge (`effect` 34 Mo, `c12`, …).
# Recopier tout l'arbre CLI est fragile et lourd (à contre-emploi du standalone).
#
# CORRECTIF RACINE (2026-07-11) : on n'utilise plus le CLI Prisma au boot. Un
# applicateur maison `scripts/apply-migrations.mjs` — ZÉRO dep, juste `pg`
# (déjà tracé, l'app en dépend) — reproduit `migrate deploy` (pending en ordre,
# suivi `_prisma_migrations` + checksum sha256). Cf. l'en-tête de ce fichier.
#
# Best-effort (défense) : un échec est loggé bruyamment mais NE FAIT JAMAIS
# tomber le serveur — une panne totale est pire qu'une dégradation sur le
# money-path. Opt-out explicite : SKIP_MIGRATE_ON_BOOT=1.
set -e

MIGRATE_RUNNER="scripts/apply-migrations.mjs"

if [ "${SKIP_MIGRATE_ON_BOOT:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_MIGRATE_ON_BOOT=1 — migrations non appliquées ici."
elif [ ! -f "$MIGRATE_RUNNER" ]; then
  echo "[entrypoint] ⚠️ $MIGRATE_RUNNER introuvable — migrations non appliquées. DÉMARRAGE QUAND MÊME."
else
  echo "[entrypoint] application des migrations (runner pg maison, best-effort)…"
  # Non-fatal : on capture l'échec au lieu de laisser `set -e` tuer le boot.
  if node "$MIGRATE_RUNNER"; then
    echo "[entrypoint] migrations à jour."
  else
    code=$?
    echo "[entrypoint] ⚠️ migrations en échec (code $code) — DÉMARRAGE QUAND MÊME."
    echo "[entrypoint] ⚠️ Applique-les à la main : node $MIGRATE_RUNNER. Le serveur tourne sur le schéma existant."
  fi
fi

exec node server.js
