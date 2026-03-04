# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** Carla OSC integration (v3)

### Completed This Session

- Carla OSC integration (v3 feature):
  - `node-osc` dependency (v11.2.2)
  - `electron/services/carlaOsc.ts` — OSC client service (connect, disconnect, setParameterValue, setPluginActive, setDryWet, setVolume)
  - `electron/services/carlaOsc.test.ts` — 10 unit tests
  - Updated `carla.ts` to set `CARLA_OSC_UDP_PORT` env var on Carla spawn
  - OSC IPC channels in `channels.ts` (9 new channels)
  - OSC handlers in `handlers.ts` (connect, disconnect, set parameter, set active, set drywet, set volume, snapshot restore)
  - OSC API exposed in `preload.ts`
  - `ParameterSnapshot`, `PluginInfo`, `ParameterInfo` types in `src/types/index.ts`
  - `oscConnected` added to `AppStatus`
  - Smart preset switching: skip Carla restart when same `.carxp`, apply parameter snapshots via OSC
  - `ParameterPanel.tsx` — parameter slider UI with accordion plugins, real-time OSC control, save-to-preset
  - `ParameterPanel.test.tsx` — 7 component tests
  - Wired ParameterPanel into `App.tsx`
  - Updated `docs/dependencies.md` with node-osc entry
  - Updated `docs/decisions-log.md` with OSC ADR
- Total: 85 tests, all passing across 10 test files

### In Progress

- Nothing currently in progress

### Next Steps

1. Replace placeholder PNG icons with user-provided custom PNGs
2. Test packaging: `npm run package` to build .AppImage / .deb
3. Manual testing: Carla OSC connection, parameter control, snapshot save/restore
4. Hotkey support (future)

---

## Previous Sessions

### 2026-03-04 — .carxp integration, polish, branding (session 5)
- `.carxp` file association, StatusBar test, README, GPL-3.0, SVG icon, packaging (.AppImage + .deb)

### 2026-03-04 — Test infrastructure + mic monitoring (session 3-4)
- 56 tests, mic monitoring toggle, Playwright E2E scaffold, legacy cleanup

### 2026-03-04 — Full TypeScript migration (session 2)
- Phase 1-6 completed: Electron + React + Tailwind + all features

### 2026-03-04 — Documentation system setup (session 1)
- CLAUDE.md, docs system, git hooks, GitHub remote
