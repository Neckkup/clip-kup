#!/usr/bin/env bash
# Normalize loudness for social/chat playback (-16 LUFS) and report loudness per second so missing VO is obvious.
# usage: finalize.sh <in.mp4> <out.mp4>
set -euo pipefail
IN="${1:?in}"; OUT="${2:?out}"
ffmpeg -loglevel error -y -i "$IN" -c:v copy -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 "$OUT"
printf "%s  %s  dur=%ss\n" "$OUT" "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$OUT")" \
  "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")"
echo "loudness per second (LUFS, momentary) — speech should rise above the music bed:"
ffmpeg -hide_banner -i "$OUT" -af "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M" -f null - 2>&1 \
  | grep -oE 'M=[-0-9.inf]+' | cut -d= -f2 | awk 'NR%10==5{printf "%ds:%s  ", (NR-5)/10, $1} END{print ""}'
