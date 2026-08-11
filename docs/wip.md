# Work In Progress

<!-- Claude: Read this file at session start. Update it at session end. -->

## Current Session

**Date:** 2026-07-22 (branch `feat/discord-robust-routing`)
**Goal:** Robust zero-config Discord routing after the monitor-based design failed live

### Completed This Session

- **Root-caused the failure** (ADR 2026-07-22): device-poll race hid the
  virtual-mic pseudo-device (selection reverted to auto), monitor sources are
  fragile, zero feedback.
- **Real virtual source** (`Audio/Source/Virtual`) — "Persona Virtual Mic" is a
  genuine microphone entry in every app; topology measured (input_FL/FR feed,
  capture_FL/FR listen; description needs backslash-escaped spaces).
- **Speakers/Discord toggle** (routeMode in config + segmented control in
  DeviceSelector; pseudo-device removed; config migration included).
- **Fully automatic adoption**: default-source switch + live
  `move-source-output` of call-app streams, all reverted on Off/speakers/quit.
  Status-bar chip shows call capture truth (green/amber/gray).
- Verified live: pulse-API capture of the chain shows processed audio;
  adoption cycle on a fake call stream is clean and reversible.
- 209 tests passing. discord-setup.md rewritten as zero-config.

### Post-field-test fixes (2026-08-11)

First real Discord test broke (Off = silence in call, Discord device dialog
triggered by default-source flapping, stale stream indexes). Fixed: sticky
per-mode adoption (release only on speakers/quit), Off in Discord mode = clean
passthrough into the virtual mic, stateless release keyed by app name, monitor
link leak on preset switches. System default input restored to the N32 after
the drift. See ADR 2026-07-22 amendment.

- **Circular-input regression fixed:** adoption makes the virtual mic the
  default source, so `input: auto` resolved the chain input to the virtual mic
  itself (silent presets). Auto-resolution now refuses the virtual mic
  (falls back to displaced source / first hardware input); release never
  strands the default on the virtual mic even after a crash.

### Next Steps

1. User acceptance: real Discord call — voices AND Off audible, no Discord
   dialogs when switching presets, status chip green throughout
2. Voice-to-voice switching: retest after these fixes (churn removal is the
   suspected cause); if still broken, capture `pw-link -l` during a bad switch
3. Merge to main on approval

---

## Previous Session (2026-07-21)

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
- Tests: 180 passing (was 128). Docs: carla-setup.md and adding-voices.md rewritten.
- **Roster expansion:** 15 archetypes total (added Multitudes, Psychic Chorus, Insect,
  Aquatic People, Elf, Wizard, Astartes, Psychic Sage, Child, Servitor, Wraith).
  MDA pack added to doctor requirements (MDA Detune for voice-doubling effects).
  Multitudes (MDA) and Insect (SWH Decimator) verified live headless: signal
  processed, detune sidebands measured. Gotcha: Carla's Flatpak sandbox cannot
  read /tmp — generated .carxp files must live under $HOME.
- **Mic-mute warning:** monitor toggle and preset activation now toast when the
  source is pactl-muted (Discord mute) — root-caused from live "monitor doesn't
  work" report where all links were healthy but the N32 source was muted.
- **Link-leak fixes:** quit now disconnects all links + startup sweeps stale
  device-to-device links; fixed listLinks parser (never worked on real output).
- **Desktop flicker fix:** hardware acceleration disabled (Haswell iGPU +
  XWayland compositing artifact).
- **Virtual mic for Discord** (ADR 2026-07-21): null sink `persona_virtual_mic`
  managed by new virtualMic.ts; output device entry; monitor toggle plays
  processed voice when virtual output selected; docs/discord-setup.md.
  End-to-end verified headless (processed signal captured at sink monitor).
- **Duplicate-preset fix:** duplicating now clones the .carxp file (was: both
  presets shared one file; Carla Save from either overwrote the other's voice).
  User's spoiled Techpriest/Demon templates restored via regeneration.
- **Portable config paths + configurable voices folder:** carxpPath/voicesDir
  stored config-relative (`voices/x.carxp`) or home-relative (`~/...`) on disk,
  resolved to absolute in memory — `~/.config/persona/` is now copyable across
  machines/usernames. New Voice wizard shows/changes the destination folder
  (warns if outside home: Carla sandbox readability).
- **Desktop fixes along the way:** tray icons for ALL Electron apps were
  invisible system-wide (Unity-era indicator-application-service hijacked the
  StatusNotifierWatcher — documented in troubleshooting.md, fixed via autostart
  override); tray icon must be PNG (nativeImage can't decode SVG); close-to-tray
  now notifies once per session.

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
