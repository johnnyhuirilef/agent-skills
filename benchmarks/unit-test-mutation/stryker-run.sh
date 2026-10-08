#!/usr/bin/env bash
# Run Stryker on one candidate project with the shared stryker.config.mjs.
# usage: ./stryker-run.sh <project_dir> <usecase> [out_dir]
#   <project_dir>  a project made by new-project.sh (its node_modules links to base/node_modules)
#   <usecase>      auth | billing | transfer; only src/<usecase>/ is mutated
#   [out_dir]      where the JSON report goes (default results/stryker); file name is <project>.json
# Stryker runs the project's own tests (vitest.config.ts includes tests/**/*.spec.ts only).
# The clear-text summary goes to stdout.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
project="${1:?usage: $0 <project_dir> <usecase> [out_dir]}"
usecase="${2:?usage: $0 <project_dir> <usecase> [out_dir]}"
out_dir="${3:-$here/results/stryker}"
case "$usecase" in auth|billing|transfer) ;; *) echo "unknown use case: $usecase" >&2; exit 1 ;; esac
[ -d "$project/src/$usecase" ] || { echo "not a candidate project: $project" >&2; exit 1; }
[ -e "$project/node_modules/.bin/stryker" ] || { echo "stryker not installed; run 'npm ci' in base/" >&2; exit 1; }
mkdir -p "$out_dir"
project_abs="$(cd "$project" && pwd)"
out_abs="$(cd "$out_dir" && pwd)/$(basename "$project_abs").json"
cd "$project_abs"
STRYKER_USECASE="$usecase" STRYKER_JSON_OUT="$out_abs" \
  ./node_modules/.bin/stryker run "$here/stryker.config.mjs"
echo "report: $out_abs"
