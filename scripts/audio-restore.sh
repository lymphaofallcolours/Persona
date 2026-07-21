#!/usr/bin/env bash
# audio-restore.sh — restore the audio configuration exactly as captured by
# scripts/audio-snapshot.sh, then restart the PipeWire stack.
#
# Usage:
#   bash scripts/audio-restore.sh                    # list available snapshots
#   bash scripts/audio-restore.sh latest             # restore most recent snapshot
#   bash scripts/audio-restore.sh 20260721-140000    # restore a specific snapshot
#   bash scripts/audio-restore.sh latest --dry-run   # show what would happen
#   bash scripts/audio-restore.sh latest --yes       # skip confirmation prompt
#
# Restoring:
#   1. Stops the PipeWire stack (pipewire, pipewire-pulse, wireplumber, filter-chain)
#   2. Restores config/state dirs EXACTLY (files added since the snapshot are deleted)
#   3. Re-applies systemd --user unit enablement recorded in the snapshot
#   4. Restarts the PipeWire stack
#
# Close audio applications (Discord, Carla, browsers) first — they will lose
# their audio streams during the restart and may need to be restarted.

set -euo pipefail

SNAP_ROOT="${HOME}/.local/share/persona/audio-snapshots"

if [ $# -eq 0 ]; then
  echo "Available snapshots in ${SNAP_ROOT}:"
  if [ -d "${SNAP_ROOT}" ]; then
    ls -1 "${SNAP_ROOT}" | grep -v '^latest$' | sed 's/^/  /'
    [ -L "${SNAP_ROOT}/latest" ] && echo "  latest -> $(basename "$(readlink "${SNAP_ROOT}/latest")")"
  else
    echo "  (none — run scripts/audio-snapshot.sh first)"
  fi
  exit 0
fi

SNAP_NAME="$1"; shift
DRY_RUN=false
ASSUME_YES=false
for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=true ;;
    --yes) ASSUME_YES=true ;;
    *) echo "Unknown option: ${arg}" >&2; exit 1 ;;
  esac
done

SNAP_DIR="${SNAP_ROOT}/${SNAP_NAME}"
[ -L "${SNAP_DIR}" ] && SNAP_DIR="$(readlink -f "${SNAP_DIR}")"
if [ ! -f "${SNAP_DIR}/manifest.txt" ]; then
  echo "Not a valid snapshot: ${SNAP_DIR}" >&2
  exit 1
fi

echo "Restoring snapshot: ${SNAP_DIR}"
echo

run() {
  if ${DRY_RUN}; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

if ! ${DRY_RUN} && ! ${ASSUME_YES}; then
  echo "This will overwrite current audio config/state and restart PipeWire."
  echo "Close Discord/Carla/browsers first, or their audio will drop."
  read -r -p "Continue? [y/N] " answer
  case "${answer}" in [yY]*) ;; *) echo "Aborted."; exit 1 ;; esac
  echo
fi

# --- 1. Stop the audio stack ---
echo "--- Stopping PipeWire stack"
run systemctl --user stop filter-chain.service 2>/dev/null || true
run systemctl --user stop wireplumber.service pipewire-pulse.socket pipewire-pulse.service pipewire.socket pipewire.service

# --- 2. Restore config/state directories exactly ---
echo "--- Restoring config and state files"
while read -r kind rel; do
  target="${HOME}/${rel}"
  case "${kind}" in
    present)
      run mkdir -p "$(dirname "${target}")"
      # rsync --delete makes the target IDENTICAL to the snapshot,
      # removing any files created after the snapshot was taken.
      run rsync -a --delete "${SNAP_DIR}/config/${rel}/" "${target}/"
      echo "  restored ${rel}"
      ;;
    absent)
      if [ -d "${target}" ]; then
        run rm -rf "${target}"
        echo "  removed  ${rel} (did not exist at snapshot time)"
      fi
      ;;
    present-file)
      run mkdir -p "$(dirname "${target}")"
      run cp -a "${SNAP_DIR}/config/${rel}" "${target}"
      echo "  restored ${rel}"
      ;;
    absent-file)
      if [ -f "${target}" ]; then
        run rm -f "${target}"
        echo "  removed  ${rel} (did not exist at snapshot time)"
      fi
      ;;
  esac
done < "${SNAP_DIR}/manifest.txt"

# --- 3. Re-apply systemd unit enablement ---
echo "--- Re-applying systemd unit enablement"
if [ -f "${SNAP_DIR}/systemd-units.txt" ]; then
  while read -r unit state; do
    current="$(systemctl --user is-enabled "${unit}" 2>/dev/null || true)"
    [ "${current}" = "${state}" ] && continue
    case "${state}" in
      enabled)  run systemctl --user unmask "${unit}" 2>/dev/null || true
                run systemctl --user enable "${unit}"; echo "  enabled  ${unit}" ;;
      disabled) run systemctl --user unmask "${unit}" 2>/dev/null || true
                run systemctl --user disable "${unit}"; echo "  disabled ${unit}" ;;
      masked)   run systemctl --user mask "${unit}"; echo "  masked   ${unit}" ;;
      *) echo "  skipping ${unit} (state '${state}' not re-applied)" ;;
    esac
  done < "${SNAP_DIR}/systemd-units.txt"
fi
run systemctl --user daemon-reload

# --- 4. Restart the audio stack ---
echo "--- Restarting PipeWire stack"
run systemctl --user start pipewire.socket pipewire.service wireplumber.service pipewire-pulse.socket pipewire-pulse.service
if grep -q '^filter-chain.service enabled' "${SNAP_DIR}/systemd-units.txt" 2>/dev/null; then
  run systemctl --user start filter-chain.service
fi

# --- 5. Verify ---
if ! ${DRY_RUN}; then
  sleep 2
  if pw-cli info 0 >/dev/null 2>&1; then
    echo
    echo "PipeWire is up. Restore complete."
    echo "Restart audio applications (Discord, Carla) to reconnect their streams."
  else
    echo
    echo "WARNING: PipeWire did not respond after restart." >&2
    echo "Try: systemctl --user status pipewire.service wireplumber.service" >&2
    exit 1
  fi
else
  echo
  echo "[dry-run] No changes were made."
fi
