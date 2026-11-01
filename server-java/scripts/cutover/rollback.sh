#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${1:-}" != "--confirm-rollback" ]]; then
  echo "usage: rollback.sh --confirm-rollback" >&2
  echo "This restores pre-cutover.sql and starts Node again." >&2
  exit 2
fi

SOURCE_DB="${SOURCE_DB:-njupt_hub}"
MYSQL_CONTAINER="${MYSQL_CONTAINER-njupt-hub-db-1}"
NODE_CONTAINER="${NODE_CONTAINER:-njupt-hub-server-1}"
BACKUP_DIR="${BACKUP_DIR:?BACKUP_DIR is required}"
PUBLIC_BASE="${PUBLIC_BASE:-http://127.0.0.1:3002}"
NODE_HEALTH="${NODE_HEALTH:-http://127.0.0.1:3001/health}"
HOST_NGINX_CONF="${HOST_NGINX_CONF:-/etc/nginx/sites-enabled/njupt-hub}"
NGINX_BACKUP_DIR="${NGINX_BACKUP_DIR:-/tmp/opencode/batch5-nginx}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
else
  COMPOSE=(docker-compose)
fi
BACKUP="$BACKUP_DIR/pre-cutover.sql"
CHECKSUM="$BACKUP_DIR/pre-cutover.sql.sha256"

case "$SOURCE_DB" in
  *[!A-Za-z0-9_]*|"") echo "invalid SOURCE_DB" >&2; exit 2;;
esac

for file in "$BACKUP" "$CHECKSUM"; do
  [[ -s "$file" ]] || { echo "missing rollback file: $file" >&2; exit 1; }
done
if ! (cd "$BACKUP_DIR" && sha256sum -c "$(basename "$CHECKSUM")"); then
  echo "backup checksum verification failed; refusing to DROP database" >&2
  exit 1
fi
BACKUP_BYTES="$(stat -c %s "$BACKUP")"
AVAILABLE_KB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
if (( AVAILABLE_KB * 1024 < BACKUP_BYTES * 2 )); then
  echo "insufficient disk for rollback: need $((BACKUP_BYTES * 2)) bytes" >&2
  exit 1
fi
if [[ "$(docker inspect -f '{{.State.Running}}' "$NODE_CONTAINER" 2>/dev/null || true)" == "true" ]]; then
  echo "Node is already running; refusing to overwrite its database" >&2
  exit 1
fi

if [[ -n "$MYSQL_CONTAINER" ]]; then
  MYSQL=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysql --batch --skip-column-names)
else
  MYSQL=(mysql --batch --skip-column-names -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}")
fi

BACKUP_DIR="$NGINX_BACKUP_DIR" "$SCRIPT_DIR/maintenance-on.sh"

(
  cd "$REPO_ROOT"
  "${COMPOSE[@]}" -f docker-compose.prod-java.yml stop java >/dev/null 2>&1 || true
)

"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$SOURCE_DB\`; CREATE DATABASE \`$SOURCE_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
"${MYSQL[@]}" "$SOURCE_DB" < "$BACKUP"

docker start "$NODE_CONTAINER" >/dev/null
docker update --restart=always "$NODE_CONTAINER" >/dev/null
for _ in $(seq 1 30); do
  if curl -fsS "$NODE_HEALTH" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
curl -fsS "$NODE_HEALTH" >/dev/null || { echo "Node health check failed; maintenance remains active" >&2; exit 1; }

BACKUP_DIR="$NGINX_BACKUP_DIR" "$SCRIPT_DIR/maintenance-off.sh"
curl -fsS "$PUBLIC_BASE/api/resources?status=APPROVED&page=1&pageSize=1" >/dev/null

echo "rollback complete"
"${MYSQL[@]}" -e "SELECT 'User' AS table_name, COUNT(*) AS rows_count FROM \`$SOURCE_DB\`.\`User\` UNION ALL SELECT 'Resource', COUNT(*) FROM \`$SOURCE_DB\`.\`Resource\`"
