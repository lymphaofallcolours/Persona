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
