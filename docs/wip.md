# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** `.carxp` file association, continued polish

### Completed This Session

- `.carxp` file association per preset (v2 feature):
  - Native file dialog IPC for browsing `.carxp` files
  - File picker UI in PresetEditor (browse, change, clear)
  - Carla restart logic when switching to preset with different `.carxp`
  - 4 new component tests for file picker
- Total: 60 tests, all passing across 7 test files
- Version bumped to 0.4.0

### In Progress

- Nothing currently in progress

### Next Steps

1. Write StatusBar component test
2. Update `docs/architecture.md` with `.carxp` data flow
3. v3: Carla OSC integration for plugin parameter control (future)
4. App icon / branding
5. README with setup instructions

---

## Previous Sessions

### 2026-03-04 — Test infrastructure + mic monitoring (session 3-4)
- 56 tests across 7 files (unit + component)
- Mic monitoring toggle (buildMonitorLinks, IPC, status bar button)
- Playwright E2E scaffold
- Removed legacy Python code, updated docs

### 2026-03-04 — Full TypeScript migration (session 2)
- Phase 1-6 of migration plan completed
- Electron + React + Tailwind scaffold with all components

### 2026-03-04 — Documentation system setup (session 1)
- Created CLAUDE.md, docs system, git hooks
- Created GitHub remote, pushed initial commit
