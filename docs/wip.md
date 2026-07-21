# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-07-21
**Goal:** Audio state safety net before resuming development (post Zorin 18.0→18.1 Discord breakage)

### Completed This Session

- **Audio snapshot/restore safety net** (see ADR 2026-07-21):
  - `scripts/audio-snapshot.sh` — captures PipeWire/WirePlumber config + state, pulse config, persona presets, systemd unit enablement, plus diagnostics (pw-dump, pw-link, pactl, package versions)
  - `scripts/audio-restore.sh` — one-command exact restore (rsync --delete + absence manifest), `--dry-run`/`--yes` flags, restarts PipeWire stack, verified via dry run
  - Baseline snapshot taken: `20260721-130709-known-good-zorin18.1` (~350K)
  - `docs/audio-recovery.md` — what persists vs. what's ephemeral, snapshot discipline, "Discord hears me double" diagnosis checklist
  - System audit: custom config dirs from March are empty (harmless); `filter-chain.service` enabled but inert (stock config, no filters); current node graph verified clean

### In Progress

- Nothing currently in progress

### Next Steps

1. **Snapshot discipline:** run `bash scripts/audio-snapshot.sh <label>` before any experiment touching PipeWire config, pactl modules, or audio services
2. **Manual testing:** kill stale Carla, run `npm run dev`, activate preset with .carxp, verify `pw-link -o | grep -i carla` shows ports
3. If Carla still has no PipeWire ports: user needs to set Audio Driver = JACK in Carla's settings GUI
4. Replace placeholder PNG icons with user-provided custom PNGs
5. Crossfade toggle between presets (needs research)
6. Discord overlay integration (research needed)
7. Stream Deck / macro pad support (future)

---

## Previous Sessions

### 2026-03-04 — Carla+PipeWire integration fixes (session 7)
- Dynamic port discovery, async Carla stop, JACK env vars, 128 tests passing

### 2026-03-04 — Carla OSC integration (session 6)
- node-osc, carlaOsc.ts, ParameterPanel, smart preset switching, 85 tests

### 2026-03-04 — .carxp integration, polish, branding (session 5)
- `.carxp` file association, StatusBar test, README, GPL-3.0, SVG icon, packaging (.AppImage + .deb)

### 2026-03-04 — Test infrastructure + mic monitoring (session 3-4)
- 56 tests, mic monitoring toggle, Playwright E2E scaffold, legacy cleanup

### 2026-03-04 — Full TypeScript migration (session 2)
- Phase 1-6 completed: Electron + React + Tailwind + all features

### 2026-03-04 — Documentation system setup (session 1)
- CLAUDE.md, docs system, git hooks, GitHub remote
