# Carla Setup

> **Users should never need this page.** Persona's Setup Doctor (header → Setup,
> auto-opens on first run) detects and repairs everything below with one click,
> all user-scope, no sudo. This page documents what the doctor does and why.

## Installation

Flatpak: `studio.kx.carla` (2.5.x) from Flathub. The doctor installs it with
`flatpak install --user -y flathub studio.kx.carla` (~1 GB with runtime).

## Audio Driver & Process Mode

- **AudioDriver=JACK** — routed through PipeWire's JACK compatibility layer.
- **ProcessMode=3 (Patchbay)** — Carla appears in PipeWire as a single `Carla`
  node with `audio-in1/2` / `audio-out1/2` ports; plugins are wired *inside*
  Carla via the project's `<Patchbay>` section.

Both are written directly to `~/.var/app/studio.kx.carla/config/falkTX/Carla2.conf`
(plain INI) by the doctor's "Configure" fix — no GUI interaction needed. The
file is only safe to edit while Carla is not running (enforced in the handler).

## Plugins: Flathub extensions, NOT host packages

Plugins come from Flathub `org.freedesktop.LinuxAudio.Plugins.*` extensions,
which Flatpak mounts inside the Carla sandbox at `/app/extensions/Plugins/`:

```bash
flatpak install --user -y flathub org.freedesktop.LinuxAudio.Plugins.Calf//<branch>
flatpak install --user -y flathub org.freedesktop.LinuxAudio.Plugins.swh//<branch>
```

`<branch>` must match Carla's runtime branch (e.g. `25.08` for
`org.kde.Platform/x86_64/5.15-25.08` — the doctor derives it from `flatpak info`).

- **Calf** — Compressor, EQ, Ring Modulator, Flanger, Reverb, Saturator,
  Filter, Vintage Delay (all archetype chains). Note: **Calf Pitch is NOT in
  the extension** (experimental, excluded from release builds).
- **SWH** — `AM pitchshifter` (mono), the pitch shifter used by the Demon
  archetype since Calf Pitch is unavailable.

### The stale-override trap (historical)

The pre-2026-07 setup copied host plugins to `~/.local/lib/{ladspa,lv2}` and set
`LV2_PATH`/`LADSPA_PATH` via `flatpak override`. **Any such override shadows the
extension mount and hides the extension plugins.** The doctor detects this and
repairs it: user-level overrides are `--unset-env`'d; a system-level override
(needs root to delete) is instead shadowed by a user-level override pointing at
`/app/extensions/Plugins/...`. Note `flatpak override --show` renders unset-env
markers as empty `VAR=` lines — empty means unset, not "set to empty".

## Project Files

- Generated voices: `~/.config/persona/voices/*.carxp` (via New Voice wizard).
- Legacy hand-made projects: `~/.var/app/studio.kx.carla/data/carla-projects/`.

A valid project needs a `<Patchbay>` section wiring the plugins; without it the
plugins load disconnected and pass no audio (Persona warns on activation).
Format details → `docs/adding-voices.md`.

## Carla in PipeWire (Patchbay mode)

Carla appears as ONE node:

- `Carla:audio-in1` / `Carla:audio-in2` — chain input (Persona links mic here)
- `Carla:audio-out1` / `Carla:audio-out2` — chain output (Persona links to speakers)

Internal patchbay port naming (used inside `.carxp` connections):
hardware is `Audio Input:Left/Right` and `Audio Output:Left/Right`; plugin
clients are named by plugin name (Calf ports `In L`/`Out R` etc., SWH
AM pitchshifter is mono `Input`/`Output`).

> The older Multi-Client mode (each plugin its own JACK client with
> `<Plugin Name>:In L` ports) is still handled by Persona's dynamic port
> discovery, but Patchbay mode is what the doctor configures.

## Tweaking Plugin Parameters

Generated voices ship with curated parameters and work out of the box.
To fine-tune: open Carla, double-click a plugin, adjust, File → Save.

### Key Techpriest Dials

**Ring Modulator** (the alien sound):
- Mod Freq: ~150 Hz (carrier frequency)
- Mod Amount: 70-80% (metallic intensity)

**Flanger** (metallic shimmer):
- Min delay: 3-5 ms
- Feedback: ~0.7
- Mod depth: 2-3 ms
- Amount: 60-70%
