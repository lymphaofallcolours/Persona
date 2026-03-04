# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** Fix Carla+PipeWire integration and Persona routing

### Completed This Session

- **Fix Carla+PipeWire integration** (post-.carxp refactor):
  - `carla.ts`: async `stop()` with wait-for-death loop + force kill fallback
  - `carla.ts`: JACK env vars (`JACK_NO_START_SERVER`, `PIPEWIRE_LATENCY`) in Flatpak args and spawn env
  - `carla.ts`: stricter `isRunning()` using `[c]arla` pattern to avoid grep self-match
  - `devices.ts`: `waitForCarlaPort()` — polls for ANY new PipeWire port after Carla launch (15s timeout)
  - `devices.ts`: `discoverCarlaRoutingPorts()` — dynamically discovers Carla's input/output port pairs
  - `devices.ts`: `snapshotBaseline()` now captures both input and output nodes
  - `pipewire.ts`: `buildPresetLinks()` now accepts full port paths (carlaIn/carlaOut) instead of plugin name endpoints
  - `carxp.ts`: `validateCarxp()` checks for plugins and internal `<Patchbay>` section
  - `handlers.ts`: activatePreset rewritten — dynamic port discovery from PipeWire instead of .carxp parsing
  - `handlers.ts`: warns user if .carxp has no internal patchbay (plugins won't be wired together)
  - All tests updated: 128 tests passing across 11 test files

### In Progress

- Nothing currently in progress

### Next Steps

1. **Manual testing:** kill stale Carla, run `npm run dev`, activate preset with .carxp, verify `pw-link -o | grep -i carla` shows ports
2. If Carla still has no PipeWire ports: user needs to set Audio Driver = JACK in Carla's settings GUI
3. Replace placeholder PNG icons with user-provided custom PNGs
4. Crossfade toggle between presets (needs research)
5. Discord overlay integration (research needed)
6. Stream Deck / macro pad support (future)

---

## Previous Sessions

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
