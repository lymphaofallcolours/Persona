# Carla Setup

## Installation

Installed via Flatpak: `studio.kx.carla` v2.5.10 from Flathub.

## Audio Driver

JACK — routed through PipeWire's JACK compatibility layer (`pipewire-jack` package).

## Flatpak Overrides

The Flatpak sandbox blocks access to host plugin directories. Workaround:
plugins are copied to user-accessible locations with env vars set.

```bash
# LADSPA plugins
cp /usr/lib/ladspa/*.so ~/.local/lib/ladspa/
flatpak override --user --env=LADSPA_PATH=/home/lympha/.local/lib/ladspa studio.kx.carla

# LV2 plugins
cp -r /usr/lib/lv2/* ~/.local/lib/lv2/
cp -r /usr/lib/x86_64-linux-gnu/lv2/* ~/.local/lib/lv2/
flatpak override --user --env=LV2_PATH=/home/lympha/.local/lib/lv2 studio.kx.carla
```

**Important**: After installing new plugins on the host, re-copy them to `~/.local/lib/`.

## Plugin Packages

### Calf Studio Gear (`calf-plugins`)
LV2 plugins with full GUIs. Used for:
- **Calf Compressor** — dynamics flattening
- **Calf Equalizer 8 Band** — frequency shaping
- **Calf Ring Modulator** — metallic/alien harmonics (the key Techpriest effect)
- **Calf Flanger** — metallic shimmer via comb filtering
- **Calf Reverb** — spatial effect
- **Calf Pitch** — pitch shifting (available but not currently loaded)

Other available Calf plugins: Phaser, Crusher, Saturator, Vocoder, Multi Chorus,
Rotary Speaker, Pulsator, Vinyl, etc. All can be loaded in Carla on demand.

### SWH Plugins (`swh-plugins`)
LADSPA plugins. Available but not currently used in favor of Calf LV2 equivalents.
Includes: ringmod, flanger, comb filter, pitch shift, decimator, and many more.

### LSP Plugins (`lsp-plugins-lv2`)
High-quality LV2 plugins. Installed but not currently used.
Includes: compressors, gates, limiters, EQs, etc.

## Project Files

Saved at: `~/Documents/Carla-Projects/`
- `Techpriest.carxp` — full metallic voice chain
- `Normal.carxp` — empty (passthrough)

## Plugin Behavior in PipeWire

Each Carla plugin appears as a separate JACK client in PipeWire with ports:
- `<Plugin Name>:In L` / `<Plugin Name>:In R` — audio inputs
- `<Plugin Name>:Out L` / `<Plugin Name>:Out R` — audio outputs

Persona wires these ports in series to form the effect chain.

## Tweaking Plugin Parameters

1. Open Carla
2. Double-click a plugin to open its GUI
3. Adjust dials
4. File → Save to persist settings

### Key Techpriest Dials

**Ring Modulator** (the alien sound):
- Mod Freq: ~150 Hz (carrier frequency)
- Mod Amount: 70-80% (metallic intensity)

**Flanger** (metallic shimmer):
- Min delay: 3-5 ms
- Feedback: ~0.7
- Mod depth: 2-3 ms
- Amount: 60-70%
