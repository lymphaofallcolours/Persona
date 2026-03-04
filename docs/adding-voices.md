# Adding New Voice Presets

## Quick Guide

1. Edit `persona.py`
2. Add an entry to `PRESETS` dict — a list of plugin names to wire in order
3. Add a color to `COLORS` dict
4. Restart Persona

## Step-by-Step Example: Adding a "Dark" Voice

### 1. Decide which plugins to use

Pick from the plugins currently loaded in Carla (listed in `PLUGINS`):
- "Calf Compressor"
- "Calf Equalizer 8 Band"
- "Calf Ring Modulator"
- "Calf Flanger"
- "Calf Reverb"

A "Dark" voice might use Compressor + EQ + Flanger + Reverb (skip Ring Mod):

### 2. Add to PRESETS

```python
PRESETS = {
    "Normal": [],
    "Techpriest": [...],
    "Clean": [...],
    "Dark": [
        "Calf Compressor",
        "Calf Equalizer 8 Band",
        "Calf Flanger",
        "Calf Reverb",
    ],
    "Off": None,
}
```

### 3. Add a color

```python
COLORS = {
    ...
    "Dark": "#6633cc",
}
```

### 4. Restart Persona

Close and relaunch. The new button appears automatically.

## Using New Plugins

If you need a plugin not currently loaded in Carla:

1. **In Carla**: open the plugin browser, search for the plugin, add it
2. **In persona.py**: add the exact plugin name (as shown in PipeWire) to `PLUGINS`
3. Use it in your preset

Check what name PipeWire sees with:
```bash
pw-link -o | grep "Calf\|SWH"
```

## Available Calf Plugins

These are installed and available to load in Carla:

| Plugin | Use case |
|---|---|
| Calf Pitch | Pitch shifting (up/down semitones) |
| Calf Phaser | Sweeping phase effect |
| Calf Crusher | Bitcrushing / sample rate reduction |
| Calf Saturator | Warm saturation / overdrive |
| Calf Vocoder | Vocoder effect |
| Calf Multi Chorus | Thick chorus effect |
| Calf Rotary Speaker | Leslie speaker simulation |
| Calf Pulsator | Tremolo / amplitude modulation |
| Calf Vinyl | Vinyl record simulation |

## Special Preset Values

- `[]` (empty list) — direct mic-to-headphones passthrough, no plugins
- `None` — disconnect everything (mute monitoring)

## Tips

- Plugin order matters: Compressor before EQ, effects after EQ
- The Ring Modulator is the main "inhuman" effect; without it, voices sound processed but human
- Keep Reverb last in the chain
- Tweak plugin parameters in Carla's GUIs, not in Persona
- Save Carla state (File → Save) after tweaking so settings persist
