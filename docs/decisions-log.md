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
