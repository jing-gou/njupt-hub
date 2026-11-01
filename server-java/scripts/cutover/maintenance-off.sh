#!/usr/bin/env bash
set -euo pipefail
umask 077

CLIENT_CONTAINER="${CLIENT_CONTAINER:-njupt-hub-client-1}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/opencode/batch5-nginx}"
NGINX_CONF="/etc/nginx/conf.d/default.conf"
MARKER="$BACKUP_DIR/.maintenance-active"

if [[ ! -f "$BACKUP_DIR/default.conf" ]]; then
  echo "original nginx config backup not found: $BACKUP_DIR/default.conf" >&2
  exit 1
fi
if [[ "$(docker inspect -f '{{.State.Running}}' "$CLIENT_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
  echo "client container is not running: $CLIENT_CONTAINER" >&2
  exit 1
fi

docker cp "$BACKUP_DIR/default.conf" "$CLIENT_CONTAINER:$NGINX_CONF"
if ! docker exec "$CLIENT_CONTAINER" nginx -t; then
  echo "restored config is invalid; not reloading" >&2
  exit 1
fi
docker exec "$CLIENT_CONTAINER" nginx -s reload
sleep 1
rm -f "$MARKER"
echo "normal nginx config restored"
