#!/usr/bin/env bash
# Full render + finalize. Local by default; set CLIP_KUP_HOST=user@host to render on the render VM.
# usage: render.sh <composition> [concurrency]      (run inside the project)
#   local:  nice -n 19 so the dev machine stays usable
#   remote: rsync project (no node_modules/out) -> npm ci if needed -> render -> pull mp4 back
set -euo pipefail
COMP="${1:?comp}"; CONC="${2:-}"
NAME="$(basename "$PWD")"
mkdir -p out/final
if [ -z "${CLIP_KUP_HOST:-}" ]; then
  CONC="${CONC:-$(( $(nproc) / 2 ))}"
  nice -n 19 npx remotion render src/index.ts "$COMP" "out/final/raw_$COMP.mp4" --gl=swangle --concurrency="$CONC" --log=error
else
  CONC="${CONC:-36}"
  ssh "$CLIP_KUP_HOST" "mkdir -p ~/clips/$NAME"
  rsync -az --delete --exclude node_modules --exclude out "$PWD/" "$CLIP_KUP_HOST:~/clips/$NAME/"
  ssh "$CLIP_KUP_HOST" "cd ~/clips/$NAME && { [ -d node_modules ] && cmp -s package.json .pkg.last || { npm install --no-audit --no-fund && cp package.json .pkg.last; }; } \
    && mkdir -p out/final && npx remotion render src/index.ts $COMP out/final/raw_$COMP.mp4 --gl=swangle --concurrency=$CONC --log=error"
  rsync -az "$CLIP_KUP_HOST:~/clips/$NAME/out/final/raw_$COMP.mp4" out/final/
fi
"$(dirname "$0")/finalize.sh" "out/final/raw_$COMP.mp4" "out/final/$NAME-$COMP.mp4"
rm -f "out/final/raw_$COMP.mp4"
