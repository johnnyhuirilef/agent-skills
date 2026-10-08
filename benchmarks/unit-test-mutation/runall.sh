#!/usr/bin/env bash
# Run the mutation harness over every candidate project in projects/.
# usage: ./runall.sh [mutants-file]
#   mutants-file defaults to mutants.json (results/<name>.json);
#   any other file writes to results/<file-stem>/<name>.json, e.g. ./runall.sh mutants-hard.json.
# Projects that already have a result file are skipped.
# Project names follow <label>-<usecase>-<sample>; the use case is the second-to-last dash field.
set -uo pipefail
cd "$(dirname "$0")"
mutants="${1:-mutants.json}"
[ -f "$mutants" ] || { echo "mutants file not found: $mutants" >&2; exit 1; }
if [ "$(basename "$mutants")" = "mutants.json" ]; then
  out="results"
else
  out="results/$(basename "$mutants" .json)"
fi
mkdir -p "$out"
for dir in projects/*/; do
  [ -d "$dir" ] || continue
  p="$(basename "$dir")"
  uc="$(echo "$p" | awk -F- '{print $(NF-1)}')"
  [ -f "$out/$p.json" ] && continue
  n=$(find "$dir/tests" -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = "0" ] && { echo "SKIP $p (no spec files)"; continue; }
  python3 -I harness.py run "projects/$p" "$uc" "$out/$p.json" --mutants "$mutants" 2>&1 | tail -1
done
echo ALLDONE
