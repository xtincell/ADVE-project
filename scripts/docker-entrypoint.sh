#!/bin/sh
# La Fusée OS — container entrypoint.
#
# Applique les migrations Prisma AVANT de démarrer le serveur : sur les cibles
# non-Vercel (Coolify/self-host), `prisma migrate deploy` n'a aucun autre point
# d'accroche — une migration manquée = erreurs de schéma au runtime.
#
# ⚠️ INCIDENT 2026-07-10 (503 post-merge #442) : l'image standalone Next embarque
# un `node_modules` élagué (trace standalone) qui N'INCLUT PAS le moteur WASM du
# CLI Prisma (`prisma_schema_build_bg.wasm`) → `prisma migrate deploy` crashait
# (ENOENT) → `set -e` tuait le conteneur → crash-loop → 503. Correctif :
# migrate-on-boot est désormais **best-effort** — un échec est loggé bruyamment
# mais NE FAIT JAMAIS tomber le serveur. Une panne totale est pire qu'une
# dégradation partielle sur le money-path.
#
# Flow migrations recommandé (le CLI ne tourne pas dans l'image standalone) :
#   - appliquer les migrations hors-bande (env complet / job dédié / ops-ssh),
#   - garder SKIP_MIGRATE_ON_BOOT=1 en prod standalone.
# Opt-out explicite : SKIP_MIGRATE_ON_BOOT=1.
set -e

if [ "${SKIP_MIGRATE_ON_BOOT:-0}" != "1" ]; then
  echo "[entrypoint] prisma migrate deploy… (best-effort)"
  # Non-fatal : on capture l'échec au lieu de laisser `set -e` tuer le boot.
  if npx prisma migrate deploy; then
    echo "[entrypoint] migrations appliquées."
  else
    echo "[entrypoint] ⚠️ prisma migrate deploy a échoué (code $?) — DÉMARRAGE QUAND MÊME."
    echo "[entrypoint] ⚠️ Applique les migrations hors-bande puis vérifie le schéma. Le serveur tourne sur le schéma existant."
  fi
else
  echo "[entrypoint] SKIP_MIGRATE_ON_BOOT=1 — migrations non appliquées ici (attendu en prod standalone)."
fi

exec node server.js
