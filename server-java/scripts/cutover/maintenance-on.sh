#!/usr/bin/env bash
set -euo pipefail
umask 077

CLIENT_CONTAINER="${CLIENT_CONTAINER:-njupt-hub-client-1}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/opencode/batch5-nginx}"
NGINX_CONF="/etc/nginx/conf.d/default.conf"
NGINX_HTML="/usr/share/nginx/html"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MARKER="$BACKUP_DIR/.maintenance-active"

if [[ "$(docker inspect -f '{{.State.Running}}' "$CLIENT_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
  echo "client container is not running: $CLIENT_CONTAINER" >&2
  exit 1
fi
if [[ -f "$MARKER" ]]; then
  echo "maintenance page already active" >&2
  exit 0
fi
for file in "$REPO_ROOT/ops/nginx/maintenance.html" "$REPO_ROOT/ops/nginx/maintenance.conf"; do
  [[ -f "$file" ]] || { echo "missing file: $file" >&2; exit 1; }
done

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
docker cp "$CLIENT_CONTAINER:$NGINX_CONF" "$BACKUP_DIR/default.conf"

restore_config() {
  docker cp "$BACKUP_DIR/default.conf" "$CLIENT_CONTAINER:$NGINX_CONF"
  docker exec "$CLIENT_CONTAINER" nginx -t
}

if ! docker cp "$REPO_ROOT/ops/nginx/maintenance.html" "$CLIENT_CONTAINER:$NGINX_HTML/maintenance.html" \
  || ! docker cp "$REPO_ROOT/ops/nginx/maintenance.conf" "$CLIENT_CONTAINER:$NGINX_CONF"; then
  restore_config || true
  echo "failed to copy maintenance files" >&2
  exit 1
fi

if ! docker exec "$CLIENT_CONTAINER" nginx -t; then
  restore_config || true
  echo "maintenance nginx config is invalid; original restored" >&2
  exit 1
fi
docker exec "$CLIENT_CONTAINER" nginx -s reload
sleep 1
touch "$MARKER"
echo "maintenance page enabled"
