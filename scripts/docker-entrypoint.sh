#!/bin/sh
# La Fusée OS — container entrypoint.
#
# Applique les migrations Prisma AVANT de démarrer le serveur : sur les cibles
# non-Vercel (Coolify/self-host), `prisma migrate deploy` n'a aucun autre point
# d'accroche — une migration manquée = erreurs de schéma au runtime.
#
# Opt-out : SKIP_MIGRATE_ON_BOOT=1 (ex. exécution du migrate en pre-deploy
# Coolify, ou replicas multiples où un seul pod doit migrer).
set -e

if [ "${SKIP_MIGRATE_ON_BOOT:-0}" != "1" ]; then
  echo "[entrypoint] prisma migrate deploy…"
  npx prisma migrate deploy
else
  echo "[entrypoint] SKIP_MIGRATE_ON_BOOT=1 — migrations non appliquées ici"
fi

exec node server.js
