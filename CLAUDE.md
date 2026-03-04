# CLAUDE.md

<!-- ROOT FILE: Keep under 150 lines. Hand-crafted, not auto-generated. -->
<!-- For detailed guidance, see linked docs under each section. -->

## Project Context

Persona — real-time voice preset switcher for tabletop RPG sessions (Warhammer 40K).
Rewires PipeWire audio links to route mic through Carla-hosted LV2/LADSPA plugin chains.

**Stack:** Electron · React · TypeScript · Tailwind CSS · PipeWire (`pw-link` CLI) · Carla
**Runtime:** Node.js ≥18 | **OS:** Linux (Zorin OS / Ubuntu 22.04+)

## Architecture

Three independent layers — each can run/fail independently:

```
Mic (USB) ──► [Carla plugins in series] ──► Laptop headphone jack
                 rewired by Persona
```

1. **PipeWire** — audio server, moves audio between devices
2. **Carla** — plugin host, keeps LV2/LADSPA effects loaded (managed by Persona)
3. **Persona** — Electron app: switching GUI + Carla lifecycle + device discovery

### Hard Rules

- Persona MUST NOT host or process audio — purely a routing controller.
- All PipeWire interaction via `pw-link` CLI only. No dbus, no native bindings.
- Mic and output MUST be on separate physical devices (feedback prevention).
- All system calls (pw-link, Carla spawn, file I/O) in main process only. Renderer uses IPC.
- Plugin parameter tweaking happens in Carla GUIs, never in Persona (v1).

> Full component diagram and data flows → `docs/architecture.md`
> Code-level layer map (TS migration) → `docs/code-architecture.md`

## Key Commands

```bash
npm run dev                               # Run in development mode
npm run build                             # Build for production
npm run package                           # Package as .AppImage / .deb
pw-link -l                                # List current audio links
pw-link -o | grep Calf                    # Check if Carla plugins are visible
bash scripts/install-hooks.sh             # Install git hooks after cloning
```

## Code Conventions

TypeScript strict mode. `camelCase` functions/variables, `UPPER_SNAKE_CASE` constants.
See `docs/code-conventions.md` for full patterns.

## Testing

No automated tests currently. Manual testing: click buttons, listen to audio output.
See `docs/testing.md` for planned test strategy (pytest → vitest after migration).

## Error Handling

- `child_process.execFile` with `timeout: 2000` — pw-link calls fail fast.
- Graceful degradation: Normal/Off presets work without Carla running.
- Toast notifications for errors (device disconnect, Carla crash, link failure).
- Status bar shows persistent connection state.

## Git Workflow

- **Conventional Commits REQUIRED:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- Scope when useful: `feat(presets): add Dark voice preset`.
- Auto-versioning: `commit-msg` hook enforces format, `post-commit` bumps `VERSION`.
- Feature branches: max 1-2 days. Merge to `main` via squash-merge PR.
- **Commit after each logical unit of work** — each completed phase, feature, or fix gets its own commit. Do not accumulate large uncommitted changesets across multiple features.

## Gotchas

- Soundbase N32 is both mic and speaker — NEVER route output to it while using as mic (feedback loop).
- Carla Flatpak cannot see host plugins without explicit env overrides (`LADSPA_PATH`, `LV2_PATH`).
- Plugin names in presets must exactly match PipeWire client names (check with `pw-link -o`).
- PipeWire services must be restarted after version upgrades (`systemctl --user daemon-reload`).

## Automated Documentation & Memory Maintenance

Claude MUST maintain living documentation as part of the development workflow.

### On Every Session Start

- Read `docs/decisions-log.md` for recent architectural decisions and open questions.
- Read `docs/wip.md` for current work-in-progress state.

### During Development

- **New file/module created** → Update `docs/architecture.md` or `docs/code-architecture.md`.
- **New pattern adopted** → Add entry to `docs/code-conventions.md` with example.
- **Non-obvious decision made** → Append to `docs/decisions-log.md` (ADR format below).
- **Bug fixed with non-obvious cause** → Add to Gotchas section or relevant `.claude/rules/` file.
- **New dependency added** → Document WHY in `docs/dependencies.md`.

### On Session End

- Update `docs/wip.md`: completed, in progress, blocked, next steps.
- Log any TODO/FIXME added to code in `docs/wip.md` with file path.
- Self-check: "Did I change anything making existing docs stale?" If yes, update now.

### Decision Log Format (`docs/decisions-log.md`)

```markdown
## YYYY-MM-DD — {Short title}
**Status:** Accepted | Superseded by YYYY-MM-DD | Deprecated
**Context:** {What triggered this}
**Decision:** {What was chosen}
**Alternatives rejected:** {What else and why not}
**Consequences:** {Tradeoffs, follow-up work}
```

### Memory File Inventory

```
docs/
├── wip.md                 # Session state — updated EVERY session
├── decisions-log.md       # ADRs — append-only, never delete past entries
├── dependencies.md        # Why each dependency exists
├── changelog.md           # Auto-maintained via post-commit hook
```

> Documentation updates are NOT optional. Stale docs are worse than no docs.
> If a doc update exceeds scope, create a TODO in `docs/wip.md` instead.

## Memory & Documentation Map

```
docs/
├── architecture.md        # System component diagram, runtime data flows
├── code-architecture.md   # Code-level layer map (TS migration target)
├── code-conventions.md    # Patterns, anti-patterns, naming, imports
├── testing.md             # Test strategies, pyramid, fixtures
├── adding-voices.md       # How to create new voice presets
├── carla-setup.md         # Carla Flatpak configuration
├── hardware.md            # Hardware inventory and PipeWire device names
├── pipewire-setup.md      # PipeWire service configuration
├── troubleshooting.md     # Common issues and fixes
```

### Scoped Rules (auto-loaded by glob match)

```
.claude/rules/
└── persona.py.md          # Constraints for the main Python file
```

### Local Overrides (gitignored)

`CLAUDE.local.md` — personal preferences, local env quirks, WIP experiments.
