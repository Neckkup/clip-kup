#!/usr/bin/env bash
# Parallel render: split frames into chunks, one Remotion process (= its own Chrome + GPU process) per chunk.
# One Remotion process scales badly with --concurrency because all tabs share ONE SwiftShader GPU process
# (measured on 48 cores: 1 process x24 tabs = 684s, 16 processes x2 tabs = 173s for a 24s clip).
# usage (inside the project): render-chunks.sh <composition> <out.mp4> [procs=16] [tabs-per-proc=2]
set -euo pipefail
COMP="${1:?comp}"; OUT="${2:?out}"; P="${3:-16}"; C="${4:-2}"
mkdir -p "$(dirname "$OUT")" out
B=out/bundle
npx remotion bundle src/index.ts --out-dir="$B" --log=error >/dev/null   # bundle once, every chunk reuses it
N=$(npx remotion compositions "$B" 2>&1 | awk -v c="$COMP" '$1==c{print $4}')
[ -n "$N" ] || { echo "composition not found: $COMP" >&2; exit 1; }
D=$(mktemp -d out/chunks.XXXX); s=$(date +%s); pids=()
for i in $(seq 0 $((P-1))); do
  a=$(( i*N/P )); b=$(( (i+1)*N/P - 1 ))
  npx remotion render "$B" "$COMP" "$D/c$(printf %03d "$i").mp4" --gl=swangle --concurrency="$C" --timeout=120000 --frames="$a-$b" --muted --log=error & pids+=($!)
done
npx remotion render "$B" "$COMP" "$D/audio.wav" --codec=wav --log=error & pids+=($!)
for p in "${pids[@]}"; do wait "$p" || { echo "a chunk failed" >&2; exit 1; }; done
for f in "$D"/c*.mp4; do echo "file '$(basename "$f")'"; done > "$D/list.txt"
ffmpeg -nostdin -loglevel error -y -f concat -safe 0 -i "$D/list.txt" -i "$D/audio.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$OUT"
GOT=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$OUT")
rm -rf "$D"
[ "$GOT" = "$N" ] || { echo "frame count mismatch: got $GOT want $N" >&2; exit 1; }
echo "$OUT  frames=$N  procs=$P x tabs=$C  render=$(( $(date +%s)-s ))s"
