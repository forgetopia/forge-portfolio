#!/usr/bin/env bash
set -euo pipefail

# Optional authoring helper. The committed MP4s require no FFmpeg at build time.
# Requires FFmpeg with libx264/drawtext and a local sans-serif TrueType font.
# Set FORGE_PLACEHOLDER_FONT to override the supported system font paths below.
command -v ffmpeg >/dev/null || { printf '%s\n' 'FFmpeg is required.' >&2; exit 1; }
script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
output_directory="${script_directory}/../public/media"
font_file="${FORGE_PLACEHOLDER_FONT:-}"
if [[ -z "${font_file}" ]]; then
  for candidate in \
    /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf \
    /usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf \
    /usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf; do
    if [[ -f "${candidate}" ]]; then font_file="${candidate}"; break; fi
  done
fi
if [[ -z "${font_file}" || ! -f "${font_file}" ]]; then
  printf '%s\n' 'Set FORGE_PLACEHOLDER_FONT to a local sans-serif TrueType font.' >&2
  exit 1
fi

mkdir -p -- "${output_directory}"
generate_clip() {
  local orientation="$1" dimensions="$2" title_size="$3" subtitle_size="$4"
  local filters="drawgrid=width=iw/8:height=ih/8:thickness=1:color=0xECE9E0@0.05"
  filters+=",drawbox=x=32:y=32:w=iw-64:h=ih-64:color=0xB2A083@0.22:t=1"
  filters+=",drawtext=fontfile='${font_file}':text='PLACEHOLDER CLIP':fontcolor=0xECE9E0:fontsize=${title_size}:x=(w-text_w)/2:y=(h-text_h)/2-28"
  filters+=",drawtext=fontfile='${font_file}':text='NO ORIGINAL FOOTAGE':fontcolor=0xB2A083:fontsize=${subtitle_size}:x=(w-text_w)/2:y=(h-text_h)/2+32"
  filters+=",drawbox=x=64:y=ih-90:w=iw-128:h=1:color=0xB2A083@0.25:t=fill"
  filters+=",drawtext=fontfile='${font_file}':text='||||||||':fontcolor=0xB2A083:fontsize=14:x=64+(w-128-text_w)*t/5:y=h-99"
  ffmpeg -hide_banner -loglevel warning -nostdin -y \
    -f lavfi -i "color=c=0x1C1D1B:s=${dimensions}:r=20:d=5" \
    -vf "${filters}" -an -c:v libx264 -preset slow -crf 27 \
    -pix_fmt yuv420p -movflags +faststart -map_metadata -1 \
    "${output_directory}/placeholder-${orientation}.mp4"
}

generate_clip landscape 1280x800 42 23
generate_clip portrait 640x896 28 18
