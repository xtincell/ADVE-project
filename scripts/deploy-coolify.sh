#!/usr/bin/env bash
# Provisionne et déploie La Fusée v7 sur Coolify (idempotent, auto-diagnostiquant).
# Requis : COOLIFY_URL + COOLIFY_TOKEN (env). Optionnel : GIT_BRANCH, APP_DOMAIN.
set -uo pipefail
: "${COOLIFY_URL:?COOLIFY_URL manquant}"
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN manquant}"
BRANCH="${GIT_BRANCH:-claude/project-revamp-agent-safe-doc3ip}"
REPO="https://github.com/xtincell/ADVE-project"
API="$COOLIFY_URL/api/v1"

# GET/POST avec corps d'erreur TOUJOURS visible (le token n'apparaît jamais en sortie).
call() { # method path [json]
  local m="$1" p="$2" d="${3:-}" out code
  if [ -n "$d" ]; then
    out=$(curl -sS -X "$m" -H "Authorization: Bearer $COOLIFY_TOKEN" -H "Content-Type: application/json" -d "$d" -w $'\n%{http_code}' "$API$p")
  else
    out=$(curl -sS -X "$m" -H "Authorization: Bearer $COOLIFY_TOKEN" -w $'\n%{http_code}' "$API$p")
  fi
  code="${out##*$'\n'}"; body="${out%$'\n'*}"
  echo "[$m $p → $code]" >&2
  if [ "${code:0:1}" != "2" ]; then echo "  ↳ $body" >&2; return 1; fi
  printf '%s' "$body"
}

echo "═ Découverte"
SERVERS=$(call GET /servers) || exit 1
SERVER_UUID=$(echo "$SERVERS" | jq -r 'if type=="array" then .[0].uuid else (.data[0].uuid // empty) end')
echo "  server=$SERVER_UUID"
PROJECTS=$(call GET /projects || echo "[]")
echo "  projets: $(echo "$PROJECTS" | jq -c 'if type=="array" then [.[] | {name, uuid}] else . end' 2>/dev/null | head -c 400)"
APPS=$(call GET /applications || echo "[]")
echo "  apps: $(echo "$APPS" | jq -c 'if type=="array" then [.[] | {name, uuid}] else . end' 2>/dev/null | head -c 400)"
DBS=$(call GET /databases || echo "[]")
echo "  dbs: $(echo "$DBS" | jq -c 'if type=="array" then [.[] | {name, uuid}] else . end' 2>/dev/null | head -c 400)"
for path in /sources /security/keys /private-keys /github-apps; do
  echo "  découverte $path :"; call GET "$path" >/dev/null || true
done

echo "═ Projet lafusee-v7"
PROJECT_UUID=$(echo "$PROJECTS" | jq -r 'if type=="array" then (.[] | select(.name=="lafusee-v7") | .uuid) else empty end' | head -1)
if [ -z "$PROJECT_UUID" ]; then
  CREATED=$(call POST /projects '{"name":"lafusee-v7"}') || { echo "!! création projet impossible — corps ci-dessus"; exit 1; }
  PROJECT_UUID=$(echo "$CREATED" | jq -r '.uuid // .data.uuid // empty')
fi
echo "  project=$PROJECT_UUID"

echo "═ Postgres lafusee-v7-db"
DB_UUID=$(echo "$DBS" | jq -r 'if type=="array" then (.[] | select(.name=="lafusee-v7-db") | .uuid) else empty end' | head -1)
if [ -z "$DB_UUID" ]; then
  CREATED=$(call POST /databases/postgresql "{\"server_uuid\":\"$SERVER_UUID\",\"project_uuid\":\"$PROJECT_UUID\",\"environment_name\":\"production\",\"name\":\"lafusee-v7-db\",\"postgres_user\":\"lafusee\",\"postgres_db\":\"lafusee\"}") || { echo "!! création DB impossible"; exit 1; }
  DB_UUID=$(echo "$CREATED" | jq -r '.uuid // .data.uuid // empty')
fi
DB_INFO=$(call GET "/databases/$DB_UUID") || exit 1
DB_URL=$(echo "$DB_INFO" | jq -r '.internal_db_url // .external_db_url // empty')
echo "  db=$DB_UUID (url interne: $([ -n "$DB_URL" ] && echo présent || echo ABSENT))"

echo "═ Application lafusee-v7"
APP_UUID=$(echo "$APPS" | jq -r 'if type=="array" then (.[] | select(.name=="lafusee-v7") | .uuid) else empty end' | head -1)
if [ -z "$APP_UUID" ]; then
  # Repo public → build pack dockerfile depuis le repo public.
  CREATED=$(call POST /applications/public "{\"server_uuid\":\"$SERVER_UUID\",\"project_uuid\":\"$PROJECT_UUID\",\"environment_name\":\"production\",\"name\":\"lafusee-v7\",\"git_repository\":\"$REPO\",\"git_branch\":\"$BRANCH\",\"build_pack\":\"dockerfile\",\"ports_exposes\":\"3000\",\"instant_deploy\":false}") || { echo "!! création app impossible — corps ci-dessus"; exit 1; }
  APP_UUID=$(echo "$CREATED" | jq -r '.uuid // .data.uuid // empty')
fi
echo "  app=$APP_UUID"

echo "═ Env vars"
setenv() { call POST "/applications/$APP_UUID/envs" "{\"key\":\"$1\",\"value\":\"$2\",\"is_preview\":false}" >/dev/null || call PATCH "/applications/$APP_UUID/envs" "{\"key\":\"$1\",\"value\":\"$2\",\"is_preview\":false}" >/dev/null || true; }
[ -n "$DB_URL" ] && setenv DATABASE_URL "$DB_URL"
setenv AUTH_SECRET "$(openssl rand -hex 32)"
setenv RUN_SEED "1"
setenv OPERATOR_EMAIL "xtincell@gmail.com"
[ -n "${APP_DOMAIN:-}" ] && call PATCH "/applications/$APP_UUID" "{\"domains\":\"$APP_DOMAIN\"}" >/dev/null || true

echo "═ Deploy"
call GET "/deploy?uuid=$APP_UUID&force=true" | jq -r '.message // .' || call POST "/applications/$APP_UUID/start" "" | jq -r '.message // .' || true
echo "✓ Fini. Suivi : $COOLIFY_URL → projet lafusee-v7 (app + db + logs de build)."
