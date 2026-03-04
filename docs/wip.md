# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** Simplify presets to one .carxp per preset, bug fixes

### Completed This Session

- Bug fixes (v0.9.4–v0.10.0):
  - Removed `--no-gui` (crashes Flatpak Carla), replaced with xdotool minimize
  - Snapshot-based plugin detection (baseline diff instead of blacklist)
  - Fixed OSC timing (wait for actual plugins, not just isRunning)
  - Three-mode Carla window control: Visible / Minimized / No GUI
  - Focus-steal prevention: refocusPersona() via xdotool after Carla launch

- **Major refactor: one .carxp per preset** (v0.11.0):
  - Removed `plugins: string[]` and `parameterSnapshots` from Preset type
  - Each preset now just points to a .carxp file; Carla handles all internal plugin routing
  - New `carxp.ts`: parses .carxp XML to extract first/last plugin names for PipeWire routing
  - Simplified `pipewire.ts`: endpoint-based routing (mic→first_plugin, last_plugin→output)
  - Simplified `handlers.ts`: activatePreset uses carxp parsing instead of plugin arrays
  - Removed ParameterPanel component (Carla manages params via .carxp)
  - Simplified PresetEditor: removed plugin chain UI, kept carxp file browser
  - PresetPanel: shows .carxp filename instead of plugin count
  - Factory presets stripped to Off only; v2→v3 migration strips plugins from existing configs
  - Removed PLUGINS_GET_AVAILABLE, OSC snapshot channels
  - Total: 117 tests passing across 11 test files

### In Progress

- Nothing currently in progress

### Next Steps

1. Manual testing: create .carxp in Carla GUI, assign to preset, verify routing works
2. Replace placeholder PNG icons with user-provided custom PNGs
3. Crossfade toggle between presets (needs research)
4. Discord overlay integration (research needed)
5. Stream Deck / macro pad support (future)

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
