# Code Architecture

<!-- Claude: Update this file when new layers, boundaries, ports, or adapters are introduced. -->

## Overview

Persona is a real-time audio routing controller that switches voice effect presets by
rewiring PipeWire links between a USB microphone, Carla-hosted plugins, and headphone output.
Currently a single-file Python/Tk application, planned for migration to TypeScript with
Clean Architecture.

## Current Structure (Python)

```
persona.py              # Single file: config, pw-link commands, preset logic, Tk GUI
```

All concerns live in one file:
- **Configuration** (lines 1-43): device names, plugin list, preset definitions, colors
- **PipeWire interface** (lines 49-80): `_run_pw_link`, `_batch_pw_commands`, `disconnect_current`, `connect_links`
- **Preset logic** (lines 83-119): `activate_preset` — decides which links to create based on preset type
- **GUI** (lines 122-163): `main()` — Tk window with buttons

## Planned Structure (TypeScript Migration)

```
src/
├── domain/           # PresetConfig, AudioLink, PluginChain — value objects, no I/O
├── application/      # SwitchPreset use case, AudioRouter port interface
├── infrastructure/   # PipeWireAdapter (pw-link CLI), CarlaAdapter (plugin status)
├── adapters/         # GUI (Electron or web), CLI handler
└── main.ts           # Composition root — all DI wiring
```

## Dependency Rule

Dependencies point inward ONLY: adapters → application → domain.
Infrastructure implements interfaces defined in application (Dependency Inversion).
Domain imports NOTHING from other layers.

## Ports & Adapters

### Driving Ports (how the outside world calls us)

| Port | Adapter(s) | Description |
|------|-----------|-------------|
| Preset Switching | Tk GUI buttons (Python) / Electron UI (TS) | User selects a voice preset |

### Driven Ports (what we need from the outside world)

| Port (interface) | Adapter (implementation) | Description |
|------------------|--------------------------|-------------|
| `AudioRouter` | `PipeWireAdapter` (`pw-link` CLI) | Create/destroy audio links between ports |
| `PluginRegistry` | `CarlaAdapter` (future) | Query available plugins and their PipeWire names |

## Key Data Flows

### Preset Switching

```
Button click → activate_preset(name)
  → disconnect_current() — remove all _active_links via pw-link -d (parallel threads)
  → build link list based on preset type:
      empty list → mic direct to headphones
      plugin list → mic → plugin1 → plugin2 → ... → headphones
      None → leave disconnected (Off)
  → connect_links() — create new links via pw-link (parallel threads)
  → update GUI state on main thread via .after(0, callback)
```

## Cross-Cutting Concerns

- **Error handling:** Silent failure — `pw-link` errors are captured but not surfaced (audio glitches self-resolve)
- **Threading:** All `pw-link` calls run in parallel daemon threads. GUI updates marshalled to main thread.
- **State tracking:** `_active_links` global tracks what's connected so only active links are disconnected.
