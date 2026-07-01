#!/usr/bin/env bash
# Provisionne et déploie La Fusée v7 sur Coolify (idempotent).
# Requis : COOLIFY_URL (ex: http://76.13.128.23:8000) + COOLIFY_TOKEN (API root, régénéré).
# Optionnel : GIT_BRANCH (défaut: branche de rebuild), APP_DOMAIN.
set -euo pipefail
: "${COOLIFY_URL:?COOLIFY_URL manquant}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN manquant}"
BRANCH="${GIT_BRANCH:-claude/project-revamp-agent-safe-doc3ip}"
REPO="https://github.com/xtincell/ADVE-project"
API="$COOLIFY_URL/api/v1"
H=(-H "Authorization: Bearer $COOLIFY_TOKEN" -H "Content-Type: application/json")

req() { curl -sS --fail-with-body "${H[@]}" "$@"; }

echo "→ serveur"
SERVER_UUID=$(req "$API/servers" | jq -r '.[0].uuid')
echo "  server=$SERVER_UUID"

echo "→ projet lafusee-v7"
PROJECT_UUID=$(req "$API/projects" | jq -r '.[] | select(.name=="lafusee-v7") | .uuid' | head -1)
if [ -z "$PROJECT_UUID" ]; then
  PROJECT_UUID=$(req -X POST "$API/projects" -d '{"name":"lafusee-v7","description":"La Fusée v7 — rebuild"}' | jq -r '.uuid')
fi
echo "  project=$PROJECT_UUID"

echo "→ postgres"
DB_UUID=$(req "$API/databases" | jq -r '.[] | select(.name=="lafusee-v7-db") | .uuid' | head -1)
if [ -z "$DB_UUID" ]; then
  DB_UUID=$(req -X POST "$API/databases/postgresql" -d "{
    \"server_uuid\":\"$SERVER_UUID\",\"project_uuid\":\"$PROJECT_UUID\",
    \"environment_name\":\"production\",\"name\":\"lafusee-v7-db\",
    \"postgres_user\":\"lafusee\",\"postgres_db\":\"lafusee\"}" | jq -r '.uuid')
fi
DB_URL=$(req "$API/databases/$DB_UUID" | jq -r '.internal_db_url // .external_db_url')
echo "  db=$DB_UUID"

echo "→ application"
APP_UUID=$(req "$API/applications" | jq -r '.[] | select(.name=="lafusee-v7") | .uuid' | head -1)
if [ -z "$APP_UUID" ]; then
  GH_APP=$(req "$API/security/keys" >/dev/null 2>&1; req "$API/applications" >/dev/null 2>&1; echo "")
  # Repo privé : nécessite une GitHub App Coolify déjà connectée (Sources dans l'UI).
  GH_APP_UUID=$(req "$API/sources" 2>/dev/null | jq -r '.[0].uuid // empty' || true)
  if [ -n "$GH_APP_UUID" ]; then
    APP_UUID=$(req -X POST "$API/applications/private-github-app" -d "{
      \"server_uuid\":\"$SERVER_UUID\",\"project_uuid\":\"$PROJECT_UUID\",
      \"environment_name\":\"production\",\"name\":\"lafusee-v7\",
      \"github_app_uuid\":\"$GH_APP_UUID\",\"git_repository\":\"$REPO\",
      \"git_branch\":\"$BRANCH\",\"build_pack\":\"dockerfile\",\"ports_exposes\":\"3000\"}" | jq -r '.uuid')
  else
    echo "!! Aucune source GitHub connectée dans Coolify (UI → Sources → GitHub App)." >&2
    echo "   Connecte la GitHub App puis relance ce script." >&2
    exit 1
  fi
fi
echo "  app=$APP_UUID"

echo "→ env vars"
req -X POST "$API/applications/$APP_UUID/envs" -d "{\"key\":\"DATABASE_URL\",\"value\":\"$DB_URL\",\"is_preview\":false}" >/dev/null || true
req -X POST "$API/applications/$APP_UUID/envs" -d "{\"key\":\"AUTH_SECRET\",\"value\":\"$(openssl rand -hex 32)\",\"is_preview\":false}" >/dev/null || true
req -X POST "$API/applications/$APP_UUID/envs" -d "{\"key\":\"RUN_SEED\",\"value\":\"1\",\"is_preview\":false}" >/dev/null || true
[ -n "${APP_DOMAIN:-}" ] && req -X PATCH "$API/applications/$APP_UUID" -d "{\"domains\":\"$APP_DOMAIN\"}" >/dev/null || true

echo "→ deploy"
req "$API/deploy?uuid=$APP_UUID&force=true" | jq -r '.message // .'
echo "✓ déclenché. Suivi : $COOLIFY_URL → projet lafusee-v7."
