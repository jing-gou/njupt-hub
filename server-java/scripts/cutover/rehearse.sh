#!/usr/bin/env bash
set -euo pipefail
umask 077

SOURCE_DB="${SOURCE_DB:-njupt_hub}"
REHEARSAL_DB="${REHEARSAL_DB:-njupt_hub_rehearsal}"
MYSQL_CONTAINER="${MYSQL_CONTAINER-njupt-hub-db-1}"
ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/opencode/batch5-$(date -u +%Y%m%dT%H%M%SZ)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$SOURCE_DB" in *[!A-Za-z0-9_]*|"") echo "invalid SOURCE_DB" >&2; exit 2;; esac
case "$REHEARSAL_DB" in *[!A-Za-z0-9_]*|"") echo "invalid REHEARSAL_DB" >&2; exit 2;; esac
[[ "$SOURCE_DB" != "$REHEARSAL_DB" ]] || { echo "SOURCE_DB and REHEARSAL_DB must differ" >&2; exit 2; }

mkdir -p "$ARTIFACT_DIR"
chmod 700 "$ARTIFACT_DIR"

if [[ -n "$MYSQL_CONTAINER" ]]; then
  MYSQL=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysql --batch --skip-column-names)
  DUMP=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysqldump)
else
  MYSQL=(mysql --batch --skip-column-names -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}")
  DUMP=(mysqldump -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}")
fi
if [[ -n "${MYSQL_PWD:-}" && -z "$MYSQL_CONTAINER" ]]; then
  export MYSQL_PWD
fi

SOURCE_BYTES="$("${MYSQL[@]}" -e "SELECT COALESCE(SUM(data_length + index_length), 0) FROM information_schema.tables WHERE table_schema = '$SOURCE_DB'")"
AVAILABLE_KB="$(df -Pk "$ARTIFACT_DIR" | awk 'NR==2 {print $4}')"
AVAILABLE_BYTES=$((AVAILABLE_KB * 1024))
if (( AVAILABLE_BYTES < SOURCE_BYTES * 3 )); then
  echo "insufficient disk: need $((SOURCE_BYTES * 3)) bytes, have $AVAILABLE_BYTES" >&2
  exit 1
fi

DUMP_OPTS=(--single-transaction --routines --triggers --events --set-gtid-purged=OFF --no-create-db --skip-add-locks)
"${DUMP[@]}" "${DUMP_OPTS[@]}" "$SOURCE_DB" > "$ARTIFACT_DIR/source.sql"
"${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$REHEARSAL_DB\`; CREATE DATABASE \`$REHEARSAL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
"${MYSQL[@]}" "$REHEARSAL_DB" < "$ARTIFACT_DIR/source.sql"

run_audit() {
  local database="$1" output="$2"
  set +e
  MYSQL_CONTAINER="$MYSQL_CONTAINER" MYSQL_HOST="${MYSQL_HOST:-}" MYSQL_PORT="${MYSQL_PORT:-}" \
    MYSQL_USER="${MYSQL_USER:-}" MYSQL_PWD="${MYSQL_PWD:-}" \
    "$SCRIPT_DIR/audit.sh" "$database" > "$output"
  local result=$?
  set -e
  return "$result"
}

set +e
run_audit "$SOURCE_DB" "$ARTIFACT_DIR/audit-source.txt"
SOURCE_AUDIT=$?
run_audit "$REHEARSAL_DB" "$ARTIFACT_DIR/audit-rehearsal.txt"
REHEARSAL_AUDIT=$?
set -e

SOURCE_DB="$SOURCE_DB" REHEARSAL_DB="$REHEARSAL_DB" ARTIFACT_DIR="$ARTIFACT_DIR" \
  "$SCRIPT_DIR/compare-dumps.sh"

if (( SOURCE_AUDIT != 0 || REHEARSAL_AUDIT != 0 )); then
  echo "audit failed: source=$SOURCE_AUDIT rehearsal=$REHEARSAL_AUDIT (see $ARTIFACT_DIR)" >&2
  exit 1
fi

echo "rehearsal ready: $ARTIFACT_DIR"
