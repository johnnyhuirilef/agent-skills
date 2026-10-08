#!/usr/bin/env bash
# Run the mutation harness over every candidate project in projects/.
# usage: ./runall.sh            (skips projects that already have results/<name>.json)
# Project names follow <label>-<usecase>-<sample>; the use case is the second-to-last dash field.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p results
for dir in projects/*/; do
  [ -d "$dir" ] || continue
  p="$(basename "$dir")"
  uc="$(echo "$p" | awk -F- '{print $(NF-1)}')"
  [ -f "results/$p.json" ] && continue
  n=$(find "$dir/tests" -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = "0" ] && { echo "SKIP $p (no spec files)"; continue; }
  python3 -I harness.py run "projects/$p" "$uc" "results/$p.json" 2>&1 | tail -1
done
echo ALLDONE
