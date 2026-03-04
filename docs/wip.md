# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** `.carxp` integration, polish, branding

### Completed This Session

- `.carxp` file association per preset (v2 feature):
  - Native file dialog IPC for browsing `.carxp` files
  - File picker UI in PresetEditor (browse, change, clear)
  - Carla restart logic when switching to preset with different `.carxp`
- StatusBar component test (8 tests)
- App icon (SVG) for window and system tray
- README with setup instructions and feature overview
- MIT LICENSE file
- Total: 68 tests, all passing across 8 test files
- Version: 0.5.0

### In Progress

- Nothing currently in progress

### Next Steps

1. Generate PNG icons from SVG (need `librsvg2-bin` or `imagemagick`) for electron-builder packaging
2. Test packaging: `npm run package` to build .AppImage / .deb
3. v3: Carla OSC integration for plugin parameter control (future)
4. Hotkey support (future)

---

## Previous Sessions

### 2026-03-04 — Test infrastructure + mic monitoring (session 3-4)
- 56 tests, mic monitoring toggle, Playwright E2E scaffold, legacy cleanup

### 2026-03-04 — Full TypeScript migration (session 2)
- Phase 1-6 completed: Electron + React + Tailwind + all features

### 2026-03-04 — Documentation system setup (session 1)
- CLAUDE.md, docs system, git hooks, GitHub remote
