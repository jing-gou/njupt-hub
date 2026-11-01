#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NORMALIZER="$DIR/../normalize-json.py"
diff -u \
  <(python3 "$NORMALIZER" "$DIR/normalize-node.json") \
  <(python3 "$NORMALIZER" "$DIR/normalize-java.json")
