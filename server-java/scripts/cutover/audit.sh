#!/usr/bin/env bash
set -euo pipefail
umask 077

DB="${1:-}"
if [[ -z "$DB" ]]; then
  echo "usage: audit.sh <database>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n "${MYSQL_CONTAINER:-}" ]]; then
  MYSQL=(docker exec -i -e "MYSQL_PWD=${MYSQL_PWD:-}" "$MYSQL_CONTAINER" mysql --batch --skip-column-names)
else
  MYSQL=(mysql --batch --skip-column-names)
  MYSQL+=(-h "${MYSQL_HOST:-127.0.0.1}")
  MYSQL+=(-P "${MYSQL_PORT:-3306}")
  MYSQL+=(-u "${MYSQL_USER:-root}")
  if [[ -n "${MYSQL_PWD:-}" ]]; then
    export MYSQL_PWD
  fi
fi

OUTPUT="$("${MYSQL[@]}" "$DB" < "$SCRIPT_DIR/audit.sql")"
printf '%s\n' "$OUTPUT"

status=0
while IFS=$'\t' read -r metric value; do
  [[ -z "$metric" ]] && continue
  case "$metric" in
    orphan.*|bad_password_hash)
      if [[ "$value" != "0" ]]; then
        echo "BLOCK $metric=$value"
        status=1
      fi
      ;;
    file_url.*|file_key.*)
      if [[ "$value" != "0" ]]; then
        echo "WARN $metric=$value"
      fi
      ;;
  esac
done <<< "$OUTPUT"

exit "$status"
