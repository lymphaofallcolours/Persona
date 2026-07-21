# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-07-21 (branch `feat/onboarding-doctor`)
**Goal:** Zero-config onboarding — setup doctor + voice archetype generator

### Completed This Session

- **Setup doctor** (`setup.ts` + `SetupDoctor.tsx`, ADR 2026-07-21): six checks with
  one-click user-scope fixes (Flathub remote, Carla install, plugin pack extensions
  pinned to Carla's runtime branch, stale env overrides, Carla2.conf engine config).
  Auto-opens on first run; header "Setup" button for self-healing later.
- **Voice archetype generator** (`voices.ts` + `NewVoiceWizard.tsx`): Techpriest /
  Demon / Vox Caster / Cavern Spirit generated as fully-wired .carxp files with
  curated parameters into `~/.config/persona/voices/`. Format + parameter indices
  verified against real Carla projects and extension LV2 TTLs.
- **Live verification on this machine:** doctor found and repaired the real stale
  LV2_PATH override from March; generated Techpriest loaded headless in Carla and
  measurably processed audio (ring-mod sidebands at 440±150 Hz). SWH extension
  installed (user scope) for AM pitchshifter.
- Tests: 177 passing (was 128). Docs: carla-setup.md and adding-voices.md rewritten.

### In Progress

- Nothing currently in progress

### Next Steps

1. **Merge `feat/onboarding-doctor`** to main via squash PR after user tries the GUI
2. **Manual GUI testing:** `npm run dev` → first-run doctor appears → New Voice →
   activate preset → talk (the non-GUI path is verified; the GUI flow is not)
3. Fix or delete the stale "test" preset (points at nonexistent `~/Techpriest-patchbay.carxp`)
4. Cleanup pass from Carla research (see 2026-07-21 findings): crash detection for
   signal deaths, `isRunning()` matching any Carla, volume applied to all plugins,
   dead OSC renderer surface, stale E2E test
5. Snapshot discipline: `bash scripts/audio-snapshot.sh <label>` before audio experiments
6. Replace placeholder PNG icons; crossfade toggle; Discord overlay; Stream Deck (future)

---

## Previous Sessions

### 2026-07-21 — Audio snapshot/restore safety net
- `scripts/audio-snapshot.sh` / `audio-restore.sh`, baseline `known-good-zorin18.1`,
  `docs/audio-recovery.md`, system audit clean (committed on main, `fdba00e`)

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
