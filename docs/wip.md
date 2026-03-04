# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** Test infrastructure, mic monitoring, remaining polish

### Completed This Session

- Unit tests: pipewire (7), presets (8), devices (10), carla (7) — 32 unit tests
- Component tests: PresetPanel (8), PresetEditor (11), DeviceSelector (5) — 24 component tests
- Total: 56 tests, all passing across 7 test files
- Mic monitoring toggle: buildMonitorLinks, IPC handlers, status bar button (TDD)
- Playwright E2E scaffold: config + 2 test files (preset switching, device selection)
- Removed legacy `persona.py` and `.claude/rules/persona.py.md`
- Updated docs: adding-voices.md, testing.md, dependencies.md, wip.md
- Configured vitest with React plugin for JSX transform in component tests

### In Progress

- Nothing currently in progress

### Next Steps

1. v2: `.carxp` file association per preset (load Carla project on switch)
2. Write StatusBar component test
3. Fill out E2E tests (requires built app: `npm run build`)
4. Test the app on actual hardware (`npm run dev`)
5. v3: Carla OSC integration for plugin parameter control

---

## Previous Sessions

### 2026-03-04 — Test infrastructure + legacy cleanup (session 3)
- Set up vitest, @testing-library/react, Playwright
- Wrote first batch of tests (43 passing)
- Removed legacy Python code

### 2026-03-04 — Full TypeScript migration (session 2)
- Phase 1-6 of migration plan completed
- Electron + React + Tailwind scaffold with all components
- All services, IPC, system tray, mini panel

### 2026-03-04 — Documentation system setup (session 1)
- Created CLAUDE.md, docs system, git hooks
- Created GitHub remote, pushed initial commit
