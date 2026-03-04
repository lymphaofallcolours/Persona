# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** Test infrastructure + remaining docs

### Completed This Session

- Set up vitest test infrastructure (vitest, @testing-library/react, Playwright, jsdom)
- Unit tests: pipewire (5), presets (8), devices (10), carla (7) — 30 unit tests
- Component tests: PresetPanel (8), DeviceSelector (5) — 13 component tests
- Total: 43 tests, all passing
- Removed legacy `persona.py` and `.claude/rules/persona.py.md`
- Created `.claude/rules/electron.md` with TS migration rules
- Updated `docs/adding-voices.md` for new GUI preset editor workflow
- Updated `docs/testing.md` with TDD workflow and test pyramid
- Configured vitest with React plugin for JSX transform in component tests

### In Progress

- Nothing currently in progress

### Next Steps

1. Add mic monitoring toggle (task #14)
2. Write PresetEditor component test
3. Set up Playwright E2E test scaffold
4. Update `docs/dependencies.md` with all npm dependencies
5. v2: `.carxp` file association per preset
6. v3: Carla OSC integration for plugin parameter control
7. Test the app on actual hardware (`npm run dev`)

---

## Previous Sessions

### 2026-03-04 — Full TypeScript migration (session 2)
- Phase 1-6 of migration plan completed
- Electron + React + Tailwind scaffold with all components
- PipeWire service, preset store, device discovery, Carla lifecycle
- System tray, mini panel, toast notifications
- electron-builder packaging config
- Fixed post-commit hook infinite recursion
- Created GitHub repo (lymphaofallcolours/Persona), pushed all commits

### 2026-03-04 — Documentation system setup (session 1)
- Renamed `doc/` → `docs/`, created 13 docs files
- Created CLAUDE.md, VERSION, git hooks, .claude/rules/persona.py.md
- Created GitHub remote, pushed initial commit
