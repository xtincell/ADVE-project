#!/bin/sh
# Sync du schéma au boot (bootstrap v1 — bascule vers `migrate deploy` quand les
# migrations formelles seront posées). Idempotent, ne perd jamais de données.
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "[boot] prisma db push (schema sync)…"
  ./node_modules/.bin/prisma db push --skip-generate || echo "[boot] WARN: db push failed — app starts anyway"
  if [ -n "$RUN_SEED" ]; then
    echo "[boot] seed référentiels…"
    node prisma/seed.mjs || echo "[boot] WARN: seed failed"
  fi
else
  echo "[boot] DATABASE_URL absent — démarrage sans DB (pages statiques seulement)"
fi
exec node server.js
