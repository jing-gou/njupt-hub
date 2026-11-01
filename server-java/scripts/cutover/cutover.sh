#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ "${1:-}" != "--confirm-cutover" ]]; then
  echo "usage: cutover.sh --confirm-cutover" >&2
  echo "This stops Node, writes a backup, runs Flyway, and switches Nginx to Java." >&2
  exit 2
fi

SOURCE_DB="${SOURCE_DB:-njupt_hub}"
MYSQL_CONTAINER="${MYSQL_CONTAINER-njupt-hub-db-1}"
NODE_CONTAINER="${NODE_CONTAINER:-njupt-hub-server-1}"
BACKUP_DIR="${BACKUP_DIR:?BACKUP_DIR is required}"
JAVA_HEALTH="${JAVA_HEALTH:-http://127.0.0.1:13000/health}"
SMOKE_BASE="${SMOKE_BASE:-http://127.0.0.1:13000}"
PUBLIC_BASE="${PUBLIC_BASE:-http://127.0.0.1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARTIFACT_DIR="${ARTIFACT_DIR:-$BACKUP_DIR/rehearsal-$STAMP}"

: "${MYSQL_PWD:?MYSQL_PWD is required for MySQL admin operations}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${QINIU_ACCESS_KEY:?QINIU_ACCESS_KEY is required}"
: "${QINIU_SECRET_KEY:?QINIU_SECRET_KEY is required}"
: "${QINIU_BUCKET:?QINIU_BUCKET is required}"
: "${QINIU_DOMAIN:?QINIU_DOMAIN is required}"
: "${SMTP_HOST:?SMTP_HOST is required}"
: "${SMTP_USER:?SMTP_USER is required}"
: "${SMTP_PASS:?SMTP_PASS is required}"
: "${SMTP_FROM:?SMTP_FROM is required}"

if [[ "$(docker inspect -f '{{.State.Running}}' "$NODE_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
  echo "Node container is not running: $NODE_CONTAINER" >&2
  exit 1
fi

if [[ -n "$MYSQL_CONTAINER" ]]; then
  MYSQL=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysql --batch --skip-column-names)
  DUMP=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysqldump)
else
  MYSQL=(mysql --batch --skip-column-names -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}")
  DUMP=(mysqldump -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}")
fi

mkdir -p "$BACKUP_DIR" "$ARTIFACT_DIR"
chmod 700 "$BACKUP_DIR" "$ARTIFACT_DIR"
SOURCE_BYTES="$("${MYSQL[@]}" -e "SELECT COALESCE(SUM(data_length + index_length), 0) FROM information_schema.tables WHERE table_schema = '$SOURCE_DB'")"
AVAILABLE_KB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
if (( AVAILABLE_KB * 1024 < SOURCE_BYTES * 3 )); then
  echo "insufficient backup disk: need $((SOURCE_BYTES * 3)) bytes" >&2
  exit 1
fi

OUTBOX_TABLES="$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$SOURCE_DB' AND table_name='mail_outbox'")"
if [[ "$OUTBOX_TABLES" == "1" ]]; then
  OUTBOX_ROWS="$("${MYSQL[@]}" -e "SELECT COUNT(*) FROM \`$SOURCE_DB\`.\`mail_outbox\`")"
  if [[ "$OUTBOX_ROWS" != "0" ]]; then
    echo "mail_outbox is not empty ($OUTBOX_ROWS rows); this is not a first cutover" >&2
    exit 1
  fi
fi

on_error() {
  if [[ ! -f /tmp/opencode/batch5-nginx/.maintenance-active ]]; then
    "$SCRIPT_DIR/maintenance-on.sh" >/dev/null 2>&1 || true
  fi
  echo "cutover stopped; maintenance page is active" >&2
  echo "run: BACKUP_DIR='$BACKUP_DIR' $SCRIPT_DIR/rollback.sh --confirm-rollback" >&2
  exit 1
}
trap on_error ERR

"$SCRIPT_DIR/maintenance-on.sh"
if [[ "$(curl -sS -o /dev/null -w '%{http_code}' "$PUBLIC_BASE/" || true)" != "503" ]]; then
  echo "maintenance page did not return 503" >&2
  exit 1
fi

docker stop "$NODE_CONTAINER" >/dev/null
"${DUMP[@]}" --single-transaction --routines --triggers --events \
  --set-gtid-purged=OFF --no-create-db "$SOURCE_DB" > "$BACKUP_DIR/pre-cutover.sql"
[[ -s "$BACKUP_DIR/pre-cutover.sql" ]] || { echo "backup is empty" >&2; exit 1; }
sha256sum "$BACKUP_DIR/pre-cutover.sql" | tee "$BACKUP_DIR/pre-cutover.sql.sha256"

SOURCE_DB="$SOURCE_DB" REHEARSAL_DB="${REHEARSAL_DB:-njupt_hub_rehearsal}" \
  MYSQL_CONTAINER="$MYSQL_CONTAINER" MYSQL_HOST="${MYSQL_HOST:-}" MYSQL_PORT="${MYSQL_PORT:-}" \
  MYSQL_USER="${MYSQL_USER:-}" MYSQL_PWD="${MYSQL_PWD:-}" ARTIFACT_DIR="$ARTIFACT_DIR" \
  "$SCRIPT_DIR/rehearse.sh"

(
  cd "$REPO_ROOT"
  docker compose -f docker-compose.prod-java.yml up -d --build
)

for _ in $(seq 1 60); do
  if curl -fsS "$JAVA_HEALTH" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS "$JAVA_HEALTH" >/dev/null || { echo "Java health check failed" >&2; exit 1; }

FLYWAY="$("${MYSQL[@]}" -e "SELECT version, success FROM \`$SOURCE_DB\`.\`flyway_schema_history\` ORDER BY installed_rank" 2>/dev/null || true)"
if ! grep -q $'1\t1' <<< "$FLYWAY" || ! grep -q $'2\t1' <<< "$FLYWAY"; then
  echo "Flyway history is incomplete: $FLYWAY" >&2
  exit 1
fi

if [[ "${RUN_SMOKE:-true}" == "true" ]]; then
  BASE_NODE="" BASE_JAVA="$SMOKE_BASE" \
    SMOKE_RESOURCE_ID="${SMOKE_RESOURCE_ID:?SMOKE_RESOURCE_ID is required}" \
    SMOKE_REVIEW_ITEM_ID="${SMOKE_REVIEW_ITEM_ID:?SMOKE_REVIEW_ITEM_ID is required}" \
    SMOKE_TOKEN="${SMOKE_TOKEN:-}" SMOKE_ADMIN_TOKEN="${SMOKE_ADMIN_TOKEN:-}" \
    ARTIFACT_DIR="$ARTIFACT_DIR/smoke" \
    "$SCRIPT_DIR/smoke.sh"
fi

"$SCRIPT_DIR/maintenance-off.sh"
curl -fsS "$PUBLIC_BASE/api/resources?status=APPROVED&page=1&pageSize=1" >/dev/null
trap - ERR
echo "cutover complete; backup: $BACKUP_DIR/pre-cutover.sql"
