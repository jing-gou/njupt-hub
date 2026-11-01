#!/usr/bin/env bash
set -euo pipefail
umask 077

BASE_NODE="${BASE_NODE-}"
: "${BASE_JAVA:?BASE_JAVA is required}"
: "${SMOKE_RESOURCE_ID:?SMOKE_RESOURCE_ID is required}"
: "${SMOKE_REVIEW_ITEM_ID:?SMOKE_REVIEW_ITEM_ID is required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTIFACT_DIR="${ARTIFACT_DIR:-/tmp/opencode/batch5-smoke-$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$ARTIFACT_DIR"
chmod 700 "$ARTIFACT_DIR"
DIFF_FILE="$ARTIFACT_DIR/smoke-diff.txt"
: > "$DIFF_FILE"
STATUS=0

normalize() {
  python3 "$SCRIPT_DIR/normalize-json.py" "$1"
}

fetch() {
  local base="$1" path="$2" token="$3" out="$4"
  local -a args=(-sS --max-time 15 -o "$out" -w '%{http_code}')
  if [[ -n "$token" ]]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  curl "${args[@]}" "${base%/}${path}" 2> "$out.err" || {
    cat "$out.err" >&2
    return 1
  }
}

check() {
  local name="$1" path="$2" token="${3:-}" expected="${4:-200}"
  local node_body="$ARTIFACT_DIR/${name}.node.json"
  local java_body="$ARTIFACT_DIR/${name}.java.json"
  local node_status java_status
  java_status="$(fetch "$BASE_JAVA" "$path" "$token" "$java_body")" || {
    echo "FAIL $name: Java connection failed" >&2
    STATUS=1
    return
  }
  if [[ -z "$BASE_NODE" ]]; then
    if [[ -n "$expected" && "$java_status" != "$expected" ]]; then
      echo "FAIL $name: Java status $java_status, expected $expected" >&2
      STATUS=1
    fi
    normalize "$java_body" > "$ARTIFACT_DIR/${name}.java.normalized.json"
    return
  fi
  node_status="$(fetch "$BASE_NODE" "$path" "$token" "$node_body")" || {
    echo "FAIL $name: Node connection failed" >&2
    STATUS=1
    return
  }

  if [[ -n "$expected" && "$node_status" != "$expected" ]]; then
    echo "FAIL $name: Node status $node_status, expected $expected" >&2
    STATUS=1
  fi
  if [[ -n "$expected" && "$java_status" != "$expected" ]]; then
    echo "FAIL $name: Java status $java_status, expected $expected" >&2
    STATUS=1
  fi
  if [[ "$node_status" != "$java_status" ]]; then
    echo "FAIL $name: status Node=$node_status Java=$java_status" >> "$DIFF_FILE"
    echo "FAIL $name: status Node=$node_status Java=$java_status" >&2
    STATUS=1
  fi

  normalize "$node_body" > "$ARTIFACT_DIR/${name}.node.normalized.json"
  normalize "$java_body" > "$ARTIFACT_DIR/${name}.java.normalized.json"
  if ! diff -u "$ARTIFACT_DIR/${name}.node.normalized.json" "$ARTIFACT_DIR/${name}.java.normalized.json" \
      >> "$DIFF_FILE"; then
    echo "FAIL $name: body differs (see $DIFF_FILE)" >&2
    STATUS=1
  fi
}

check_meta() {
  local node_body="$ARTIFACT_DIR/meta.node.json"
  local java_body="$ARTIFACT_DIR/meta.java.json"
  local node_status java_status
  if [[ -n "$BASE_NODE" ]]; then
    node_status="$(fetch "$BASE_NODE" "/api/meta/commits" "" "$node_body")" || {
      echo "FAIL meta: Node connection failed" >&2
      STATUS=1
      return
    }
  fi
  java_status="$(fetch "$BASE_JAVA" "/api/meta/commits" "" "$java_body")" || {
    echo "FAIL meta: Java connection failed" >&2
    STATUS=1
    return
  }
  if [[ "$java_status" != "501" && "$java_status" != "404" ]]; then
    echo "FAIL meta: Java status $java_status, expected 501/404 (no fake success)" >&2
    STATUS=1
  fi
  if ! python3 -c 'import json,sys; assert json.load(open(sys.argv[1])).get("message")' "$java_body"; then
    echo "FAIL meta: Java response has no explicit message" >&2
    STATUS=1
  fi
  if [[ -n "$BASE_NODE" && "$node_status" != "200" ]]; then
    echo "WARN meta: Node reference status $node_status; Java still must be explicit" >&2
  fi
}

check "health" "/health"
check "leaderboard" "/api/auth/leaderboard"
check "me-no-token" "/api/auth/me" "" "401"
if [[ -n "${SMOKE_TOKEN:-}" ]]; then
  check "me-token" "/api/auth/me" "$SMOKE_TOKEN"
  check "user-stats" "/api/reviews/user/stats" "$SMOKE_TOKEN"
else
  echo "WARN: SMOKE_TOKEN not set; old-token and user-stats checks skipped" >&2
fi
check "resources" "/api/resources?status=APPROVED&page=1&pageSize=20"
check "resource-detail" "/api/resources/$SMOKE_RESOURCE_ID"
check "resource-download-url" "/api/resources/$SMOKE_RESOURCE_ID/download-url"
check "review-items" "/api/reviews/items"
check "review-item-detail" "/api/reviews/items/$SMOKE_REVIEW_ITEM_ID"
if [[ -n "${SMOKE_ADMIN_TOKEN:-}" ]]; then
  check "admin-reports" "/api/reviews/admin/reports" "$SMOKE_ADMIN_TOKEN"
  check "admin-pending" "/api/reviews/admin/pending-reviews" "$SMOKE_ADMIN_TOKEN"
else
  check "admin-reports-no-token" "/api/reviews/admin/reports" "" "401"
  check "admin-pending-no-token" "/api/reviews/admin/pending-reviews" "" "401"
fi
check "resource-missing" "/api/resources/99999999" "" "404"
check "review-item-missing" "/api/reviews/items/99999999" "" "404"
check_meta

if (( STATUS != 0 )); then
  echo "smoke failed; artifacts: $ARTIFACT_DIR" >&2
  exit 1
fi
echo "smoke passed: $ARTIFACT_DIR"
