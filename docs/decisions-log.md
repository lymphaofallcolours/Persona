# Architecture Decision Records

<!-- Claude: Append new decisions during development. NEVER delete or edit past entries. -->
<!-- This is an append-only log. Superseded decisions get a new entry, not an edit. -->

## How to Use This Log

Each entry captures a non-obvious technical decision. Record a decision when:
- You chose between two or more viable approaches
- A dependency was added or replaced
- An architectural boundary was introduced or changed
- A pattern or convention was established for the first time
- Something was intentionally NOT done (and the reasoning matters)

---

<!-- Entries below — newest first -->

## 2026-03-04 — Session profiles for saving/restoring app state

**Status:** Accepted
**Context:** User switches between different audio setups for different activities (game sessions, recording, practice). Manually reconfiguring devices, active preset, and group view each time is tedious.
**Decision:** Add `SessionProfile` type stored in `presets.json` alongside presets/groups. Sessions capture: active preset ID, selected input/output devices, and selected group tab. Save/load via header dropdown. Loading a session sets devices, activates preset, and restores UI state. No schema version bump — `sessions` field added with empty-array fallback in migration logic.
**Alternatives rejected:** (1) Separate session files — adds file management complexity. (2) Browser localStorage — not accessible from main process for device/preset activation.
**Consequences:** Sessions reference preset IDs — if a preset is deleted, loading that session will show a warning toast but still restore devices and group view. Session dropdown lives in the header bar.

## 2026-03-04 — Preset export/import via .persona files

**Status:** Accepted
**Context:** User mentioned others may use Persona with their own presets. Need a way to share preset configurations between machines.
**Decision:** `.persona` JSON file format containing presets + referenced groups. Export strips `isFactory` and `hotbarSlot` (personal preferences). Import regenerates all UUIDs and remaps group references to avoid collisions. Available via context menu (single preset) and toolbar buttons (Import/Export All).
**Alternatives rejected:** (1) ZIP bundle with .carxp files — too complex for v1, .carxp paths are machine-specific. (2) Clipboard copy/paste — not persistent, can't share as files.
**Consequences:** Imported presets are always non-factory. `carxpPath` is included but may not resolve on target machine. Group names may duplicate if user imports presets from a setup with same group names.

## 2026-03-04 — Preset groups, hotbar, per-preset volume, and global hotkeys

**Status:** Accepted
**Context:** User manages 10+ voice presets during tabletop RPG sessions. The flat 2-column grid doesn't scale — no way to organize, no quick-access bar, no keyboard shortcuts, and some presets are louder than others.
**Decision:** Four tightly related features implemented together: (1) Preset Groups — flat `groupId` field on presets, group tabs in PresetPanel with filtering, context menu for move-to-group. (2) Hotbar — 7-slot quick-access bar, `hotbarSlot` field on presets, pin/unpin via context menu. (3) Per-Preset Volume — `volume` field (0.0-1.27), applied via OSC `setVolume()` on activation. (4) Global Hotkeys — Ctrl+1-7 via Electron `globalShortcut`, activates corresponding hotbar slot. Schema migrated v1→v2 with backward compatibility.
**Alternatives rejected:** (1) Nested group hierarchy — overkill for ~20 presets, flat groupId simpler. (2) Separate hotbar config — keeping it on the preset object is more intuitive. (3) System-wide volume control — per-plugin OSC volume gives finer control.
**Consequences:** Config schema is now v2. v1 configs auto-migrate (add empty groups array). Global Ctrl+1-7 shortcuts may conflict with other apps — acceptable since Persona is always-on during sessions. Volume requires OSC connection to Carla.

## 2026-03-04 — Carla OSC integration for real-time parameter control

**Status:** Accepted
**Context:** Preset switching with different `.carxp` files requires restarting Carla (~2s delay). Carla exposes an OSC API for real-time plugin parameter control.
**Decision:** Add `node-osc` library for UDP OSC messaging. New `carlaOsc.ts` service handles connection/parameter control. Smart preset switching: same `.carxp` presets switch instantly via OSC parameter snapshots; different `.carxp` still restarts Carla. Parameter snapshots stored per-preset. ParameterPanel UI shows real-time sliders.
**Alternatives rejected:** (1) Carla's Python API — requires embedding Python, adds complexity. (2) `osc-js` — heavier, browser-focused. (3) Parsing `.carxp` XML directly — fragile, can't control live parameters.
**Consequences:** Instant preset switching when `.carxp` is shared. OSC port fixed at 22752 via `CARLA_OSC_UDP_PORT` env var. Bidirectional messaging is limited — no parameter change callbacks from Carla, so UI shows intended values not actual.

## 2026-03-04 — .carxp file association via Carla restart

**Status:** Accepted
**Context:** Users need different Carla plugin parameter configurations per preset. Carla stores settings in `.carxp` project files.
**Decision:** Each preset can optionally reference a `.carxp` file path. On preset activation, if the `.carxp` path differs from the currently running Carla session, Carla is stopped and restarted with the new project file. File selection uses Electron's native file dialog via IPC.
**Alternatives rejected:** (1) Carla OSC API to hot-swap parameters — too complex for v2, reserved for v3. (2) Parsing `.carxp` XML in Persona — fragile, couples to Carla internals.
**Consequences:** Preset switching with different `.carxp` files has a ~2-3 second delay for Carla restart. Trade-off accepted for simplicity. Future OSC integration could eliminate restart overhead.

## 2026-03-04 — Full TypeScript migration with Electron + React + Tailwind

**Status:** Accepted
**Context:** Python/tkinter app needed major feature expansion (dynamic devices, preset CRUD, Carla lifecycle, system tray). Python/tkinter was insufficient for the desired UX.
**Decision:** Complete rewrite as Electron desktop app. React for UI, Tailwind CSS for styling, electron-vite for build tooling. Main process handles all system calls (pw-link, Carla spawn, JSON file I/O). Renderer communicates via typed IPC.
**Alternatives rejected:** (1) Tauri — lighter but Rust backend adds friction for system calls. (2) Web app (localhost) — no native window controls (always-on-top, tray). (3) Extending Python/tkinter — would still need to rewrite for the desired feature set.
**Consequences:** Node.js is now a build dependency. Package size increases (~150MB for Electron). Gains: proper component architecture, typed IPC, system tray, always-on-top mini panel, hot module reload for development.

## 2026-03-04 — JSON config file for preset persistence

**Status:** Accepted
**Context:** Presets were hardcoded in Python source. Need user-editable persistence for preset CRUD.
**Decision:** JSON file at `~/.config/persona/presets.json`. First run copies factory defaults from shipped `presets/factory.json`.
**Alternatives rejected:** (1) SQLite — overkill for a flat preset list. (2) electron-store — adds dependency for something JSON + fs handles fine.
**Consequences:** Human-editable config. Versioned schema (`version: 1`). Factory presets protected from deletion.

## 2026-03-04 — Phased Carla integration (routing → project files → OSC)

**Status:** Accepted
**Context:** User wants full plugin management from Persona. Options range from simple routing to deep Carla API integration.
**Decision:** Phase approach: v1 = routing + Carla lifecycle (spawn, health, crash). v2 = `.carxp` project file association per preset. v3 = Carla OSC API for real-time plugin control.
**Alternatives rejected:** Implementing full OSC integration in v1 — too complex, blocks shipping a working app.
**Consequences:** v1 delivers immediate value. Each phase is independently useful. Carla's GUI still needed for parameter tweaking in v1.

## 2026-03-04 — Dual architecture docs (system vs code)

**Status:** Accepted
**Context:** Template provides a code-level Clean Architecture doc; existing project has a system-level component diagram describing PipeWire/Carla/Persona runtime relationships.
**Decision:** Keep both: `docs/architecture.md` (system/runtime) and `docs/code-architecture.md` (code layers). They describe different abstraction levels.
**Alternatives rejected:** Merge into one file — rejected because system-level (hardware, services, data flows) and code-level (layers, ports, modules) serve different purposes.
**Consequences:** `architecture.md` is the "what runs where" doc; `code-architecture.md` is the "how code is organized" doc. Both need updating when boundaries change.

## 2026-03-04 — Shell-based auto-versioning over npm tooling

**Status:** Accepted
**Context:** Need auto-versioning from conventional commits. Project is Python with zero npm dependencies.
**Decision:** Use git hooks (`commit-msg` for validation, `post-commit` for version bump + changelog). `VERSION` file at repo root.
**Alternatives rejected:** `standard-version` / `release-it` via npm — would add Node.js as a build dependency for a Python project. Premature before TS migration.
**Consequences:** Hooks must be installed via `scripts/install-hooks.sh` after cloning. Will migrate to npm tooling during TS migration.

## 2026-03-04 — Rename doc/ to docs/

**Status:** Accepted
**Context:** Template system references `docs/` convention; existing project used `doc/`.
**Decision:** Rename `doc/` to `docs/` before first commit. Single canonical location for all documentation.
**Alternatives rejected:** Keep both directories — confusing, violates single-source principle.
**Consequences:** All internal references updated to `docs/`. GitHub Pages and tooling expect `docs/` by default.

## 2026-03-04 — Template-based documentation system

**Status:** Accepted
**Context:** Project had informal docs; needed structured, living documentation for multi-session AI-assisted development and upcoming TS migration.
**Decision:** Adopt template-based docs system (CLAUDE.md + 13 docs files) with conventional commits, auto-versioning, and session tracking via `wip.md`.
**Alternatives rejected:** (1) Ad-hoc docs only — no cross-session memory. (2) `.claude/projects/` memory files — not version-controlled, ephemeral.
**Consequences:** All Claude sessions must read `wip.md` on start and update it on end. Decisions are append-only. Documentation updates are mandatory, not optional.
