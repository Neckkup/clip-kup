#!/usr/bin/env bash
# Create a clip project from the skill template.  usage: new-project.sh <dir>
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:?usage: new-project.sh <dir>}"
[ -e "$DEST" ] && { echo "exists: $DEST" >&2; exit 1; }
mkdir -p "$DEST"
cp -r "$SKILL/assets/template/." "$DEST/"
mkdir -p "$DEST/vo-raw" "$DEST/out"
cd "$DEST"
npm install --no-audit --no-fund
npx tsc -p . && echo "ready: $DEST  (npm run studio | scripts/contact-sheet.sh)"
