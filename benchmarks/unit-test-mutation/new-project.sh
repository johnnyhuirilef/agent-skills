#!/usr/bin/env bash
# Create a candidate project from base/ for one generation run.
# usage: ./new-project.sh <name>
#   <name> should be <label>-<usecase>-<sample>, e.g. v4-auth-1 (usecase: auth | billing | transfer),
#   so runall.sh can derive the use case from it.
# The project lands in projects/<name>/ with a copy of src/ and config and a symlink to base/node_modules.
set -euo pipefail
cd "$(dirname "$0")"
name="${1:?usage: $0 <label>-<usecase>-<sample>}"
dest="projects/$name"
[ -e "$dest" ] && { echo "already exists: $dest" >&2; exit 1; }
[ -d base/node_modules ] || { echo "run 'npm ci' in base/ first" >&2; exit 1; }
mkdir -p "$dest/tests/support"
cp -R base/src "$dest/src"
cp base/package.json base/tsconfig.json base/vitest.config.ts "$dest/"
ln -s ../../base/node_modules "$dest/node_modules"
echo "$dest"
