#!/usr/bin/env bash
# Generate a per-match title-race snapshot for every prefix of data/results.json.
# For k = 0..N played matches, re-simulate conditioned on the first k results and
# write a compact snapshot data/snapshots/history/<k>-matches.json holding each
# team's title-win probability at that point. This is what the web "Title race"
# chart reads (one point per game).
#
# Usage: scripts/gen_history.sh [results.json] [seed] [iterations]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS="${1:-$ROOT/data/results.json}"
SEED="${2:-2026}"
ITER="${3:-100000}"
BIN="$ROOT/target/release/wcsim"
OUT="$ROOT/data/snapshots/history"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

[ -x "$BIN" ] || { echo "build first: cargo build --release" >&2; exit 1; }
mkdir -p "$OUT"

N="$(jq '.matches | length' "$RESULTS")"
echo "results: $RESULTS  played: $N  seed: $SEED  iter: $ITER"

for k in $(seq 0 "$N"); do
  partial="$TMP/partial.json"
  jq ".matches |= .[0:$k]" "$RESULTS" > "$partial"
  fname="$OUT/$(printf '%03d' "$k")-matches.json"
  "$BIN" -n "$ITER" -s "$SEED" --results "$partial" -o json \
    | jq -c '{fixed_matches, results_updated, teams: [.teams[] | {code, win}]}' \
    > "$fname"
  echo "  wrote $(basename "$fname")"
done

echo "done: $((N + 1)) per-match snapshots in $OUT"
