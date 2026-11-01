#!/usr/bin/env bash
set -euo pipefail
umask 077

SOURCE_DB="${SOURCE_DB:-njupt_hub}"
REHEARSAL_DB="${REHEARSAL_DB:-njupt_hub_rehearsal}"
MYSQL_CONTAINER="${MYSQL_CONTAINER-njupt-hub-db-1}"
ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/opencode/batch5-compare}"
mkdir -p "$ARTIFACT_DIR"

if [[ -n "$MYSQL_CONTAINER" ]]; then
  DUMP=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysqldump)
else
  DUMP=(mysqldump -h "${MYSQL_HOST:-127.0.0.1}" -P "${MYSQL_PORT:-3306}" -u "${MYSQL_USER:-root}")
fi
if [[ -n "${MYSQL_PWD:-}" && -z "$MYSQL_CONTAINER" ]]; then
  export MYSQL_PWD
fi

DUMP_OPTS=(--no-create-info --skip-triggers --skip-comments --skip-dump-date
  --complete-insert --extended-insert=false --order-by-primary --skip-add-locks)

"${DUMP[@]}" "${DUMP_OPTS[@]}" "$SOURCE_DB" > "$ARTIFACT_DIR/source-data.sql"
"${DUMP[@]}" "${DUMP_OPTS[@]}" "$REHEARSAL_DB" > "$ARTIFACT_DIR/rehearsal-data.sql"

set +e
diff -u "$ARTIFACT_DIR/source-data.sql" "$ARTIFACT_DIR/rehearsal-data.sql" > "$ARTIFACT_DIR/data.diff"
DIFF_STATUS=$?
set -e
if (( DIFF_STATUS != 0 )); then
  head -100 "$ARTIFACT_DIR/data.diff" >&2
  echo "data mismatch; full diff: $ARTIFACT_DIR/data.diff" >&2
  exit 1
fi
echo "data identical: $SOURCE_DB vs $REHEARSAL_DB"
