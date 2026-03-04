# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-03-04
**Goal:** Preset groups, hotbar, per-preset volume, global hotkeys

### Completed This Session

- Preset Groups, Hotbar, Per-Preset Volume, and Global Hotkeys:
  - Schema migration v1→v2: added `groups: PresetGroup[]` to config, `groupId`, `volume`, `hotbarSlot` to Preset
  - Factory presets updated to v2 with `factory-core` group
  - Group CRUD service: `getGroups()`, `createGroup()`, `updateGroup()`, `deleteGroup()`, `reorderGroups()`
  - 5 new group IPC channels + handlers + preload API
  - PresetPanel rewritten: group tabs (All | groups | Ungrouped | +), filtering, move-to-group context menu, pin-to-hotbar
  - New `Hotbar.tsx` component: 7-slot quick-access bar with preset name/color/slot number
  - PresetEditor expanded: group dropdown, hotbar slot selector, volume slider (0%-127%)
  - Per-preset volume applied via OSC `setVolume()` on activation
  - Global hotkeys: Ctrl+1 through Ctrl+7 via Electron `globalShortcut`
  - MiniPanel updated: hotbar presets shown at top
  - New tests: `Hotbar.test.tsx` (5), groups/hotbar/migration tests in `presets.test.ts` (7)
  - Updated PresetPanel and PresetEditor tests for new props
- Preset Export/Import:
  - `PersonaExport` type in `src/types/index.ts`
  - `exportPresets()` and `importPresets()` in `electron/services/presets.ts`
  - IPC channels `PRESET_EXPORT` and `PRESET_IMPORT` with file dialog handlers
  - PresetPanel: Import/Export All toolbar buttons, Export in context menu
  - 5 new tests (export strips fields, groups included, import new IDs, group remap, invalid data)
- Previous: Carla OSC integration (v3) — carlaOsc.ts, ParameterPanel, smart switching
- Total: 102 tests, all passing across 11 test files

### In Progress

- Nothing currently in progress

### Next Steps

1. Replace placeholder PNG icons with user-provided custom PNGs
2. Test packaging: `npm run package` to build .AppImage / .deb
3. Manual testing: full preset workflow with groups, hotbar, volume, hotkeys
4. Session profiles (save/restore full app state)
5. Preset export/import
6. Crossfade toggle between presets
7. Discord overlay integration

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
