# Dependencies

<!-- Claude: Update this file whenever a dependency is added, replaced, or removed. -->
<!-- The goal is to capture WHY each dependency exists, not just what it does. -->

## Format

For each dependency, document:
- **What it does** (one line)
- **Why it was chosen** over alternatives
- **What it replaced** (if applicable)
- **Removal risk** — how coupled is the codebase to this dependency?

---

## Python Standard Library

### tkinter

**Purpose:** GUI framework — button panel for preset switching.
**Chosen over:** PyQt/PySide (heavy, licensing), GTK (requires gobject introspection), web UI (over-engineered for 4 buttons).
**Removal risk:** High — entire GUI depends on it. Will be replaced during TS migration.
**Added:** 2026-03-04

### subprocess

**Purpose:** Runs `pw-link` commands to create/destroy PipeWire audio links.
**Chosen over:** dbus bindings (complex, fragile), native PipeWire bindings (no Python package), shell scripts (less control).
**Removal risk:** High — sole interface to PipeWire. Will be replaced by `node:child_process` or similar.
**Added:** 2026-03-04

### threading

**Purpose:** Parallel execution of `pw-link` calls for fast preset switching.
**Chosen over:** asyncio (all operations are subprocess calls with short timeouts, threading is simpler), multiprocessing (overkill for I/O-bound work).
**Removal risk:** Medium — used in `_batch_pw_commands`. Could be replaced with asyncio or Promise.all in TS.
**Added:** 2026-03-04

---

## System Dependencies

### PipeWire 1.0.7

**Purpose:** Audio server providing JACK compatibility and modern audio routing.
**Chosen over:** PulseAudio (no JACK compatibility for Carla), raw JACK (less desktop integration), PipeWire 0.3.x (too old for some features).
**What it replaced:** PulseAudio (disabled via systemctl).
**Removal risk:** High — entire project depends on PipeWire for audio routing.
**Added:** 2026-03-04

### Carla 2.5.10 (Flatpak)

**Purpose:** LV2/LADSPA plugin host — keeps audio effects loaded and provides GUIs for tweaking.
**Chosen over:** Hosting plugins directly in Persona (complex, fragile), JACK Rack (unmaintained), Easy Effects (different purpose).
**Removal risk:** Medium — Normal/Off presets work without it, but all effects presets require it.
**Added:** 2026-03-04

### Calf Studio Gear (calf-plugins)

**Purpose:** LV2 plugin suite providing Compressor, EQ, Ring Modulator, Flanger, Reverb.
**Chosen over:** SWH LADSPA plugins (less GUI support), LSP plugins (installed but not used — Calf has more character effects).
**Removal risk:** High — all voice presets reference Calf plugin names. Changing plugins requires updating PRESETS dict.
**Added:** 2026-03-04

---

## Dev Dependencies

_None currently. Git hooks use bash only._
