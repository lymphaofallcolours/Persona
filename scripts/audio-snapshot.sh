#!/usr/bin/env bash
# audio-snapshot.sh — capture the complete audio configuration state of this machine
# so it can be restored exactly with scripts/audio-restore.sh.
#
# Usage:
#   bash scripts/audio-snapshot.sh [label]
#
# Snapshots are stored under ~/.local/share/persona/audio-snapshots/<timestamp>[-label]/
# A "latest" symlink always points at the most recent snapshot.
#
# What is captured (and restored exactly):
#   ~/.config/pipewire/           PipeWire user config overrides
#   ~/.config/wireplumber/        WirePlumber user config overrides
#   ~/.local/state/wireplumber/   WirePlumber state: per-app routing memory,
#                                 default devices, volumes (the usual culprit
#                                 when "Discord suddenly routes wrong")
#   ~/.config/pulse/              PulseAudio-compat client config
#   ~/.config/persona/presets.json  Persona presets
#   systemd --user enablement of the audio stack units
#
# What is captured for diagnostics only (not restored):
#   pw-dump graph, pw-link listings, pactl summaries, package versions

set -euo pipefail

SNAP_ROOT="${HOME}/.local/share/persona/audio-snapshots"
STAMP="$(date +%Y%m%d-%H%M%S)"
LABEL="${1:-}"
SNAP_DIR="${SNAP_ROOT}/${STAMP}${LABEL:+-${LABEL}}"

# Directories restored exactly (relative to $HOME). Keep in sync with audio-restore.sh.
CONFIG_DIRS=(
  ".config/pipewire"
  ".config/wireplumber"
  ".config/pulse"
  ".local/state/wireplumber"
)

# systemd --user units whose enablement state is recorded and re-applied.
AUDIO_UNITS=(
  pipewire.service
  pipewire.socket
  pipewire-pulse.service
  pipewire-pulse.socket
  wireplumber.service
  filter-chain.service
  pipewire-media-session.service
)

mkdir -p "${SNAP_DIR}/config" "${SNAP_DIR}/diagnostics"

# --- Config directories (exact copies + presence manifest) ---
MANIFEST="${SNAP_DIR}/manifest.txt"
: > "${MANIFEST}"
for rel in "${CONFIG_DIRS[@]}"; do
  src="${HOME}/${rel}"
  if [ -d "${src}" ]; then
    mkdir -p "${SNAP_DIR}/config/$(dirname "${rel}")"
    cp -a "${src}" "${SNAP_DIR}/config/${rel}"
    echo "present ${rel}" >> "${MANIFEST}"
  else
    echo "absent ${rel}" >> "${MANIFEST}"
  fi
done

# --- Persona presets (single file, not the Electron cache around it) ---
if [ -f "${HOME}/.config/persona/presets.json" ]; then
  mkdir -p "${SNAP_DIR}/config/.config/persona"
  cp -a "${HOME}/.config/persona/presets.json" "${SNAP_DIR}/config/.config/persona/presets.json"
  echo "present-file .config/persona/presets.json" >> "${MANIFEST}"
else
  echo "absent-file .config/persona/presets.json" >> "${MANIFEST}"
fi

# --- systemd --user enablement states ---
UNITS_FILE="${SNAP_DIR}/systemd-units.txt"
: > "${UNITS_FILE}"
for unit in "${AUDIO_UNITS[@]}"; do
  state="$(systemctl --user is-enabled "${unit}" 2>/dev/null || true)"
  [ -n "${state}" ] && echo "${unit} ${state}" >> "${UNITS_FILE}"
done

# --- Diagnostics (comparison/debugging only; never restored) ---
pw-dump > "${SNAP_DIR}/diagnostics/pw-dump.json" 2>&1 || true
pw-link -l > "${SNAP_DIR}/diagnostics/pw-link-l.txt" 2>&1 || true
pw-link -o > "${SNAP_DIR}/diagnostics/pw-link-o.txt" 2>&1 || true
pw-link -i > "${SNAP_DIR}/diagnostics/pw-link-i.txt" 2>&1 || true
pactl info > "${SNAP_DIR}/diagnostics/pactl-info.txt" 2>&1 || true
pactl list short modules > "${SNAP_DIR}/diagnostics/pactl-modules.txt" 2>&1 || true
pactl list short sinks > "${SNAP_DIR}/diagnostics/pactl-sinks.txt" 2>&1 || true
pactl list short sources > "${SNAP_DIR}/diagnostics/pactl-sources.txt" 2>&1 || true
systemctl --user list-units --all 2>/dev/null | grep -Ei 'pipewire|wireplumber|pulse|filter-chain' \
  > "${SNAP_DIR}/diagnostics/systemd-audio-units.txt" || true
dpkg-query -W 'pipewire*' 'wireplumber*' 'libspa*' 'pulseaudio*' 2>/dev/null \
  > "${SNAP_DIR}/diagnostics/packages.txt" || true
cp /etc/os-release "${SNAP_DIR}/diagnostics/os-release.txt" 2>/dev/null || true

# --- latest symlink ---
ln -sfn "${SNAP_DIR}" "${SNAP_ROOT}/latest"

echo "Snapshot saved: ${SNAP_DIR}"
echo
echo "Captured:"
sed 's/^/  /' "${MANIFEST}"
echo
echo "Restore with:  bash scripts/audio-restore.sh latest"
echo "List all:      bash scripts/audio-restore.sh"
