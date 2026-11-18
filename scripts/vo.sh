#!/usr/bin/env bash
# Trim leading/trailing silence from a TTS file, optionally speed it up, and PROVE it is audible end to end.
# usage: vo.sh <in.wav> <out.wav> [tempo=1.0]
# Never add afade/other filters here without re-running the check: a stray afade once silenced every line.
set -euo pipefail
IN="${1:?in}"; OUT="${2:?out}"; TEMPO="${3:-1.0}"
AF="silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
[ "$TEMPO" != "1.0" ] && AF="$AF,atempo=$TEMPO"
ffmpeg -loglevel error -y -i "$IN" -af "$AF" -ar 48000 "$OUT"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" 2>/dev/null || true)
if ! awk -v d="$DUR" 'BEGIN{exit !(d+0 >= 0.3)}'; then
  echo "FAIL: $OUT is empty/near-silent after trimming (dur=${DUR:-none}) — the source or the filter chain has no audible speech" >&2; exit 2
fi
# momentary loudness every 0.1s; count windows quieter than -50 LUFS after the first 0.4s
read -r QUIET TOTAL < <(ffmpeg -hide_banner -i "$OUT" -af "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M" -f null - 2>&1 \
  | grep -oE 'M=[-0-9.inf]+' | cut -d= -f2 | awk 'NR>4{n++; if($1=="-inf"||$1<-50)q++} END{print q+0, n+0}')
printf "%s  dur=%.2fs  quiet_windows=%s/%s\n" "$OUT" "$DUR" "$QUIET" "$TOTAL"
if [ "$TOTAL" -gt 0 ] && [ $((QUIET * 100 / TOTAL)) -gt 30 ]; then
  echo "FAIL: more than 30% of $OUT is silent — check the filter chain" >&2; exit 2
fi
