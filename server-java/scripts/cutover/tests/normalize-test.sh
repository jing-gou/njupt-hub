#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NORMALIZER="$DIR/../normalize-json.jq"
diff -u \
  <(jq -S -f "$NORMALIZER" "$DIR/normalize-node.json") \
  <(jq -S -f "$NORMALIZER" "$DIR/normalize-java.json")
