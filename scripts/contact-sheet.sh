#!/usr/bin/env bash
# Render stills of a composition at given frames and tile them into one image to review before a full render.
# usage: contact-sheet.sh <composition> <scale> <frame> [frame...]     (run inside the project)
set -euo pipefail
COMP="${1:?comp}"; SCALE="${2:?scale e.g. 0.35}"; shift 2
mkdir -p out/sheet && rm -f out/sheet/${COMP}_*.png
for f in "$@"; do
  npx remotion still src/index.ts "$COMP" "out/sheet/${COMP}_$(printf %04d "$f").png" --frame="$f" --gl=swangle --scale="$SCALE" --log=error
done
N=$#; COLS=$(( N < 4 ? N : 4 )); ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -loglevel error -y -pattern_type glob -i "out/sheet/${COMP}_*.png" -vf "tile=${COLS}x${ROWS}" -frames:v 1 "out/sheet-${COMP}.jpg"
echo "out/sheet-${COMP}.jpg"
